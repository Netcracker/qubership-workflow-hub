import { jest } from "@jest/globals";

const mockCore = {
  info: jest.fn(),
  summary: {
    addRaw: jest.fn(),
    addTable: jest.fn(),
    write: jest.fn().mockResolvedValue(undefined),
  },
};

jest.unstable_mockModule("@actions/core", () => mockCore);

const { default: Report } = await import("../src/report.js");

describe("Report.writeSummary", () => {
  let report;

  beforeEach(() => {
    jest.clearAllMocks();
    report = new Report();
  });

  test("logs info and returns early when items is empty array", async () => {
    await report.writeSummary([], "owner", "repo", "v1.0.0");
    expect(mockCore.info).toHaveBeenCalledWith("❗️ No assets processed.");
    expect(mockCore.summary.addTable).not.toHaveBeenCalled();
  });

  test("logs info and returns early when items is not an array", async () => {
    await report.writeSummary(null, "owner", "repo", "v1.0.0");
    expect(mockCore.info).toHaveBeenCalledWith("❗️ No assets processed.");
  });

  test("writes summary table with Success status", async () => {
    const items = [{ itemPath: "path/file.zip", fileName: "file.zip", success: "Success", error: null }];
    await report.writeSummary(items, "myowner", "myrepo", "v1.0.0");

    expect(mockCore.summary.addTable).toHaveBeenCalledTimes(1);
    const tableData = mockCore.summary.addTable.mock.calls[0][0];
    expect(tableData[1]).toContain("✔️ Uploaded");
    expect(mockCore.summary.write).toHaveBeenCalledTimes(1);
  });

  test("writes summary table with Failed status", async () => {
    const items = [{ itemPath: "path/file.zip", fileName: "file.zip", success: "Failed", error: "Upload error" }];
    await report.writeSummary(items, "owner", "repo", "v1.0.0");

    const tableData = mockCore.summary.addTable.mock.calls[0][0];
    expect(tableData[1]).toContain("❗️ Failed");
  });

  test("writes summary table with NotFound status", async () => {
    const items = [{ itemPath: "path/file.zip", fileName: "file.zip", success: "NotFound", error: null }];
    await report.writeSummary(items, "owner", "repo", "v1.0.0");

    const tableData = mockCore.summary.addTable.mock.calls[0][0];
    expect(tableData[1]).toContain("⚠️ NotFound");
  });

  test("uses '-' as fileName when fileName is missing", async () => {
    const items = [{ itemPath: "path/file.zip", fileName: null, success: "Success", error: null }];
    await report.writeSummary(items, "owner", "repo", "v1.0.0");

    const tableData = mockCore.summary.addTable.mock.calls[0][0];
    expect(tableData[1][1]).toBe("-");
  });

  test("uses '-' as error message when error is null", async () => {
    const items = [{ itemPath: "path/file.zip", fileName: "file.zip", success: "Success", error: null }];
    await report.writeSummary(items, "owner", "repo", "v1.0.0");

    const tableData = mockCore.summary.addTable.mock.calls[0][0];
    expect(tableData[1][3]).toBe("-");
  });

  test("includes owner, repo and releaseTag in summary header", async () => {
    const items = [{ itemPath: "p", fileName: "f", success: "Success", error: null }];
    await report.writeSummary(items, "acme", "myrepo", "v2.5.0");

    const calls = mockCore.summary.addRaw.mock.calls.map(c => c[0]).join("");
    expect(calls).toContain("acme");
    expect(calls).toContain("myrepo");
    expect(calls).toContain("v2.5.0");
  });
});
