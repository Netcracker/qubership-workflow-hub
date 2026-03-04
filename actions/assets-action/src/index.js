// actions/assets-action/src/index.js
import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "node:fs";
import path from "node:path";
import { addToArchive } from "./archiveUtils.js";
import AssetUploader from "./assetsUploader.js";
import { retryAsync } from "./retry.js";
import Report from "./report.js";
import * as glob from "@actions/glob";

const { promises: fsPromises } = fs;


async function getInput() {
  return {
    releaseTag: core.getInput("tag", { required: true }),
    archiveType: core.getInput("archive-type").trim() || "zip",
    itemPath: core.getInput("item-path").trim(),
    retries: parseInt(core.getInput("retries"), 10) || 3,
    delay: parseInt(core.getInput("retry-delay-ms"), 10) || 1000,
    factor: parseFloat(core.getInput("factor")) || 1,
    dryRun: core.getInput("dry-run") === "true",
    compressionLevel: parseInt(core.getInput("compression-level"), 10) || 9
  };
}

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const input = await getInput();
    const { owner, repo } = github.context.repo;

    if (!owner || !repo) {
      throw new Error("❗️ Failed to get owner/repo from github.context.repository");
    }

    // Split itemPath into an array of paths (comma-separated)
    const itemsPath = input.itemPath.split(",").map((p) => p.trim()).filter(Boolean);

    if (itemsPath.length === 0) {
      throw new Error("❗️ No file or folder paths provided for processing");
    }

    const matchedFilesSet = new Set();
    const foundDirs = new Set();

    for (const pattern of itemsPath) {

      core.info(`🔍 Processing pattern: ${pattern}`);
      const globber = await glob.create(pattern, { followSymbolicLinks: false });

      for await (const filePath of globber.globGenerator()) {
        try {
          const stat = await fsPromises.stat(filePath);

          if (stat.isDirectory()) {
            matchedFilesSet.add(filePath);
            foundDirs.add(filePath);
            break; // If it's a directory, we can skip further checks for this pattern
          }
          if (stat.isFile()) {
            matchedFilesSet.add(filePath);
          } else {
            core.warning(`Skipping non-file/non-directory: ${filePath}`);
          }
        } catch (e) {
          core.warning(`Could not access file: ${filePath}. Error: ${e.message}`);
        }
      }
    }

    core.info(`🔹 Found ${matchedFilesSet.size} files/directories matching the patterns: ${Array.from(matchedFilesSet).join(", ")}`);
    const matchedFiles = Array.from(matchedFilesSet);
    if (matchedFiles.length === 0) {
      core.setFailed(`❗️ No files or directories matched the provided patterns: ${itemsPath.join(", ")}`);
      return;
    }

    const assetsUploader = new AssetUploader(token, input.releaseTag, owner, repo);
    if (!assetsUploader) {
      throw new Error("❗️ Failed to initialize AssetUploader");
    }

    core.info(`🔹 Using archive type: ${input.archiveType}`);
    core.info(`🔹 Items to process: ${matchedFiles.join(", ")}`);

    // Collect information for the final report
    const reportEntries = [];

    for (const itemPath of matchedFiles) {

      core.info(`🔸 Processing item: ${itemPath}`);

      if (!fs.existsSync(itemPath)) {
        core.info(`⚠️ File or folder not found: ${itemPath}. \n Skipping... \n`);

        reportEntries.push({
          fileName: null,
          itemPath,
          success: "NotFound",
          error: `File or folder not found: ${itemPath}`
        });

        continue;
      }

      // Default to the item path if not archiving
      let archivePath = itemPath;

      if (fs.statSync(itemPath).isDirectory()) {
        try {
          archivePath = await addToArchive(itemPath, input.archiveType, input.compressionLevel);

        } catch (archiveErr) {
          core.error(`Error packaging ${itemPath}: ${archiveErr.message}`);

          reportEntries.push({
            fileName: null,
            itemPath,
            success: "Error",
            error: `Error packaging ${itemPath}: ${archiveErr.message}`
          });

          continue;
        }
      }

      // Attempt to upload the archive or file
      try {
        await retryAsync(() => Promise.resolve(assetsUploader.upload(archivePath)),
          {
            retries: input.retries,
            delay: input.delay,
            factor: input.factor
          });

        reportEntries.push({
          fileName: path.basename(archivePath),
          itemPath,
          success: "Success",
          error: ''
        });

      } catch (uploadErr) {
        core.info(`Failed to upload asset: ${archivePath}. ${uploadErr.message}`);

        reportEntries.push({
          fileName: path.basename(archivePath),
          itemPath,
          success: "Failed",
          error: `Failed to upload asset: ${archivePath}. ${uploadErr.message}`
        });

      }
    }

    // Generate the final report (table) and write the Summary
    const report = new Report();
    await report.writeSummary(reportEntries, owner, repo, input.releaseTag);

    reportEntries.forEach(element => {
      core.info(`Report Entry: ${JSON.stringify(element)}`);
    });

    core.info("✅ Action completed successfully!");
  } catch (err) {
    core.setFailed(`❌ Error: ${err.message}`);
  }
}

run();
