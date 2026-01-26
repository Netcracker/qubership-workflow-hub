const fs = require("fs");
const yaml = require("js-yaml");
const core = require("@actions/core");
const Ajv = require("ajv");
const path = require("path");

const log = require("@netcracker/action-logger");

// Cache schema and validator for performance
let cachedValidator = null;

function getValidator() {
  if (cachedValidator) {
    return cachedValidator;
  }

  const schemaPath = path.resolve(__dirname, '..', 'config.schema.json');
  if (!fs.existsSync(schemaPath)) {
    core.setFailed(`❗️ Schema file not found: ${schemaPath}`);
    return null;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  let schema;
  try {
    schema = JSON.parse(schemaContent);
  } catch (error) {
    core.setFailed(`❗️ Error parsing JSON schema: ${error.message}`);
    return null;
  }

  const ajv = new Ajv();
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

class ConfigLoader {
  constructor() {
    this._configExists = true;
  }

  get fileExists() {
    return this._configExists;
  }

  load(filePath, debug = false) {
    const configPath = path.resolve(filePath);
    log.dim(`Try to reading configuration ${configPath}`);

    if (!fs.existsSync(configPath)) {
      log.warn(`Configuration file not found: ${configPath}`);
      this._configExists = false;
      return null;
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');

    let config;
    try {
      config = yaml.load(fileContent);
      if (debug) {
        log.dim("🔍 Loaded configuration YAML:", JSON.stringify(config, null, 2));
        log.dim("🔑 Object Keys:", Object.keys(config));
      }
    } catch (error) {
      core.setFailed(`❗️ Error parsing YAML file: ${error.message}`);
      return null;
    }

    const validate = getValidator();
    if (!validate) {
      return null;
    }

    const valid = validate(config);
    if (!valid) {
      const errors = new Ajv().errorsText(validate.errors);
      core.setFailed(`❗️ Configuration file is invalid: ${errors}`);
      return null;
    }

    core.info(`💡 Configuration file is valid: ${valid}`);
    return config;
  }
}

module.exports = ConfigLoader;
