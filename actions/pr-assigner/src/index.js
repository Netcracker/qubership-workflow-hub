const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const ConfigLoader = require("./loader");
const { execSync } = require("child_process");

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
    if (!codeownersPath) {
        core.setFailed(`❗️ Can't find CODEOWNERS file.`);
        return;
    }
    core.info(`🔍 CODEOWNERS file found on: ${codeownersPath}`);
    const codeownersContent = fs.readFileSync(codeownersPath, 'utf8');
    const lines = codeownersContent.split('\n');
    const userLine = lines.find(line => line.trim().startsWith('*'));
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

    let count = core.getInput("assignees-count") || 1;
    let assignees = [];

    if (fs.existsSync(configurationPath)) {
        const content = new ConfigLoader().load(configurationPath);
        assignees = content['assignees'];
        count = content['count'] != null ? content['count'] : count;

        core.info(`🔹 Count for shuffle: ${count}`);
        core.info(`🔹 Assignees: ${assignees}`);

        core.warning(`Using configuration file ${configurationPath}`);
    } else {
        const codeownersPath = findFile('CODEOWNERS');
        assignees = getUsersFromCodeowners(codeownersPath);
        if (assignees == null) {
            core.setFailed(`❗️ Can't process CODEOWNERS file`);
            return;
        }
        core.info(`🔹 Count for shuffle: ${count}`);
        core.info(`🔹 Assignees: ${assignees}`);
        core.warning(`Using CODEOWNERS file`);
    }

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

        const getAssigneesCmd = `gh pr view ${pullRequest.number} --json assignees --jq ".assignees | map(.login) | join(\\" \\" )"`;
        let currentAssignees = execSync(getAssigneesCmd).toString().trim();
        if (currentAssignees) {
            const removeCmd = `gh pr edit ${pullRequest.number} --remove-assignee ${currentAssignees}`;
            core.info(`🔍 Removing current assignees with: ${removeCmd}`);
            execSync(removeCmd, { stdio: 'inherit' });
        } else {
            core.info("🔍 No assignees to remove.");
        }

        const addCmd = `gh pr edit ${pullRequest.number} --add-assignee ${assignees.join(' ')}`;
        core.info(` Adding new assignees with: ${addCmd}`);
        execSync(addCmd, { stdio: 'inherit' });

        core.info("✅ Action completed successfully!");
    } catch (error) {
        core.setFailed(`❗️ ${error.message}`);
    }
}

run();
