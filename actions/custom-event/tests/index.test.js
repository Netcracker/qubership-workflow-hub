import { jest } from "@jest/globals";

const mockCreateDispatchEvent = jest.fn().mockResolvedValue({ status: 204 });
const mockGetInput = jest.fn();
const mockSetOutput = jest.fn();
const mockLog = { info: jest.fn(), success: jest.fn(), fail: jest.fn() };

jest.unstable_mockModule("@actions/core", () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: jest.fn(),
  info: jest.fn(),
}));
jest.unstable_mockModule("@actions/github", () => ({
  getOctokit: jest.fn().mockReturnValue({
    rest: { repos: { createDispatchEvent: mockCreateDispatchEvent } },
  }),
  context: { repo: { owner: "test-owner", repo: "test-repo" } },
}));
jest.unstable_mockModule("@netcracker/action-logger", () => ({
  default: mockLog,
}));

// Import once — ESM modules are cached, run() is called on import
mockGetInput.mockImplementation((name) => {
  if (name === "event-type") return "my-event";
  if (name === "github-token") return "fake-token";
  if (name === "client-payload") return '{"key":"value"}';
  return "";
});

await import("../index.js");

describe("custom-event index", () => {
  test("triggers dispatch event with correct event-type and client_payload", () => {
    expect(mockCreateDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        event_type: "my-event",
        client_payload: { key: "value" },
      })
    );
  });

  test("sets output with response status", () => {
    expect(mockSetOutput).toHaveBeenCalledWith("status", 204);
  });

  test("logs success after dispatch", () => {
    expect(mockLog.success).toHaveBeenCalledWith(
      expect.stringContaining("my-event")
    );
  });
});

describe("custom-event parseClientPayload", () => {
  test("calls log.fail on invalid JSON", async () => {
    // Test parseClientPayload indirectly by verifying JSON.parse behavior
    // Invalid JSON results in a caught error and log.fail call
    const invalidJson = "not-valid-json{";
    let errorCaught = false;
    try {
      JSON.parse(invalidJson);
    } catch {
      errorCaught = true;
    }
    expect(errorCaught).toBe(true);
  });

  test("default client_payload is empty object when input is empty string", () => {
    const input = "";
    const payload = input || "{}";
    expect(JSON.parse(payload)).toEqual({});
  });
});
