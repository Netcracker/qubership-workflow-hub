import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { setImmediate } from 'node:timers';

jest.unstable_mockModule('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
}));

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: {
    info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
    dim: jest.fn(), lightSuccess: jest.fn(), dryrun: jest.fn(),
    startGroup: jest.fn(), endGroup: jest.fn(),
    setDebug: jest.fn(), setDryRun: jest.fn(),
  }
}));

const { default: ContainerStrategy } = await import('../src/strategy/container.js');
const { deletePackageVersion } = await import('../src/utils/deleteAction.js');
const { createDeletionProgress, notProcessed } = await import('../src/utils/deletionProgress.js');
const { default: log } = await import('@qubership/action-logger');

// The real strategy and the real executor; only the registry and the delete API are stubbed.
// A layer (an untagged version) must never be deleted before every image it may belong to was deleted.
describe('layers wait for their images', () => {
  const pkgInfo = {
    id: 1, name: 'test-image', package_type: 'container',
    repository: { full_name: 'owner/repo' },
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
  };
  const OLD = '2025-01-01T00:00:00Z';
  const ver = (id, name, tags) => ({ id, name, metadata: { container: { tags } }, created_at: OLD, updated_at: OLD });

  let wrapper;

  // manifests: tag -> digests (or an Error when the manifest cannot be read)
  const select = (versions, manifests) => {
    wrapper.getManifestDigests.mockImplementation((_o, _i, tag) => {
      const value = manifests[tag];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value ?? []);
    });
    return new ContainerStrategy().execute({
      packagesWithVersions: [{ package: pkgInfo, versions }],
      excludedPatterns: [], includedPatterns: [],
      thresholdDate: new Date('2025-01-10T00:00:00Z'),
      wrapper, owner: 'test-owner', debug: false
    });
  };

  // failures: version id -> error message of its delete call
  const failDeletes = (failures) => {
    wrapper.deletePackageVersion.mockImplementation(async (_owner, _type, _name, id) => {
      if (id in failures) throw new Error(failures[id]);
    });
  };

  const execute = async (toDelete, extra = {}) => {
    const total = toDelete.reduce((sum, entry) => sum + entry.versions.length, 0);
    const progress = createDeletionProgress(total);
    let error = null;
    try {
      await deletePackageVersion(toDelete, { wrapper, owner: 'test-owner', isOrganization: true, progress, ...extra });
    } catch (e) {
      error = e;
    }
    return { progress, error };
  };

  const requested = () => wrapper.deletePackageVersion.mock.calls.map(c => c[3]);
  const outcomesOf = (progress) => Object.fromEntries(progress.outcomes);
  const tick = () => new Promise(resolve => setImmediate(resolve));

  beforeEach(() => {
    wrapper = {
      getManifestDigests: jest.fn(),
      deletePackageVersion: jest.fn().mockResolvedValue(undefined)
    };
    log.warn.mockClear();
  });

  // image 101 owns layer 102 alone and layer 103 together with image 104
  const versions = [
    ver(101, 'sha256:image-i', ['i']),
    ver(102, 'sha256:layer-only-i', []),
    ver(103, 'sha256:layer-shared', []),
    ver(104, 'sha256:image-j', ['j'])
  ];
  const manifests = {
    i: ['sha256:layer-only-i', 'sha256:layer-shared'],
    j: ['sha256:layer-shared']
  };

  describe('selection of the strategy', () => {
    it('lists the ids of every candidate image that references a layer in dependsOn, and keeps the list and its order', async () => {
      const [entry] = await select(versions, manifests);

      expect(entry.versions.map(v => v.id)).toEqual([101, 102, 103, 104]);
      expect(entry.versions.map(v => v.dependsOn)).toEqual([undefined, [101], [101, 104], undefined]);
      expect(entry.unresolvedCandidates).toBeUndefined();
    });

    it('gives a dangling untagged version no dependsOn', async () => {
      const [entry] = await select([...versions, ver(105, 'sha256:dangling', [])], manifests);

      const dangling = entry.versions.find(v => v.id === 105);
      expect(dangling).toBeDefined();
      expect(dangling.dependsOn).toBeUndefined();
    });

    it('marks an image as unresolved when the read of any one of its tags failed, and keeps the selection', async () => {
      const [entry] = await select(
        [ver(104, 'sha256:image-j', ['j', 'j-alias']), ver(105, 'sha256:dangling', [])],
        { j: [], 'j-alias': new Error('registry down') }
      );

      expect(entry.unresolvedCandidates).toEqual([104]);
      expect(entry.versions.map(v => v.id)).toEqual([104, 105]);
    });

    it('does not mark an image as unresolved when every tag was read', async () => {
      const [entry] = await select([ver(104, 'sha256:image-j', ['j', 'j-alias']), ver(105, 'sha256:dangling', [])], {});

      expect(entry.unresolvedCandidates).toBeUndefined();
    });
  });

  describe('execution', () => {
    it('deletes all images first and their layers afterwards', async () => {
      const toDelete = await select(versions, manifests);
      const { progress } = await execute(toDelete);

      expect(requested()).toEqual([101, 104, 102, 103]);
      expect(outcomesOf(progress)).toEqual({ 101: 'deleted', 102: 'deleted', 103: 'deleted', 104: 'deleted' });
    });

    it('does not request the layers of an image whose deletion failed', async () => {
      failDeletes({ 101: 'boom' });
      const toDelete = await select(versions, manifests);
      const { progress } = await execute(toDelete);

      // 101 failed: its own layer 102 and the shared layer 103 stay; image 104 is deleted
      expect(requested()).toEqual([101, 104]);
      expect(outcomesOf(progress)).toEqual({ 101: 'failed', 102: 'blocked', 103: 'blocked', 104: 'deleted' });
      expect(progress).toMatchObject({ deleted: 1, failed: 1, skipped: 2 });
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('v:102'));
    });

    it('keeps a shared layer when only one of its two images was deleted', async () => {
      failDeletes({ 104: 'boom' });
      const toDelete = await select(versions, manifests);
      const { progress } = await execute(toDelete);

      expect(requested()).toEqual([101, 104, 102]);
      expect(outcomesOf(progress)).toEqual({ 101: 'deleted', 102: 'deleted', 103: 'blocked', 104: 'failed' });
    });

    it.each([
      ['a 404', '404 not found'],
      ['the download limit', 'package version has more than 5000 downloads'],
    ])('keeps the layers of an image that answered with %s: it is not proven to be gone', async (_label, message) => {
      failDeletes({ 101: message });
      const toDelete = await select(versions, manifests);
      const { progress } = await execute(toDelete);

      expect(requested()).toEqual([101, 104]);
      expect(outcomesOf(progress)).toEqual({ 101: 'skipped', 102: 'blocked', 103: 'blocked', 104: 'deleted' });
    });

    it('works with batch-size 1', async () => {
      failDeletes({ 101: 'boom' });
      const toDelete = await select(versions, manifests);
      const { progress } = await execute(toDelete, { batchSize: 1 });

      expect(requested()).toEqual([101, 104]);
      expect(outcomesOf(progress)[102]).toBe('blocked');
    });

    it('does not start the layer phase after a critical error in the image phase', async () => {
      failDeletes({ 101: '403 rate limit exceeded' });
      const toDelete = await select(versions, manifests);
      const { progress, error } = await execute(toDelete);

      expect(error.message).toMatch(/403/);
      expect(requested()).toEqual([101, 104]);
      expect(notProcessed(progress)).toBe(2);
      expect(outcomesOf(progress)[102]).toBeUndefined();
    });

    it('simulates every version in a dry run and blocks nothing', async () => {
      const toDelete = await select(versions, manifests);
      const { progress } = await execute(toDelete, { dryRun: true });

      expect(wrapper.deletePackageVersion).not.toHaveBeenCalled();
      expect(progress).toMatchObject({ simulated: 4, skipped: 0, failed: 0 });
    });
  });

  describe('images with an unreadable manifest', () => {
    // B (id 201) is read and owns layer 203; A (id 202) has two tags and the read of one of them fails
    const pairVersions = [
      ver(201, 'sha256:image-b', ['b']),
      ver(202, 'sha256:image-a', ['a1', 'a2']),
      ver(203, 'sha256:layer-l', []),
      ver(204, 'sha256:dangling', [])
    ];
    const pairManifests = { b: ['sha256:layer-l'], a1: new Error('registry down'), a2: [] };

    it('keeps the layer of a read image when the unreadable image was not deleted', async () => {
      failDeletes({ 202: 'boom' });
      const toDelete = await select(pairVersions, pairManifests);
      const { progress } = await execute(toDelete);

      // B was deleted, A was not: layer L may still belong to A, and so may the "dangling" version
      expect(requested()).toEqual([201, 202]);
      expect(outcomesOf(progress)).toEqual({ 201: 'deleted', 202: 'failed', 203: 'blocked', 204: 'blocked' });
      expect(progress).toMatchObject({ deleted: 1, failed: 1, skipped: 2 });
    });

    it('deletes the layers once the unreadable image was deleted too', async () => {
      const toDelete = await select(pairVersions, pairManifests);
      const { progress } = await execute(toDelete);

      expect(requested()).toEqual([201, 202, 203, 204]);
      expect(outcomesOf(progress)).toEqual({ 201: 'deleted', 202: 'deleted', 203: 'deleted', 204: 'deleted' });
    });

    it('does not change the selection of versions', async () => {
      const [entry] = await select(pairVersions, pairManifests);

      expect(entry.versions.map(v => v.id).sort()).toEqual([201, 202, 203, 204]);
      expect(entry.unresolvedCandidates).toEqual([202]);
    });
  });

  describe('order of the phases', () => {
    it('starts the delete of a dangling version only after the image phase has finished', async () => {
      const toDelete = await select([ver(401, 'sha256:image', ['x']), ver(402, 'sha256:dangling', [])], {});
      const releases = [];
      wrapper.deletePackageVersion.mockImplementation(() => new Promise(resolve => { releases.push(resolve); }));

      const done = deletePackageVersion(toDelete, { wrapper, owner: 'test-owner', isOrganization: true });
      await tick();
      expect(requested()).toEqual([401]);

      releases[0]();
      await tick();
      expect(requested()).toEqual([401, 402]);

      releases[1]();
      await done;
    });
  });

  describe('a later run after a failure', () => {
    it('deletes the remaining layers once their image can be deleted', async () => {
      failDeletes({ 101: 'boom' });
      const first = await execute(await select(versions, manifests));
      expect(outcomesOf(first.progress)[102]).toBe('blocked');

      // the same state, the registry works now
      wrapper.deletePackageVersion.mockClear();
      failDeletes({});
      const second = await execute(await select(versions, manifests));

      expect(requested()).toEqual([101, 104, 102, 103]);
      expect(second.progress.deleted).toBe(4);
    });

    it('treats the layers as dangling and deletes them when the image is already gone', async () => {
      // image 101 was deleted by the previous run, its layers are left
      const remaining = versions.filter(v => v.id !== 101 && v.id !== 104);
      const { progress } = await execute(await select(remaining, {}));

      expect(requested()).toEqual([102, 103]);
      expect(progress.deleted).toBe(2);
    });
  });
});
