/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 74:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(958);

class RefExtractor {
    constructor() {

    }
    extract(ref) {
        let name = "";
        let isTag = false;
        if (ref.startsWith("refs/heads/")) {
            name = ref.replace("refs/heads/", "").replace(/\//g, "-");
            core.info(`Run-on branch: ${name}`);
        } else if (ref.startsWith("refs/tags/")) {
            isTag = true;
            name = ref.replace("refs/tags/", "").replace(/\//g, "-");
            core.info(`Run-on tag: ${name}`);
        } else {
            core.warning(`Cant detect type ref: ${ref}`);
        }
        return { name, isTag };
    }
}

module.exports = RefExtractor;

/***/ }),

/***/ 27:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fs = __nccwpck_require__(896);
const yaml = __nccwpck_require__(444);
const core = __nccwpck_require__(958);
const Ajv = __nccwpck_require__(326);
const path = __nccwpck_require__(928);

class ConfigLoader {
  constructor() {
  }

  load(filePath) {
    const configPath = path.resolve(filePath);
    console.log(`💡 Try to reading configuration ${configPath}`)

    if (!fs.existsSync(configPath)) {
      core.setFailed(`❗️ File not found: ${configPath}`);
      return;
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');

    let config;
    try {
      config = yaml.load(fileContent);
    }
    catch (error) {
      core.setFailed(`❗️ Error parsing YAML file: ${error.message}`);
      return;
    }

    const schemaPath = __nccwpck_require__.ab + "config.schema.json";
    if (!fs.existsSync(__nccwpck_require__.ab + "config.schema.json")) {
      core.setFailed(`❗️ Schema file not found: ${schemaPath}`);
      return;
    }

    const schemaContent = fs.readFileSync(__nccwpck_require__.ab + "config.schema.json", 'utf8');

    let schema;
    try {
      schema = JSON.parse(schemaContent);
    }
    catch (error) {
      core.setFailed(`❗️ Error parsing JSON schema: ${error.message}`);
      return;
    }

    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(config);
    if (!valid) {
      let errors = ajv.errorsText(validate.errors);
      core.setFailed(`❗️ Configuration file is invalid: ${errors}`);
      return;
    }
    core.warning(`Configuration file is valid: ${valid}`);
    return config;
  }
}

module.exports = ConfigLoader;

/***/ }),

/***/ 958:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 394:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 326:
/***/ ((module) => {

module.exports = eval("require")("ajv");


/***/ }),

/***/ 444:
/***/ ((module) => {

module.exports = eval("require")("js-yaml");


/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// With a motherfucking microphone, plug it in my soul
// I'm a renegade riot getting out of control
// I'm-a keeping it alive and continue to be
// Flying like an eagle to my destiny

const core = __nccwpck_require__(958);
const github = __nccwpck_require__(394);

const ConfigLoader = __nccwpck_require__(27);
const RefExtractor = __nccwpck_require__(74);

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
    core.warning(`Not a valid semver string (skip): ${versionString}`);
    return { major: "", minor: "", patch: "" };
  }
  const [major, minor, patch] = normalized.split(".");
  return { major, minor, patch };
}


function matchesPattern(refName, pattern) {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
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

function findDistTag(ref, distTags) {
  let branchName = ref.name;
  if (ref.isTag) {
    for (let item of distTags) {
      let key = Object.keys(item)[0];
      if (key === "tag") {
        return item[key]; // возвращаем значение из item
      }
    }
    return "latest";
  }
  for (let item of distTags) {
    let key = Object.keys(item)[0];
    if (key.includes('*')) {
      if (matchesPattern(branchName, key)) {
        return item[key]; // возвращаем значение из item
      }
    } else {
      if (branchName === key || branchName.startsWith(key + "/")) {
        return item[key]; // возвращаем значение из item
      }
    }
  }
  return null;
}

function fillTemplate(template, values) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : match;
  });
}

async function run() {
  // const def_template = core.getInput("default-template");

  const name = core.getInput('ref') || github.context.ref;
  const ref = new RefExtractor().extract(name);

  const configurationPath = core.getInput('configuration-path') || "./.github/metadata-action-config.yml";
  const loader = new ConfigLoader().load(configurationPath);

  core.info(`🔹 Ref: ${JSON.stringify(ref)}`);

  const template = findTemplate(!ref.isTag ? ref.name : "tag", loader["branches-template"]);

  // let fill =  fillTemplate(template, { ...ref, ...generateSnapshotVersionParts(), ...extractSemverParts(ref.name) });

  const parts = generateSnapshotVersionParts();
  const semverParts = extractSemverParts(ref.name);
  const distTag = findDistTag(ref, loader["dist-tags"]) || "default";
  const values = { ...ref, ...semverParts, ...parts, ...github.context, distTag };

  core.info(`🔹 time: ${JSON.stringify(parts)}`);
  core.info(`🔹 semver: ${JSON.stringify(semverParts)}`);
  core.info(`🔹 dist-tag: ${JSON.stringify(distTag)}`);

  let result = fillTemplate(template, values)

  core.info(`🔹 Template: ${template}`);
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
  core.setOutput("tag", distTag);

   core.info('✅ Action completed successfully!');
}

run();
module.exports = __webpack_exports__;
/******/ })()
;