import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import process from 'node:process';
import { setImmediate } from 'node:timers';

// Order of the log group commands, as seen by the runner.
// The fake mirrors the contract of @qubership/action-logger: startDebugGroup opens a group
// only when debug mode is on, startGroup/endGroup always do.
const events = [];
let debugMode = false;
let debugJsonError = null;

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: new Proxy({}, {
    get: (_target, name) => {
      if (name === 'setDebug') return (value) => { debugMode = Boolean(value); };
      if (name === 'startGroup') return () => { events.push('startGroup'); };
      if (name === 'startDebugGroup') return () => { if (debugMode) events.push('startGroup'); };
      if (name === 'endGroup') return () => { events.push('endGroup'); };
      if (name === 'debugJSON') return () => { if (debugJsonError) throw debugJsonError; };
      return jest.fn();
    }
  })
}));

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

const wrapperInstance = {
  isOrganization: jest.fn(),
  listPackages: jest.fn(),
  listVersionsForPackage: jest.fn(),
  deletePackageVersion: jest.fn()
};
jest.unstable_mockModule('../src/utils/wrapper.js', () => ({ default: jest.fn(() => wrapperInstance) }));

const { deletePackageVersion } = await import('../src/utils/deleteAction.js');

const OPEN_AND_CLOSE = ['startGroup', 'endGroup'];

describe('deletePackageVersion: log groups', () => {
  const toDelete = [{
    package: { id: 1, name: 'img', type: 'container' },
    versions: [
      { id: 1, name: 'sha256:a', metadata: { container: { tags: ['a'] } } },
      { id: 2, name: 'sha256:b', metadata: { container: { tags: ['b'] } } }
    ]
  }];
  let wrapper;

  beforeEach(() => {
    events.length = 0;
    debugMode = false;
    wrapper = { deletePackageVersion: jest.fn().mockResolvedValue(undefined) };
  });

  it('opens the deletion group once and closes it after a successful run', async () => {
    await deletePackageVersion(toDelete, { wrapper, owner: 'owner' });

    expect(events).toEqual(OPEN_AND_CLOSE);
  });

  it('opens and closes the group in dry-run mode too', async () => {
    await deletePackageVersion(toDelete, { wrapper, owner: 'owner', dryRun: true });

    expect(events).toEqual(OPEN_AND_CLOSE);
  });

  it('closes the group and rethrows when the error limit stops the deletion', async () => {
    wrapper.deletePackageVersion.mockRejectedValue(new Error('boom'));

    await expect(deletePackageVersion(toDelete, { wrapper, owner: 'owner', batchSize: 1, maxErrors: 1 }))
      .rejects.toThrow('Stopped after 1 errors');
    expect(events).toEqual(OPEN_AND_CLOSE);
  });

  it('closes the group and rethrows a critical error', async () => {
    wrapper.deletePackageVersion.mockRejectedValue(new Error('403 forbidden'));

    await expect(deletePackageVersion(toDelete, { wrapper, owner: 'owner' }))
      .rejects.toThrow('403 forbidden');
    expect(events).toEqual(OPEN_AND_CLOSE);
  });

  it.each([
    ['an empty list', [], { owner: 'owner' }],
    ['no list', undefined, { owner: 'owner' }],
    ['a list that is not an array', 'versions', { owner: 'owner' }],
  ])('does not touch the log groups for %s', async (_label, filtered, ctx) => {
    await expect(deletePackageVersion(filtered, { wrapper, ...ctx })).resolves.toBeUndefined();
    expect(events).toEqual([]);
    expect(wrapper.deletePackageVersion).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing wrapper', { wrapper: undefined, owner: 'owner' }, /wrapper/],
    ['a missing owner', { owner: '' }, /owner/],
    ['a non-positive batchSize', { owner: 'owner', batchSize: 0 }, /batchSize/],
  ])('rejects %s before any log group is opened', async (_label, ctx, message) => {
    await expect(deletePackageVersion(toDelete, { wrapper, ...ctx })).rejects.toThrow(message);
    expect(events).toEqual([]);
  });
});

describe('entry point: log groups', () => {
  const savedEnv = { ...process.env };

  const flush = async () => {
    for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
  };
  const runEntryPoint = async (newInputs) => {
    inputs = { 'package-type': 'container', 'threshold-days': '7', ...newInputs };
    await jest.isolateModulesAsync(async () => {
      await import('../src/index.js');
    });
    await flush();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    events.length = 0;
    debugMode = false;
    debugJsonError = null;
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.PACKAGE_TOKEN = 'token';
    wrapperInstance.isOrganization.mockResolvedValue(true);
    wrapperInstance.listVersionsForPackage.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  const repoPackage = {
    id: 1, name: 'img', package_type: 'container',
    repository: { name: 'repo', full_name: 'owner/repo' },
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
  };

  it('opens and closes no group without debug when no package matches the repository', async () => {
    wrapperInstance.listPackages.mockResolvedValue([]);
    await runEntryPoint({ debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('opens and closes the debug group when no package matches the repository', async () => {
    wrapperInstance.listPackages.mockResolvedValue([]);
    await runEntryPoint({ debug: 'true' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(events).toEqual(OPEN_AND_CLOSE);
  });

  it('opens and closes no group without debug on a full run', async () => {
    wrapperInstance.listPackages.mockResolvedValue([repoPackage]);
    await runEntryPoint({ debug: 'false' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('opens and closes each debug group as a pair on a full run', async () => {
    wrapperInstance.listPackages.mockResolvedValue([repoPackage]);
    await runEntryPoint({ debug: 'true' });

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalled();
    expect(events).toEqual([...OPEN_AND_CLOSE, ...OPEN_AND_CLOSE]);
  });

  it('closes the first debug group when writing its content throws', async () => {
    wrapperInstance.listPackages.mockResolvedValue([repoPackage]);
    debugJsonError = new Error('cannot serialize');
    await runEntryPoint({ debug: 'true' });

    expect(mockCore.setFailed).toHaveBeenCalledWith('cannot serialize');
    expect(events).toEqual(OPEN_AND_CLOSE);
  });
});
