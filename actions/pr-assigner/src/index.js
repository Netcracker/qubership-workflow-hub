const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const ConfigLoader = require("./loader");
const GhCommand = require("./command");
const log = require("@netcracker/action-logger");

// function findCodeowners(startDir = process.cwd()) {
//     let found = null;

//     function searchDir(dir) {
//         const entries = fs.readdirSync(dir, { withFileTypes: true });

//         for (const entry of entries) {
//             const fullPath = path.join(dir, entry.name);

//             if (entry.isFile() && entry.name === "CODEOWNERS") {
//                 found = fullPath;
//                 return true;
//             } else if (entry.isDirectory()) {
//                 if ([".git", "node_modules"].includes(entry.name)) continue;
//                 if (searchDir(fullPath)) return true;
//             }
//         }
//         return false;
//     }

//     searchDir(startDir);
//     return found;
// }

function findCodeowners(startDir = process.cwd()) {
    const repoRoot = startDir;
    const candidates = [
        path.join(repoRoot, ".github", "CODEOWNERS"),
        path.join(repoRoot, "CODEOWNERS"),
        path.join(repoRoot, "docs", "CODEOWNERS"),
    ];

    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}

function getUsersFromCodeowners(codeownersPath) {
    log.info(`🔍 CODEOWNERS file found on: ${codeownersPath}`);
    const codeownersContent = fs.readFileSync(codeownersPath, 'utf8');
    const lines = codeownersContent.split('\n');
    const userLine = lines.find(line => line.trim().startsWith('*'));
    if (!userLine) {
        log.warn(`❗️ No user found in CODEOWNERS file`);
        return null;
    }
    return userLine.split(/\s+/).slice(1).filter(user => user.trim() !== '').map(user => user.replace('@', ''));
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function run() {

    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        log.fail("❗️ No pull request found in the context.");
    }

    const defaultConfigurationPath = ".github/pr-assigner-config.yml";
    const configurationPath = core.getInput("configuration-path") || defaultConfigurationPath;

    let count = core.getInput("shuffle");
    // core.info(`Input shuffle: ${count}`);
    let assignees = [];

    let sourceUsed = "CODEOWNERS file";
    if (fs.existsSync(configurationPath)) {
        const content = new ConfigLoader().load(configurationPath);
        assignees = content.assignees || [];
        count = content.count != null ? content.count : count;
        sourceUsed = `configuration file: ${configurationPath}`;

    } else {
        const filePath = findCodeowners();
        if (!filePath) {
            log.fail(`❗️ Can't find CODEOWNERS file.`);
            return;
        }
        assignees = getUsersFromCodeowners(filePath);
    }

    log.info(`Count for shuffle: ${count}`);
    log.info(`Assignees: ${assignees}`);
    log.info(`Source used: ${sourceUsed}`);


    const assigneesLength = assignees.length;
    if (count > assigneesLength) {
        log.warn(`Assignees count ${count} exceeds number of available assignees ${assigneesLength}. Using available count (${assigneesLength}).`);
        count = assigneesLength;
    }

    if (assigneesLength > 1) {
        assignees = shuffleArray(assignees);
    }

    assignees = assignees.slice(0, count);

    try {
        const ghCommand = new GhCommand();
        const currentAssignees = ghCommand.getAssigneesCommand(pullRequest.number);
        // core.info(`🔍 Current assignees: ${currentAssignees}`);
        if (currentAssignees != null && currentAssignees != "") {
            log.success(`✔️ PR already has assignees: ${currentAssignees}`);
            return;
        }

        log.info(`Adding new assignees with: ${assignees}`);
        ghCommand.addAssigneesCommand(pullRequest.number, assignees);

        log.success(`✔️ Assigned ${assignees.length} user(s) to PR #${pullRequest.number}: ${assignees.join(", ")}`);
    } catch (error) {
        log.fail(`❗️ Failed to assign users: ${error.message}`);
    }
}

run();
