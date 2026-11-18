import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

const requests = fs.readFileSync(path.join(process.env.CLA_TEST_DIR, "requests.jsonl"), "utf8")
  .trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
const scenario = process.env.CLA_TEST_SCENARIO;
assert.ok(requests.some(request => request.path === "/graphql"), "Contributor API was not called");
assert.ok(!requests.some(request => request.status === 500), "Unexpected API request");
const writes = requests.filter(request => ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && request.path !== "/graphql");
const fileWrites = writes.filter(request => request.method === "PUT");
if (scenario === "signed" || scenario === "remote-storage" || scenario === "allowlisted") {
  assert.deepEqual(writes, [], "Signed and allowlisted contributors must not modify signatures");
} else if (scenario === "unsigned") {
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, "POST");
  assert.ok(writes[0].body.body.includes("Contributor License Agreement"));
  assert.deepEqual(fileWrites, []);
} else if (scenario === "new-signature") {
  assert.equal(fileWrites.length, 1);
  assert.equal(fileWrites[0].body.sha, "storage-sha");
  const content = JSON.parse(Buffer.from(fileWrites[0].body.content, "base64").toString());
  assert.deepEqual(content.signedContributors.map(user => user.id), [1]);
  assert.ok(writes.some(request => request.method === "PATCH" && request.body.body.includes("All contributors have signed")));
} else if (scenario === "missing-storage") {
  assert.equal(fileWrites.length, 1);
  const content = JSON.parse(Buffer.from(fileWrites[0].body.content, "base64").toString());
  assert.deepEqual(content, { signedContributors: [] });
  assert.ok(writes.some(request => request.method === "POST"));
} else if (scenario === "storage-error") {
  assert.deepEqual(writes, [], "A storage access error must not create or replace signatures");
} else {
  throw new Error("Unknown scenario: " + scenario);
}
console.log("Verified CLA API behavior for", scenario);

if (scenario === "remote-storage") {
  const storage = requests.find(request => request.path === "/repos/signature-owner/signature-store/contents/signatures/cla.json");
  assert.ok(storage?.usingPersonalToken, "Remote signature storage must use the PAT client");
}
