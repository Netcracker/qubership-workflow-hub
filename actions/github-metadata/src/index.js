// With a motherfucking microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = require("@actions/core");
const github = require("@actions/github");

const ConfigLoader = require("./configLoader");
const RefExtractor = require("./extractor");

function generateSnapshotTimeParts() {
  const now = new Date();
  const iso = now.toISOString(); // "2025-02-25T14:30:53.123Z"
  const date = iso.slice(0, 10).replace(/-/g, ""); // "20250225"
  const time = iso.slice(11, 19).replace(/:/g, ""); // "143053"
  return { date, time, timestamp: `${date}${time}` };
}

function extractSemverParts(versionString) {
  const normalized = versionString.replace(/^v/i, "");
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    core.warning(`Not a valid semver string (skip): ${versionString}`);
    return { major: "", minor: "", patch: "" };
  }
  const [major, minor, patch] = normalized.split(".");
  return { major, minor, patch };
}

function fillTemplate(template, values) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : match;
  });
}

async function run() {
  const def_template = core.getInput("default-template");

  const name = core.getInput('ref') || github.context.ref;
  const ref = new RefExtractor().extract(name);

  // const configPath = core.getInput("config-path") || "./.github/metadata-extractor-config.yml";
  // const config = new ConfigLoader(configPath).load();

  const tagsConfig = {};
  const brancheTemplatesConfig = {};

  const tagsInputStr = core.getInput("dist-tags");
  let inputTags = {};
  if (tagsInputStr) {
    try {
      inputTags = JSON.parse(tagsInputStr);
    } catch (error) {
      core.error("Failed to parsing tags-input: " + error.message);
    }
  }

  const tagsMapping = { ...tagsConfig, ...inputTags };
  let tag = tagsMapping[ref.name] || "latest";


  const branchTemplateConfig = {};
  const branchInputStr = core.getInput("branch-template")
  let inputTemplates = {};
  try {
    inputTemplates = JSON.parse(branchInputStr);
  }
  catch (error) {
    core.error("Cant read tempalets" + error.message);
  }

  const branchTemplateMapping = { ...branchTemplateConfig, ...inputTemplates };
  let template = branchTemplateMapping[ref.name] || def_template;

  const parts = generateSnapshotTimeParts();

  const semverParts = extractSemverParts(ref.name);

  const values = { ...ref, ...semverParts, ...parts, ...github.context, tag };

  const result = fillTemplate(template, values);

  core.info(`Ref: ${name}`);
  core.info(`Ref name: ${ref.name}`);
  core.info(`Date: ${parts.date}`);
  core.info(`Time: ${parts.time}`);
  core.info(`Timestamp: ${parts.timestamp}`);
  core.info(`Major: ${semverParts.major}`);
  core.info(`Minor: ${semverParts.minor}`);
  core.info(`Patch: ${semverParts.patch}`);
  core.info(`Tag: ${tag}`);
  core.info(`Rendered template: ${result}`);

  core.setOutput("rendered-template", result);
  core.setOutput("ref", ref);
  core.setOutput("ref-name", ref.name);
  core.setOutput("date", parts.date);
  core.setOutput("time", parts.time);
  core.setOutput("Timestamp", parts.timestamp);
  core.setOutput("major", semverParts.major);
  core.setOutput("minor", semverParts.minor);
  core.setOutput("patch", semverParts.patch);
  core.setOutput("tag", tag);
}

run();