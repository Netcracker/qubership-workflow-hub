import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('@actions/core', () => ({
  info: jest.fn(),
  setFailed: jest.fn(),
}));

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), setDebug: jest.fn(), setDryRun: jest.fn() }
}));

const { default: MavenStrategy } = await import('../src/strategy/maven.js');
const { default: log } = await import('@qubership/action-logger');

const day = 86400000;
const now = Date.now();
const ago = (days) => new Date(now - days * day).toISOString();
const version = (id, name, days) => ({ id, name, created_at: ago(days), updated_at: ago(days) });
const pkg = { id: 1, name: 'lib', package_type: 'maven' };

describe('MavenStrategy', () => {
  let strategy;
  let blockedByExclusion;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new MavenStrategy();
    blockedByExclusion = [];
  });

  const run = (versions, extra = {}) => strategy.execute({
    packagesWithVersions: [{ package: pkg, versions }],
    includedPatterns: ['*SNAPSHOT*'], excludedPatterns: [],
    thresholdDate: new Date(now - 14 * day), thresholdVersions: 1,
    blockedByExclusion, ...extra
  });
  const ids = (result) => (result[0]?.versions ?? []).map(v => v.id).sort((a, b) => a - b);

  const snapshots = [
    version(1, '1.0.0', 60),
    version(2, '1.1.0-SNAPSHOT', 40),
    version(3, '1.2.0-SNAPSHOT', 20),
    version(4, '1.3.0-SNAPSHOT', 10),
    version(5, '1.4.0-SNAPSHOT', 2),
  ];

  describe('selection (unchanged behavior)', () => {
    it('deletes old SNAPSHOT versions, keeps releases, fresh versions and the newest old candidate', async () => {
      expect(ids(await run(snapshots))).toEqual([2]);
    });

    it('keeps the N newest old candidates', async () => {
      expect(ids(await run(snapshots, { thresholdVersions: 0 }))).toEqual([2, 3]);
    });

    it('skips a package whose candidates do not exceed threshold-versions', async () => {
      expect(await run([version(1, '1.0.0', 60), version(2, '1.1.0-SNAPSHOT', 40)])).toEqual([]);
    });

    it('skips a package with a single version', async () => {
      expect(await run([version(1, '1.0.0-SNAPSHOT', 60)])).toEqual([]);
    });

    it('does not touch releases even with SNAPSHOT inclusion only', async () => {
      expect(await run([version(1, '1.0.0', 60), version(2, '1.1.0', 50), version(3, '1.2.0', 40)])).toEqual([]);
      expect(blockedByExclusion).toEqual([]);
    });
  });

  describe('excluded patterns', () => {
    it('protects excluded versions and wins over the inclusion', async () => {
      const versions = [version(1, '1.0.0-SNAPSHOT', 60), version(2, 'release-1.0-SNAPSHOT', 50), version(3, '1.1.0-SNAPSHOT', 40), version(4, '1.2.0-SNAPSHOT', 30)];

      const result = await run(versions, { excludedPatterns: ['release*'], thresholdVersions: 0 });

      expect(ids(result)).toEqual([1, 3, 4]);
    });

    it('with latest,release* (the migrated configuration) still deletes old SNAPSHOT versions', async () => {
      const result = await run(snapshots, { excludedPatterns: ['latest', 'release*'], includedPatterns: ['*SNAPSHOT'] });

      expect(ids(result)).toEqual([2]);
      expect(blockedByExclusion).toEqual([]);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('with *.* deletes nothing, because it also matches SNAPSHOT versions, and says so', async () => {
      const result = await run(snapshots, { excludedPatterns: ['latest', 'release*', '*.*'] });

      expect(result).toEqual([]);
      expect(blockedByExclusion).toEqual([{ package: 'lib', versions: 2, patterns: ['*.*'] }]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('protected by excluded patterns: *.*'));
    });

    it('reports only the patterns that actually protect eligible versions', async () => {
      await run(snapshots, { excludedPatterns: ['nothing-matches', '1.*'] });

      expect(blockedByExclusion[0].patterns).toEqual(['1.*']);
    });

    it('does not warn when exclusions protect only some of the candidates', async () => {
      const result = await run(snapshots, { excludedPatterns: ['1.1.0*'], thresholdVersions: 0 });

      expect(ids(result)).toEqual([3]);
      expect(blockedByExclusion).toEqual([]);
    });

    it('does not warn when nothing matches the inclusion or is old enough', async () => {
      await run([version(1, '1.0.0', 60), version(2, '1.1.0-SNAPSHOT', 3)], { excludedPatterns: ['*.*'] });

      expect(blockedByExclusion).toEqual([]);
    });
  });

  describe('inclusion patterns', () => {
    it('matches names ending with SNAPSHOT for *SNAPSHOT (without trailing star)', async () => {
      expect(ids(await run(snapshots, { includedPatterns: ['*SNAPSHOT'] }))).toEqual([2]);
    });

    it('uses only the given patterns', async () => {
      const versions = [version(1, '2.0.0-beta1', 60), version(2, '2.0.0-beta2', 50), version(3, '1.0.0-SNAPSHOT', 40)];

      expect(ids(await run(versions, { includedPatterns: ['*beta*'], thresholdVersions: 0 }))).toEqual([1, 2]);
    });
  });
});
