const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const ConfigLoader = require("./loader");
const GhCommand = require("./command");

function findFile(filename, startDir = process.cwd()) {
    let dir = startDir;
    while (dir !== path.parse(dir).root) {
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
        dir = path.dirname(dir);
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

    let count = core.getInput("suffle-count");
    let assignees = [];

    let sourceUsed = "CODEOWNERS file";
    if (fs.existsSync(configurationPath)) {
        const content = new ConfigLoader().load(configurationPath);
        assignees = content['assignees'];
        count = content['count'] != null ? content['count'] : count;
        sourceUsed = `configuration file: ${configurationPath}`;

    } else {
        const codeownersPath = findFile('CODEOWNERS');
        if (!codeownersPath) {
            core.setFailed(`❗️ Can't find CODEOWNERS file.`);
            return;
        }
        assignees = getUsersFromCodeowners(codeownersPath);
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
        let currentAssignees = await ghCommand.getAssigneesCommand(pullRequest.number);
        core.info(`💡 Current assignees: ${currentAssignees}`);

        if (currentAssignees != "") {
            core.info(`✔️ PR has current assignees: ${currentAssignees}, skipping...`);
            return;
        }

        core.info(`🟡 Adding new assignees with: ${addCmd}`);
        await ghCommand.addAssigneesCommand(pullRequest.number, assignees);

        core.info("✔️ Action completed successfully!");
    } catch (error) {
        core.setFailed(`❗️ ${error.message}`);
    }
}

run();
