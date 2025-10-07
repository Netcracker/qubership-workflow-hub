const core = require("@actions/core");
const github = require("@actions/github");
const ConfigLoader = require("../src/loader");
const RefNormalizer = require("../src/extractor");
const Report = require("../src/report");

jest.mock("@actions/core");
jest.mock("@actions/github");
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
            payload: {}
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
                "show-report": "false",
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

        // Проверяем, что извлечение ссылки вызвано
        expect(mockRefNormalizer.extract).toHaveBeenCalledWith("refs/heads/main","-");

        // Проверяем, что записались основные outputs
        expect(core.setOutput).toHaveBeenCalledWith("ref-name", "main");
        expect(core.setOutput).toHaveBeenCalledWith("short-sha", "8c3c6b6");

        // Проверяем успешный лог
        expect(core.info).toHaveBeenCalledWith(
            expect.stringContaining("✅ Action completed successfully")
        );

        // Проверяем, что не было ошибок
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

        expect(core.warning).toHaveBeenCalledWith(
            expect.stringContaining("fallback to 7")
        );
    });

    test("should handle missing config gracefully", async () => {
        mockConfigLoader.fileExists = false;

        await run();

        // Даже без конфигурации должны быть выведены шаблоны по умолчанию
        expect(core.warning).toHaveBeenCalledWith(
            expect.stringContaining("using default")
        );
    });
});
