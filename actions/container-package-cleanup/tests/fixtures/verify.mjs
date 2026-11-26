import assert from 'node:assert/strict';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

const directory = process.env.CLEANUP_TEST_DIR;
const scenario = process.env.CLEANUP_TEST_SCENARIO;
const readLog = file => fs.readFileSync(path.join(directory, file), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const requests = readLog('requests.jsonl');
const docker = readLog('docker.jsonl');
const invalid = scenario.startsWith('invalid-');
assert.equal(process.env.ACTUAL_OUTCOME, invalid ? 'failure' : 'success', 'Unexpected action outcome');
assert.ok(requests.every(r => r.status < 400), 'Unexpected API operation');
if (invalid) {
  const input = scenario === 'invalid-days' ? 'threshold-days' : 'threshold-versions';
  assert.ok(fs.readFileSync(path.join(directory, 'action.log'), 'utf8').includes(`Invalid '${input}' input`), 'Failure must come from retention validation');
  assert.deepEqual(requests, [], 'Invalid input must fail before any API call');
  assert.deepEqual(docker, [], 'Invalid input must fail before Docker operations');
} else {
  assert.ok(requests.some(r => r.path === '/users/fixture-owner'), 'The real wrapper must query the fixture');
  const expected = {
    'retained-images': [1, 12, 16], 'dry-run': [], 'manifest-failure': [1],
    'deleted-manifest-failure': [1, 12, 16], 'single-arch': [1, 16], 'tagged-only': [1], empty: [],
    maven: [22, 23], 'maven-zero': [21, 22, 23], 'maven-excluded-all': [], 'maven-migrated': [22, 23]
  }[scenario];
  const deleted = requests.filter(r => r.method === 'DELETE').map(r => Number(r.path.split('/').at(-1))).sort((a, b) => a - b);
  assert.deepEqual(deleted, expected, 'Unexpected deleted versions');
  if (scenario.startsWith('maven') || scenario === 'empty') {
    assert.deepEqual(docker, [], 'Maven/empty cleanup must not inspect containers');
    if (scenario === 'maven-excluded-all' || scenario === 'maven-migrated') {
      // the original workflow exclusions (with *.*) protect every SNAPSHOT version; the migrated ones do not
      const summary = fs.readFileSync(path.join(directory, 'summary.md'), 'utf8');
      const blocked = summary.includes('Versions protected by excluded patterns');
      assert.equal(blocked, scenario === 'maven-excluded-all', 'Unexpected exclusion warning in the report');
      if (blocked) assert.ok(summary.includes('<code>*.*</code>'), 'The responsible pattern must be named in the report');
    }
  } else {
    if (scenario === 'tagged-only') {
      assert.deepEqual(docker, [], 'A package without untagged versions must not run any Docker operation');
    } else {
      // parallel inspections share one login
      assert.equal(docker.filter(r => r.operation === 'login').length, 1, 'Docker login must run exactly once');
      assert.ok(docker.some(r => r.operation === 'inspect' && r.tag === 'dev-fresh'), 'Retained-image manifest was not inspected');
      const candidateInspected = docker.some(r => r.operation === 'inspect' && r.tag === 'dev-old');
      if (scenario === 'manifest-failure') assert.ok(!candidateInspected, 'Candidates must not be inspected once a retained manifest failed');
      if (scenario === 'retained-images') assert.ok(candidateInspected, 'Candidates must be inspected when untagged versions can be deleted');
    }
    const summary = fs.readFileSync(path.join(directory, 'summary.md'), 'utf8');
    assert.ok(summary.includes('Container Package Cleanup Summary'), 'Cleanup summary is missing');
    if (scenario === 'manifest-failure') {
      assert.ok(summary.includes('Incomplete cleanup') && summary.includes('dev-fresh'), 'Protective skip must appear in the report');
    } else assert.ok(!summary.includes('Incomplete cleanup'), 'Unexpected incomplete cleanup');
    if (scenario === 'dry-run') assert.ok(summary.includes('(Dry Run)') && summary.includes('<code>12</code>'), 'Dry-run must still report candidates');
  }
}
process.stdout.write(`Verified ${scenario}: action outcome, API operations, Docker calls and summary.\n`);
