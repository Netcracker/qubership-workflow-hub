import * as core from "@actions/core";
import log from "@qubership/action-logger";
import fs from "node:fs";
import path from "node:path";

function resolveWithinWorkspace(workspace, relativePath, label) {
  const base = path.resolve(workspace);
  const resolved = path.resolve(base, relativePath);

  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error(`'${label}' escapes the workspace: ${relativePath}`);
  }

  return resolved;
}

function assertNoSymlink(targetPath) {
  const stat = fs.lstatSync(targetPath);

  if (stat.isSymbolicLink()) {
    throw new Error(`Symlinks are not supported: ${targetPath}`);
  }

  return stat;
}

function collectRelativeFiles(root) {
  const results = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error(`Symlinks are not supported: ${full}`);
      }

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        results.push(path.relative(root, full));
      }
    }
  };

  walk(root);
  return results;
}

function copyOne(fromAbs, toAbs, overwrite, stats) {
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });

  if (!overwrite && fs.existsSync(toAbs)) {
    log.info(`  skipped (exists): ${toAbs}`);
    stats.skipped += 1;
    return;
  }

  fs.copyFileSync(fromAbs, toAbs);
  stats.copied += 1;
}

function parseFilesInput() {
  const input = core.getInput("files", { required: true });

  let files;

  try {
    files = JSON.parse(input);
  } catch {
    throw new Error("Input 'files' must be a valid JSON array");
  }

  if (!Array.isArray(files)) {
    throw new Error("Input 'files' must be a JSON array");
  }

  if (files.length === 0) {
    throw new Error("Input 'files' must contain at least one mapping");
  }

  for (const [index, item] of files.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`files[${index}] must be an object`);
    }

    if (typeof item.from !== "string" || item.from.trim() === "") {
      throw new Error(`files[${index}].from must be a non-empty string`);
    }

    if (typeof item.to !== "string" || item.to.trim() === "") {
      throw new Error(`files[${index}].to must be a non-empty string`);
    }

    if (item.overwrite !== undefined && typeof item.overwrite !== "boolean") {
      throw new Error(`files[${index}].overwrite must be a boolean`);
    }

    item.overwrite ??= true;
  }

  return files;
}

async function run() {
  try {
    const files = parseFilesInput();
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const stats = { copied: 0, skipped: 0 };

    log.info(`Loaded ${files.length} sync mapping(s)`);

    for (const { from, to, overwrite } of files) {
      const fromAbs = resolveWithinWorkspace(workspace, from, "from");
      const toAbs = resolveWithinWorkspace(workspace, to, "to");

      if (!fs.existsSync(fromAbs)) {
        throw new Error(`Source path does not exist: ${from}`);
      }

      const fromStat = assertNoSymlink(fromAbs);

      if (fromStat.isDirectory()) {
        log.info(`Syncing directory: ${from} -> ${to} (overwrite: ${overwrite})`);
        for (const relativeFile of collectRelativeFiles(fromAbs)) {
          copyOne(
            path.join(fromAbs, relativeFile),
            path.join(toAbs, relativeFile),
            overwrite,
            stats,
          );
        }
      } else {
        log.info(`Syncing file: ${from} -> ${to} (overwrite: ${overwrite})`);
        copyOne(fromAbs, toAbs, overwrite, stats);
      }
    }

    log.info(`Copied: ${stats.copied}`);
    log.info(`Skipped: ${stats.skipped}`);
    core.setOutput("copied", stats.copied);
    core.setOutput("skipped", stats.skipped);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
  }
}

run();
