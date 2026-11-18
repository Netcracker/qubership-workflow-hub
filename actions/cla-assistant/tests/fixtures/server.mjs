import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";

const directory = process.env.CLA_TEST_DIR;
const scenario = process.env.CLA_TEST_SCENARIO;
fs.mkdirSync(directory, { recursive: true });
const log = path.join(directory, "requests.jsonl");
fs.writeFileSync(log, "");
fs.writeFileSync(path.join(directory, "event.json"), JSON.stringify({
  action: "opened",
  number: 42,
  pull_request: { number: 42, user: { login: "alice" }, merged: false },
  repository: { id: 7, name: "test-repo", owner: { login: "test-owner" } },
}));
const storageRoot = scenario === "remote-storage" ? "/repos/signature-owner/signature-store" : "/repos/test-owner/test-repo";
const signature = "I have read the CLA Document and I hereby sign the CLA";
const comments = scenario === "new-signature" ? [
  { id: 100, body: "CLA Assistant Lite bot", user: { login: "github-actions[bot]", id: 99 } },
  { id: 101, body: signature, user: { login: "alice", id: 1 }, created_at: "2026-01-01T00:00:00Z" },
  { id: 102, body: signature, user: { login: "outsider", id: 2 }, created_at: "2026-01-01T00:00:00Z" },
] : [];

const server = createServer(async (request, response) => {
  let body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length) body = JSON.parse(Buffer.concat(chunks).toString());
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const method = request.method;
  const reply = (status, data) => {
    fs.appendFileSync(log, JSON.stringify({ method, path: pathname, body, status, usingPersonalToken: request.headers.authorization === "token cla-fixture-pat" }) + "\n");
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };

  if (method === "POST" && pathname === "/graphql") {
    reply(200, { data: { repository: { pullRequest: { commits: {
      edges: [{ node: { commit: {
        author: { user: { login: "alice", databaseId: 1 } },
        committer: { user: { login: "alice", databaseId: 1 } },
      } } }],
      pageInfo: { hasNextPage: false, endCursor: "" },
    } } } } });
  } else if (pathname === storageRoot + "/contents/signatures/cla.json" && method === "GET") {
    if (scenario === "missing-storage") return reply(404, { message: "Not Found" });
    if (scenario === "storage-error") return reply(403, { message: "Access denied" });
    const signedContributors = ["signed", "remote-storage"].includes(scenario) ? [{ name: "alice", id: 1 }] : [];
    reply(200, { sha: "storage-sha", content: Buffer.from(JSON.stringify({ signedContributors })).toString("base64") });
  } else if (pathname === storageRoot + "/contents/signatures/cla.json" && method === "PUT") {
    reply(200, { content: { sha: "updated-sha" }, commit: { sha: "updated-commit" } });
  } else if (pathname === "/repos/test-owner/test-repo/issues/42/comments" && method === "GET") {
    reply(200, comments);
  } else if (pathname === "/repos/test-owner/test-repo/issues/42/comments" && method === "POST") {
    reply(201, { id: 100, body: body.body });
  } else if (pathname === "/repos/test-owner/test-repo/issues/comments/100" && method === "PATCH") {
    reply(200, { id: 100, body: body.body });
  } else {
    reply(500, { message: "Unexpected fixture request: " + method + " " + pathname });
  }
});
server.listen(0, "127.0.0.1", () => {
  fs.writeFileSync(path.join(directory, "api-url"), "http://127.0.0.1:" + server.address().port);
});
