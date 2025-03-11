/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 958:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 394:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


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
const github = __nccwpck_require__(394);

function parseClientPayload(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`❗ Invalid JSON for client_payload: ${input}`);
  }
}

async function run() {
  try {
    const eventType = core.getInput("event-type", { required: true });
    const clientPayloadInput = core.getInput("client-payload") || "{}";
    const clientPayload = parseClientPayload(clientPayloadInput);

    core.info(`🔹 Event name: ${eventType}`);
    core.info(`🔹 Client Payload: ${JSON.stringify(clientPayload)}`);

    const token =
      core.getInput("github-token", { required: true }) || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("❗ GitHub token is not provided. Make sure it is passed.");
    }

    const octokit = github.getOctokit(token);
    const { owner: defaultOwner, repo: defaultRepo } = github.context.repo;
    const owner = core.getInput('owner') || defaultOwner;
    const repo = core.getInput('repo') || defaultRepo;

    const { status } = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: clientPayload,
    });

    core.info(`💡 Custom event "${eventType}" triggered on ${owner}/${repo} with status: ${status}`);
    core.setOutput("status", status);
  } catch (error) {
    core.setFailed(`❗ Action failed with error: ${error.message}`);
    console.error(error);
  }
}

run();

module.exports = __webpack_exports__;
/******/ })()
;