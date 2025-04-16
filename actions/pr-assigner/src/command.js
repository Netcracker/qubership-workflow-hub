const { execSync } = require("child_process");

class GhCommand {
    constructor() {
    }
    async getAssigneesCommand(prNumber) {
        let cmd = `gh pr view ${pullRequest.number} --json assignees --jq ".assignees | map(.login) | join(\\" \\" )"`;
        return execSync(cmd, { stdio: 'inherit' }).toString().trim();
    }

    async addAssigneesCommand(prNumber, assignees) {
        let cmd = `gh pr edit ${prNumber} ${assignees.map(user => `--add-assignee ${user}`).join(' ')}`;
        return  execSync(cmd, { stdio: 'inherit' }).toString().trim();
    }
}

module.exports = GhCommand;