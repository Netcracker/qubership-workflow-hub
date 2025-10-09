const core = require("@actions/core");
const github = require("@actions/github");
const ConfigLoader = require("../src/loader");
const RefNormalizer = require("../src/extractor");

jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("../src/loader");
jest.mock("../src/extractor");
jest.mock("../src/report");

const run = require("../src/index");

describe("index.js template rendering", () => {
  let mockConfigLoader;
  let mockRefNormalizer;

  beforeEach(() => {
    jest.clearAllMocks();

    github.context = {
      eventName: "push",
      ref: "refs/heads/main",
      sha: "8c3c6b66a6af28f66b17eb5190458d04a2a62e34",
      runNumber: 101,
      payload: {}
    };

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

    core.info = jest.fn();
    core.warning = jest.fn();
    core.setOutput = jest.fn();
    core.setFailed = jest.fn();
  });

  test("✅ should render default template with dynamic values", async () => {
    await run();

    // Проверяем, что шаблон отрендерился с ref-name, short-sha и timestamp
    const calls = core.setOutput.mock.calls;
    const resultCall = calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toContain("main");
    expect(rendered).toContain("8c3c6b6"); // short-sha (7 символов)
    expect(rendered).toMatch(/\d{8}\d{6}/); // timestamp YYYYMMDDhhmmss
  });

  test("🧩 should merge extra tags if merge-tags=true", async () => {
    core.getInput.mockImplementation((name) => {
      const map = {
        ref: "refs/heads/main",
        "short-sha": "7",
        "dry-run": "false",
        "show-report": "false",
        "debug": "false",
        "extra-tags": "beta, rc",
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
  });

  test("should fallback to default-template if not found in config", async () => {
    mockConfigLoader.fileExists = false;

    await run();

    const resultCall = core.setOutput.mock.calls.find(([key]) => key === "result");
    const rendered = resultCall ? resultCall[1] : null;

    expect(rendered).toContain("main"); // fallback works
    expect(core.warning).not.toHaveBeenCalledWith(expect.stringMatching(/fallback to/));
  });
});
