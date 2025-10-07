// With a motherf***ing microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = require("@actions/core");
const github = require("@actions/github");

const ConfigLoader = require("./loader");
const RefNormalizer = require("./extractor");
const Report = require("./report");
const log = require("./logger");

// --- utility functions ---
function generateSnapshotVersionParts() {
  const now = new Date();
  const iso = now.toISOString();
  const date = iso.slice(0, 10).replace(/-/g, "");
  const time = iso.slice(11, 19).replace(/:/g, "");
  return { date, time, timestamp: `${date}${time}` };
}

function extractSemverParts(versionString) {
  const normalized = versionString.replace(/^v/i, "");
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    log.dim(`Not a valid semver string (skip): ${versionString}`);
    return { major: "", minor: "", patch: "" };
  }
  const [major, minor, patch] = normalized.split(".");
  return { major, minor, patch };
}

function matchesPattern(refName, pattern) {
  const normalizedPattern = pattern.replace(/\//g, "-").replace(/\*/g, ".*");
  return new RegExp(`^${normalizedPattern}$`).test(refName);
}

function findTemplate(refName, templates) {
  if (!Array.isArray(templates) || templates.length === 0) return null;
  for (const item of templates) {
    const pattern = Object.keys(item)[0];
    if (matchesPattern(refName, pattern)) {
      return item[pattern];
    }
  }
  return null;
}

function fillTemplate(template, values) {
  return template.replace(/{{\s*([\w\.-]+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : match;
  });
}

function flattenObject(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object") {
      Object.assign(acc, flattenObject(val, name));
    } else {
      acc[name] = val;
    }
    return acc;
  }, {});
}

async function run() {
  try {
    log.group("🚀 Metadata Action Initialization");

    let ref = core.getInput("ref") || (github.context.eventName === "pull_request" ? github.context.payload.pull_request?.head?.ref : github.context.ref);

    log.info(`Ref: ${ref}`);

    const dryRun = core.getInput("dry-run") === "true";
    const showReport = core.getInput("show-report") === "true";
    const debug = ["true", "1", "yes", "on"].includes(core.getInput("debug")?.toLowerCase());
    const replaceSymbol = core.getInput("replace-symbol") || "-";

    const refData = new RefNormalizer().extract(ref, replaceSymbol);
    const { normalizedName } = refData;

    // --- short-sha logic ---
    let shortShaLength = parseInt(core.getInput("short-sha"), 10);
    if (isNaN(shortShaLength) || shortShaLength < 1 || shortShaLength > 40) {
      log.warn(`⚠️ Invalid short-sha value: ${core.getInput("short-sha")}, fallback to 7`);
      shortShaLength = 7;
    }

    const fullSha = github.context.sha;
    const shortSha = fullSha.slice(0, shortShaLength);
    log.info(`Commit: ${shortSha} (full: ${fullSha}, length: ${shortShaLength})`);

    // --- Config load ---
    const configurationPath = core.getInput("configuration-path") || "./.github/metadata-action-config.yml";
    const loader = new ConfigLoader();
    const config = loader.load(configurationPath, debug);

    const defaultTemplate = core.getInput("default-template") || config?.["default-template"] || `{{ref-name}}-{{timestamp}}-{{runNumber}}`;
    const defaultTag = core.getInput("default-tag") || config?.["default-tag"] || "latest";

    const extraTags = core.getInput("extra-tags") || "";
    const mergeTags = core.getInput("merge-tags") === "true";

    log.dim(`defaultTemplate: ${defaultTemplate}`);
    log.dim(`defaultTag: ${defaultTag}`);

    const selectedTemplateAndTag = { template: null, distTag: null, toString() { return `Template: ${this.template}, DistTag: ${this.distTag}`; }, };

    if (loader.fileExists) {
      selectedTemplateAndTag.template = findTemplate(!refData.isTag ? refData.normalizedName : "tag", config["branches-template"]);
      selectedTemplateAndTag.distTag = findTemplate(refData.normalizedName, config["distribution-tag"]);
    }

    if (!selectedTemplateAndTag.template) {
      log.warn(`No template found for ref: ${refData.normalizedName}, using default -> ${defaultTemplate}`);
      selectedTemplateAndTag.template = defaultTemplate;
    }

    if (!selectedTemplateAndTag.distTag) {
      log.warn(`No dist-tag found for ref: ${refData.normalizedName}, using default -> ${defaultTag}`);
      selectedTemplateAndTag.distTag = defaultTag;
    }

    const parts = generateSnapshotVersionParts();
    const semverParts = extractSemverParts(refData.normalizedName);

    const values = {
      ...refData,
      "ref-name": refData.normalizedName,
      "short-sha": shortSha,
      ...semverParts,
      ...parts,
      "dist-tag": selectedTemplateAndTag.distTag,
      "runNumber": github.context.runNumber,
      ...flattenObject({ github }, ""),
    };

    let result = fillTemplate(selectedTemplateAndTag.template, values);
    if (extraTags && mergeTags) {
      log.info(`Merging extra tags: ${extraTags}`);
      result += `, ${extraTags}`;
    }

    log.success(`💡 Rendered template: ${result}`);

    log.endGroup();

    // --- Outputs ---
    core.setOutput("result", result);
    core.setOutput("ref", refData.normalizedName);
    core.setOutput("ref-name", refData.normalizedName);
    core.setOutput("commit", fullSha);
    core.setOutput("short-sha", shortSha);
    core.setOutput("date", parts.date);
    core.setOutput("time", parts.time);
    core.setOutput("timestamp", parts.timestamp);
    core.setOutput("major", semverParts.major);
    core.setOutput("minor", semverParts.minor);
    core.setOutput("patch", semverParts.patch);
    core.setOutput("tag", selectedTemplateAndTag.distTag);

    if (showReport) {
      const reportItem = {
        ref: refData.normalizedName,
        sha: fullSha,
        shortSha,
        semver: `${semverParts.major}.${semverParts.minor}.${semverParts.patch}`,
        timestamp: parts.timestamp,
        template: selectedTemplateAndTag.template,
        distTag: selectedTemplateAndTag.distTag,
        extraTags,
        renderResult: result,
      };
      await new Report().writeSummary(reportItem, dryRun);
    }

    log.success("✅ Action completed successfully!");
  } catch (error) {
    log.error(`❌ Action failed: ${error.message}`);
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
