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
}

module.exports = new Logger();
