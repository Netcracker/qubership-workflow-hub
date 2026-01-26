const _log = require("@netcracker/action-logger");

jest.mock("@netcracker/action-logger", () => ({
  dim: jest.fn(),
  warn: jest.fn(),
}));

const run = require("../src/index");
const {
  generateSnapshotVersionParts,
  extractSemverParts,
  matchesPattern,
  findTemplate,
  fillTemplate,
  normalizeExtraTags,
  _patternCache,
  _PATTERN_CACHE_MAX,
} = run.__testables;

describe("index.js helper functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _patternCache.clear();
  });

  test("generateSnapshotVersionParts returns stable date/time/timestamp", () => {
    const parts = generateSnapshotVersionParts();

    expect(parts.date).toMatch(/^\d{8}$/);
    expect(parts.time).toMatch(/^\d{6}$/);
    expect(parts.timestamp).toBe(`${parts.date}${parts.time}`);
  });

  test("extractSemverParts parses semver and strips v-prefix", () => {
    expect(extractSemverParts("v1.2.3")).toEqual({ major: "1", minor: "2", patch: "3" });
    expect(extractSemverParts("1.2.3-rc.1+build.9")).toEqual({ major: "1", minor: "2", patch: "3" });
  });

  test("extractSemverParts logs and returns empty parts for invalid input", () => {
    const parts = extractSemverParts("not-a-version");

    expect(parts).toEqual({ major: "", minor: "", patch: "" });
  });

  test("matchesPattern supports wildcards and replaces '/' with '-'", () => {
    expect(matchesPattern("feature-awesome", "feature/*")).toBe(true);
    expect(matchesPattern("release-v1.2.3", "release/v1.2.*")).toBe(true);
    expect(matchesPattern("release-v1.3.0", "release/v1.2.*")).toBe(false);
  });

  test("matchesPattern uses bounded cache", () => {
    for (let i = 0; i < _PATTERN_CACHE_MAX + 10; i += 1) {
      matchesPattern(`ref-${i}`, `pattern-${i}*`);
    }

    expect(_patternCache.size).toBeLessThanOrEqual(_PATTERN_CACHE_MAX);
  });

  test("findTemplate skips invalid entries and picks first match", () => {
    const templates = [null, {}, { "feature/*": "feature-template" }, { "feature/other": "unused" }];

    const result = findTemplate("feature-xyz", templates);

    expect(result).toBe("feature-template");
  });

  test("fillTemplate applies length modifier and warns on missing keys", () => {
    const result = fillTemplate("{{ref-name}}-{{short-sha:4}}-{{missing}}", { "ref-name": "main", "short-sha": "8c3c6b6" }, true);

    expect(result).toBe("main-8c3c-{{missing}}");
  });

  test("fillTemplate length modifier clamps by slicing and preserves whitespace", () => {
    const result = fillTemplate("{{short-sha:10}}", { "short-sha": "8c3c6b6" });

    expect(result).toBe("8c3c6b6");
  });

  test("fillTemplate length modifier trims only via slice, not padding", () => {
    const result = fillTemplate("{{value:2}}-{{value:5}}", { value: "abc" });

    expect(result).toBe("ab-abc");
  });

  test("fillTemplate ignores length modifier for non-number patterns", () => {
    const result = fillTemplate("{{short-sha:abc}}", { "short-sha": "8c3c6b6" });

    expect(result).toBe("{{short-sha:abc}}");
  });

  test("fillTemplate ignores negative/zero length modifiers (regex should not match)", () => {
    const result = fillTemplate("{{short-sha:0}}-{{short-sha:-1}}", { "short-sha": "8c3c6b6" });

    expect(result).toBe("-{{short-sha:-1}}");
  });

  test("normalizeExtraTags trims and filters tags", () => {
    expect(normalizeExtraTags(" beta , , rc , ")).toEqual(["beta", "rc"]);
    expect(normalizeExtraTags("")).toEqual([]);
    expect(normalizeExtraTags(null)).toEqual([]);
  });
});
