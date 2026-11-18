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
jest.unstable_mockModule("@qubership/action-logger", () => ({
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
const { default: log } = await import("@qubership/action-logger");
const { default: ConfigLoader } = await import("../src/loader.js");
const { default: RefNormalizer } = await import("../src/extractor.js");
const { default: run } = await import("../src/index.js");

describe("index.js template rendering", () => {
  let mockConfigLoader;
  let mockRefNormalizer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-02T03:04:05Z"));

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

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should render default template with dynamic values", async () => {
    await run();

    // check that the template was rendered with ref-name, short-sha and timestamp
    const calls = core.setOutput.mock.calls;
    const resultCall = calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toBe("main-8c3c6b6-20260102030405");
    expect(core.setFailed).not.toHaveBeenCalled();
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

    expect(rendered).toBe("main-8c3c6b6-20260102030405, beta, rc");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test("should use built-in defaults when configuration is absent", async () => {
    mockConfigLoader.load.mockReturnValue(null);

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toBe("main-20260102030405-101");
    expect(core.setOutput).toHaveBeenCalledWith("dist-tag", "latest");
    expect(core.setFailed).not.toHaveBeenCalled();
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

  test("should truncate a long tag and preserve subsequent tags", async () => {
    mockConfigLoader.load.mockReturnValue({
      "default-template": "a".repeat(140) + ", {{short-sha}}",
      "default-tag": "latest"
    });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith("result", "a".repeat(128) + ", 8c3c6b6");
    expect(core.setFailed).not.toHaveBeenCalled();
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
