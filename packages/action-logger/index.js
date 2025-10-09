const core = require("@actions/core");

const COLORS = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

class Logger {
  constructor() {
    this.debugMode = false;
    this.dryRunMode = false;
  }

  /** Enable or disable debug logging */
  setDebug(enabled) {
    this.debugMode = Boolean(enabled);
    this.debug(`Debug mode ${this.debugMode ? "enabled" : "disabled"}`);
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

  endGroup() {
    core.endGroup();
  }

  // --- Debug section ---
  debug(message) {
    if (!this.debugMode) return;
    const formatted = `${COLORS.gray}[debug] ${message}${COLORS.reset}`;
    core.info(formatted);
    if (typeof core.debug === "function") core.debug(message); // for GitHub’s ACTIONS_STEP_DEBUG
  }

  debugJSON(label, obj) {
    if (!this.dr) return;
    const formatted = JSON.stringify(obj, null, 2);
    this.debug(`${label}:\n${formatted}`);
  }

  dryrun(message) {
    if (!this.dryRunMode) return;
    const formatted = `${COLORS.gray}[dry-run] ${message}${COLORS.reset}`;
    core.info(formatted);
  }

  // --- Errors ---
  fail(message) {
    core.setFailed(message);
  }
}

module.exports = new Logger();
