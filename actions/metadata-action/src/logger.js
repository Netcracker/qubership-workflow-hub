const core = require("@actions/core");

const COLORS = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    gray: "\x1b[90m"
};

class Logger {
    constructor() {
        this.debugMode = false;
    }

    setDebug(enabled) {
        this.debugMode = Boolean(enabled);
    }

    info(message) {
        core.info(`${COLORS.blue}${message}${COLORS.reset}`);
    }

    success(message) {
        core.info(`${COLORS.green}${message}${COLORS.reset}`);
    }

    warn(message) {
        core.warning(`${COLORS.yellow}${message}${COLORS.reset}`);
    }

    error(message) {
        core.error(`${COLORS.red}${message}${COLORS.reset}`);
    }

    dim(message) {
        core.info(`${COLORS.gray}${message}${COLORS.reset}`);
    }

    group(title) {
        core.startGroup(`${COLORS.blue}${title}${COLORS.reset}`);
    }

    endGroup() {
        core.endGroup();
    }

    plain(message) {
        core.info(message);
    }

    debug(message) {
        if (this.debugMode) {
            core.info(`${COLORS.gray}[debug] ${message}${COLORS.reset}`);
        }
    }
}

module.exports = new Logger();
