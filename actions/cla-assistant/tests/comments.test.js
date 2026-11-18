import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const listComments = jest.fn();
const getUseDcoFlag = jest.fn();
const getCustomPrSignComment = jest.fn();
jest.unstable_mockModule("@actions/github", () => ({
  context: { repo: { owner: "owner", repo: "repo" }, issue: { number: 42 }, payload: { repository: { id: 7 } } },
}));
jest.unstable_mockModule("../lib/octokit.js", () => ({
  octokit: { rest: { issues: { listComments } } },
}));
jest.unstable_mockModule("../lib/shared/getInputs.js", () => ({ getUseDcoFlag, getCustomPrSignComment }));
const { default: signatureWithPRComment } = await import("../lib/pullrequest/signatureComment.js");
const alice = { name: "alice", id: 1 };

beforeEach(() => {
  jest.resetAllMocks();
  getUseDcoFlag.mockReturnValue("false");
  getCustomPrSignComment.mockReturnValue("");
});
function comment(login, id, body) {
  return { id: 10, user: { login, id }, body, created_at: "2026-01-01T00:00:00Z" };
}
async function check(comments) {
  listComments.mockResolvedValue({ data: comments });
  return signatureWithPRComment({ signed: [], notSigned: [alice], unknown: [] }, [alice]);
}

describe("signature comments", () => {
  test("recognizes CLA signatures case-insensitively", async () => {
    const result = await check([comment("alice", 1, " I HAVE READ THE CLA DOCUMENT AND I HEREBY SIGN THE CLA ")]);
    expect(result.newSigned).toEqual([expect.objectContaining({ name: "alice", id: 1, comment_id: 10 })]);
    expect(result.newSigned[0]).not.toHaveProperty("body");
  });

  test("recognizes DCO signatures only in DCO mode", async () => {
    getUseDcoFlag.mockReturnValue("true");
    const result = await check([comment("alice", 1, "I have read the DCO Document and I hereby sign the DCO")]);
    expect(result.newSigned).toHaveLength(1);
  });

  test("uses the configured custom signing phrase", async () => {
    getCustomPrSignComment.mockReturnValue("I agree");
    expect((await check([comment("alice", 1, "i agree")])).newSigned).toHaveLength(1);
    expect((await check([comment("alice", 1, "I have read the CLA Document and I hereby sign the CLA")])).newSigned).toEqual([]);
  });

  test("rejects bot signatures and signatures from unrelated users", async () => {
    const result = await check([
      comment("github-actions[bot]", 1, "I have read the CLA Document and I hereby sign the CLA"),
      comment("outsider", 2, "I have read the CLA Document and I hereby sign the CLA"),
    ]);
    expect(result.newSigned).toEqual([]);
    expect(result.onlyCommitters).toEqual([]);
  });
});
