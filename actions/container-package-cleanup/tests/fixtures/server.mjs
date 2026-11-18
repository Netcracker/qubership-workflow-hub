import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { fixture } from './data.mjs';

const directory = process.env.CLEANUP_TEST_DIR;
const scenario = process.env.CLEANUP_TEST_SCENARIO;
const data = fixture(scenario);
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'requests.jsonl'), '');
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  const method = request.method;
  let status = 500;
  let body = { message: `Unexpected fixture request: ${method} ${pathname}` };
  if (request.headers.authorization !== 'token cleanup-fixture-token') {
    status = 401;
    body = { message: 'Only the fixture token is accepted' };
  } else if (method === 'GET' && pathname === '/users/fixture-owner') {
    status = 200; body = { type: 'Organization' };
  } else if (method === 'GET' && pathname === '/orgs/fixture-owner/packages') {
    status = 200; body = scenario !== 'empty' && url.searchParams.get('visibility') === 'public' ? [data.package] : [];
  } else if (method === 'GET' && pathname === `/orgs/fixture-owner/packages/${data.package.package_type}/fixture-image/versions`) {
    status = 200; body = data.versions;
  } else if (method === 'DELETE' && pathname.startsWith(`/orgs/fixture-owner/packages/${data.package.package_type}/fixture-image/versions/`)) {
    status = 204; body = undefined;
  }
  fs.appendFileSync(path.join(directory, 'requests.jsonl'), JSON.stringify({ method, path: pathname, query: url.search, status }) + '\n');
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(body === undefined ? undefined : JSON.stringify(body));
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(path.join(directory, 'api-url'), `http://127.0.0.1:${server.address().port}`);
});
