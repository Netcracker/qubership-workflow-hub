const fs = require("node:fs");
const yaml = require("js-yaml");
const core = require("@actions/core");
const Ajv = require("ajv");
const path = require("node:path");

const log = require('@netcracker/action-logger');

class ConfigLoader {
  load(filePath) {
    const configPath = path.resolve(filePath);
    console.log(`💡 Try to reading configuration ${configPath}`)

    if (!fs.existsSync(configPath)) {
      log.error(`❗️ Configuration file not found: ${configPath}`);
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
      log.fail(`❗️ JSON schema file not found: ${schemaPath}`);
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
      log.fail(`❗️ Configuration validation error: ${errors}`);
      return;
    }
    log.success(`✅ Configuration file is valid.`);
    return config;
  }
}

module.exports = ConfigLoader;