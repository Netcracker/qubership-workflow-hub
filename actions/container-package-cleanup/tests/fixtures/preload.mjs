import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { URL } from 'node:url';
import { fixture } from './data.mjs';

const directory = process.env.CLEANUP_TEST_DIR;
const data = fixture(process.env.CLEANUP_TEST_SCENARIO);
const api = fs.readFileSync(path.join(directory, 'api-url'), 'utf8').trim();
process.env.GITHUB_API_URL = api;
process.env.GITHUB_GRAPHQL_URL = `${api}/graphql`;
process.env.GITHUB_REPOSITORY = 'fixture-owner/fixture-repo';
process.env.GITHUB_STEP_SUMMARY = path.join(directory, 'summary.md');
fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, '');
process.env.PACKAGE_TOKEN = 'cleanup-fixture-token';
for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete process.env[name];
fs.writeFileSync(path.join(directory, 'docker.jsonl'), '');
fs.writeFileSync(path.join(directory, 'action.log'), '');
for (const stream of [process.stdout, process.stderr]) {
  const write = stream.write;
  stream.write = function (chunk, ...args) {
    fs.appendFileSync(path.join(directory, 'action.log'), String(chunk));
    return Reflect.apply(write, this, [chunk, ...args]);
  };
}
const record = entry => fs.appendFileSync(path.join(directory, 'docker.jsonl'), JSON.stringify(entry) + '\n');

// Fail closed if action code tries to connect anywhere except the local API fixture.
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof options !== 'object' || options.host !== '127.0.0.1' || Number(options.port) !== Number(new URL(api).port)) {
    throw new Error('External network access is forbidden in cleanup fixtures');
  }
  return Reflect.apply(connect, this, args);
};

const inspect = async command => {
  const prefix = 'docker manifest inspect ghcr.io/fixture-owner/fixture-image:';
  if (!command.startsWith(prefix)) throw new Error(`Unexpected command: ${command}`);
  const tag = command.slice(prefix.length);
  record({ operation: 'inspect', tag });
  if (data.failedTags.includes(tag)) throw new Error(`Fixture manifest unavailable: ${tag}`);
  if (!Object.hasOwn(data.manifests, tag)) throw new Error(`Unknown fixture tag: ${tag}`);
  return { stdout: JSON.stringify(data.manifests[tag]), stderr: '' };
};
const fixtureExec = (command, options, callback) => {
  const done = typeof options === 'function' ? options : callback;
  inspect(command).then(result => done(null, result.stdout, result.stderr), error => done(error));
};
fixtureExec[promisify.custom] = inspect;
childProcess.exec = fixtureExec;
childProcess.spawn = (command, args) => {
  if (command !== 'docker' || JSON.stringify(args) !== JSON.stringify(['login', 'ghcr.io', '-u', 'x-access-token', '--password-stdin'])) {
    throw new Error(`Unexpected spawned command: ${command}`);
  }
  record({ operation: 'login' });
  const child = new EventEmitter();
  child.stdin = new Writable({ write(_chunk, _encoding, done) { done(); } });
  child.stdin.on('finish', () => process.nextTick(() => child.emit('close', 0)));
  return child;
};
syncBuiltinESMExports();
