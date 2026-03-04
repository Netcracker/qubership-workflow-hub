import { jest } from "@jest/globals";

jest.unstable_mockModule("@actions/core", () => ({
    getInput: jest.fn(),
    setOutput: jest.fn(),
    setFailed: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    notice: jest.fn(),
    summary: { addRaw: jest.fn(), addTable: jest.fn(), write: jest.fn() },
}));
jest.unstable_mockModule("@actions/github", () => ({
    context: {
        eventName: "push",
        ref: "refs/heads/main",
        sha: "8c3c6b66a6af28f66b17eb5190458d04a2a62e34",
        runNumber: 101,
        runId: 12345,
        actor: "test-actor",
        workflow: "test-workflow",
        payload: {},
        repo: { owner: "test-owner", repo: "test-repo" }
    }
}));
jest.unstable_mockModule("@netcracker/action-logger", () => ({
    default: {
        group: jest.fn(),
        endGroup: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        dim: jest.fn(),
        setDebug: jest.fn(),
        debugJSON: jest.fn(),
        notice: jest.fn(),
    },
}));
jest.unstable_mockModule("../src/loader.js", () => ({
    default: jest.fn(),
}));
jest.unstable_mockModule("../src/extractor.js", () => ({
    default: jest.fn(),
}));
jest.unstable_mockModule("../src/report.js", () => ({
    default: jest.fn(),
}));

const core = await import("@actions/core");
const github = await import("@actions/github");
const { default: log } = await import("@netcracker/action-logger");
const { default: ConfigLoader } = await import("../src/loader.js");
const { default: RefNormalizer } = await import("../src/extractor.js");
const { default: run } = await import("../src/index.js");

describe("index.js template rendering", () => {
  let mockConfigLoader;
  let mockRefNormalizer;

  beforeEach(() => {
    jest.clearAllMocks();

    github.context.eventName = "push";
    github.context.ref = "refs/heads/main";
    github.context.sha = "8c3c6b66a6af28f66b17eb5190458d04a2a62e34";
    github.context.runNumber = 101;
    github.context.runId = 12345;
    github.context.actor = "test-actor";
    github.context.workflow = "test-workflow";
    github.context.payload = {};
    github.context.repo = { owner: "test-owner", repo: "test-repo" };

    mockConfigLoader = {
      load: jest.fn().mockReturnValue({
        "default-template": "{{ref-name}}-{{short-sha}}-{{timestamp}}",
        "default-tag": "latest"
      }),
      fileExists: true
    };
    ConfigLoader.mockImplementation(() => mockConfigLoader);

    mockRefNormalizer = {
      extract: jest.fn().mockReturnValue({
        rawName: "refs/heads/main",
        normalizedName: "main",
        isTag: false,
        isBranch: true,
        type: "branch"
      })
    };
    RefNormalizer.mockImplementation(() => mockRefNormalizer);

    core.getInput.mockImplementation((name) => {
      const map = {
        ref: "refs/heads/main",
        "short-sha": "7",
        "dry-run": "false",
        "show-report": "false",
        "debug": "false",
        "extra-tags": "",
        "merge-tags": "false"
      };
      return map[name];
    });

  });

  test("should render default template with dynamic values", async () => {
    await run();

    // check that the template was rendered with ref-name, short-sha and timestamp
    const calls = core.setOutput.mock.calls;
    const resultCall = calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toContain("main");
    expect(rendered).toContain("8c3c6b6"); // short-sha (7 chars)
    expect(rendered).toMatch(/\d{8}\d{6}/); // timestamp YYYYMMDDhhmmss
  });

  test("should merge extra tags if merge-tags=true", async () => {
    core.getInput.mockImplementation((name) => {
      const map = {
        ref: "refs/heads/main",
        "short-sha": "7",
        "dry-run": "false",
        "show-report": "false",
        "debug": "false",
        "extra-tags": " beta , , rc , ",
        "merge-tags": "true"
      };
      return map[name];
    });

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toContain("beta");
    expect(rendered).toContain("rc");
    expect(rendered).toContain(","); // merged output
    expect(rendered).not.toMatch(/,\s*,/);
  });

  test("should fallback to default-template if not found in config", async () => {
    mockConfigLoader.fileExists = false;

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toContain("main"); // fallback works
    expect(core.warning).not.toHaveBeenCalledWith(expect.stringMatching(/fallback to/));
  });

  test("should render aliases and length modifiers", async () => {
    mockConfigLoader.load.mockReturnValue({
      "default-template": "{{ref_name}}-{{short_sha:4}}-{{dist_tag}}",
      "default-tag": "latest"
    });

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toBe("main-8c3c-latest");
  });

  test("should render length modifiers in template", async () => {
    mockConfigLoader.load.mockReturnValue({
      "default-template": "{{short-sha:4}}",
      "default-tag": "latest"
    });

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toBe("8c3c");
  });

  test("should warn and fallback when branches-template is not an array", async () => {
    mockConfigLoader.load.mockReturnValue({
      "default-template": "{{ref-name}}",
      "default-tag": "latest",
      "branches-template": "oops",
      "distribution-tag": "oops"
    });

    await run();

    expect(log.notice).toHaveBeenCalledWith(
      expect.stringContaining("No template found for ref")
    );
  });

  test("should skip invalid template entries", async () => {
    mockConfigLoader.load.mockReturnValue({
      "default-template": "fallback-template",
      "default-tag": "latest",
      "branches-template": [null, {}, { "main": "main-template" }],
      "distribution-tag": []
    });

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toBe("main-template");
  });
});
