import fs from "node:fs";
import { load as loadYaml } from "js-yaml";
import schema from "../config.schema.json" with { type: "json" };
import path from "node:path";
import log from '@qubership/action-logger';

import Ajv from "ajv";

class ConfigLoader {
  load(filePath) {
    const configPath = path.resolve(filePath);
    log.info(`💡 Reading configuration ${configPath}`);

    if (!fs.existsSync(configPath)) {
      log.error(`❗️ Configuration file not found: ${configPath}`);
      return;
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');

    let config;
    try {
      config = loadYaml(fileContent);
    }
    catch (error) {
      log.fail(`❗️ Error parsing YAML file: ${error.message}`);
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

export default ConfigLoader;