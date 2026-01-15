// tests/container.test.js
jest.mock('@actions/core');
jest.mock('@netcracker/action-logger');

const ContainerStrategy = require('../src/strategy/container');
const log = require('@netcracker/action-logger');

describe('ContainerStrategy', () => {
  let strategy;
  let mockWrapper;

  beforeEach(() => {
    strategy = new ContainerStrategy();
    log.info = jest.fn();
    log.debug = jest.fn();
    log.warn = jest.fn();
    log.setDebug = jest.fn();

    // Mock wrapper with getManifestDigests method
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
              metadata: {
                container: {
                  tags: ['latest']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue(['sha256:layer1']);

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      expect(result).toEqual([]);
    });

    it('should not delete versions matching excludedPatterns', async () => {
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
              metadata: {
                container: {
                  tags: ['release-1.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue(['sha256:layer1']);

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: ['release-*'],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      expect(result).toEqual([]);
    });

    it('should not delete versions created after threshold date', async () => {
      const thresholdDate = new Date('2025-01-05T00:00:00Z');
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
              metadata: {
                container: {
                  tags: ['v2.0.0']
                }
              },
              created_at: '2025-01-08T00:00:00Z',
              updated_at: '2025-01-08T00:00:00Z'
            }
          ]
        }
      ];

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
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
                  tags: ['latest']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:layer1',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 103,
              name: 'sha256:obsolete',
              metadata: {
                container: {
                  tags: ['old-tag']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      // latest uses sha256:layer1
      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'latest') {
          return Promise.resolve(['sha256:layer1']);
        }
        if (tag === 'old-tag') {
          return Promise.resolve(['sha256:layer2']);
        }
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      // sha256:layer1 should not be deleted (used by latest)
      // sha256:obsolete (old-tag) should be deleted
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
                  tags: ['dependabot-pip-2025.6.15']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:def456',
              metadata: {
                container: {
                  tags: ['v1.0.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue([]);

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: ['dependabot-*'],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      // Only dependabot-* should be deleted
      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(1);
      expect(result[0].versions[0].id).toBe(101);
    });

    it('should delete all old tagged versions when includedPatterns is empty', async () => {
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
              metadata: {
                container: {
                  tags: ['v1.0.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:def456',
              metadata: {
                container: {
                  tags: ['v2.0.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue([]);

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      // Both should be deleted
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
              name: 'sha256:multiarch',
              metadata: {
                container: {
                  tags: ['v1.0.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:amd64-layer',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 103,
              name: 'sha256:arm64-layer',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      // v1.0.0 uses both arch layers
      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'v1.0.0') {
          return Promise.resolve(['sha256:amd64-layer', 'sha256:arm64-layer']);
        }
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(3);

      // Check ordering: tagged version first, then its arch layers
      expect(result[0].versions[0].id).toBe(101); // v1.0.0
      expect(result[0].versions[1].id).toBe(102); // amd64-layer
      expect(result[0].versions[2].id).toBe(103); // arm64-layer
    });
  });

  describe('execute - dangling layers', () => {
    it('should delete dangling layers not used by any manifest', async () => {
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
              name: 'sha256:dangling1',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:dangling2',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockResolvedValue([]);

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(2);
    });

    it('should not delete dangling layers that are protected digests', async () => {
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
              metadata: {
                container: {
                  tags: ['latest']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:protected-layer',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      // latest uses sha256:protected-layer
      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'latest') {
          return Promise.resolve(['sha256:protected-layer']);
        }
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      // No versions should be deleted
      expect(result).toEqual([]);
    });
  });

  describe('execute - complex scenario', () => {
    it('should handle complex scenario with all filters', async () => {
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
              name: 'sha256:latest-img',
              metadata: {
                container: {
                  tags: ['latest']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 102,
              name: 'sha256:protected-layer',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 103,
              name: 'sha256:dependabot-img',
              metadata: {
                container: {
                  tags: ['dependabot-pip-2025.6.15']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 104,
              name: 'sha256:dependabot-layer',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 105,
              name: 'sha256:release-img',
              metadata: {
                container: {
                  tags: ['release-1.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 106,
              name: 'sha256:dangling',
              metadata: {
                container: {
                  tags: []
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            {
              id: 107,
              name: 'sha256:recent',
              metadata: {
                container: {
                  tags: ['v2.0.0']
                }
              },
              created_at: '2025-01-15T00:00:00Z',
              updated_at: '2025-01-15T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockImplementation((_owner, _image, tag) => {
        if (tag === 'latest') {
          return Promise.resolve(['sha256:protected-layer']);
        }
        if (tag === 'dependabot-pip-2025.6.15') {
          return Promise.resolve(['sha256:dependabot-layer']);
        }
        if (tag === 'release-1.0') {
          return Promise.resolve(['sha256:release-layer']);
        }
        return Promise.resolve([]);
      });

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: ['release-*'],
        includedPatterns: ['dependabot-*'],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: true
      });

      // Should delete: dependabot-img + its layer, dangling
      // Should NOT delete: latest, protected-layer (used by latest), release-* (excluded), recent (too new)
      expect(result).toHaveLength(1);
      expect(result[0].versions).toHaveLength(3);
      
      const deletedIds = result[0].versions.map(v => v.id);
      expect(deletedIds).toContain(103); // dependabot-img
      expect(deletedIds).toContain(104); // dependabot-layer
      expect(deletedIds).toContain(106); // dangling
    });
  });

  describe('execute - manifest fetch error handling', () => {
    it('should continue when manifest fetch fails', async () => {
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
              metadata: {
                container: {
                  tags: ['v1.0.0']
                }
              },
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      ];

      mockWrapper.getManifestDigests.mockRejectedValue(new Error('Manifest not found'));

      const result = await strategy.execute({
        packagesWithVersions,
        excludedPatterns: [],
        includedPatterns: [],
        thresholdDate,
        wrapper: mockWrapper,
        owner: 'test-owner',
        debug: false
      });

      // Should still try to delete the version
      expect(result).toHaveLength(1);
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe('isValidMetadata', () => {
    it('should return true for valid metadata', () => {
      const version = {
        metadata: {
          container: {
            tags: ['v1.0.0']
          }
        }
      };

      expect(strategy.isValidMetadata(version)).toBe(true);
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
