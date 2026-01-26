const core = require("@actions/core");
const github = require("@actions/github");
const log = require("@netcracker/action-logger");
const ConfigLoader = require("../src/loader");
const RefNormalizer = require("../src/extractor");
const Report = require("../src/report");

jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("@netcracker/action-logger", () => ({
    group: jest.fn(),
    endGroup: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    dim: jest.fn(),
    setDebug: jest.fn(),
    debugJSON: jest.fn()
}));
jest.mock("../src/loader");
jest.mock("../src/extractor");
jest.mock("../src/report");

const run = require("../src/index");

describe("index.js (main action)", () => {
    let mockConfigLoader;
    let mockRefNormalizer;
    let mockReport;

    beforeEach(() => {
        jest.clearAllMocks();

        github.context = {
            eventName: "push",
            ref: "refs/heads/main",
            sha: "8c3c6b66a6af28f66b17eb5190458d04a2a62e34",
            runNumber: 42,
            runId: 12345,
            actor: "test-actor",
            workflow: "test-workflow",
            payload: {},
            repo: { owner: "test-owner", repo: "test-repo" }
        };

        mockConfigLoader = {
            load: jest.fn().mockReturnValue({
                "default-template": "{{ref-name}}-{{short-sha}}",
                "default-tag": "latest",
                "branches-template": [{ "main": "main-template" }],
                "distribution-tag": [{ "main": "stable" }]
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

        mockReport = { writeSummary: jest.fn().mockResolvedValue(true) };
        Report.mockImplementation(() => mockReport);

        core.getInput.mockImplementation((name) => {
            const map = {
                ref: "refs/heads/main",
                "short-sha": "7",
                "dry-run": "false",
                "show-report": "true",
                "debug": "false"
            };
            return map[name];
        });

        core.info = jest.fn();
        core.warning = jest.fn();
        core.setOutput = jest.fn();
        core.setFailed = jest.fn();
    });

    test("should complete successfully and set expected outputs", async () => {
        await run();

        // check that ref extraction was called
        expect(mockRefNormalizer.extract).toHaveBeenCalledWith("refs/heads/main","-");

        // check that main outputs were set
        expect(core.setOutput).toHaveBeenCalledWith("ref-name", "main");
        expect(core.setOutput).toHaveBeenCalledWith("short-sha", "8c3c6b6");

        // check for successful log
        expect(log.success).toHaveBeenCalledWith(
            expect.stringContaining("Action completed successfully")
        );

        // check that report summary was written
        expect(mockReport.writeSummary).toHaveBeenCalled();
        const reportArg = mockReport.writeSummary.mock.calls[0][0];
        expect(reportArg.github).toEqual({
            repository: "test-owner/test-repo",
            ref: "refs/heads/main",
            sha: "8c3c6b66a6af28f66b17eb5190458d04a2a62e34",
            actor: "test-actor",
            workflow: "test-workflow",
            run_id: 12345,
            run_number: 42,
            event_name: "push"
        });

        // check that setFailed was not called
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    test("should fallback short-sha length if invalid input", async () => {
        core.getInput.mockImplementation((name) => {
            const map = {
                ref: "refs/heads/main",
                "short-sha": "abc",
                "dry-run": "false",
                "show-report": "false",
                "debug": "false"
            };
            return map[name];
        });

        await run();

        expect(log.warn).toHaveBeenCalledWith(
            expect.stringContaining("fallback to 7")
        );
    });

    test("should handle missing config gracefully", async () => {
        mockConfigLoader.load.mockReturnValue(null);

        await run();

        // Even without configuration, default templates should be applied
        expect(log.warn).toHaveBeenCalledWith(
            expect.stringContaining("using default")
        );
    });

    test("should extract semver parts from prerelease tag", async () => {
        mockRefNormalizer.extract.mockReturnValue({
            rawName: "refs/tags/v1.2.3-rc.1",
            normalizedName: "v1.2.3-rc.1",
            isTag: true,
            isBranch: false,
            type: "tag"
        });

        await run();

        expect(core.setOutput).toHaveBeenCalledWith("major", "1");
        expect(core.setOutput).toHaveBeenCalledWith("minor", "2");
        expect(core.setOutput).toHaveBeenCalledWith("patch", "3");
    });

    test("should warn on unknown template placeholders", async () => {
        mockConfigLoader.load.mockReturnValue({
            "default-template": "{{ref-name}}-{{unknown-placeholder}}",
            "default-tag": "latest"
        });

        await run();

        expect(log.warn).toHaveBeenCalledWith(
            expect.stringContaining("Unknown template placeholders")
        );
    });
});
