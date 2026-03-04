import { jest } from "@jest/globals";

const mockExecSync = jest.fn();

jest.unstable_mockModule("node:child_process", () => ({
  execSync: mockExecSync,
}));

const { default: GhCommand } = await import("../src/command.js");

describe("GhCommand", () => {
  let cmd;

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = new GhCommand();
  });

  describe("getAssigneesCommand", () => {
    test("returns trimmed string of current assignees", () => {
      mockExecSync.mockReturnValue(Buffer.from("  user1 user2  \n"));
      const result = cmd.getAssigneesCommand(42);
      expect(result).toBe("user1 user2");
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("gh pr view 42")
      );
    });

    test("returns empty string when no assignees", () => {
      mockExecSync.mockReturnValue(Buffer.from(""));
      const result = cmd.getAssigneesCommand(1);
      expect(result).toBe("");
    });
  });

  describe("addAssigneesCommand", () => {
    test("calls execSync with correct gh pr edit command", () => {
      mockExecSync.mockReturnValue(undefined);
      cmd.addAssigneesCommand(10, ["alice", "bob"]);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("gh pr edit 10")
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("--add-assignee alice")
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("--add-assignee bob")
      );
    });

    test("calls execSync with single assignee", () => {
      mockExecSync.mockReturnValue(undefined);
      cmd.addAssigneesCommand(5, ["charlie"]);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("--add-assignee charlie")
      );
    });
  });
});
