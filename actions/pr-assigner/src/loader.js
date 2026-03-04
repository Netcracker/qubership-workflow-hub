import fs from "node:fs";
import yaml from "js-yaml";
import { createRequire } from "node:module";
import path from "node:path";
import log from '@netcracker/action-logger';

const require = createRequire(import.meta.url);
const Ajv = require("ajv");

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

    const schemaPath = path.resolve(new URL('.', import.meta.url).pathname, '..', 'config.schema.json');
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

export default ConfigLoader;