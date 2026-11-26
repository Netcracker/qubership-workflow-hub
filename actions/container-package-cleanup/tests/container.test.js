import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { setTimeout } from 'node:timers';

jest.unstable_mockModule('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
}));

jest.unstable_mockModule('@qubership/action-logger', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setDebug: jest.fn(),
    setDryRun: jest.fn(),
  }
}));

const { default: ContainerStrategy } = await import('../src/strategy/container.js');
const { default: log } = await import('@qubership/action-logger');

describe('ContainerStrategy', () => {
  let strategy;
  let mockWrapper;

  beforeEach(() => {
    strategy = new ContainerStrategy();

    mockWrapper = {
      getManifestDigests: jest.fn()
    };
  });

  describe('parse', () => {
    it('should parse raw package data correctly', async () => {
      const rawData = [
        {
          package: {
            id: 1,
            name: 'test-image',
            package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101,
              name: 'sha256:abc123',
              metadata: {
                container: {
                  tags: ['latest', 'v1.0.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      const result = await strategy.parse(rawData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'test-image',
        packageType: 'container',
        repository: 'owner/repo',
        versions: [
          {
            id: 101,
            name: 'sha256:abc123',
            metadata: {
              container: {
                tags: ['latest', 'v1.0.0']
              }
            }
          }
        ]
      });
    });

    it('should handle JSON string input', async () => {
      const rawData = JSON.stringify([
        {
          package: {
            id: 1,
            name: 'test-image',
            package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z'
          },
          versions: []
        }
      ]);

      const result = await strategy.parse(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-image');
    });

    it('should handle missing tags gracefully', async () => {
      const rawData = [
        {
          package: {
            id: 1,
            name: 'test-image',
            package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101,
              name: 'sha256:abc123',
              metadata: {},
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      const result = await strategy.parse(rawData);

      expect(result[0].versions[0].metadata.container.tags).toEqual([]);
    });

    it('should reject with the original reason instead of returning undefined', async () => {
      const broken = [{
        package: { id: 1, name: 'broken', package_type: 'container', repository: undefined },
        versions: []
      }];

      await expect(strategy.parse(broken)).rejects.toThrow(/Failed to parse packages: .*full_name/);
    });

    it('should reject invalid JSON input with a clear message', async () => {
      await expect(strategy.parse('not json')).rejects.toThrow(/Failed to parse packages/);
    });

    it('should keep the original error as cause', async () => {
      const error = await strategy.parse('not json').catch(e => e);

      expect(error.cause).toBeInstanceOf(SyntaxError);
    });

    it('execute should reject on unparsable data and never inspect manifests', async () => {
      const broken = [{ package: { id: 1, name: 'broken', package_type: 'container' }, versions: [] }];

      await expect(strategy.execute({
        packagesWithVersions: broken, excludedPatterns: [], includedPatterns: [],
        thresholdDate: new Date('2025-01-10T00:00:00Z'), wrapper: mockWrapper, owner: 'test-owner'
      })).rejects.toThrow(/Failed to parse packages/);
      expect(mockWrapper.getManifestDigests).not.toHaveBeenCalled();
    });
  });

  describe('execute - protected tags logic', () => {
    it('should not delete versions with "latest" tag', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1,
            name: 'test-image',
            package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101,
              name: 'sha256:abc123',
              metadata: { container: { tags: ['latest'] } },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue(['sha256:layer1']);

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toEqual([]);
    });

    it('should not delete versions matching excludedPatterns', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['release-1.0'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue(['sha256:layer1']);

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: ['release-*'], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toEqual([]);
    });

    it('should not delete versions created after threshold date', async () => {
      const thresholdDate = new Date('2025-01-05T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['v2.0.0'] } },
              created_at: '2025-01-08T00:00:00Z', updated_at: '2025-01-08T00:00:00Z'
            }
          ]
        }
      ];

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toEqual([]);
    });
  });

  describe('execute - protected digests logic', () => {
    it('should not delete arch layers used by protected tags', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['latest'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:layer1',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 103, name: 'sha256:obsolete',
              metadata: { container: { tags: ['old-tag'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'latest') return Promise.resolve(['sha256:layer1']);
        if (tag === 'old-tag') return Promise.resolve(['sha256:layer2']);
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(1);
      expect(result[0].versions[0].id).toBe(103);
    });
  });

  describe('execute - includedPatterns logic', () => {
    it('should only delete tagged versions matching includedPatterns', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['dependabot-pip-2025.6.15'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:def456',
              metadata: { container: { tags: ['v1.0.0'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue([]);

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: ['dependabot-*'],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(1);
      expect(result[0].versions[0].id).toBe(101);
    });

    it('should delete all old tagged versions when includedPatterns is empty', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['v1.0.0'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:def456',
              metadata: { container: { tags: ['v2.0.0'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue([]);

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(2);
    });
  });

  describe('execute - arch layers ordering', () => {
    it('should group arch layers with their tagged versions', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:multiarch',
              metadata: { container: { tags: ['v1.0.0'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:amd64-layer',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 103, name: 'sha256:arm64-layer',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'v1.0.0') return Promise.resolve(['sha256:amd64-layer', 'sha256:arm64-layer']);
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(3);
      expect(result[0].versions[0].id).toBe(101);
      expect(result[0].versions[1].id).toBe(102);
      expect(result[0].versions[2].id).toBe(103);
    });
  });

  describe('execute - dangling layers', () => {
    it('should delete dangling layers not used by any manifest', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:dangling1',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:dangling2',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue([]);

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(2);
    });

    it('should not delete dangling layers that are protected digests', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['latest'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:protected-layer',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'latest') return Promise.resolve(['sha256:protected-layer']);
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toEqual([]);
    });
  });

  describe('execute - complex scenario', () => {
    it('should handle complex scenario with all filters', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            { id: 101, name: 'sha256:latest-img', metadata: { container: { tags: ['latest'] } }, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
            { id: 102, name: 'sha256:protected-layer', metadata: { container: { tags: [] } }, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
            { id: 103, name: 'sha256:dependabot-img', metadata: { container: { tags: ['dependabot-pip-2025.6.15'] } }, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
            { id: 104, name: 'sha256:dependabot-layer', metadata: { container: { tags: [] } }, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
            { id: 105, name: 'sha256:release-img', metadata: { container: { tags: ['release-1.0'] } }, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
            { id: 106, name: 'sha256:dangling', metadata: { container: { tags: [] } }, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
            { id: 107, name: 'sha256:recent', metadata: { container: { tags: ['v2.0.0'] } }, created_at: '2025-01-15T00:00:00Z', updated_at: '2025-01-15T00:00:00Z' }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'latest') return Promise.resolve(['sha256:protected-layer']);
        if (tag === 'dependabot-pip-2025.6.15') return Promise.resolve(['sha256:dependabot-layer']);
        if (tag === 'release-1.0') return Promise.resolve(['sha256:release-layer']);
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: ['release-*'],
        includedPatterns: ['dependabot-*'],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: true
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(3);

      const deletedIds = result[0].versions.map(v => v.id);
      expect(deletedIds).toContain(103);
      expect(deletedIds).toContain(104);
      expect(deletedIds).toContain(106);
    });
  });

  describe('execute - manifest fetch error handling', () => {
    it('should continue when manifest fetch fails', async () => {
      const thresholdDate = new Date('2025-01-10T00:00:00Z');
      const packagesWithVersions = [
        {
          package: {
            id: 1, name: 'test-image', package_type: 'container',
            repository: { full_name: 'owner/repo' },
            created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
          },
          versions: [
            {
              id: 101, name: 'sha256:abc123',
              metadata: { container: { tags: ['v1.0.0'] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102, name: 'sha256:untagged',
              metadata: { container: { tags: [] } },
              created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockRejectedValue(new Error('Manifest not found'));

      const result = await strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      });

      expect(result).toHaveLength(1);
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe('execute - invalid threshold date', () => {
    it.each([[new Date(NaN)], [undefined], ['2025-01-10']])('refuses an invalid threshold date: %p', async (thresholdDate) => {
      const packagesWithVersions = [{
        package: {
          id: 1, name: 'test-image', package_type: 'container',
          repository: { full_name: 'owner/repo' },
          created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
        },
        versions: [{
          id: 101, name: 'sha256:fresh',
          metadata: { container: { tags: ['fresh'] } },
          created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z'
        }]
      }];

      await expect(strategy.execute({
        packagesWithVersions, excludedPatterns: [], includedPatterns: [],
        thresholdDate, wrapper: mockWrapper, owner: 'test-owner', debug: false
      })).rejects.toThrow(/Invalid threshold date/);
      expect(mockWrapper.getManifestDigests).not.toHaveBeenCalled();
    });
  });

  describe('execute - layers of retained images (issue #1071)', () => {
    const pkgInfo = {
      id: 1, name: 'test-image', package_type: 'container',
      repository: { full_name: 'owner/repo' },
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
    };
    const ver = (id, name, tags, created = '2025-01-01T00:00:00Z') => ({
      id, name, metadata: { container: { tags } }, created_at: created, updated_at: created
    });
    const run = (versions, extra = {}) => strategy.execute({
      packagesWithVersions: [{ package: pkgInfo, versions }],
      excludedPatterns: [], includedPatterns: [],
      thresholdDate: new Date('2025-01-10T00:00:00Z'),
      wrapper: mockWrapper, owner: 'test-owner', debug: false, ...extra
    });
    const deletedIds = (result) => (result[0]?.versions ?? []).map(v => v.id);

    it('keeps an old untagged version referenced by a fresh tagged image', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) =>
        Promise.resolve(tag === 'fresh' ? ['sha256:shared'] : []));

      const result = await run([
        ver(101, 'sha256:shared', []),
        ver(102, 'sha256:fresh-index', ['fresh'], '2025-01-20T00:00:00Z')
      ]);

      expect(result).toEqual([]);
    });

    it('keeps layers of images retained because they do not match includedPatterns', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) =>
        Promise.resolve(tag === 'v1.0.0' ? ['sha256:kept-layer'] : tag === 'dependabot-1' ? ['sha256:gone-layer'] : []));

      const result = await run([
        ver(101, 'sha256:kept-layer', []),
        ver(102, 'sha256:kept-index', ['v1.0.0']),
        ver(103, 'sha256:gone-layer', []),
        ver(104, 'sha256:gone-index', ['dependabot-1'])
      ], { includedPatterns: ['dependabot-*'] });

      expect(deletedIds(result).sort()).toEqual([103, 104]);
    });

    it('keeps layers of excluded images', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) =>
        Promise.resolve(tag === 'release-1.0' ? ['sha256:rel-layer'] : []));

      const result = await run([
        ver(101, 'sha256:rel-layer', []),
        ver(102, 'sha256:rel-index', ['release-1.0'])
      ], { excludedPatterns: ['release-*'] });

      expect(result).toEqual([]);
    });

    it('keeps a platform manifest shared by a deleted and a retained image', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) => {
        if (tag === 'old') return Promise.resolve(['sha256:shared', 'sha256:only-old']);
        if (tag === 'latest') return Promise.resolve(['sha256:shared']);
        return Promise.resolve([]);
      });

      const result = await run([
        ver(101, 'sha256:old-index', ['old']),
        ver(102, 'sha256:shared', []),
        ver(103, 'sha256:only-old', []),
        ver(104, 'sha256:latest-index', ['latest'])
      ]);

      expect(deletedIds(result).sort()).toEqual([101, 103]);
    });

    it('still deletes an old image together with its own layers', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) =>
        Promise.resolve(tag === 'old' ? ['sha256:layer'] : []));

      const result = await run([
        ver(101, 'sha256:old-index', ['old']),
        ver(102, 'sha256:layer', []),
        ver(103, 'sha256:fresh-index', ['fresh'], '2025-01-20T00:00:00Z')
      ]);

      expect(deletedIds(result)).toEqual([101, 102]);
    });

    it('does not delete any untagged version when a retained manifest cannot be inspected', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) =>
        tag === 'latest' ? Promise.reject(new Error('boom')) : Promise.resolve(['sha256:old-layer']));
      const incompleteCleanup = [];

      const result = await run([
        ver(101, 'sha256:latest-index', ['latest']),
        ver(102, 'sha256:required-layer', []),
        ver(103, 'sha256:old-index', ['old']),
        ver(104, 'sha256:old-layer', []),
        ver(105, 'sha256:dangling', [])
      ], { incompleteCleanup });

      // only the tagged candidate is deleted; arch layers and dangling versions are kept
      expect(deletedIds(result)).toEqual([103]);
      expect(incompleteCleanup).toEqual([
        { package: 'test-image', failedTags: [{ tag: 'latest', reason: 'boom' }] }
      ]);
      expect(log.warn).toHaveBeenCalled();
    });

    it('also stops untagged deletion when a fresh retained image cannot be inspected', async () => {
      mockWrapper.getManifestDigests.mockImplementation((_o, _i, tag) =>
        tag === 'fresh' ? Promise.reject(new Error('denied')) : Promise.resolve([]));
      const incompleteCleanup = [];

      const result = await run([
        ver(101, 'sha256:fresh-index', ['fresh'], '2025-01-20T00:00:00Z'),
        ver(102, 'sha256:maybe-shared', [])
      ], { incompleteCleanup });

      expect(result).toEqual([]);
      expect(incompleteCleanup).toHaveLength(1);
    });

    it('does not block untagged deletion when only a to-be-deleted tag fails to inspect', async () => {
      mockWrapper.getManifestDigests.mockRejectedValue(new Error('Manifest not found'));
      const incompleteCleanup = [];

      const result = await run([
        ver(101, 'sha256:old-index', ['old']),
        ver(102, 'sha256:dangling', [])
      ], { incompleteCleanup });

      expect(deletedIds(result).sort()).toEqual([101, 102]);
      expect(incompleteCleanup).toEqual([]);
    });

    it('limits concurrent manifest inspections', async () => {
      let active = 0;
      let maxActive = 0;
      mockWrapper.getManifestDigests.mockImplementation(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(r => setTimeout(r, 2));
        active--;
        return [];
      });

      const versions = Array.from({ length: 40 }, (_, i) =>
        ver(i + 1, `sha256:fresh-${i}`, [`fresh-${i}`], '2025-01-20T00:00:00Z'));
      // inspections only run for packages that have untagged versions
      versions.push(ver(100, 'sha256:untagged', []));
      await run(versions);

      expect(mockWrapper.getManifestDigests).toHaveBeenCalledTimes(40);
      expect(maxActive).toBeLessThanOrEqual(8);
    });
  });

  describe('execute - skipped manifest inspections', () => {
    const pkgInfo = {
      id: 1, name: 'test-image', package_type: 'container',
      repository: { full_name: 'owner/repo' },
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
    };
    const OLD = '2025-01-01T00:00:00Z';
    const FRESH = '2025-01-20T00:00:00Z';
    const ver = (id, name, tags, created = OLD) => ({
      id, name, metadata: { container: { tags } }, created_at: created, updated_at: created
    });
    const run = (versions, incompleteCleanup = []) => strategy.execute({
      packagesWithVersions: [{ package: pkgInfo, versions }],
      excludedPatterns: [], includedPatterns: [],
      thresholdDate: new Date('2025-01-10T00:00:00Z'),
      wrapper: mockWrapper, owner: 'test-owner', debug: false, incompleteCleanup
    });
    const deletedIds = (result) => (result[0]?.versions ?? []).map(v => v.id);
    const inspectedTags = () => mockWrapper.getManifestDigests.mock.calls.map(c => c[2]).sort();

    it('does not inspect anything when the package has no untagged versions', async () => {
      mockWrapper.getManifestDigests.mockRejectedValue(new Error('registry down'));
      const incompleteCleanup = [];

      const result = await run([
        ver(1, 'sha256:old', ['old']),
        ver(2, 'sha256:fresh', ['fresh'], FRESH),
        ver(3, 'sha256:latest', ['latest'])
      ], incompleteCleanup);

      expect(mockWrapper.getManifestDigests).not.toHaveBeenCalled();
      expect(deletedIds(result)).toEqual([1]);
      expect(incompleteCleanup).toEqual([]);
    });

    it('does not inspect the candidates when a retained manifest blocks untagged deletion', async () => {
      mockWrapper.getManifestDigests.mockImplementation(async (_o, _i, tag) => {
        if (tag === 'fresh') throw new Error('registry down');
        return ['sha256:layer'];
      });
      const incompleteCleanup = [];

      const result = await run([
        ver(1, 'sha256:old', ['old', 'old-alias']),
        ver(2, 'sha256:fresh', ['fresh'], FRESH),
        ver(3, 'sha256:layer', []),
        ver(4, 'sha256:dangling', [])
      ], incompleteCleanup);

      expect(inspectedTags()).toEqual(['fresh']);
      expect(deletedIds(result)).toEqual([1]);
      expect(incompleteCleanup).toEqual([{ package: 'test-image', failedTags: [{ tag: 'fresh', reason: 'registry down' }] }]);
    });

    it('inspects retained images and candidates when untagged versions can be deleted', async () => {
      mockWrapper.getManifestDigests.mockImplementation(async (_o, _i, tag) =>
        tag === 'old' ? ['sha256:layer'] : ['sha256:kept-layer']);

      const result = await run([
        ver(1, 'sha256:old', ['old']),
        ver(2, 'sha256:fresh', ['fresh'], FRESH),
        ver(3, 'sha256:layer', []),
        ver(4, 'sha256:kept-layer', [])
      ]);

      expect(inspectedTags()).toEqual(['fresh', 'old']);
      expect(deletedIds(result)).toEqual([1, 3]);
    });
  });

  describe('isValidMetadata', () => {
    it('should return true for valid metadata', () => {
      expect(strategy.isValidMetadata({ metadata: { container: { tags: ['v1.0.0'] } } })).toBe(true);
    });

    it('should return false for invalid metadata', () => {
      expect(strategy.isValidMetadata({})).toBe(false);
      expect(strategy.isValidMetadata({ metadata: {} })).toBe(false);
      expect(strategy.isValidMetadata({ metadata: { container: {} } })).toBe(false);
      expect(strategy.isValidMetadata({ metadata: { container: { tags: 'not-array' } } })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return strategy name', () => {
      expect(strategy.toString()).toBe('Container Strategy');
    });
  });
});
