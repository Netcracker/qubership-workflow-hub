const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const ConfigLoader = require("./loader");
const GhCommand = require("./command");
const log = require("@netcracker/action-logger");

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

    const cleanedLines = lines
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    const userLine = cleanedLines.find(line => line.startsWith('*'));
    const targetLine = userLine ?? cleanedLines[cleanedLines.length - 1];
    if (!targetLine) {
        log.fail(`❗️ No user found in CODEOWNERS file`);
        return [];
    }
    return targetLine.split(/\s+/).slice(1).filter(user => user.trim() !== '').map(user => user.replace('@', ''));
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

    if (!pullRequest) return log.fail("❗️ No pull request found in the context.");


    const defaultConfigurationPath = ".github/pr-assigner-config.yml";
    const configurationPath = core.getInput("configuration-path") || defaultConfigurationPath;

    let count = parseInt(core.getInput("shuffle") || "1", 10);
    let selfAssign = core.getInput("self-assign")?.toLowerCase() !== "false";

    let assignees = [];
    let sourceUsed = "CODEOWNERS file";

    if (fs.existsSync(configurationPath)) {
        const config = new ConfigLoader().load(configurationPath);
        assignees = config.assignees ?? assignees;
        count = config.count ?? count;
        selfAssign = config.selfAssign ?? selfAssign;
        sourceUsed = `configuration file: ${configurationPath}`;

    } else {
        const filePath = findCodeowners();
        if (!filePath) return log.fail(`❗️ Can't find CODEOWNERS file.`);
        assignees = getUsersFromCodeowners(filePath);
    }

    log.dim(`Count for shuffle: ${count}`);
    log.dim(`Assignees: ${assignees}`);
    log.dim(`Source used: ${sourceUsed}`);


    assignees = assignees.filter(user => user && user.trim() !== '');
    if (assignees.length === 0) return log.fail(`❗️ No assignees found in the configuration file.`);

    const author = pullRequest.user.login;
    log.dim(`Pull request author: ${author}`);

    const authorAssignee = assignees.filter(user => user.toLowerCase() === author.toLowerCase());

    if (selfAssign && authorAssignee.length > 0) {
        assignees = authorAssignee;
        log.dim(`Author found in CODEOWNERS, assigning to self: ${assignees}`);
    }
    else {
        if (count > assignees.length) {
            log.warn(`⚠️ Requested ${count} assignees, but only ${assignees.length} available. Using ${assignees.length}.`);
            count = assignees.length;
        }

        if (assignees.length > 1) {
            assignees = shuffleArray(assignees);
        }
        assignees = assignees.slice(0, count);
    }

    try {
        const ghCommand = new GhCommand();
        const currentAssignees = ghCommand.getAssigneesCommand(pullRequest.number);

        if (currentAssignees && currentAssignees.length > 0) {
            log.success(`✔️ PR already has assignees: ${currentAssignees}`);
            return;
        }

        log.dim(`Final assignees to assign: ${assignees}`);
        ghCommand.addAssigneesCommand(pullRequest.number, assignees);

        log.success(`✔️ Assigned ${assignees.length} user(s) to PR #${pullRequest.number}: ${assignees.join(", ")}`);
    } catch (error) {
        log.fail(`❗️ Failed to assign users: ${error.message}`);
    }
}

run();
