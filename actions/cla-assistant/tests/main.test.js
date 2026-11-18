import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const context = { payload: {} };
const getInput = jest.fn();
const setFailed = jest.fn();
const setupClaCheck = jest.fn();
const lockPullRequest = jest.fn();
jest.unstable_mockModule("@actions/github", () => ({ context }));
jest.unstable_mockModule("@actions/core", () => ({ getInput, setFailed, info: jest.fn() }));
jest.unstable_mockModule("../lib/setupClaCheck.js", () => ({ setupClaCheck }));
jest.unstable_mockModule("../lib/pullrequest/pullRequestLock.js", () => ({ lockPullRequest }));

beforeEach(() => {
  jest.resetModules();
  jest.resetAllMocks();
  context.payload = { action: "opened", pull_request: { merged: false } };
  getInput.mockReturnValue("true");
});

async function executeAction() {
  const { default: execution } = await import("../lib/main.js");
  await execution;
}

describe("CLA entry point", () => {
  test("runs CLA verification for opened PRs", async () => {
    await executeAction();
    expect(setupClaCheck).toHaveBeenCalledTimes(1);
    expect(lockPullRequest).not.toHaveBeenCalled();
    expect(setFailed).not.toHaveBeenCalled();
  });

  test("locks merged PRs when enabled", async () => {
    context.payload = { action: "closed", pull_request: { merged: true } };
    await executeAction();
    expect(lockPullRequest).toHaveBeenCalledTimes(1);
    expect(setupClaCheck).not.toHaveBeenCalled();
  });

  test("does not lock unmerged closed PRs", async () => {
    context.payload = { action: "closed", pull_request: { merged: false } };
    await executeAction();
    expect(lockPullRequest).not.toHaveBeenCalled();
    expect(setupClaCheck).toHaveBeenCalledTimes(1);
  });

  test("respects disabled PR locking", async () => {
    context.payload = { action: "closed", pull_request: { merged: true } };
    getInput.mockReturnValue("false");
    await executeAction();
    expect(lockPullRequest).not.toHaveBeenCalled();
  });

  test("marks verification errors as failed", async () => {
    setupClaCheck.mockRejectedValue(new Error("Storage unavailable"));
    await executeAction();
    expect(setFailed).toHaveBeenCalledWith("Storage unavailable");
  });

  test("awaits lock errors and marks the action as failed", async () => {
    context.payload = { action: "closed", pull_request: { merged: true } };
    lockPullRequest.mockRejectedValue(new Error("Lock denied"));
    await executeAction();
    expect(setFailed).toHaveBeenCalledWith("Lock denied");
  });
});
