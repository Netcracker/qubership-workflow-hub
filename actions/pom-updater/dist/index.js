/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 958:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 624:
/***/ ((module) => {

module.exports = eval("require")("xmldom");


/***/ }),

/***/ 370:
/***/ ((module) => {

module.exports = eval("require")("xpath");


/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

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
const core = __nccwpck_require__(958);
const { DOMParser, XMLSerializer } = __nccwpck_require__(624);
const xpath = __nccwpck_require__(370);
const fs = __nccwpck_require__(896);

async function run() {
  try {
    // const filePath = core.getInput('file_path') || 'pom.xml';
    // {"pom1": "path/to/pom1.xml", "pom2": "path/to/pom2.xml"}
    const filePathsInput = core.getInput('file_paths') || '{"default": "pom.xml"}';
    let filePathsObj;
    try {
      filePathsObj = JSON.parse(filePathsInput);
    } catch (err) {
      throw new Error('Input "file_paths" should be valid JSON object.');
    }
    const filePaths = Object.values(filePathsObj);


    const xpathExpression = core.getInput('path') || '//p:project/p:properties/p:revision';
    const newValue = core.getInput('new_value');

    if (!newValue) {
      throw new Error('Input "newValue" is required but not provided.');
    }

    const select = xpath.useNamespaces({ p: 'http://maven.apache.org/POM/4.0.0' });

    filePaths.forEach(element => {

      const xml = fs.readFileSync(element, 'utf8');
      const doc = new DOMParser().parseFromString(xml);
      const nodes = select(xpathExpression, doc);

      if (nodes.length === 0) {
        throw new Error(`No nodes found for expression: ${xpathExpression}`);
      }

      core.info(`Found ${nodes.length} nodes for expression: ${xpathExpression}`);

      nodes.forEach((node) => {
        core.info(`Updated node value ${node.textContent} to: ${newValue}`);
        node.textContent = newValue;

      });

      const serializedXml = new XMLSerializer().serializeToString(doc);
      fs.writeFileSync(element, serializedXml);

      core.info(`Updated file: ${element}`);
    });

    //const updatedXml = fs.readFileSync(filePath, 'utf8');
    //core.info(`Updated XML:\n${updatedXml}`);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();

module.exports = __webpack_exports__;
/******/ })()
;