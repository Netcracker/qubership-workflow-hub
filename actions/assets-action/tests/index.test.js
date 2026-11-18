import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const getInput = jest.fn();
const setFailed = jest.fn();
const stat = jest.fn();
const existsSync = jest.fn();
const statSync = jest.fn();
const createGlob = jest.fn();
const archive = jest.fn();
const upload = jest.fn();
const writeSummary = jest.fn();

jest.unstable_mockModule("@actions/core", () => ({
  getInput, setFailed, info: jest.fn(), warning: jest.fn(), error: jest.fn(),
}));
jest.unstable_mockModule("@actions/github", () => ({
  context: { repo: { owner: "owner", repo: "repo" } },
}));
jest.unstable_mockModule("node:fs", () => ({
  default: { promises: { stat }, existsSync, statSync },
}));
jest.unstable_mockModule("@actions/glob", () => ({ create: createGlob }));
jest.unstable_mockModule("../src/archiveUtils.js", () => ({ addToArchive: archive }));
jest.unstable_mockModule("../src/assetsUploader.js", () => ({
  default: jest.fn().mockImplementation(() => ({ upload })),
}));
jest.unstable_mockModule("../src/report.js", () => ({
  default: jest.fn().mockImplementation(() => ({ writeSummary })),
}));
jest.unstable_mockModule("../src/retry.js", () => ({
  retryAsync: fn => fn(),
}));

async function executeAction() {
  const { default: execution } = await import("../src/index.js");
  await execution;
}

describe("assets action execution", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    getInput.mockImplementation(name => ({
      tag: "test-release", "item-path": "files", retries: "1",
    })[name] || "");
    existsSync.mockReturnValue(true);
    stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true });
    statSync.mockReturnValue({ isDirectory: () => false });
    createGlob.mockResolvedValue({
      async *globGenerator() { yield "file.txt"; },
    });
    archive.mockResolvedValue("files.zip");
    upload.mockResolvedValue(undefined);
    writeSummary.mockResolvedValue(undefined);
  });

  test("uploads a matching file and reports success", async () => {
    await executeAction();
    expect(upload).toHaveBeenCalledWith("file.txt");
    expect(archive).not.toHaveBeenCalled();
    expect(writeSummary).toHaveBeenCalledWith(
      [expect.objectContaining({ fileName: "file.txt", success: "Success" })],
      "owner", "repo", "test-release"
    );
    expect(setFailed).not.toHaveBeenCalled();
  });

  test("archives a directory before uploading", async () => {
    stat.mockResolvedValue({ isDirectory: () => true });
    statSync.mockReturnValue({ isDirectory: () => true });
    await executeAction();
    expect(archive).toHaveBeenCalledWith("file.txt", "zip", 9);
    expect(upload).toHaveBeenCalledWith("files.zip");
    expect(setFailed).not.toHaveBeenCalled();
  });

  test("fails when no input paths match", async () => {
    createGlob.mockResolvedValue({ async *globGenerator() {} });
    await executeAction();
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining("No files or directories matched"));
    expect(upload).not.toHaveBeenCalled();
  });

  test("fails and reports an exhausted upload error", async () => {
    upload.mockRejectedValue(new Error("Upload denied"));
    await executeAction();
    expect(writeSummary).toHaveBeenCalledWith(
      [expect.objectContaining({ success: "Failed", error: expect.stringContaining("Upload denied") })],
      "owner", "repo", "test-release"
    );
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining("could not be prepared or uploaded"));
  });

  test("fails and reports an archive error without uploading", async () => {
    stat.mockResolvedValue({ isDirectory: () => true });
    statSync.mockReturnValue({ isDirectory: () => true });
    archive.mockRejectedValue(new Error("Archive failed"));
    await executeAction();
    expect(upload).not.toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining("could not be prepared or uploaded"));
  });
});
