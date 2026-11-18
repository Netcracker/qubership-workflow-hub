import { beforeEach, describe, expect, jest, test } from "@jest/globals";

jest.unstable_mockModule("@actions/core", () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
}));
jest.unstable_mockModule("@qubership/action-logger", () => ({
  default: { warn: jest.fn(), dim: jest.fn() },
}));

const { default: RefNormalizer } = await import("../src/extractor.js");
const core = await import("@actions/core");

describe("RefNormalizer", () => {
    let normalizer;

    beforeEach(() => {
        jest.clearAllMocks();
        normalizer = new RefNormalizer();
    });

    test("should replace all slashes with '-' by default for branch", () => {
        const ref = "refs/heads/feature/awesome/path";
        const result = normalizer.extract(ref);

        expect(result.rawName).toBe("feature/awesome/path");
        expect(result.normalizedName).toBe("feature-awesome-path");
        expect(result.isTag).toBe(false);
        expect(result.isBranch).toBe(true);
        expect(result.type).toBe("branch");

    });

    test.each([
        { symbol: "_", expected: "feature_awesome_path" },
        { symbol: ".", expected: "feature.awesome.path" },
        { symbol: "__", expected: "feature__awesome__path" },
    ])("should replace every slash with $symbol", ({ symbol, expected }) => {
        const result = normalizer.extract("refs/heads/feature/awesome/path", symbol);

        expect(result.rawName).toBe("feature/awesome/path");
        expect(result.normalizedName).toBe(expected);
    });

    test("should replace slashes in tags too", () => {
        const ref = "refs/tags/release/v1.0.0";
        const result = normalizer.extract(ref);

        expect(result.normalizedName).toBe("release-v1.0.0");
        expect(result.type).toBe("tag");
        expect(result.isTag).toBe(true);
        expect(result.isBranch).toBe(false);
    });

    test("should handle refs without prefix as unknown", () => {
        const ref = "custom/branch/name";
        const result = normalizer.extract(ref);

        expect(result.normalizedName).toBe("custom-branch-name");
        expect(result.type).toBe("unknown");
        expect(result.isTag).toBe(false);
        expect(result.isBranch).toBe(false);
    });

    test("should do nothing if ref is missing", () => {
        const result = normalizer.extract();
        expect(result.normalizedName).toBe("");
        expect(result.type).toBe("unknown");
        expect(core.setFailed).toHaveBeenCalledWith(
            expect.stringContaining("No ref provided")
        );
    });
});
