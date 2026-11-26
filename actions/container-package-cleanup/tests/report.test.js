import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockCore = {
  info: jest.fn(),
  summary: {
    addRaw: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined)
  }
};

jest.unstable_mockModule('@actions/core', () => mockCore);

const { default: ContainerReport } = await import('../src/reports/containerReport.js');
const { default: MavenReport } = await import('../src/reports/mavenReport.js');

describe("ContainerReport", () => {
  let report;

  beforeEach(() => {
    report = new ContainerReport();
    jest.clearAllMocks();

    mockCore.summary.addRaw = jest.fn().mockReturnThis();
    mockCore.summary.addTable = jest.fn().mockReturnThis();
    mockCore.summary.write = jest.fn().mockResolvedValue(undefined);
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

    expect(mockCore.info).toHaveBeenCalledWith("❗️No packages or versions to delete.");
    expect(mockCore.summary.addRaw).not.toHaveBeenCalled();
    expect(mockCore.summary.addTable).not.toHaveBeenCalled();
    expect(mockCore.summary.write).not.toHaveBeenCalled();
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

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("## 🎯 Container Package Cleanup Summary (Dry Run)"));
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Packages Selected:** 2"));
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Selected Versions:** 3"));
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Deleted Versions:** 0 (dry run)"));
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("Dry run completed. No version was deleted."));
    expect(mockCore.summary.addRaw).not.toHaveBeenCalledWith(expect.stringContaining("Total Deleted Versions"));
    expect(mockCore.summary.addTable).toHaveBeenCalledWith([
      [
        { data: "Package", header: true },
        { data: "Selected Versions", header: true },
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
    expect(mockCore.summary.write).toHaveBeenCalled();
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

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("## 🎯 Container Package Cleanup Summary "));
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Packages Selected:** 1"));
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("**Selected Versions:** 1"));
    expect(mockCore.summary.addRaw).not.toHaveBeenCalledWith(expect.stringContaining("Total Deleted Versions"));
    expect(mockCore.summary.addTable).toHaveBeenCalledWith([
      [
        { data: "Package", header: true },
        { data: "Selected Versions", header: true },
      ],
      [
        "<strong>test-package</strong>&#10;(ID: 123)",
        "• <code>v1</code> — latest",
      ],
    ]);
    expect(mockCore.summary.write).toHaveBeenCalled();
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

    expect(mockCore.summary.addTable).toHaveBeenCalledWith([
      [
        { data: "Package", header: true },
        { data: "Selected Versions", header: true },
      ],
      [
        "<strong>test-package</strong>&#10;(ID: 123)",
        "• <code>v1</code> — <em>sha256:abc123</em><br>• <code>v2</code> — <em>sha256:def456</em>",
      ],
    ]);
    expect(mockCore.summary.write).toHaveBeenCalled();
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

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("❗️Cleanup operation completed with errors"));
    expect(mockCore.summary.write).toHaveBeenCalled();
  });

  describe("deletion result", () => {
    const baseContext = {
      dryRun: false,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: [],
      excludedTags: [],
      filteredPackagesWithVersionsForDelete: [
        {
          package: { name: "test-package", id: "123" },
          versions: [1, 2, 3, 4].map(n => ({ id: `v${n}`, name: `sha256:${n}`, metadata: { container: { tags: [`t${n}`] } } }))
        }
      ]
    };
    const summaryText = () => mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');

    test("counts what was deleted, skipped, failed and never reached", async () => {
      await report.writeSummary({
        ...baseContext,
        progress: { selected: 4, deleted: 1, skipped: 1, failed: 1, simulated: 0 },
        deleteStatus: [{ success: false, critical: false }]
      });

      const text = summaryText();
      expect(text).toContain("**Selected Versions:** 4");
      expect(text).toContain("**Deleted Versions:** 1");
      expect(text).toContain("**Skipped Versions:** 1");
      expect(text).toContain("**Failed Versions:** 1");
      expect(text).toContain("**Not Processed Versions:** 1");
      expect(text).toContain("completed with errors");
    });

    test("shows only the deleted count for a clean run", async () => {
      await report.writeSummary({
        ...baseContext,
        progress: { selected: 4, deleted: 4, skipped: 0, failed: 0, simulated: 0 }
      });

      const text = summaryText();
      expect(text).toContain("**Deleted Versions:** 4");
      expect(text).not.toContain("Skipped Versions");
      expect(text).not.toContain("Failed Versions");
      expect(text).not.toContain("Not Processed Versions");
      expect(text).toContain("Cleanup operation completed successfully.");
    });

    test("reports the error that stopped the run and never a success", async () => {
      await report.writeSummary({
        ...baseContext,
        progress: { selected: 4, deleted: 2, skipped: 0, failed: 1, simulated: 0 },
        deleteStatus: [],
        deletionError: "403 rate limit <exceeded>"
      });

      const text = summaryText();
      expect(text).toContain("Cleanup stopped with an error: 403 rate limit &lt;exceeded&gt;");
      expect(text).toContain("**Deleted Versions:** 2");
      expect(text).toContain("**Not Processed Versions:** 1");
      expect(text).not.toContain("completed successfully");
      expect(mockCore.summary.write).toHaveBeenCalled();
    });

    test("labels every version with what happened to it", async () => {
      await report.writeSummary({
        ...baseContext,
        progress: {
          selected: 4, deleted: 1, skipped: 1, failed: 1, simulated: 0,
          outcomes: new Map([["v1", "deleted"], ["v2", "skipped"], ["v3", "failed"]])
        },
        deletionError: "403 rate limit",
        deleteStatus: []
      });

      const [[, row]] = mockCore.summary.addTable.mock.calls[0][0].slice(1).map(r => [r[0], r[1]]);
      expect(row).toContain("<code>v1</code> — t1 — ✅ deleted");
      expect(row).toContain("<code>v2</code> — t2 — ⚠️ skipped");
      expect(row).toContain("<code>v3</code> — t3 — ❌ failed");
      expect(row).toContain("<code>v4</code> — t4 — ⏳ not processed");
    });

    test("adds no per-version label in a dry run", async () => {
      await report.writeSummary({
        ...baseContext,
        dryRun: true,
        progress: { selected: 4, deleted: 0, skipped: 0, failed: 0, simulated: 4, outcomes: new Map() }
      });

      const [[, row]] = mockCore.summary.addTable.mock.calls[0][0].slice(1).map(r => [r[0], r[1]]);
      expect(row).toContain("<code>v1</code> — t1<br>");
      expect(row).not.toContain("not processed");
    });

    test("does not count candidates as deleted in a dry run, whatever the progress says", async () => {
      await report.writeSummary({
        ...baseContext,
        dryRun: true,
        progress: { selected: 4, deleted: 0, skipped: 0, failed: 0, simulated: 4 }
      });

      const text = summaryText();
      expect(text).toContain("**Selected Versions:** 4");
      expect(text).toContain("**Deleted Versions:** 0 (dry run)");
      expect(text).not.toContain("Not Processed Versions");
    });
  });

  describe("incomplete cleanup", () => {
    const incompleteCleanup = [
      { package: "test-image", failedTags: [{ tag: "latest", reason: "boom" }, { tag: "v1", reason: "denied" }] }
    ];
    const baseContext = {
      dryRun: false,
      thresholdDays: 30,
      thresholdDate: new Date('2025-01-01'),
      includedTags: [],
      excludedTags: [],
      deleteStatus: []
    };
    const summaryText = () => mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');

    test("lists affected packages and tags after the deletion table", async () => {
      await report.writeSummary({
        ...baseContext,
        filteredPackagesWithVersionsForDelete: [
          { package: { name: "test-package", id: "123" }, versions: [{ id: "v1", name: "sha256:abc", metadata: { container: { tags: ["old"] } } }] }
        ],
        incompleteCleanup
      });

      const text = summaryText();
      expect(text).toContain("Incomplete cleanup");
      expect(text).toContain("<strong>test-image</strong>");
      expect(text).toContain("<code>latest</code>, <code>v1</code>");
      expect(mockCore.summary.write).toHaveBeenCalled();
    });

    test("is still written when the protective block left nothing to delete", async () => {
      await report.writeSummary({
        ...baseContext,
        filteredPackagesWithVersionsForDelete: [],
        incompleteCleanup
      });

      expect(mockCore.info).toHaveBeenCalledWith("❗️No packages or versions to delete.");
      expect(summaryText()).toContain("Incomplete cleanup");
      expect(summaryText()).toContain("<code>latest</code>");
      expect(mockCore.summary.addTable).not.toHaveBeenCalled();
      expect(mockCore.summary.write).toHaveBeenCalledTimes(1);
    });

    test("is not written when no cleanup was skipped", async () => {
      await report.writeSummary({
        ...baseContext,
        filteredPackagesWithVersionsForDelete: [
          { package: { name: "test-package", id: "123" }, versions: [{ id: "v1", name: "sha256:abc", metadata: { container: { tags: ["old"] } } }] }
        ],
        incompleteCleanup: []
      });

      expect(summaryText()).not.toContain("Incomplete cleanup");
    });
  });
});

describe("MavenReport", () => {
  const baseContext = {
    dryRun: false,
    thresholdDays: 30,
    thresholdDate: new Date('2025-01-01'),
    includedTags: [],
    excludedTags: [],
    filteredPackagesWithVersionsForDelete: [
      {
        package: { name: "lib", id: "9" },
        versions: [1, 2, 3].map(n => ({ id: n, name: `1.${n}-SNAPSHOT`, created_at: '2024-01-01T00:00:00Z' }))
      }
    ]
  };
  const summaryText = () => mockCore.summary.addRaw.mock.calls.map(c => c[0]).join('');

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore.summary.addRaw = jest.fn().mockReturnThis();
    mockCore.summary.addTable = jest.fn().mockReturnThis();
    mockCore.summary.write = jest.fn().mockResolvedValue(undefined);
  });

  test("does not count candidates as deleted in a dry run", async () => {
    await new MavenReport().writeSummary({
      ...baseContext,
      dryRun: true,
      progress: { selected: 3, deleted: 0, skipped: 0, failed: 0, simulated: 3 },
      deleteStatus: []
    });

    expect(summaryText()).toContain("**Selected Versions:** 3");
    expect(summaryText()).toContain("**Deleted Versions:** 0 (dry run)");
    expect(summaryText()).not.toContain("Total Deleted Versions");
  });

  test("counts the versions of a run that stopped with an error", async () => {
    await new MavenReport().writeSummary({
      ...baseContext,
      progress: { selected: 3, deleted: 1, skipped: 0, failed: 1, simulated: 0 },
      deleteStatus: [],
      deletionError: "403 rate limit"
    });

    const text = summaryText();
    expect(text).toContain("**Deleted Versions:** 1");
    expect(text).toContain("**Failed Versions:** 1");
    expect(text).toContain("**Not Processed Versions:** 1");
    expect(text).toContain("Cleanup stopped with an error: 403 rate limit");
    expect(text).not.toContain("completed successfully");
  });

  test("adds a result column that names what happened to every version", async () => {
    await new MavenReport().writeSummary({
      ...baseContext,
      progress: { selected: 3, deleted: 1, skipped: 0, failed: 1, simulated: 0, outcomes: new Map([[1, "deleted"], [2, "failed"]]) },
      deleteStatus: [],
      deletionError: "403 rate limit"
    });

    const table = mockCore.summary.addTable.mock.calls[0][0];
    expect(table[0].map(c => c.data)).toEqual(["Package", "Version", "Created At", "Result"]);
    expect(table.slice(1).map(r => r[3])).toEqual(["✅ deleted", "❌ failed", "⏳ not processed"]);
  });

  test("has no result column in a dry run", async () => {
    await new MavenReport().writeSummary({
      ...baseContext,
      dryRun: true,
      progress: { selected: 3, deleted: 0, skipped: 0, failed: 0, simulated: 3, outcomes: new Map() },
      deleteStatus: []
    });

    expect(mockCore.summary.addTable.mock.calls[0][0][0].map(c => c.data)).toEqual(["Package", "Version", "Created At"]);
  });

  test("still writes a success message for a clean run", async () => {
    await new MavenReport().writeSummary({
      ...baseContext,
      progress: { selected: 3, deleted: 3, skipped: 0, failed: 0, simulated: 0 },
      deleteStatus: []
    });

    expect(summaryText()).toContain("**Deleted Versions:** 3");
    expect(summaryText()).toContain("Cleanup operation completed successfully.");
  });
});
