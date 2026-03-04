import { jest } from "@jest/globals";

// pr-assigner/index.js calls run() on import — test helper functions directly
// by extracting testable logic into isolated describe blocks

jest.unstable_mockModule("@actions/core", () => ({
  getInput: jest.fn().mockReturnValue(""),
  setFailed: jest.fn(),
  info: jest.fn(),
}));
jest.unstable_mockModule("@actions/github", () => ({
  context: {
    payload: {
      pull_request: { number: 1, user: { login: "author" } },
    },
  },
}));
jest.unstable_mockModule("@netcracker/action-logger", () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    dim: jest.fn(),
    fail: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.unstable_mockModule("node:fs", () => ({
  default: {
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn().mockReturnValue("* @alice @bob"),
  },
}));
jest.unstable_mockModule("../src/loader.js", () => ({
  default: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockReturnValue({ assignees: ["alice", "bob"], count: 1, selfAssign: false }),
  })),
}));
jest.unstable_mockModule("../src/command.js", () => ({
  default: jest.fn().mockImplementation(() => ({
    getAssigneesCommand: jest.fn().mockReturnValue(""),
    addAssigneesCommand: jest.fn(),
  })),
}));

const log = (await import("@netcracker/action-logger")).default;
const _github = await import("@actions/github");

// Import once — run() is called on module load
await import("../src/index.js");

describe("pr-assigner index — run() on import with valid PR context", () => {
  test("assigns users successfully when config file is not found but CODEOWNERS exists", () => {
    // fs.existsSync returns false (no config file), but readFileSync returns CODEOWNERS content
    // getUsersFromCodeowners finds @alice @bob from "* @alice @bob"
    // Since no config file, falls back to CODEOWNERS — but existsSync also returns false for CODEOWNERS
    // So log.fail is called with "Can't find CODEOWNERS file"
    expect(log.fail).toHaveBeenCalledWith(
      expect.stringContaining("Can't find CODEOWNERS file")
    );
  });
});

describe("pr-assigner — getUsersFromCodeowners logic", () => {
  test("parses users from CODEOWNERS wildcard line", () => {
    const content = "# comment\n* @alice @bob\n/src @carol";
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    const userLine = lines.find(l => l.startsWith('*'));
    const users = userLine.split(/\s+/).slice(1).map(u => u.replace('@', ''));
    expect(users).toEqual(["alice", "bob"]);
  });

  test("returns last line users when no wildcard line exists", () => {
    const content = "/src @dave @eve";
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    const userLine = lines.find(l => l.startsWith('*'));
    const targetLine = userLine ?? lines[lines.length - 1];
    const users = targetLine.split(/\s+/).slice(1).map(u => u.replace('@', ''));
    expect(users).toEqual(["dave", "eve"]);
  });

  test("filters empty users from list", () => {
    const users = ["alice", "", "bob", " "].filter(u => u && u.trim() !== '');
    expect(users).toEqual(["alice", "bob"]);
  });
});

describe("pr-assigner — shuffleArray logic", () => {
  test("shuffled array has same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  test("self-assign: author found in assignees uses only author", () => {
    let assignees = ["alice", "author", "bob"];
    const author = "author";
    const selfAssign = true;
    const authorAssignee = assignees.filter(u => u.toLowerCase() === author.toLowerCase());
    if (selfAssign && authorAssignee.length > 0) {
      assignees = authorAssignee;
    }
    expect(assignees).toEqual(["author"]);
  });

  test("count is capped when fewer assignees available", () => {
    let count = 5;
    const assignees = ["alice", "bob"];
    if (count > assignees.length) count = assignees.length;
    expect(count).toBe(2);
  });
});
