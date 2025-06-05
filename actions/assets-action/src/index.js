// actions/assets-action/src/index.js
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const { addToArchive } = require("./archiveUtils");
const AssetUploader = require("./assetsUploader");
const { retryAsync } = require("./retry");
const Report = require("./report");

async function getInput() {
  return {
    releaseTag: core.getInput("tag", { required: true }),
    archiveType: core.getInput("archive-type").trim() || "zip",
    itemPath: core.getInput("item-path").trim(),
    retries: parseInt(core.getInput("retries"), 10) || 3,
    delay: parseInt(core.getInput("retry-delay-ms"), 10) || 1000,
    factor: parseFloat(core.getInput("factor")) || 1,
    dryRun: core.getInput("dry-run") === "true"
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

    const assetsUploader = new AssetUploader(token, input.releaseTag, owner, repo);
    if (!assetsUploader) {
      throw new Error("❗️ Failed to initialize AssetUploader");
    }

    core.info(`🔹 Using archive type: ${input.archiveType}`);
    core.info(`🔹 Items to process: ${itemsPath.join(", ")}`);

    // Collect information for the final report
    const reportEntries = [];

    for (const itemPath of itemsPath) {

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
          archivePath = await addToArchive(itemPath, input.archiveType);

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
