const core = require("@actions/core");
const Report = require("../src/report");

jest.mock("@actions/core");

describe("Report", () => {
  let report;

  beforeEach(() => {
    report = new Report();
    jest.clearAllMocks();
  });

  test("should log a message if no packages or versions to delete", async () => {
    await report.writeSummary([]);

    expect(core.info).toHaveBeenCalledWith("❗️No packages or versions to delete.");
    expect(core.summary.addRaw).not.toHaveBeenCalled();
    expect(core.summary.addTable).not.toHaveBeenCalled();
    expect(core.summary.write).not.toHaveBeenCalled();
  });

  test("should write a summary with package and version details (dry run)", async () => {
    const packages = [
      {
        package: { name: "test-package", id: "123" },
        versions: [
          { id: "v1", metadata: { container: { tags: ["latest"] } } },
          { id: "v2", metadata: { container: { tags: ["stable"] } } },
        ],
      },
      {
        package: { name: "another-package", id: "456" },
        versions: [
          { id: "v3", metadata: { container: { tags: ["beta"] } } },
        ],
      },
    ];

    await report.writeSummary(packages, true);

    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("## 🎯 Container Package Cleanup Summary (Dry Run)"));
    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Total Packages Processed:** 2"));
    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Total Deleted Versions:** 3"));
    expect(core.summary.addTable).toHaveBeenCalledWith([
      [
        { data: "Package", header: true },
        { data: "Deleted Versions", header: true },
      ],
      [
        "<strong>test-package</strong>&#10;(ID: 123)",
        "• <code>v1</code> — latest<br>• <code>v2</code> — stable",
      ],
      [
        "<strong>another-package</strong>&#10;(ID: 456)",
        "• <code>v3</code> — beta",
      ],
    ]);
    expect(core.summary.write).toHaveBeenCalled();
  });

  test("should write a summary with package and version details (non-dry run)", async () => {
    const packages = [
      {
        package: { name: "test-package", id: "123" },
        versions: [
          { id: "v1", metadata: { container: { tags: ["latest"] } } },
        ],
      },
    ];

    await report.writeSummary(packages, false);

    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("## 🎯 Container Package Cleanup Summary"));
    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Total Packages Processed:** 1"));
    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Total Deleted Versions:** 1"));
    expect(core.summary.addTable).toHaveBeenCalledWith([
      [
        { data: "Package", header: true },
        { data: "Deleted Versions", header: true },
      ],
      [
        "<strong>test-package</strong>&#10;(ID: 123)",
        "• <code>v1</code> — latest",
      ],
    ]);
    expect(core.summary.write).toHaveBeenCalled();
  });
});