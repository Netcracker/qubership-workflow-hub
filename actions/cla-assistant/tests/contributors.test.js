import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const graphql = jest.fn();
const context = { repo: { owner: "owner", repo: "repo" }, issue: { number: 42 } };
jest.unstable_mockModule("@actions/github", () => ({ context }));
jest.unstable_mockModule("../lib/octokit.js", () => ({ octokit: { graphql } }));
const { default: getCommitters } = await import("../lib/graphql.js");

function edge(login, id) {
  return { node: { commit: { author: { user: { login, databaseId: id } }, committer: {} } } };
}
function page(edges, hasNextPage = false, endCursor = "") {
  return { repository: { pullRequest: { commits: { edges, pageInfo: { hasNextPage, endCursor } } } } };
}
beforeEach(() => graphql.mockReset());

describe("PR contributors", () => {
  test("deduplicates users and excludes the GitHub web-flow account", async () => {
    graphql.mockResolvedValue(page([edge("alice", 1), edge("alice", 1), edge("web-flow", 41898282)]));
    expect(await getCommitters()).toEqual([{ name: "alice", id: 1, pullRequestNo: 42 }]);
  });

  test("reads every page so later contributors also require signatures", async () => {
    graphql.mockResolvedValueOnce(page([edge("alice", 1)], true, "next"));
    graphql.mockResolvedValueOnce(page([edge("bob", 2)]));
    expect(await getCommitters()).toEqual([
      { name: "alice", id: 1, pullRequestNo: 42 },
      { name: "bob", id: 2, pullRequestNo: 42 },
    ]);
    expect(graphql.mock.calls[1][1]).toEqual({ owner: "owner", name: "repo", number: 42, cursor: "next" });
  });

  test("fails when pagination stops advancing", async () => {
    graphql.mockResolvedValue(page([], true, ""));
    await expect(getCommitters()).rejects.toThrow("pagination did not advance");
  });

  test("propagates API errors", async () => {
    graphql.mockRejectedValue(new Error("Access denied"));
    await expect(getCommitters()).rejects.toThrow("Access denied");
  });
});
