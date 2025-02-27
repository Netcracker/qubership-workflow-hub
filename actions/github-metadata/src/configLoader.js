const fs = require("fs");
const yaml = require("js-yaml");
const core = require("@actions/core");

class ConfigLoader {
  constructor(configPath) {
    this.configPath = configPath;
  }

  load() {
    try {
      const fileContents = fs.readFileSync(this.configPath, "utf8");
      return yaml.load(fileContents);
    } catch (e) {
      core.error(`Failed to load config.yml: ${e}`);
      return {};
    }
  }
}

module.exports = ConfigLoader;