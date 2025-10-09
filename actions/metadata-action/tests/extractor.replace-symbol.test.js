const RefNormalizer = require("../src/extractor");

jest.mock("@actions/core");

describe("RefNormalizer replace-symbol parameter", () => {
  let normalizer;

  beforeEach(() => {
    jest.clearAllMocks();
    normalizer = new RefNormalizer();
  });

  test.each([
    { symbol: "-", expected: "feature-awesome-path" },
    { symbol: "_", expected: "feature_awesome_path" },
    { symbol: ".", expected: "feature.awesome.path" },
    { symbol: "__", expected: "feature__awesome__path" },
  ])("should replace '/' with '%s'", ({ symbol, expected }) => {
    const ref = "refs/heads/feature/awesome/path";

    const result = normalizer.extract(ref, symbol);

    expect(result.normalizedName).toBe(expected);

    expect(result.rawName).toBe("feature/awesome/path");

    expect(result.normalizedName.includes("/")).toBe(false);
  });
});
