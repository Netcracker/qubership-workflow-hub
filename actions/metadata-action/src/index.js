const core = require("@actions/core");
const github = require("@actions/github");
const log = require("@netcracker/action-logger");

const ConfigLoader = require("./loader");
const RefNormalizer = require("./extractor");
const Report = require("./report");

// --- constants ---
const DEFAULT_SHORT_SHA_LENGTH = 7;
const DEFAULT_TEMPLATE = "{{ref-name}}-{{timestamp}}-{{runNumber}}";
const DEFAULT_DIST_TAG = "latest";
const DEFAULT_REPLACE_SYMBOL = "-";
const DEFAULT_CONFIG_PATH = "./.github/metadata-action-config.yml";
const TAG_TEMPLATE_KEY = "tag";

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
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    log.dim(`Not a valid semver string (skip): ${versionString}`);
    return { major: "", minor: "", patch: "" };
  }
  const [, major, minor, patch] = match;
  return { major, minor, patch };
}

// Cache for compiled regex patterns to improve performance (bounded to avoid unbounded growth)
const patternCache = new Map();
const PATTERN_CACHE_MAX = 100;

function matchesPattern(refName, pattern) {
  if (!patternCache.has(pattern)) {
    // Escape special regex characters except *
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\//g, "-")
      .replace(/\*/g, ".*");
    if (patternCache.size >= PATTERN_CACHE_MAX) {
      const firstKey = patternCache.keys().next().value;
      if (firstKey !== undefined) {
        patternCache.delete(firstKey);
      }
    }
    patternCache.set(pattern, new RegExp(`^${escapedPattern}$`));
  }
  return patternCache.get(pattern).test(refName);
}

function findTemplate(refName, templates) {
  if (!Array.isArray(templates) || templates.length === 0) return null;
  for (const item of templates) {
    if (!item || typeof item !== "object") {
      log.dim("Invalid template entry (skip): not an object");
      continue;
    }
    const keys = Object.keys(item);
    const pattern = keys[0];
    if (!pattern || typeof pattern !== "string") {
      log.dim("Invalid template entry (skip): missing pattern key");
      continue;
    }
    if (matchesPattern(refName, pattern)) {
      return item[pattern];
    }
  }
  return null;
}

// Regex for template placeholder matching (cached for performance)
// Supports optional length modifier: {{key:8}}
const TEMPLATE_PLACEHOLDER_REGEX = /{{\s*([\w.-]+)(?::(\d+))?\s*}}/g;

function fillTemplate(template, values, warnOnMissing = false) {
  const missing = warnOnMissing ? new Set() : null;
  const result = template.replace(TEMPLATE_PLACEHOLDER_REGEX, (match, key, maxLen) => {
    if (!(key in values) || values[key] === null || values[key] === undefined) {
      if (missing) missing.add(maxLen ? `${key}:${maxLen}` : key);
      return match;
    }
    const value = values[key];
    if (maxLen) {
      const limit = parseInt(maxLen, 10);
      return String(value).slice(0, limit);
    }
    return value;
  });
  if (missing && missing.size > 0) {
    log.warn(`Unknown template placeholders (kept as-is): ${Array.from(missing).join(", ")}`);
  }
  return result;
}

function normalizeExtraTags(extraTags) {
  if (!extraTags) return [];
  return extraTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function run() {
  try {
    log.group("[meta] Metadata Action Initialization");

    const inputs = {
      ref: core.getInput("ref"),
      debug: ["true", "1", "yes", "on"].includes(core.getInput("debug")?.toLowerCase()),
      dryRun: core.getInput("dry-run") === "true",
      showReport: core.getInput("show-report") === "true",
      replaceSymbol: core.getInput("replace-symbol") || DEFAULT_REPLACE_SYMBOL,
      mergeTags: core.getInput("merge-tags") === "true",
      extraTags: core.getInput("extra-tags") || "",
      configPath: core.getInput("configuration-path") || DEFAULT_CONFIG_PATH,
      defaultTemplate: core.getInput("default-template"),
      defaultTag: core.getInput("default-tag"),
    };

    log.setDebug(inputs.debug);
    log.debugJSON("Action Inputs", inputs);

    const ref = inputs.ref || (github.context.eventName === "pull_request" ? github.context.payload.pull_request?.head?.ref : github.context.ref);
    if (!ref) {
      const payloadKeys = Object.keys(github.context.payload || {}).join(", ");
      log.warn(`Ref is undefined (event: ${github.context.eventName || "unknown"}, payload keys: ${payloadKeys || "none"})`);
      throw new Error("Ref is undefined; set input 'ref' or ensure github.context.ref is available.");
    }

    log.info(`Ref: ${ref}`);

    const refData = new RefNormalizer().extract(ref, inputs.replaceSymbol);

    // --- short-sha logic ---
    let shortShaLength = parseInt(core.getInput("short-sha"), 10);

    if (Number.isNaN(shortShaLength) || shortShaLength < 1 || shortShaLength > 40) {
      log.warn(`Invalid short-sha value: ${shortShaLength}, fallback to ${DEFAULT_SHORT_SHA_LENGTH}`);
      shortShaLength = DEFAULT_SHORT_SHA_LENGTH;
    }

    const fullSha = github.context.sha;
    const shortSha = fullSha.slice(0, shortShaLength);
    log.info(`Commit: ${shortSha} (full: ${fullSha}, length: ${shortShaLength})`);

    // --- Config load ---
    const loader = new ConfigLoader();
    const config = loader.load(inputs.configPath, inputs.debug);

    log.debugJSON("Loaded Configuration", config);

    const defaultTemplate = inputs.defaultTemplate || config?.["default-template"] || DEFAULT_TEMPLATE;
    const defaultTag = inputs.defaultTag || config?.["default-tag"] || DEFAULT_DIST_TAG;

    log.dim(`Default Template: ${defaultTemplate}`);
    log.dim(`Default Tag: ${defaultTag}`);

    const selectedTemplateAndTag = {
      template: null,
      distTag: null,
    };

    if (config) {
      selectedTemplateAndTag.template = findTemplate(!refData.isTag ? refData.normalizedName : TAG_TEMPLATE_KEY, config["branches-template"]);
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

    // Only include necessary GitHub context fields to avoid memory overhead
    const githubValues = {
      "github.repository": `${github.context.repo.owner}/${github.context.repo.repo}`,
      "github.ref": github.context.ref,
      "github.sha": fullSha,
      "github.actor": github.context.actor,
      "github.workflow": github.context.workflow,
      "github.run_id": github.context.runId,
      "github.run_number": github.context.runNumber,
      "github.event_name": github.context.eventName,
    };

    const values = {
      ...refData,
      "short-sha": shortSha,
      "sha": fullSha,
      ...semverParts,
      ...parts,
      "dist-tag": selectedTemplateAndTag.distTag,
      ...githubValues,
      // Aliases for template compatibility
      "ref-name": refData.normalizedName,
      "runNumber": github.context.runNumber,
    };

    const aliasMap = {
      "ref-name": ["ref_name", "refName"],
      "short-sha": ["short_sha", "shortSha"],
      "dist-tag": ["dist_tag", "distTag"],
      "runNumber": ["run_number"],
    };
    for (const [sourceKey, aliases] of Object.entries(aliasMap)) {
      if (sourceKey in values) {
        for (const alias of aliases) {
          if (!(alias in values)) values[alias] = values[sourceKey];
        }
      }
    }

    log.debugJSON("Template Values", values);

    let result = fillTemplate(selectedTemplateAndTag.template, values, true);

    if (inputs.mergeTags && inputs.extraTags) {
      const normalizedExtraTags = normalizeExtraTags(inputs.extraTags);
      log.info(`Merging extra tags: ${inputs.extraTags}`);
      if (normalizedExtraTags.length > 0) {
        result = [result, ...normalizedExtraTags].join(", ");
      }
    }

    log.success(`Rendered Metadata: ${result}`);

    log.endGroup();

    // --- Outputs ---
    core.setOutput("result", result);
    // "ref" kept for backward compatibility, prefer "ref-name"
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
    core.setOutput("dist-tag", selectedTemplateAndTag.distTag);
    core.setOutput("runNumber", github.context.runNumber);
    core.setOutput("ref-type", refData.type);

    if (inputs.showReport) {
      const reportItem = {
        ref: refData.normalizedName,
        sha: fullSha,
        shortSha,
        semver: semverParts.major ? `${semverParts.major}.${semverParts.minor}.${semverParts.patch}` : null,
        timestamp: parts.timestamp,
        template: selectedTemplateAndTag.template,
        distTag: selectedTemplateAndTag.distTag,
        extraTags: inputs.extraTags,
        renderResult: result,
        // Keep report compact and stable
        github: {
          repository: githubValues["github.repository"],
          ref: githubValues["github.ref"],
          sha: githubValues["github.sha"],
          actor: githubValues["github.actor"],
          workflow: githubValues["github.workflow"],
          run_id: githubValues["github.run_id"],
          run_number: githubValues["github.run_number"],
          event_name: githubValues["github.event_name"],
        }
      };
      await new Report().writeSummary(reportItem, inputs.dryRun);
    }

    log.success("Action completed successfully.");

    // For testing purpose
    return { result, refData, shortSha, parts, semverParts };
  } catch (error) {
    log.error(`Action failed: ${error.message}`);
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
// Expose internals for unit tests without changing the default export behavior.
module.exports.__testables = {
  generateSnapshotVersionParts,
  extractSemverParts,
  matchesPattern,
  findTemplate,
  fillTemplate,
  normalizeExtraTags,
  _patternCache: patternCache,
  _PATTERN_CACHE_MAX: PATTERN_CACHE_MAX,
};


