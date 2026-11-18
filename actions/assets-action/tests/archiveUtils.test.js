import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";

jest.unstable_mockModule("@actions/core", () => ({ info: jest.fn() }));
const { addToArchive } = await import("../src/archiveUtils.js");
let root;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "assets-archive-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("archive creation", () => {
  test.each(["zip", "tar", "tar.gz"])("creates a non-empty %s archive from a directory", async (type) => {
    const folder = path.join(root, "files");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "example.txt"), "archive content");

    const archive = await addToArchive(folder, type, 9);
    const data = await fs.readFile(archive);

    expect(archive).toBe(path.join(root, "files." + type));
    if (type === "zip") {
      expect(data.subarray(0, 2).toString()).toBe("PK");
    } else {
      const tar = type === "tar.gz" ? gunzipSync(data) : data;
      expect(tar.includes(Buffer.from("example.txt"))).toBe(true);
      expect(tar.includes(Buffer.from("archive content"))).toBe(true);
    }
    expect(data.length).toBeGreaterThan(0);
  });

  test("returns a file unchanged", async () => {
    const file = path.join(root, "plain.txt");
    await fs.writeFile(file, "unchanged");
    expect(await addToArchive(file, "zip", 9)).toBe(file);
    expect(await fs.readFile(file, "utf8")).toBe("unchanged");
  });

  test("rejects an unsupported archive format", async () => {
    await expect(addToArchive(root, "unknown", 9)).rejects.toThrow("Unsupported archive type");
  });
});
