// tests/wrapper.test.js
import { jest } from '@jest/globals';

// Mock @actions/github
const mockGetOctokit = jest.fn();
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: mockGetOctokit
}));

// Mock child_process
const mockSpawn = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  exec: jest.fn(),
  spawn: mockSpawn
}));

// Mock util promisify target
const mockExecPromise = jest.fn();
jest.unstable_mockModule('node:util', () => ({
  promisify: () => mockExecPromise
}));

// Mock logger
jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: { setDebug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

const { default: OctokitWrapper } = await import('../src/utils/wrapper.js');

describe('OctokitWrapper', () => {
  const fakeToken = 'fake-token';
  let wrapper;
  let mockOctokit;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        users: { getByUsername: jest.fn() },
        packages: {
          listPackagesForOrganization: jest.fn(),
          listPackagesForUser: jest.fn(),
          getAllPackageVersionsForPackageOwnedByUser: jest.fn(),
          getAllPackageVersionsForPackageOwnedByOrg: jest.fn(),
          deletePackageVersionForOrg: jest.fn(),
          deletePackageVersionForUser: jest.fn(),
        }
      },
      paginate: jest.fn((fn, opts) => fn(opts)),
    };
    mockGetOctokit.mockReturnValue(mockOctokit);
    wrapper = new OctokitWrapper(fakeToken);
    wrapper.dockerLoggedIn = true; // skip docker login in unit tests
  });

  describe('isOrganization', () => {
    it('returns true for Organization', async () => {
      mockOctokit.rest.users.getByUsername.mockResolvedValue({ data: { type: 'Organization' } });
      const result = await wrapper.isOrganization('my-org');
      expect(result).toBe(true);
      expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledWith({ username: 'my-org' });
    });

    it('returns false for User', async () => {
      mockOctokit.rest.users.getByUsername.mockResolvedValue({ data: { type: 'User' } });
      const result = await wrapper.isOrganization('my-user');
      expect(result).toBe(false);
    });
  });

  describe('listPackages', () => {
    it('calls listPackagesForOrganization when type=true', async () => {
      wrapper.listPackagesForOrganization = jest.fn().mockResolvedValue(['pkg1']);
      const result = await wrapper.listPackages('org', 'container', true);
      expect(wrapper.listPackagesForOrganization).toHaveBeenCalledWith('org', 'container');
      expect(result).toEqual(['pkg1']);
    });

    it('calls listPackagesForUser when type=false', async () => {
      wrapper.listPackagesForUser = jest.fn().mockResolvedValue(['pkg2']);
      const result = await wrapper.listPackages('user', 'container', false);
      expect(wrapper.listPackagesForUser).toHaveBeenCalledWith('user', 'container');
      expect(result).toEqual(['pkg2']);
    });
  });

  describe('listVersionsForPackage', () => {
    it('calls getPackageVersionsForOrganization when type=true', async () => {
      wrapper.getPackageVersionsForOrganization = jest.fn().mockResolvedValue(['ver1']);
      const result = await wrapper.listVersionsForPackage('org', 'container', 'pkg', true);
      expect(wrapper.getPackageVersionsForOrganization).toHaveBeenCalledWith('org', 'container', 'pkg');
      expect(result).toEqual(['ver1']);
    });

    it('calls getPackageVersionsForUser when type=false', async () => {
      wrapper.getPackageVersionsForUser = jest.fn().mockResolvedValue(['ver2']);
      const result = await wrapper.listVersionsForPackage('user', 'container', 'pkg', false);
      expect(wrapper.getPackageVersionsForUser).toHaveBeenCalledWith('user', 'container', 'pkg');
      expect(result).toEqual(['ver2']);
    });
  });

  describe('deletePackageVersion', () => {
    it('deletes for organization when type=true', async () => {
      await wrapper.deletePackageVersion('org', 'container', 'pkg', '123', true);
      expect(mockOctokit.rest.packages.deletePackageVersionForOrg).toHaveBeenCalledWith({
        org: 'org',
        package_type: 'container',
        package_name: 'pkg',
        package_version_id: '123'
      });
    });

    it('deletes for user when type=false', async () => {
      await wrapper.deletePackageVersion('user', 'container', 'pkg', '456', false);
      expect(mockOctokit.rest.packages.deletePackageVersionForUser).toHaveBeenCalledWith({
        username: 'user',
        package_type: 'container',
        package_name: 'pkg',
        package_version_id: '456'
      });
    });
  });

  describe('getManifestDigests', () => {
    it('returns digests from docker manifest inspect', async () => {
      const fakeStdout = JSON.stringify({ manifests: [{ digest: 'sha1' }, { digest: 'sha2' }] });
      mockExecPromise.mockResolvedValue({ stdout: fakeStdout });

      const digests = await wrapper.getManifestDigests('owner', 'pkg', 'tag');
      expect(digests).toEqual(['sha1', 'sha2']);
    });
  });
});
