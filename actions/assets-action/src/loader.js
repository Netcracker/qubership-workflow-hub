const path = require("path");
const Ajv = require('ajv');
const yaml = require('js-yaml');
const fs = require("fs");
const core = require("@actions/core");

class Loader {
    constructor() {
    }

    async loadConfig(jsonPath) {
        //const configPath = path.resolve(process.env.GITHUB_WORKSPACE || process.cwd(), jsonPath);

        const configPath = path.resolve(jsonPath);
        console.log(`💡 Reading asset config from ${configPath}`)


        if (!fs.existsSync(configPath)) {
            core.setFailed(`❗️ File not found: ${configPath}`);
            return;
        }

        const fileContent = fs.readFileSync(jsonPath, 'utf8');

        let config;
        try {
            config = yaml.load(fileContent);
        }
        catch (error) {
            core.setFailed(`❗️ Error parsing YAML file: ${error.message}`);
            return;
        }

        const schemaPath = path.resolve(__dirname, '..', 'config.schema.json');
        if (!fs.existsSync(schemaPath)) {
            core.setFailed(`❗️ Schema file not found: ${schemaPath}`);
            return;
        }

        const schemaContent = fs.readFileSync(schemaPath, 'utf8');

        let schema;
        try {
            schema = JSON.parse(schemaContent);
        }
        catch (error) {
            core.setFailed(`❗️ Error parsing JSON schema: ${error.message}`);
            return;
        }

        const ajv = new Ajv();
        const validate = ajv.compile(schema);
        const valid = validate(config);
        if (!valid) {
            constErrors = ajv.errorsText(validate.errors);
            core.setFailed(`❗️ Configuration file is invalid: ${constErrors}`);
            return;
        }
        core.warning(`Config file is valid: ${valid}\n`);
        return config;
    }
}

module.exports = Loader;
