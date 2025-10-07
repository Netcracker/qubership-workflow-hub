const core = require("@actions/core");
const RefNormalizer = require("../src/extractor");

jest.mock("@actions/core");

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
        expect(result.type).toBe("branch");

        // Проверим, что нет ни одного '/'
        expect(result.normalizedName.includes("/")).toBe(false);
    });

    test("should replace slashes with custom symbol '_'", () => {
        const ref = "refs/heads/feature/awesome";
        const result = normalizer.extract(ref, "_");

        expect(result.normalizedName).toBe("feature_awesome");
        expect(result.normalizedName).not.toContain("/");
        expect(result.normalizedName).toContain("_");
    });

    test("should replace slashes in tags too", () => {
        const ref = "refs/tags/release/v1.0.0";
        const result = normalizer.extract(ref);

        expect(result.normalizedName).toBe("release-v1.0.0");
        expect(result.type).toBe("tag");
        expect(result.isTag).toBe(true);
    });

    test("should handle refs without prefix as unknown", () => {
        const ref = "custom/branch/name";
        const result = normalizer.extract(ref);

        expect(result.normalizedName).toBe("custom-branch-name");
        expect(result.type).toBe("unknown");
        expect(result.isTag).toBe(false);
    });

    test("should normalize deeply nested branch names", () => {
        const ref = "refs/heads/feature/super/deep/nested/path";
        const result = normalizer.extract(ref, "_");

        // Проверяем, что все '/' заменились на '_'
        expect(result.normalizedName).toBe("feature_super_deep_nested_path");
        expect(result.normalizedName.split("_").length).toBe(5);
        expect(result.normalizedName).not.toContain("/");
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
