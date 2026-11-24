import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: new Proxy({}, { get: () => jest.fn() })
}));

const { default: ContainerStrategy } = await import('../src/strategy/container.js');

// Pins the exact selection AND order of versions produced by the container strategy.
// The order decides the composition of the deletion batches, so it must not change.
describe('container strategy: selection order', () => {
  const OLD = '2025-01-01T00:00:00Z';
  const FRESH = '2025-01-20T00:00:00Z';

  const pkgInfo = {
    id: 1, name: 'test-image', package_type: 'container',
    repository: { full_name: 'owner/repo' },
    created_at: OLD, updated_at: OLD
  };
  const ver = (id, name, tags = [], created = OLD) => ({
    id, name, metadata: { container: { tags } }, created_at: created, updated_at: created
  });

  let wrapper;
  let incompleteCleanup;

  // manifests: tag -> array of digests, or an Error to simulate an unreadable manifest
  const selectIds = async (versions, manifests = {}) => {
    wrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
      const value = manifests[tag];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value ?? []);
    });
    const result = await new ContainerStrategy().execute({
      packagesWithVersions: [{ package: pkgInfo, versions }],
      excludedPatterns: [], includedPatterns: [],
      thresholdDate: new Date('2025-01-10T00:00:00Z'),
      wrapper, owner: 'test-owner', debug: false, incompleteCleanup
    });
    return result.flatMap(entry => entry.versions.map(v => v.id));
  };

  beforeEach(() => {
    wrapper = { getManifestDigests: jest.fn() };
    incompleteCleanup = [];
  });

  it('puts each tagged version before its layers, then the dangling versions', async () => {
    const ids = await selectIds([
      ver(11, 'sha256:l1'),
      ver(12, 'sha256:l2'),
      ver(13, 'sha256:l3'),
      ver(20, 'sha256:dangling'),
      ver(1, 'sha256:a', ['a']),
      ver(2, 'sha256:b', ['b'])
    ], {
      a: ['sha256:l1', 'sha256:l2'],
      b: ['sha256:l3']
    });

    expect(ids).toEqual([1, 11, 12, 2, 13, 20]);
  });

  it('places a layer shared by two tagged versions once, after the first version that references it', async () => {
    const ids = await selectIds([
      ver(1, 'sha256:a', ['a']),
      ver(2, 'sha256:b', ['b']),
      ver(11, 'sha256:shared'),
      ver(12, 'sha256:only-a'),
      ver(13, 'sha256:only-b')
    ], {
      a: ['sha256:shared', 'sha256:only-a'],
      b: ['sha256:shared', 'sha256:only-b']
    });

    expect(ids).toEqual([1, 11, 12, 2, 13]);
  });

  it('keeps the order of the version list when the manifest lists the digests in another order', async () => {
    const ids = await selectIds([
      ver(1, 'sha256:a', ['a']),
      ver(11, 'sha256:first'),
      ver(12, 'sha256:second')
    ], {
      a: ['sha256:second', 'sha256:first']
    });

    expect(ids).toEqual([1, 11, 12]);
  });

  it('keeps only the first of two layers that have the same name', async () => {
    const ids = await selectIds([
      ver(1, 'sha256:a', ['a']),
      ver(11, 'sha256:twin'),
      ver(12, 'sha256:twin')
    ], {
      a: ['sha256:twin']
    });

    expect(ids).toEqual([1, 11]);
  });

  it('does not select an untagged version that has the same name as a tagged candidate', async () => {
    const ids = await selectIds([
      ver(1, 'sha256:same', ['a']),
      ver(21, 'sha256:same')
    ], {
      a: []
    });

    expect(ids).toEqual([1]);
  });

  it('selects only dangling versions when there are no tagged candidates (empty digest map)', async () => {
    const ids = await selectIds([
      ver(20, 'sha256:dangling-1'),
      ver(21, 'sha256:dangling-2'),
      ver(30, 'sha256:fresh', ['fresh'], FRESH),
      ver(22, 'sha256:fresh-dangling', [], FRESH)
    ], {
      fresh: []
    });

    expect(ids).toEqual([20, 21]);
  });

  it('selects tagged candidates before dangling versions when their manifests yield no digests', async () => {
    const ids = await selectIds([
      ver(20, 'sha256:dangling'),
      ver(1, 'sha256:a', ['a']),
      ver(2, 'sha256:b', ['b'])
    ], {
      a: [],
      b: []
    });

    expect(ids).toEqual([1, 2, 20]);
  });

  it('does not select layers of retained images', async () => {
    const ids = await selectIds([
      ver(1, 'sha256:a', ['a']),
      ver(11, 'sha256:shared'),
      ver(12, 'sha256:only-a'),
      ver(30, 'sha256:fresh', ['fresh'], FRESH)
    ], {
      a: ['sha256:shared', 'sha256:only-a'],
      fresh: ['sha256:shared']
    });

    expect(ids).toEqual([1, 12]);
  });

  it('selects no untagged version when the manifest of a retained image cannot be read', async () => {
    const ids = await selectIds([
      ver(1, 'sha256:a', ['a']),
      ver(11, 'sha256:l1'),
      ver(20, 'sha256:dangling'),
      ver(30, 'sha256:fresh', ['fresh'], FRESH)
    ], {
      a: ['sha256:l1'],
      fresh: new Error('denied')
    });

    expect(ids).toEqual([1]);
    expect(incompleteCleanup).toHaveLength(1);
    expect(incompleteCleanup[0].package).toBe('test-image');
  });
});
