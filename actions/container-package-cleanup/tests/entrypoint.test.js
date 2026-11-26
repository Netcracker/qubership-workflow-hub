import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import process from 'node:process';
import { setImmediate } from 'node:timers';

let inputs = {};

const mockCore = {
  getInput: jest.fn((name) => inputs[name] ?? ''),
  setFailed: jest.fn(),
  info: jest.fn(),
  summary: {
    addRaw: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined)
  }
};
jest.unstable_mockModule('@actions/core', () => mockCore);

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: new Proxy({}, { get: () => jest.fn() })
}));

const wrapperInstance = {
  isOrganization: jest.fn(),
  listPackages: jest.fn(),
  listVersionsForPackage: jest.fn(),
  deletePackageVersion: jest.fn()
};
const mockWrapperClass = jest.fn(() => wrapperInstance);
jest.unstable_mockModule('../src/utils/wrapper.js', () => ({ default: mockWrapperClass }));

const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
};

// index.js starts run() on import, so every case imports a fresh copy of it.
const runEntryPoint = async (newInputs) => {
  inputs = newInputs;
  await jest.isolateModulesAsync(async () => {
    await import('../src/index.js');
  });
  await flush();
};

describe('entry point: retention input validation', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.PACKAGE_TOKEN = 'token';
    wrapperInstance.isOrganization.mockResolvedValue(true);
    wrapperInstance.listPackages.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  const expectNothingTouched = () => {
    expect(mockWrapperClass).not.toHaveBeenCalled();
    expect(wrapperInstance.isOrganization).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).not.toHaveBeenCalled();
    expect(wrapperInstance.listVersionsForPackage).not.toHaveBeenCalled();
    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
  };

  it.each([
    ['empty', ''],
    ['nonnumeric', 'abc'],
    ['partially numeric', '7abc'],
    ['negative', '-1'],
    ['fractional', '1.5'],
  ])('fails before any API call for %s threshold-days (container)', async (_label, value) => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': value, debug: 'false' });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/threshold-days/);
    expectNothingTouched();
  });

  it.each([
    ['nonnumeric', 'abc'],
    ['negative', '-1'],
    ['fractional', '1.5'],
    ['empty', ''],
  ])('fails before any API call for %s threshold-versions (maven)', async (_label, value) => {
    await runEntryPoint({ 'package-type': 'maven', 'threshold-days': '7', 'threshold-versions': value, debug: 'false' });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/threshold-versions/);
    expectNothingTouched();
  });

  it.each([
    ['batch-size', 'negative', '-1'],
    ['batch-size', 'fractional', '1.5'],
    ['batch-size', 'nonnumeric', 'abc'],
    ['batch-size', 'partially numeric', '7abc'],
    ['max-errors', 'negative', '-1'],
    ['max-errors', 'fractional', '1.5'],
    ['max-errors', 'nonnumeric', 'abc'],
    ['max-errors', 'partially numeric', '7abc'],
  ])('fails before any API call for %s that is %s', async (name, _label, value) => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '7', [name]: value, debug: 'false' });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(new RegExp(name));
    expectNothingTouched();
  });

  it.each([
    ['empty', ''],
    ['zero', '0'],
    ['valid', '3'],
  ])('accepts %s batch-size and max-errors and continues to the API', async (_label, value) => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '7', 'batch-size': value, 'max-errors': value, debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).toHaveBeenCalled();
  });

  it.each([
    ['dry-run', 'ture'],
    ['dry-run', 'yes'],
    ['dry-run', '1'],
    ['dry-run', 'on'],
    ['debug', 'yes'],
    ['debug', '1'],
  ])('fails before any API call for %s set to %j', async (name, value) => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '7', debug: 'false', [name]: value });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(new RegExp(`'${name}'`));
    expectNothingTouched();
  });

  it.each([
    ['true'],
    ['TRUE'],
    ['False'],
    [''],
  ])('accepts %j for dry-run and debug and continues to the API', async (value) => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '7', 'dry-run': value, debug: value });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).toHaveBeenCalled();
  });

  it.each([
    ['docker', 'docker'],
    ['npm', 'npm'],
    ['empty', ''],
    ['a name of an inherited object member', 'constructor'],
  ])('fails before any API call for the unsupported package-type %s', async (_label, value) => {
    await runEntryPoint({ 'package-type': value, 'threshold-days': '7', debug: 'false' });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/Invalid 'package-type' input/);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/container, maven/);
    expectNothingTouched();
  });

  it.each([
    ['container'],
    ['Container'],
    ['MAVEN'],
  ])('accepts the package-type %s and continues to the API', async (value) => {
    await runEntryPoint({ 'package-type': value, 'threshold-days': '7', 'threshold-versions': '1', debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).toHaveBeenCalled();
  });

  it.each([
    ['container', '9000000000000000'],
    ['maven', '9000000000000000'],
    ['container', '200000000'],
  ])('fails before any API call when threshold-days gives a cutoff out of range (%s, %s)', async (packageType, days) => {
    await runEntryPoint({ 'package-type': packageType, 'threshold-days': days, 'threshold-versions': '1', debug: 'false' });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/threshold-days/);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/out of range/);
    expectNothingTouched();
  });

  it('accepts a large threshold-days whose cutoff is still a valid date', async () => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '36500', debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).toHaveBeenCalled();
  });

  it('fails for an invalid threshold-days on maven too', async () => {
    await runEntryPoint({ 'package-type': 'maven', 'threshold-days': 'abc', 'threshold-versions': '1', debug: 'false' });

    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/threshold-days/);
    expectNothingTouched();
  });

  it('accepts 0 for both thresholds on maven and continues to the API', async () => {
    await runEntryPoint({ 'package-type': 'maven', 'threshold-days': '0', 'threshold-versions': '0', debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.isOrganization).toHaveBeenCalledWith('owner');
    expect(wrapperInstance.listPackages).toHaveBeenCalledWith('owner', 'maven', true);
    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
  });

  it('accepts 0 for threshold-days on container and continues to the API', async () => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '0', debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).toHaveBeenCalledWith('owner', 'container', true);
  });

  it('does not validate threshold-versions for container packages (it is unused there)', async () => {
    await runEntryPoint({ 'package-type': 'container', 'threshold-days': '7', 'threshold-versions': 'whatever', debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listPackages).toHaveBeenCalled();
  });
});

describe('entry point: error handling and repository filter', () => {
  const savedEnv = { ...process.env };
  const pkg = (name, repository) => ({
    id: 1, name, package_type: 'container',
    repository: repository ? { name: repository, full_name: `owner/${repository}` } : undefined
  });
  const inputs = { 'package-type': 'container', 'threshold-days': '7', debug: 'false' };
  const NOTHING_TO_DELETE = '❗️No packages or versions to delete.';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.PACKAGE_TOKEN = 'token';
    wrapperInstance.isOrganization.mockResolvedValue(true);
    wrapperInstance.listPackages.mockResolvedValue([]);
    wrapperInstance.listVersionsForPackage.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('exits before listing versions when no package belongs to the current repository', async () => {
    wrapperInstance.listPackages.mockResolvedValue([pkg('other-image', 'other-repo'), pkg('no-repo-image')]);

    await runEntryPoint(inputs);

    expect(wrapperInstance.listPackages).toHaveBeenCalled();
    expect(wrapperInstance.listVersionsForPackage).not.toHaveBeenCalled();
    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
    expect(mockCore.setFailed).not.toHaveBeenCalled();
    // the run stops before the strategy and the report: the report logs this message when it is reached
    expect(mockCore.info).not.toHaveBeenCalledWith(NOTHING_TO_DELETE);
  });

  it('still processes packages of the current repository', async () => {
    wrapperInstance.listPackages.mockResolvedValue([pkg('other-image', 'other-repo'), pkg('my-image', 'repo')]);

    await runEntryPoint(inputs);

    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalledTimes(1);
    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalledWith('owner', 'container', 'my-image', true);
    expect(mockCore.setFailed).not.toHaveBeenCalled();
    // positive control: the run reaches the strategy and the report
    expect(mockCore.info).toHaveBeenCalledWith(NOTHING_TO_DELETE);
  });

  it('reports an unexpected error through setFailed with its message', async () => {
    wrapperInstance.isOrganization.mockRejectedValue(new Error('api is down'));

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).toHaveBeenCalledWith('api is down');
    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
  });

  it('reports a package that cannot be parsed with the original reason and deletes nothing', async () => {
    // a malformed version entry returned by the API makes parsing fail
    wrapperInstance.listPackages.mockResolvedValue([pkg('my-image', 'repo')]);
    wrapperInstance.listVersionsForPackage.mockResolvedValue([null]);

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/Failed to parse packages: .*null/);
    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
  });
});

describe('entry point: deletion result in the report', () => {
  const savedEnv = { ...process.env };
  const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
  const mavenPackage = { id: 9, name: 'lib', package_type: 'maven', repository: { name: 'repo', full_name: 'owner/repo' } };
  // the Maven strategy deletes the newest version first: ids 1, 2, 3 in this order
  const mavenVersions = [1, 2, 3].map(n => ({ id: n, name: `1.${n}-SNAPSHOT`, created_at: ago(30 + n * 10), updated_at: ago(30 + n * 10) }));
  const inputs = { 'package-type': 'maven', 'threshold-days': '7', 'threshold-versions': '0', 'batch-size': '1', debug: 'false' };
  const summaryText = () => mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.PACKAGE_TOKEN = 'token';
    wrapperInstance.isOrganization.mockResolvedValue(true);
    wrapperInstance.listPackages.mockResolvedValue([mavenPackage]);
    wrapperInstance.listVersionsForPackage.mockResolvedValue(mavenVersions);
    wrapperInstance.deletePackageVersion.mockReset();
    wrapperInstance.deletePackageVersion.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('reports the counters and no success when a critical error stops the deletion', async () => {
    wrapperInstance.deletePackageVersion.mockImplementation(async (_owner, _type, _name, id) => {
      if (id === 2) throw new Error('403 rate limit exceeded');
    });

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed).toHaveBeenCalledWith('403 rate limit exceeded');
    const text = summaryText();
    expect(text).toContain('**Selected Versions:** 3');
    expect(text).toContain('**Deleted Versions:** 1');
    expect(text).toContain('**Failed Versions:** 1');
    expect(text).toContain('**Not Processed Versions:** 1');
    expect(text).toContain('Cleanup stopped with an error: 403 rate limit exceeded');
    expect(text).not.toContain('completed successfully');
    // the table names the result of every version: 1 deleted, 2 failed, 3 never reached
    const table = mockCore.summary.addTable.mock.calls[0][0];
    expect(table.slice(1).map(row => [row[1], row[3]])).toEqual([
      ['<code>1.1-SNAPSHOT</code>', '✅ deleted'],
      ['<code>1.2-SNAPSHOT</code>', '❌ failed'],
      ['<code>1.3-SNAPSHOT</code>', '⏳ not processed']
    ]);
  });

  it('reports all versions as deleted after a clean run', async () => {
    await runEntryPoint(inputs);

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(summaryText()).toContain('**Deleted Versions:** 3');
    expect(summaryText()).toContain('Cleanup operation completed successfully.');
  });

  it('does not report any version as deleted in a dry run', async () => {
    await runEntryPoint({ ...inputs, 'dry-run': 'true' });

    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
    expect(summaryText()).toContain('**Selected Versions:** 3');
    expect(summaryText()).toContain('**Deleted Versions:** 0 (dry run)');
  });
});

describe('entry point: package listing failures', () => {
  const savedEnv = { ...process.env };
  const inputs = { 'package-type': 'container', 'threshold-days': '7', debug: 'false' };
  const summaryText = () => mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');
  const ownPackage = { id: 1, name: 'my-image', package_type: 'container', repository: { name: 'repo', full_name: 'owner/repo' } };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.PACKAGE_TOKEN = 'token';
    wrapperInstance.isOrganization.mockResolvedValue(true);
    wrapperInstance.listPackages.mockResolvedValue([]);
    wrapperInstance.listVersionsForPackage.mockResolvedValue([]);
    wrapperInstance.listingFailures = [];
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    delete wrapperInstance.listingFailures;
  });

  it('fails the action when the package listing fails, instead of finishing as an empty run', async () => {
    wrapperInstance.listPackages.mockRejectedValue(new Error('Failed to list container packages for organization owner (public: forbidden)'));

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).toHaveBeenCalledTimes(1);
    expect(mockCore.setFailed.mock.calls[0][0]).toMatch(/Failed to list container packages/);
    expect(wrapperInstance.listVersionsForPackage).not.toHaveBeenCalled();
    expect(wrapperInstance.deletePackageVersion).not.toHaveBeenCalled();
  });

  it('reports a partial listing failure in the summary when the run ends early', async () => {
    wrapperInstance.listingFailures = [{ visibility: 'private', reason: 'Resource not accessible' }];
    wrapperInstance.listPackages.mockResolvedValue([]);

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(summaryText()).toContain('Incomplete package listing');
    expect(summaryText()).toContain('<strong>private</strong>: Resource not accessible');
    expect(mockCore.summary.write).toHaveBeenCalled();
  });

  it('reports a partial listing failure after a normal run too', async () => {
    wrapperInstance.listingFailures = [{ visibility: 'internal', reason: 'Not Found' }];
    wrapperInstance.listPackages.mockResolvedValue([ownPackage]);

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalledTimes(1);
    expect(summaryText()).toContain('<strong>internal</strong>: Not Found');
  });

  it('writes no listing section when every visibility was listed', async () => {
    wrapperInstance.listPackages.mockResolvedValue([ownPackage]);

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(summaryText()).not.toContain('Incomplete package listing');
  });

  it('keeps working with a wrapper that does not report listing failures (user owner)', async () => {
    delete wrapperInstance.listingFailures;
    wrapperInstance.listPackages.mockResolvedValue([ownPackage]);

    await runEntryPoint(inputs);

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(summaryText()).not.toContain('Incomplete package listing');
  });
});

describe('entry point: tag and pattern inputs', () => {
  const savedEnv = { ...process.env };
  const day = 86400000;
  const ago = (days) => new Date(Date.now() - days * day).toISOString();
  const summaryText = () => mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');
  const deleted = () => wrapperInstance.deletePackageVersion.mock.calls.map(c => c[3]).sort((a, b) => a - b);

  const mavenPackage = { id: 1, name: 'my-lib', package_type: 'maven', repository: { name: 'repo', full_name: 'owner/repo' } };
  const mavenVersions = [
    { id: 1, name: '1.0.0', created_at: ago(60) },
    { id: 2, name: '1.1.0-SNAPSHOT', created_at: ago(40) },
    { id: 3, name: '1.2.0-SNAPSHOT', created_at: ago(20) },
    { id: 4, name: '1.3.0-SNAPSHOT', created_at: ago(10) },
    { id: 5, name: '2.0.0-beta1', created_at: ago(50) },
    { id: 6, name: '2.0.0-beta2', created_at: ago(45) },
  ];
  const mavenInputs = { 'package-type': 'maven', 'threshold-days': '14', 'threshold-versions': '1', debug: 'false' };

  const containerPackage = { id: 2, name: 'my-image', package_type: 'container', repository: { name: 'repo', full_name: 'owner/repo' } };
  const tagged = (id, tag, days) => ({ id, name: `sha256:${id}`, created_at: ago(days), metadata: { container: { tags: [tag] } } });
  const containerVersions = [tagged(1, 'dev-old', 30), tagged(2, 'test-old', 30), tagged(3, 'release-1', 30), tagged(4, 'v1.0.0', 30), tagged(5, 'dev-fresh', 1)];
  const containerInputs = { 'package-type': 'container', 'threshold-days': '7', debug: 'false' };

  const setup = (pkg, versions) => {
    wrapperInstance.listPackages.mockResolvedValue([pkg]);
    wrapperInstance.listVersionsForPackage.mockResolvedValue(versions);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.PACKAGE_TOKEN = 'token';
    wrapperInstance.isOrganization.mockResolvedValue(true);
    wrapperInstance.deletePackageVersion.mockResolvedValue(undefined);
    wrapperInstance.getManifestDigests = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    delete wrapperInstance.getManifestDigests;
  });

  describe('maven', () => {
    it('deletes only old SNAPSHOT versions without any filter inputs (default)', async () => {
      setup(mavenPackage, mavenVersions);

      await runEntryPoint(mavenInputs);

      expect(deleted()).toEqual([2]);
      expect(wrapperInstance.deletePackageVersion).toHaveBeenCalledWith('owner', 'maven', 'my-lib', 2, true);
    });

    it('works with the migrated workflow configuration (SNAPSHOT inclusion, latest and release exclusions)', async () => {
      setup(mavenPackage, mavenVersions);

      await runEntryPoint({ ...mavenInputs, 'included-patterns': '*SNAPSHOT', 'excluded-patterns': 'latest,release*' });

      expect(deleted()).toEqual([2]);
      expect(summaryText()).not.toContain('protected by excluded patterns');
    });

    it('deletes nothing and explains why when *.* protects every SNAPSHOT version', async () => {
      setup(mavenPackage, mavenVersions);

      await runEntryPoint({ ...mavenInputs, 'included-patterns': '*SNAPSHOT', 'excluded-patterns': 'latest,release*,*.*' });

      expect(deleted()).toEqual([]);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(summaryText()).toContain('Versions protected by excluded patterns');
      expect(summaryText()).toContain('<code>*.*</code>');
      expect(mockCore.summary.write).toHaveBeenCalled();
    });

    it('trims whitespace and skips empty items in the lists', async () => {
      setup(mavenPackage, mavenVersions);

      await runEntryPoint({ ...mavenInputs, 'included-patterns': ' *SNAPSHOT , ', 'excluded-patterns': ' latest , release* ,, ' });

      expect(deleted()).toEqual([2]);
    });

    it('uses only explicit inclusions and does not add *SNAPSHOT*', async () => {
      setup(mavenPackage, mavenVersions);

      await runEntryPoint({ ...mavenInputs, 'threshold-versions': '0', 'included-patterns': '*beta*' });

      expect(deleted()).toEqual([5, 6]);
    });

    it('merges excluded-tags and excluded-patterns; exclusions win over inclusions', async () => {
      setup(mavenPackage, mavenVersions);

      await runEntryPoint({ ...mavenInputs, 'threshold-versions': '0', 'excluded-tags': '1.1.0*', 'excluded-patterns': '1.2.0*' });

      expect(deleted()).toEqual([]);
    });
  });

  describe('container', () => {
    it('deletes all old tagged versions without filter inputs (default)', async () => {
      setup(containerPackage, containerVersions);

      await runEntryPoint(containerInputs);

      expect(deleted()).toEqual([1, 2, 3, 4]);
    });

    it('protects versions matched by excluded-patterns', async () => {
      setup(containerPackage, containerVersions);

      await runEntryPoint({ ...containerInputs, 'excluded-patterns': 'release-*,semver' });

      expect(deleted()).toEqual([1, 2]);
    });

    it('merges included-tags and included-patterns', async () => {
      setup(containerPackage, containerVersions);

      await runEntryPoint({ ...containerInputs, 'included-tags': 'dev-*', 'included-patterns': 'test-*' });

      expect(deleted()).toEqual([1, 2]);
    });

    it('applies the same result for tags and for patterns', async () => {
      setup(containerPackage, containerVersions);
      await runEntryPoint({ ...containerInputs, 'included-tags': 'dev-*', 'excluded-tags': 'release-*' });
      const byTags = deleted();

      jest.clearAllMocks();
      wrapperInstance.deletePackageVersion.mockResolvedValue(undefined);
      wrapperInstance.getManifestDigests = jest.fn().mockResolvedValue([]);
      wrapperInstance.isOrganization.mockResolvedValue(true);
      setup(containerPackage, containerVersions);
      await runEntryPoint({ ...containerInputs, 'included-patterns': 'dev-*', 'excluded-patterns': 'release-*' });

      expect(deleted()).toEqual(byTags);
      expect(byTags).toEqual([1]);
    });
  });
});
