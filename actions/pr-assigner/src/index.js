const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const ConfigLoader = require("./loader");
const GhCommand = require("./command");

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
    core.info(`🔍 CODEOWNERS file found on: ${codeownersPath}`);
    const codeownersContent = fs.readFileSync(codeownersPath, 'utf8');
    const lines = codeownersContent.split('\n');
    const userLine = lines.find(line => line.trim().startsWith('*'));
    if (!userLine) {
        core.warning(`❗️ No user found in CODEOWNERS file`);
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
        core.setFailed("❗️ Action must run on a pull request.");
        process.exit(1);
    }

    const defaultConfigurationPath = ".github/pr-assigner-config.yml";
    const configurationPath = core.getInput("configuration-path") || defaultConfigurationPath;

    let count = core.getInput("shuffle");
    // core.info(`Input shuffle: ${count}`);
    let assignees = [];

    let sourceUsed = "CODEOWNERS file";
    if (fs.existsSync(configurationPath)) {
        const content = new ConfigLoader().load(configurationPath);
        assignees = content['assignees'];
        count = content['count'] != null ? content['count'] : count;
        sourceUsed = `configuration file: ${configurationPath}`;

    } else {
        const filePath = findCodeowners();
        if (!filePath) {
            core.setFailed(`❗️ Can't find CODEOWNERS file.`);
            return;
        }
        assignees = getUsersFromCodeowners(filePath);
    }

    core.info(`🔹 Count for shuffle: ${count}`);
    core.info(`🔹 Assignees: ${assignees}`);
    core.info(`💡 Source used: ${sourceUsed}`);


    const assigneesLength = assignees.length;
    if (count > assigneesLength) {
        core.warning(`Assignees count ${count} exceeds number of available assignees ${assigneesLength}. Using available count (${assigneesLength}).`);
        count = assigneesLength;
    }

    if (assigneesLength > 1) {
        assignees = shuffleArray(assignees);
    }

    assignees = assignees.slice(0, count);

    try {
        const ghCommand = new GhCommand();
        let currentAssignees = ghCommand.getAssigneesCommand(pullRequest.number);
        // core.info(`🔍 Current assignees: ${currentAssignees}`);
        if (currentAssignees != null && currentAssignees != "") {
            core.info(`✔️ PR has current assignees: ${currentAssignees}, skipping...`);
            return;
        }

        core.info(`🟡 Adding new assignees with: ${assignees}`);
        ghCommand.addAssigneesCommand(pullRequest.number, assignees);

        core.info("✔️ Action completed successfully!");
    } catch (error) {
        core.setFailed(`❗️ ${error.message}`);
    }
}

run();
