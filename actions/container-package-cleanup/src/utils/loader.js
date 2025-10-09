const fs = require("node:fs");
const yaml = require("js-yaml");
const core = require("@actions/core");
const Ajv = require("ajv");
const path = require("node:path");
const log = require("@netcracker/action-logger");


class ConfigLoader {
  constructor() {
    this.fileExist = true;
  }

  get fileExists() {
    return this.fileExist;
  }

  load(filePath) {
    const configPath = path.resolve(filePath);
    log.dim(`💡 Try to reading configuration ${configPath}`)

    if (!fs.existsSync(configPath)) {
      log.warn(`❗️ Configuration file not found: ${configPath}`);
      this.fileExist = false;
      return;
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');

    let config;
    try {
      config = yaml.load(fileContent);
    }
    catch (error) {
      log.fail(`❗️ Error parsing YAML file: ${error.message}`);
      return;
    }

    const schemaPath = path.resolve(__dirname, '..', 'config.schema.json');
    if (!fs.existsSync(schemaPath)) {
      log.fail(`❗️ Schema file not found: ${schemaPath}`);
      return;
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    let schema;
    try {
      schema = JSON.parse(schemaContent);
    }
    catch (error) {
      log.fail(`❗️ Error parsing JSON schema: ${error.message}`);
      return;
    }

    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(config);
    if (!valid) {
      const errors = ajv.errorsText(validate.errors);
      log.fail(`❗️ Configuration file is invalid: ${errors}`);
      return;
    }
    core.warning(`Configuration file is valid: ${valid}`);
    return config;
  }
}

module.exports = ConfigLoader;