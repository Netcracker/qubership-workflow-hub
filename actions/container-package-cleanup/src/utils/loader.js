import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";
import * as core from "@actions/core";
import Ajv from "ajv";
import log from "@qubership/action-logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

export default ConfigLoader;