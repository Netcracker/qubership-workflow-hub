import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const mockCreateDispatchEvent = jest.fn();
const mockGetInput = jest.fn();
const mockSetOutput = jest.fn();
const mockGetOctokit = jest.fn();
const mockLog = { info: jest.fn(), success: jest.fn(), fail: jest.fn() };
let inputs;

jest.unstable_mockModule("@actions/core", () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
}));
jest.unstable_mockModule("@actions/github", () => ({
  getOctokit: mockGetOctokit,
  context: { repo: { owner: "test-owner", repo: "test-repo" } },
}));
jest.unstable_mockModule("@qubership/action-logger", () => ({
  default: mockLog,
}));

async function executeAction() {
  const { default: execution } = await import("../index.js");
  await execution;
}

describe("custom-event", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    inputs = {
      "event-type": "my-event",
      "github-token": "fake-token",
      "client-payload": '{"key":"value"}',
    };
    mockGetInput.mockImplementation((name, options) => {
      const value = inputs[name] || "";
      if (options?.required && !value) {
        throw new Error("Input required and not supplied: " + name);
      }
      return value;
    });
    mockGetOctokit.mockReturnValue({
      rest: { repos: { createDispatchEvent: mockCreateDispatchEvent } },
    });
    mockCreateDispatchEvent.mockResolvedValue({ status: 204 });
  });

  test("dispatches once with the configured token and payload and publishes the status", async () => {
    await executeAction();

    expect(mockGetOctokit).toHaveBeenCalledWith("fake-token");
    expect(mockCreateDispatchEvent).toHaveBeenCalledTimes(1);
    expect(mockCreateDispatchEvent).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      event_type: "my-event",
      client_payload: { key: "value" },
    });
    expect(mockSetOutput).toHaveBeenCalledWith("status", 204);
    expect(mockLog.success).toHaveBeenCalledWith(expect.stringContaining("my-event"));
    expect(mockLog.fail).not.toHaveBeenCalled();
  });

  test("dispatches an empty object when client-payload is empty", async () => {
    inputs["client-payload"] = "";

    await executeAction();

    expect(mockCreateDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ client_payload: {} })
    );
    expect(mockSetOutput).toHaveBeenCalledWith("status", 204);
    expect(mockLog.fail).not.toHaveBeenCalled();
  });

  test.each([
    { overrides: { owner: "other-owner" }, owner: "other-owner", repo: "test-repo" },
    { overrides: { repo: "other-repo" }, owner: "test-owner", repo: "other-repo" },
    { overrides: { owner: "other-owner", repo: "other-repo" }, owner: "other-owner", repo: "other-repo" },
  ])("dispatches to the requested repository for $overrides", async ({ overrides, owner, repo }) => {
    Object.assign(inputs, overrides);

    await executeAction();

    expect(mockCreateDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo })
    );
    expect(mockSetOutput).toHaveBeenCalledWith("status", 204);
    expect(mockLog.fail).not.toHaveBeenCalled();
  });

  test("reports invalid JSON and stops before dispatch", async () => {
    inputs["client-payload"] = "not-valid-json{";

    await executeAction();

    expect(mockLog.fail).toHaveBeenCalledTimes(1);
    expect(mockLog.fail).toHaveBeenCalledWith(expect.stringContaining("Failed to parse client_payload"));
    expect(mockCreateDispatchEvent).not.toHaveBeenCalled();
    expect(mockSetOutput).not.toHaveBeenCalled();
    expect(mockLog.success).not.toHaveBeenCalled();
  });

  test("reports a rejected API request without publishing a successful status", async () => {
    mockCreateDispatchEvent.mockRejectedValue(new Error("Resource not accessible by integration"));

    await executeAction();

    expect(mockCreateDispatchEvent).toHaveBeenCalledTimes(1);
    expect(mockLog.fail).toHaveBeenCalledWith(expect.stringContaining("Resource not accessible by integration"));
    expect(mockSetOutput).not.toHaveBeenCalled();
    expect(mockLog.success).not.toHaveBeenCalled();
  });

  test.each(["event-type", "github-token"])("rejects a missing required %s input", async (name) => {
    inputs[name] = "";

    await executeAction();

    expect(mockGetInput).toHaveBeenCalledWith(name, { required: true });
    expect(mockLog.fail).toHaveBeenCalledWith(expect.stringContaining("Input required and not supplied: " + name));
    expect(mockCreateDispatchEvent).not.toHaveBeenCalled();
    expect(mockSetOutput).not.toHaveBeenCalled();
    expect(mockLog.success).not.toHaveBeenCalled();
  });
});
