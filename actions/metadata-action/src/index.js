// With a motherfucking microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = require("@actions/core");
const github = require("@actions/github");

const ConfigLoader = require("./loader");
const RefExtractor = require("./extractor");
const { default: def } = require("ajv/dist/vocabularies/discriminator");

const Report = require("./report");

function generateSnapshotVersionParts() {
  const now = new Date();
  const iso = now.toISOString(); // "2025-02-25T14:30:53.123Z"
  const date = iso.slice(0, 10).replace(/-/g, ""); // "20250225"
  const time = iso.slice(11, 19).replace(/:/g, ""); // "143053"
  return { date, time, timestamp: `${date}${time}` };
}

function extractSemverParts(versionString) {
  const normalized = versionString.replace(/^v/i, "");
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    core.info(`💡 Not a valid semver string (skip): ${versionString}`);
    return { major: "", minor: "", patch: "" };
  }
  const [major, minor, patch] = normalized.split(".");
  return { major, minor, patch };
}

function matchesPattern(refName, pattern) {
  const normalizedPattern = pattern.replace(/\//g, '-').replace(/\*/g, '.*');
  const regex = new RegExp('^' + normalizedPattern + '$');
  return regex.test(refName);
}

function findTemplate(refName, templates) {
  for (let item of templates) {
    let pattern = Object.keys(item)[0];
    if (matchesPattern(refName, pattern)) {
      return item[pattern]; // возвращаем значение из объекта item, а не templates
    }
  }
  return null;
}

function fillTemplate(template, values) {
  return template.replace(/{{\s*([\w\.-]+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : match;
  });
}

function flattenObject(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object') {
      Object.assign(acc, flattenObject(val, name));
    } else {
      acc[name] = val;
    }
    return acc;
  }, {});
}

// Objects
const selectedTemplateAndTag = {
  template: null,
  distTag: null,
  toString() {
    return `Template: ${this.template}, DistTag: ${this.distTag}`;
  }
};



async function run() {

  core.info(`pull_request head.ref: ${github.context.payload.pull_request?.head?.ref}`);
  core.info(`pull_request head: ${JSON.stringify(github.context.payload.pull_request?.head, null, 2)}`);
  let name = core.getInput('ref');

  if (!name) {
    name = github.context.eventName === 'pull_request' ? github.context.payload.pull_request?.head?.ref : github.context.ref;
  }

  core.info(`Ref: ${name}`);

  const debug = core.getInput('debug') === "true";
  const dryRun = core.getInput('dry-run') === "true";
  const showReport = core.getInput('show-report') === "true";
  const isDebug = debug === 'true' || debug === '1' || debug === 'yes' || debug === 'on';

  core.info(`Debug: ${isDebug}`);

  const ref = new RefExtractor().extract(name);

  const configurationPath = core.getInput('configuration-path') || "./.github/metadata-action-config.yml";
  const loader = new ConfigLoader()
  const config = loader.load(configurationPath, debug);

  const defaultTemplate = core.getInput('default-template') || config?.["default-template"] || `{{ref-name}}-{{timestamp}}-{{runNumber}}`;
  const defaultTag = core.getInput('default-tag') || config?.["default-tag"] || "latest";

  const extraTags = core.getInput('extra-tags');
  const mergeTags = core.getInput('merge-tags');

  core.info(`🔸 defaultTemplate: ${defaultTemplate}`);
  core.info(`🔸 defaultTag: ${defaultTag}`);

  // core.info(`🔹 Ref: ${JSON.stringify(ref)}`);

  if (loader.fileExists) {
    selectedTemplateAndTag.template = findTemplate(!ref.isTag ? ref.name : "tag", config["branches-template"]);
    selectedTemplateAndTag.distTag = findTemplate(ref.name, config["distribution-tag"]);
  }

  if (selectedTemplateAndTag.template === null) {
    core.info(`⚠️ No template found for ref: ${ref.name}, will be used default -> ${defaultTemplate}`);
    selectedTemplateAndTag.template = defaultTemplate;
  }

  if (selectedTemplateAndTag.distTag === null) {
    core.info(`⚠️ No dist-tag found for ref: ${ref.name}, will be used default -> ${defaultTag}`);
    selectedTemplateAndTag.distTag = defaultTag;
  }

  const parts = generateSnapshotVersionParts();
  const semverParts = extractSemverParts(ref.name);

  const shortShaDeep = +core.getInput("short-sha");
  if (!(shortShaDeep > 0)) {
    core.info(`⚠️ Invalid short-sha value: ${shortShaDeep}, will be used default -> 7`);
  }
  const shortSha = github.context.sha.slice(0, shortShaDeep);

  const values = {
    ...ref, "ref-name": ref.name, "short-sha": shortSha,
    ...semverParts, ...parts,
    "dist-tag": selectedTemplateAndTag.distTag,
    ...flattenObject({ github }, '')
  };

  core.info(`🔹 time: ${JSON.stringify(parts)}`);
  core.info(`🔹 semver: ${JSON.stringify(semverParts)}`);
  core.info(`🔹 dist-tag: ${JSON.stringify(selectedTemplateAndTag.distTag)}`);

  // core.info(`Values: ${JSON.stringify(values)}`); //debug values
  let result = fillTemplate(selectedTemplateAndTag.template, values)

  core.info(`🔹 Template: ${selectedTemplateAndTag.template}`);

  if (extraTags != '' && mergeTags == 'true') {
    core.info(`🔹 Merging extra tags: ${extraTags}`);
    result = result + ", " + extraTags;
  }

  core.info(`💡 Rendered template: ${result}`);

  core.setOutput("result", result);
  core.setOutput("ref", ref);
  core.setOutput("ref-name", ref.name);
  core.setOutput("date", parts.date);
  core.setOutput("time", parts.time);
  core.setOutput("Timestamp", parts.timestamp);
  core.setOutput("major", semverParts.major);
  core.setOutput("minor", semverParts.minor);
  core.setOutput("patch", semverParts.patch);
  core.setOutput("tag", selectedTemplateAndTag.distTag);
  core.setOutput("short-sha", shortSha);

  if (showReport) {
    const reportItem = {
      "ref": ref.name,
      "sha": github.context.sha,
      "shortSha": shortSha,
      "semver": `${semverParts.major}.${semverParts.minor}.${semverParts.patch}`,
      "timestamp": parts.timestamp,
      "template": selectedTemplateAndTag.template,
      "distTag": selectedTemplateAndTag.distTag,
      "extraTags": extraTags,
      "renderResult": result
    };
    await new Report().writeSummary(reportItem, dryRun);
  }
  core.info('✅ Action completed successfully!');
}

run();
