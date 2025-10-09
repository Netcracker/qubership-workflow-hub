const { execSync } = require("child_process");

class GhCommand {
    getAssigneesCommand(prNumber) {
        const cmd = `gh pr view ${prNumber} --json assignees --jq ".assignees | map(.login) | join(\\" \\" )"`;
        return execSync(cmd).toString().trim();
    }

    addAssigneesCommand(prNumber, assignees) {
        const cmd = `gh pr edit ${prNumber} ${assignees.map(user => `--add-assignee ${user}`).join(' ')}`;
        return execSync(cmd);
    }
}

module.exports = GhCommand;