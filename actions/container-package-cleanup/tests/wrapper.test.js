// tests/wrapper.test.js
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock @actions/github
const mockGetOctokit = jest.fn();
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: mockGetOctokit
}));

// Mock child_process
const mockSpawn = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execFile: jest.fn(),
  spawn: mockSpawn
}));

// Mock util promisify target
const mockExecPromise = jest.fn();
jest.unstable_mockModule('node:util', () => ({
  promisify: () => mockExecPromise
}));

// Mock logger
jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: { setDebug: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

const { default: OctokitWrapper } = await import('../src/utils/wrapper.js');
const { default: log } = await import('@qubership/action-logger');

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

  describe('listPackagesForOrganization', () => {
    const pkg = (id) => ({ id, name: `pkg-${id}` });
    const respond = (byVisibility) => {
      mockOctokit.paginate.mockImplementation(async (_fn, opts) => {
        const value = byVisibility[opts.visibility];
        if (value instanceof Error) throw value;
        return value;
      });
    };

    it('requests every visibility and returns all packages without failures', async () => {
      respond({ public: [pkg(1)], internal: [pkg(2)], private: [pkg(3), pkg(4)] });

      const result = await wrapper.listPackagesForOrganization('org', 'container');

      expect(result.map(p => p.id)).toEqual([1, 2, 3, 4]);
      expect(wrapper.listingFailures).toEqual([]);
      expect(mockOctokit.paginate.mock.calls.map(c => c[1].visibility)).toEqual(['public', 'internal', 'private']);
      expect(mockOctokit.paginate.mock.calls.every(c => c[1].org === 'org' && c[1].package_type === 'container' && c[1].per_page === 100)).toBe(true);
    });

    it('keeps the packages that were found and records a partial failure', async () => {
      respond({ public: [pkg(1)], internal: [], private: new Error('Resource not accessible') });

      const result = await wrapper.listPackagesForOrganization('org', 'container');

      expect(result.map(p => p.id)).toEqual([1]);
      expect(wrapper.listingFailures).toEqual([{ visibility: 'private', reason: 'Resource not accessible' }]);
    });

    it('treats an organization without packages as an empty result, not as a failure', async () => {
      respond({ public: [], internal: [], private: [] });

      await expect(wrapper.listPackagesForOrganization('org', 'container')).resolves.toEqual([]);
      expect(wrapper.listingFailures).toEqual([]);
    });

    it('fails when no visibility could be listed and explains every reason', async () => {
      respond({ public: new Error('rate limit'), internal: new Error('forbidden'), private: new Error('forbidden') });

      await expect(wrapper.listPackagesForOrganization('my-org', 'maven'))
        .rejects.toThrow(/Failed to list maven packages for organization my-org \(public: rate limit; internal: forbidden; private: forbidden\)/);
      expect(wrapper.listingFailures).toHaveLength(3);
    });

    it('does not keep failures of a previous listing', async () => {
      respond({ public: [pkg(1)], internal: [], private: new Error('forbidden') });
      await wrapper.listPackagesForOrganization('org', 'container');
      expect(wrapper.listingFailures).toHaveLength(1);

      respond({ public: [pkg(1)], internal: [], private: [] });
      await wrapper.listPackagesForOrganization('org', 'container');

      expect(wrapper.listingFailures).toEqual([]);
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

    it('runs docker without a shell and passes the reference as one argument', async () => {
      mockExecPromise.mockResolvedValue({ stdout: '{}' });

      await wrapper.getManifestDigests('owner', 'pkg', 'v1; echo hacked');

      expect(mockExecPromise).toHaveBeenCalledWith('docker', ['manifest', 'inspect', 'ghcr.io/owner/pkg:v1; echo hacked']);
    });
  });

  describe('ensureDockerLogin', () => {
    // a fake `docker login` process that finishes with the given exit code
    const fakeLogin = (code) => {
      const handlers = {};
      const proc = {
        stdin: { write: jest.fn(), end: jest.fn() },
        on: (event, handler) => { handlers[event] = handler; return proc; }
      };
      setImmediate(() => handlers.close(code));
      return proc;
    };

    beforeEach(() => {
      mockSpawn.mockReset();
      log.warn.mockClear();
      wrapper.dockerLoggedIn = false;
    });

    it('runs one docker login for parallel calls', async () => {
      mockSpawn.mockImplementation(() => fakeLogin(0));

      await Promise.all(Array.from({ length: 8 }, () => wrapper.ensureDockerLogin()));

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith('docker', ['login', 'ghcr.io', '-u', 'x-access-token', '--password-stdin'], expect.anything());
      expect(wrapper.dockerLoggedIn).toBe(true);
    });

    it('does not log in again once logged in', async () => {
      mockSpawn.mockImplementation(() => fakeLogin(0));

      await wrapper.ensureDockerLogin();
      await wrapper.ensureDockerLogin();

      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });

    it('shares a failed attempt between parallel calls and retries on the next call', async () => {
      mockSpawn.mockImplementationOnce(() => fakeLogin(1)).mockImplementationOnce(() => fakeLogin(0));

      await Promise.all(Array.from({ length: 3 }, () => wrapper.ensureDockerLogin()));
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(wrapper.dockerLoggedIn).toBe(false);
      expect(log.warn).toHaveBeenCalledTimes(1);

      await wrapper.ensureDockerLogin();
      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(wrapper.dockerLoggedIn).toBe(true);
    });
  });
});
