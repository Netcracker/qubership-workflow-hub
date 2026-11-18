import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import path from "node:path";

const getInput = jest.fn();
const existsSync = jest.fn();
const readFileSync = jest.fn();
const load = jest.fn();
const getAssignees = jest.fn();
const addAssignees = jest.fn();
const log = { info: jest.fn(), warn: jest.fn(), dim: jest.fn(), fail: jest.fn(), success: jest.fn() };
const context = { payload: {} };
let inputs;

jest.unstable_mockModule("@actions/core", () => ({ getInput }));
jest.unstable_mockModule("@actions/github", () => ({ context }));
jest.unstable_mockModule("@qubership/action-logger", () => ({ default: log }));
jest.unstable_mockModule("node:fs", () => ({ default: { existsSync, readFileSync } }));
jest.unstable_mockModule("../src/loader.js", () => ({
  default: jest.fn().mockImplementation(() => ({ load })),
}));
jest.unstable_mockModule("../src/command.js", () => ({
  default: jest.fn().mockImplementation(() => ({
    getAssigneesCommand: getAssignees,
    addAssigneesCommand: addAssignees,
  })),
}));

async function executeAction() {
  const { default: execution } = await import("../src/index.js");
  await execution;
}

describe("PR assignment", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    context.payload = { pull_request: { number: 42, user: { login: "author" } } };
    inputs = { shuffle: "1", "self-assign": "false" };
    getInput.mockImplementation(name => inputs[name] || "");
    existsSync.mockImplementation(file => file === ".github/pr-assigner-config.yml");
    load.mockReturnValue({ assignees: ["alice"] });
    getAssignees.mockReturnValue("");
  });

  afterEach(() => jest.restoreAllMocks());

  test("assigns a user from the configuration", async () => {
    await executeAction();
    expect(load).toHaveBeenCalledWith(".github/pr-assigner-config.yml");
    expect(getAssignees).toHaveBeenCalledWith(42);
    expect(addAssignees).toHaveBeenCalledWith(42, ["alice"]);
    expect(log.fail).not.toHaveBeenCalled();
  });

  test.each([
    { content: "# comment\n* @alice @bob\n/src @carol", expected: ["alice", "bob"] },
    { content: "/src @dave @eve", expected: ["dave", "eve"] },
  ])("assigns users parsed from CODEOWNERS $content", async ({ content, expected }) => {
    existsSync.mockImplementation(file => file === path.join(".github", "CODEOWNERS") || file.endsWith(path.join(".github", "CODEOWNERS")));
    readFileSync.mockReturnValue(content.replaceAll("\\n", "\n"));
    inputs.shuffle = "2";

    await executeAction();

    expect(load).not.toHaveBeenCalled();
    expect(addAssignees).toHaveBeenCalledWith(42, expect.arrayContaining(expected));
    expect(addAssignees.mock.calls[0][1]).toHaveLength(expected.length);
    expect(log.fail).not.toHaveBeenCalled();
  });

  test("reports missing CODEOWNERS without attempting assignment", async () => {
    existsSync.mockReturnValue(false);
    await executeAction();
    expect(log.fail).toHaveBeenCalledWith(expect.stringContaining("Can't find CODEOWNERS"));
    expect(addAssignees).not.toHaveBeenCalled();
  });

  test("reports missing PR context", async () => {
    context.payload = {};
    await executeAction();
    expect(log.fail).toHaveBeenCalledWith(expect.stringContaining("No pull request"));
    expect(addAssignees).not.toHaveBeenCalled();
  });

  test("filters blank users and rejects an empty candidate list", async () => {
    load.mockReturnValue({ assignees: ["", " "] });
    await executeAction();
    expect(log.fail).toHaveBeenCalledWith(expect.stringContaining("No assignees"));
    expect(addAssignees).not.toHaveBeenCalled();
  });

  test("caps the requested count to available users", async () => {
    inputs.shuffle = "5";
    await executeAction();
    expect(addAssignees).toHaveBeenCalledWith(42, ["alice"]);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("only 1 available"));
  });

  test("preserves existing assignees", async () => {
    getAssignees.mockReturnValue("bob");
    await executeAction();
    expect(getAssignees).toHaveBeenCalledWith(42);
    expect(addAssignees).not.toHaveBeenCalled();
    expect(log.fail).not.toHaveBeenCalled();
  });

  test("self-assigns the author using a case-insensitive match", async () => {
    inputs["self-assign"] = "true";
    load.mockReturnValue({ assignees: ["alice", "Author", "bob"] });
    await executeAction();
    expect(addAssignees).toHaveBeenCalledWith(42, ["Author"]);
    expect(log.fail).not.toHaveBeenCalled();
  });

  test("selects the shuffled candidate before applying the count", async () => {
    load.mockReturnValue({ assignees: ["alice", "bob", "carol"] });
    jest.spyOn(Math, "random").mockReturnValue(0);
    await executeAction();
    expect(addAssignees).toHaveBeenCalledWith(42, ["bob"]);
    expect(log.fail).not.toHaveBeenCalled();
  });

  test("reports assignment command failures", async () => {
    addAssignees.mockImplementation(() => { throw new Error("Permission denied"); });
    await executeAction();
    expect(log.fail).toHaveBeenCalledWith(expect.stringContaining("Permission denied"));
    expect(log.success).not.toHaveBeenCalled();
  });

  test("stops when configuration validation fails", async () => {
    load.mockReturnValue(undefined);
    await executeAction();
    expect(getAssignees).not.toHaveBeenCalled();
    expect(addAssignees).not.toHaveBeenCalled();
  });
});
