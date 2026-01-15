const core = require("@actions/core");
const ContainerReport = require("../src/reports/containerReport");

jest.mock("@actions/core");

describe("ContainerReport", () => {
  let report;

  beforeEach(() => {
    report = new ContainerReport();
    jest.clearAllMocks();

    // Mock core.summary methods
    core.summary = {
      addRaw: jest.fn().mockReturnThis(),
      addTable: jest.fn().mockReturnThis(),
      write: jest.fn().mockResolvedValue(undefined)
    };
  });

  test("should log a message if no packages or versions to delete", async () => {
    const context = {
      filteredPackagesWithVersionsForDelete: [],
      dryRun: false,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: [],
      excludedTags: [],
      deleteStatus: []
    };

    await report.writeSummary(context);

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
          { id: "v1", name: "sha256:abc", metadata: { container: { tags: ["latest"] } } },
          { id: "v2", name: "sha256:def", metadata: { container: { tags: ["stable"] } } },
        ],
      },
      {
        package: { name: "another-package", id: "456" },
        versions: [
          { id: "v3", name: "sha256:ghi", metadata: { container: { tags: ["beta"] } } },
        ],
      },
    ];

    const context = {
      filteredPackagesWithVersionsForDelete: packages,
      dryRun: true,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: ['dependabot-*'],
      excludedTags: ['latest', 'main'],
      deleteStatus: []
    };

    await report.writeSummary(context);

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
          { id: "v1", name: "sha256:abc", metadata: { container: { tags: ["latest"] } } },
        ],
      },
    ];

    const context = {
      filteredPackagesWithVersionsForDelete: packages,
      dryRun: false,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: [],
      excludedTags: ['main'],
      deleteStatus: []
    };

    await report.writeSummary(context);

    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("## 🎯 Container Package Cleanup Summary "));
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

  test("should handle versions without tags (untagged/dangling)", async () => {
    const packages = [
      {
        package: { name: "test-package", id: "123" },
        versions: [
          { id: "v1", name: "sha256:abc123", metadata: { container: { tags: [] } } },
          { id: "v2", name: "sha256:def456", metadata: { container: { tags: [] } } },
        ],
      },
    ];

    const context = {
      filteredPackagesWithVersionsForDelete: packages,
      dryRun: false,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: [],
      excludedTags: [],
      deleteStatus: []
    };

    await report.writeSummary(context);

    expect(core.summary.addTable).toHaveBeenCalledWith([
      [
        { data: "Package", header: true },
        { data: "Deleted Versions", header: true },
      ],
      [
        "<strong>test-package</strong>&#10;(ID: 123)",
        "• <code>v1</code> — <em>sha256:abc123</em><br>• <code>v2</code> — <em>sha256:def456</em>",
      ],
    ]);
    expect(core.summary.write).toHaveBeenCalled();
  });

  test("should show error message when deleteStatus contains errors", async () => {
    const packages = [
      {
        package: { name: "test-package", id: "123" },
        versions: [
          { id: "v1", name: "sha256:abc", metadata: { container: { tags: ["latest"] } } },
        ],
      },
    ];

    const context = {
      filteredPackagesWithVersionsForDelete: packages,
      dryRun: false,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: [],
      excludedTags: [],
      deleteStatus: [
        { success: false, status: 'error' }
      ]
    };

    await report.writeSummary(context);

    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("❗️Cleanup operation completed with errors"));
    expect(core.summary.write).toHaveBeenCalled();
  });
});