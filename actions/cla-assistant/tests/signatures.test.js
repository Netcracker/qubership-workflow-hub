import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const getCommitters = jest.fn();
const getFileContent = jest.fn();
const createFile = jest.fn();
const updateFile = jest.fn();
const comment = jest.fn();
const rerun = jest.fn();
const setFailed = jest.fn();
const alice = { name: "alice", id: 1, pullRequestNo: 42 };

jest.unstable_mockModule("@actions/core", () => ({ setFailed, info: jest.fn() }));
jest.unstable_mockModule("@actions/github", () => ({ context: { issue: { number: 42 } } }));
jest.unstable_mockModule("../lib/graphql.js", () => ({ default: getCommitters }));
jest.unstable_mockModule("../lib/checkAllowList.js", () => ({ checkAllowList: users => users }));
jest.unstable_mockModule("../lib/persistence/persistence.js", () => ({ getFileContent, createFile, updateFile }));
jest.unstable_mockModule("../lib/pullrequest/pullRequestComment.js", () => ({ default: comment }));
jest.unstable_mockModule("../lib/pullRerunRunner.js", () => ({ reRunLastWorkFlowIfRequired: rerun }));
const { setupClaCheck } = await import("../lib/setupClaCheck.js");

function stored(signatures) {
  return { data: { sha: "storage-sha", content: Buffer.from(JSON.stringify({ signedContributors: signatures })).toString("base64") } };
}
beforeEach(() => {
  jest.resetAllMocks();
  getCommitters.mockResolvedValue([alice]);
  createFile.mockResolvedValue({});
  getFileContent.mockResolvedValue(stored([]));
});

describe("CLA signature verification", () => {
  test("fails unsigned contributors without modifying stored signatures", async () => {
    await setupClaCheck();
    expect(comment).toHaveBeenCalledWith({ signed: [], notSigned: [alice], unknown: [] }, [alice]);
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining("have to sign"));
    expect(updateFile).not.toHaveBeenCalled();
    expect(rerun).not.toHaveBeenCalled();
  });

  test("accepts contributors with a stored matching GitHub ID", async () => {
    getFileContent.mockResolvedValue(stored([{ name: "old-name", id: 1 }]));
    await setupClaCheck();
    expect(comment).toHaveBeenCalledWith({ signed: [alice], notSigned: [], unknown: [] }, [alice]);
    expect(rerun).toHaveBeenCalledTimes(1);
    expect(setFailed).not.toHaveBeenCalled();
    expect(updateFile).not.toHaveBeenCalled();
  });

  test("does not accept a matching name with a different GitHub ID", async () => {
    getFileContent.mockResolvedValue(stored([{ name: "alice", id: 2 }]));
    await setupClaCheck();
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining("have to sign"));
    expect(rerun).not.toHaveBeenCalled();
  });

  test("persists newly signed contributors before rerunning checks", async () => {
    const reacted = { newSigned: [alice], allSignedFlag: true };
    comment.mockResolvedValue(reacted);
    await setupClaCheck();
    expect(updateFile).toHaveBeenCalledWith("storage-sha", { signedContributors: [] }, reacted);
    expect(rerun).toHaveBeenCalledTimes(1);
    expect(setFailed).not.toHaveBeenCalled();
  });

  test("creates empty storage for a missing file and still requires signatures", async () => {
    getFileContent.mockRejectedValue({ status: 404 });
    await expect(setupClaCheck()).rejects.toThrow("have to sign");
    const content = JSON.parse(Buffer.from(createFile.mock.calls[0][0], "base64").toString());
    expect(content).toEqual({ signedContributors: [] });
    expect(comment).toHaveBeenCalled();
    expect(updateFile).not.toHaveBeenCalled();
  });

  test("does not overwrite storage after an access error", async () => {
    getFileContent.mockRejectedValue({ status: 403 });
    await expect(setupClaCheck()).rejects.toThrow("Status: 403");
    expect(createFile).not.toHaveBeenCalled();
    expect(updateFile).not.toHaveBeenCalled();
  });

  test("does not overwrite malformed signature storage", async () => {
    getFileContent.mockResolvedValue({ data: { sha: "bad", content: Buffer.from("invalid JSON").toString("base64") } });
    await expect(setupClaCheck()).rejects.toThrow();
    expect(createFile).not.toHaveBeenCalled();
    expect(updateFile).not.toHaveBeenCalled();
  });

  test("marks signature update failures as failed", async () => {
    comment.mockResolvedValue({ newSigned: [alice], allSignedFlag: true });
    updateFile.mockRejectedValue(new Error("Write denied"));
    await setupClaCheck();
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining("Write denied"));
    expect(rerun).not.toHaveBeenCalled();
  });
});
