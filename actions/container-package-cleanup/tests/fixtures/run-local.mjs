import process from 'node:process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import * as yaml from 'js-yaml';
import { scenarios } from './data.mjs';

const fixtures = path.dirname(fileURLToPath(import.meta.url));
const action = path.resolve(fixtures, '../..');
const manifest = yaml.load(fs.readFileSync(path.join(action, 'action.yml'), 'utf8'));
async function execute(file, env, args = []) {
  const child = spawn(process.execPath, [...args, file], { cwd: action, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timer = globalThis.setTimeout(() => child.kill(), 30000);
  try {
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    return { code, output };
  } finally { globalThis.clearTimeout(timer); }
}
for (const scenario of scenarios) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-action-'));
  const env = { ...process.env, CLEANUP_TEST_DIR: directory, CLEANUP_TEST_SCENARIO: scenario };
  const server = spawn(process.execPath, [path.join(fixtures, 'server.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverOutput = '';
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
  try {
    for (let attempt = 0; attempt < 100 && !fs.existsSync(path.join(directory, 'api-url')); attempt++) await setTimeout(50);
    if (!fs.existsSync(path.join(directory, 'api-url'))) throw new Error(`Fixture did not start: ${serverOutput}`);
    for (const [name, input] of Object.entries(manifest.inputs)) env[`INPUT_${name.toUpperCase()}`] = input.default ?? '';
    env['INPUT_DEBUG'] = 'false';
    env['INPUT_DRY-RUN'] = String(scenario === 'dry-run');
    env['INPUT_PACKAGE-TYPE'] = scenario.startsWith('maven') || scenario === 'invalid-versions' ? 'maven' : 'container';
    // tag filters belong to the container scenarios; for Maven the default SNAPSHOT inclusion applies
    const container = env['INPUT_PACKAGE-TYPE'] === 'container';
    env['INPUT_INCLUDED-TAGS'] = container ? 'dev-*' : '';
    env['INPUT_EXCLUDED-TAGS'] = container ? 'release-*' : '';
    if (scenario === 'invalid-days') env['INPUT_THRESHOLD-DAYS'] = '7abc';
    if (scenario === 'invalid-versions') env['INPUT_THRESHOLD-VERSIONS'] = '1.5';
    if (scenario === 'maven-excluded-all') { env['INPUT_INCLUDED-PATTERNS'] = '*SNAPSHOT*'; env['INPUT_EXCLUDED-PATTERNS'] = 'latest,release*,*.*'; }
    if (scenario === 'maven-migrated') { env['INPUT_INCLUDED-PATTERNS'] = '*SNAPSHOT'; env['INPUT_EXCLUDED-PATTERNS'] = 'latest,release*'; }
    if (scenario === 'maven-zero') { env['INPUT_THRESHOLD-DAYS'] = '0'; env['INPUT_THRESHOLD-VERSIONS'] = '0'; }
    const result = await execute(path.join(action, manifest.runs.main), env, ['--import', pathToFileURL(path.join(fixtures, 'preload.mjs')).href]);
    const verified = await execute(path.join(fixtures, 'verify.mjs'), { ...env, ACTUAL_OUTCOME: result.code === 0 ? 'success' : 'failure' });
    if (verified.code !== 0) throw new Error(`${scenario}\n${result.output}\n${verified.output}`);
    process.stdout.write(verified.output);
  } finally {
    if (server.exitCode === null) {
      const stopped = new Promise(resolve => server.once('close', resolve));
      server.kill();
      await stopped;
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
