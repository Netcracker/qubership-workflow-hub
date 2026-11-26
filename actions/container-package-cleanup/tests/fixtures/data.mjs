export const scenarios = [
  'retained-images', 'dry-run', 'manifest-failure', 'deleted-manifest-failure',
  'single-arch', 'tagged-only', 'empty', 'maven', 'maven-zero', 'maven-excluded-all', 'maven-migrated', 'invalid-days', 'invalid-versions'
];

export function fixture(scenario) {
  if (!scenarios.includes(scenario)) throw new Error(`Unknown scenario: ${scenario}`);
  const old = new Date(Date.now() - 30 * 86400000).toISOString();
  const fresh = new Date(Date.now() - 86400000).toISOString();
  const version = (id, name, tags, date = old) => ({
    id, name, created_at: date, updated_at: date, metadata: { container: { tags } }
  });
  const tagged = [
    version(1, 'sha256:old', ['dev-old', 'dev-alias']),
    version(2, 'sha256:fresh', ['dev-fresh'], fresh),
    version(3, 'sha256:latest', ['latest', 'dev-main']),
    version(4, 'sha256:release', ['dev-release', 'release-1']),
    version(5, 'sha256:stable', ['v1.0.0'])
  ];
  const layers = [11, 12, 13, 14, 15, 16].map(id => version(id, `sha256:layer-${id}`, []));
  const manifest = digests => ({ schemaVersion: 2, manifests: digests.map(id => ({ digest: `sha256:layer-${id}` })) });
  const manifests = {
    'dev-old': manifest([11, 12]), 'dev-alias': manifest([11, 12]),
    'dev-fresh': manifest([11]), latest: manifest([13]), 'dev-main': manifest([13]),
    'dev-release': manifest([14]), 'release-1': manifest([14]), 'v1.0.0': manifest([15])
  };
  const maven = scenario.startsWith('maven') || scenario === 'invalid-versions';
  let versions = [...tagged, ...layers];
  if (maven) versions = [
    version(21, '1.3-SNAPSHOT', [], old),
    version(22, '1.2-SNAPSHOT', [], new Date(Date.now() - 40 * 86400000).toISOString()),
    version(23, '1.1-SNAPSHOT', [], new Date(Date.now() - 50 * 86400000).toISOString()),
    version(24, '1.0', [])
  ];
  // a package without untagged versions: nothing can be inspected or protected
  if (scenario === 'tagged-only') versions = [tagged[0], tagged[1]];
  if (scenario === 'single-arch') {
    versions = [tagged[0], tagged[1], layers[5]];
    for (const tag of ['dev-old', 'dev-alias', 'dev-fresh']) manifests[tag] = { schemaVersion: 2, config: { digest: 'sha256:config' }, layers: [] };
  }
  return {
    package: { id: 7, name: 'fixture-image', package_type: maven ? 'maven' : 'container', repository: { name: 'fixture-repo', full_name: 'fixture-owner/fixture-repo' } },
    versions, manifests,
    failedTags: scenario === 'manifest-failure' ? ['dev-fresh'] : scenario === 'deleted-manifest-failure' ? ['dev-old', 'dev-alias'] : []
  };
}
