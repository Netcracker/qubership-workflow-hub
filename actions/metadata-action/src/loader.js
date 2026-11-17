import fs from "node:fs";
import { load as loadYaml } from "js-yaml";
import * as core from "@actions/core";
import path from "node:path";
import log from "@qubership/action-logger";
import Ajv from "ajv";
import schema from "../config.schema.json" with { type: "json" };

// Cache schema and validator for performance
let cachedValidator = null;

function getValidator() {
  if (cachedValidator) {
    return cachedValidator;
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
      log.notice(`Configuration file not found: ${configPath}`);
      this._configExists = false;
      return null;
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');

    let config;
    try {
      config = loadYaml(fileContent);
      if (debug) {
        log.dim("🔍 Loaded configuration YAML:", JSON.stringify(config, null, 2));
        log.dim("🔑 Object Keys:", Object.keys(config));
      }
    } catch (error) {
      core.setFailed(`❗️ Error parsing YAML file: ${error.message}`);
      return null;
    }

    const validate = getValidator();
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

export default ConfigLoader;
