const core = require("@actions/core");

const COLORS = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  lightGreen: "\x1b[92m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

class Logger {
  constructor() {
    this.debugMode = false;
    this.dryRunMode = false;
  }

  // Get caller info from stack trace
  _getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    // Skip first 3 lines: Error, _getCallerInfo, calling logger method
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      // Match file path in stack trace
      const match = line.match(/at\s+(?:.*\s+)?\(?([^:]+):(\d+):\d+\)?/);
      if (match && !match[1].includes('node_modules')) {
        const filePath = match[1].replace(/\\/g, '/');
        const fileName = filePath.split('/').pop();
        return `${fileName}:${match[2]}`;
      }
    }
    return 'unknown';
  }

  /** Enable or disable debug logging */
  setDebug(enabled) {
    this.debugMode = Boolean(enabled);
    const caller = this._getCallerInfo();
    this.debug(`Debug mode ${this.debugMode ? "enabled" : "disabled"} (called from ${caller})`);
  }

  setDryRun(enabled) {
    this.dryRunMode = Boolean(enabled);
    this.debug(`Dry-run mode ${this.dryRunMode ? "enabled" : "disabled"}`);
  }

  // --- Base color wrappers ---
  info(message) {
    core.info(`${COLORS.blue}${message}${COLORS.reset}`);
  }

  success(message) {
    core.info(`${COLORS.green}${message}${COLORS.reset}`);
  }

  lightSuccess(message) {
    core.info(`${COLORS.lightGreen}${message}${COLORS.reset}`);
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

  plain(message) {
    core.info(message);
  }

  // --- Grouping ---
  group(title) {
    core.startGroup(`${COLORS.blue}${title}${COLORS.reset}`);
  }

  startGroup(title) {
    core.startGroup(`${COLORS.blue}${title}${COLORS.reset}`);
  }

  endGroup() {
    core.endGroup();
  }

  startDebugGroup(title) {
    if (!this.debugMode) return;
    core.startGroup(`${COLORS.gray}[debug] ${title}${COLORS.reset}`);
  }

  // --- Debug section ---
  debug(message, caller = null) {
    if (!this.debugMode) return;
    const callerInfo = caller || this._getCallerInfo();
    const formatted = `${COLORS.gray}[debug][${callerInfo}] ${message}${COLORS.reset}`;
    core.info(formatted);
    if (typeof core.debug === "function") core.debug(message); // for GitHub’s ACTIONS_STEP_DEBUG
  }

  debugJSON(label, obj, caller = null) {
    if (!this.debugMode) return;
    const callerInfo = caller || this._getCallerInfo();
    const formatted = JSON.stringify(obj, null, 2);
    const message = `${COLORS.gray}[debug][${callerInfo}] ${label}:\n${formatted}${COLORS.reset}`;
    core.info(message);
    if (typeof core.debug === "function") core.debug(`${label}: ${formatted}`);
  }

  dryrun(message, caller = null) {
    if (!this.dryRunMode) return;
    const callerInfo = caller || this._getCallerInfo();
    const formatted = `${COLORS.gray}[dry-run][${callerInfo}] ${message}${COLORS.reset}`;
    core.info(formatted);
  }

  // --- Errors ---
  fail(message) {
    core.setFailed(message);
  }
}

module.exports = new Logger();
