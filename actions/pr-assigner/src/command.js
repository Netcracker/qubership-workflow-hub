const { execSync } = require("child_process");

class GhCommand {
    constructor() {
    }
    getAssigneesCommand(prNumber) {
        let cmd = `gh pr view ${prNumber} --json assignees --jq ".assignees | map(.login) | join(\\" \\" )"`;
        return execSync(cmd, { stdio: 'inherit' }).toString().trim();
    }

    addAssigneesCommand(prNumber, assignees) {
        let cmd = `gh pr edit ${prNumber} ${assignees.map(user => `--add-assignee ${user}`).join(' ')}`;
        return  execSync(cmd, { stdio: 'inherit' });
    }
}

module.exports = GhCommand;