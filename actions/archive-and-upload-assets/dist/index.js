/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 958:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 326:
/***/ ((module) => {

module.exports = eval("require")("ajv");


/***/ }),

/***/ 444:
/***/ ((module) => {

module.exports = eval("require")("js-yaml");


/***/ }),

/***/ 317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

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
const fs = __nccwpck_require__(896);
const core = __nccwpck_require__(958);
const { execSync } = __nccwpck_require__(317);
const path = __nccwpck_require__(928);
const Ajv = __nccwpck_require__(326);
const yaml = __nccwpck_require__(444);


async function assetsUpload(dist_path, ref) {
    const directoryPath = path.join(dist_path);

    try {
        const files = fs.readdirSync(directoryPath);
        for (const file of files) {
            const fullPath = path.join(directoryPath, file);
            if (fs.statSync(fullPath).isFile()) {
                console.log(`🔄 Uploading ${fullPath} to ${ref}`);
                execSync(`gh release upload ${ref} ${fullPath} --clobber`, {
                    stdio: "inherit",
                });
            }
        }
        core.info(`\n-----------------------------------------------`)
    } catch (err) {
        throw err;
    }
}

async function run() {
    try {

        const jsonFile = core.getInput('config-path');
        const ref = core.getInput('ref');
        const dist_path = core.getInput('dist-path');
        const upload = core.getInput('upload');

        core.info(`Debug:\n 🔹json: ${jsonFile}\n 🔹ref: ${ref}\n 🔹dist_path: ${dist_path}\n 🔹upload: ${upload}\n`);


        const configPath = path.resolve(jsonFile);
        console.log(`💡 Reading asset config from ${configPath}`)

        if (!fs.existsSync(jsonFile)) {
            core.setFailed(`❗️ File not found: ${jsonFile}`);
            return;
        }

        const fileContent = fs.readFileSync(jsonFile, 'utf8');

        let config;
        try {
            config = yaml.load(fileContent);
        }
        catch (error) {
            core.setFailed(`❗️ Error parsing YAML file: ${error.message}`);
            return;
        }

        const schemaPath = path.resolve(__dirname, '..', 'config.schema.json');
        if (!fs.existsSync(schemaPath)) {
            core.setFailed(`❗️ Schema file not found: ${schemaPath}`);
            return;
        }

        const schemaContent = fs.readFileSync(schemaPath, 'utf8');

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
            constErrors = ajv.errorsText(validate.errors);
            core.setFailed(`❗️ Configuration file is invalid: ${constErrors}`);
            return;
        }
        core.warning(`Config file is valid: ${valid}\n`);

        // Create dist folder for storing archives
        fs.mkdirSync(dist_path, { recursive: true })
        for (const archiveItem of config.archives) {
            let source = archiveItem.source;
            let outputName = archiveItem.outputName;
            let archiveType = archiveItem.archiveType;

            if (!fs.existsSync(source)) {
                throw new Error(`❗️ Folder not found: ${source}`);
            }

            let outputFile = "";
            let command = "";

            if (archiveType == "tar.gz") {
                outputFile = `${outputName}-${ref}.tar.gz`;
                command = `tar -czf ${dist_path}/${outputFile} ${source}`;

            }
            else if (archiveType == "zip") {
                outputFile = `${outputName}-${ref}.zip`;
                command = `zip -r ${dist_path}/${outputFile} ${source}`;
            }
            else if (archiveType == "tar") {
                outputFile = `${outputName}-${ref}.tar`;
                command = `tar -cf ${dist_path}/${outputFile} ${source}`;
            }

            execSync(command, {
                cwd: process.env.GITHUB_WORKSPACE,
                stdio: "inherit",
            });

            core.info(`🧱 Creating archive ${outputFile} from ${source} archiveType: ${archiveType}`);;
        }

        core.info(`\n-----------------------------------------------`)
        if (upload === 'true') {
            await assetsUpload(dist_path, ref);
        }
        core.info('✅ Action completed successfully!');
    }
    catch (error) {
        core.setFailed(`❌ Action failed: ${error.message}`);
    }
}

run();
module.exports = __webpack_exports__;
/******/ })()
;