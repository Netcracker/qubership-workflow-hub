import { jest, describe, it, expect, beforeEach } from '@jest/globals';

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

// Runs the real strategy and the real delete executor, only the registry/API is stubbed.
describe('cleanup flow: strategy -> delete executor', () => {
  const pkgInfo = {
    id: 1, name: 'test-image', package_type: 'container',
    repository: { full_name: 'owner/repo' },
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
  };
  const ver = (id, name, tags, created = '2025-01-01T00:00:00Z') => ({
    id, name, metadata: { container: { tags } }, created_at: created, updated_at: created
  });

  let wrapper;

  const select = (versions, manifests, extra = {}) => {
    wrapper.getManifestDigests.mockImplementation((_o, _i, tag) => {
      const value = manifests[tag];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value ?? []);
    });
    return new ContainerStrategy().execute({
      packagesWithVersions: [{ package: pkgInfo, versions }],
      excludedPatterns: [], includedPatterns: [],
      thresholdDate: new Date('2025-01-10T00:00:00Z'),
      wrapper, owner: 'test-owner', debug: false, ...extra
    });
  };

  const deletedIds = () => wrapper.deletePackageVersion.mock.calls.map(c => c[3]);

  beforeEach(() => {
    wrapper = {
      getManifestDigests: jest.fn(),
      deletePackageVersion: jest.fn().mockResolvedValue(undefined)
    };
  });

  const versions = [
    ver(101, 'sha256:old-index', ['old']),
    ver(102, 'sha256:shared', []),
    ver(103, 'sha256:only-old', []),
    ver(104, 'sha256:fresh-index', ['fresh'], '2025-01-20T00:00:00Z')
  ];
  const manifests = {
    old: ['sha256:shared', 'sha256:only-old'],
    fresh: ['sha256:shared']
  };

  it('never passes protected version ids to the delete call', async () => {
    const toDelete = await select(versions, manifests);
    await deletePackageVersion(toDelete, { wrapper, owner: 'test-owner', isOrganization: true });

    expect(deletedIds().sort()).toEqual([101, 103]);
    expect(deletedIds()).not.toContain(102); // layer shared with the fresh image
    expect(deletedIds()).not.toContain(104); // the fresh image itself
  });

  it('makes no delete calls at all in dry-run mode', async () => {
    const toDelete = await select(versions, manifests);
    const status = await deletePackageVersion(toDelete, { wrapper, owner: 'test-owner', isOrganization: true, dryRun: true });

    expect(wrapper.deletePackageVersion).not.toHaveBeenCalled();
    expect(status).toEqual([]);
  });

  it('deletes only the tagged candidate when a retained manifest cannot be inspected', async () => {
    const incompleteCleanup = [];
    const toDelete = await select(versions, { ...manifests, fresh: new Error('boom') }, { incompleteCleanup });
    await deletePackageVersion(toDelete, { wrapper, owner: 'test-owner', isOrganization: true });

    expect(deletedIds()).toEqual([101]);
    expect(incompleteCleanup).toHaveLength(1);
  });

  it('has nothing for the executor when the protective block leaves no candidates', async () => {
    const incompleteCleanup = [];
    const toDelete = await select(
      [ver(201, 'sha256:fresh-index', ['fresh'], '2025-01-20T00:00:00Z'), ver(202, 'sha256:maybe-needed', [])],
      { fresh: new Error('denied') },
      { incompleteCleanup }
    );

    expect(toDelete).toEqual([]);
    expect(incompleteCleanup).toHaveLength(1);
    expect(wrapper.deletePackageVersion).not.toHaveBeenCalled();
  });
});
