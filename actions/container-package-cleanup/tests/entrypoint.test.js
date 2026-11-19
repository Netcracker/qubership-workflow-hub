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
  });

  it('still processes packages of the current repository', async () => {
    wrapperInstance.listPackages.mockResolvedValue([pkg('other-image', 'other-repo'), pkg('my-image', 'repo')]);

    await runEntryPoint(inputs);

    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalledTimes(1);
    expect(wrapperInstance.listVersionsForPackage).toHaveBeenCalledWith('owner', 'container', 'my-image', true);
    expect(mockCore.setFailed).not.toHaveBeenCalled();
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
