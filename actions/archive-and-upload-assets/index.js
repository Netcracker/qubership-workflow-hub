const fs = require("fs");
const core = require("@actions/core");
const { execSync } = require('child_process');
const path = require("path");
const Ajv = require('ajv');
const yaml = require('js-yaml');

async function assetsUpload(dist_path, ref) {
    const directoryPath = path.join(dist_path);
    try {
        const files = fs.readdirSync(directoryPath);
        for (const file of files) {
            const fullPath = path.join(directoryPath, file);
            if (fs.statSync(fullPath).isFile()) {
                console.log(`🔄 Uploading ${fullPath} to ${ref}`);
                execSync(`gh release upload ${ref} ${fullPath} --clobber`, {
                    stdio: "inherit",
                });
            }
        }
    } catch (err) {
        throw err;
    }
}

async function run() {
    try {

        const jsonFile = core.getInput('config-path');
        const ref = core.getInput('ref') || process.env.GITHUB_REF_NAME;
        const distPath = core.getInput('dist-path');
        const dryRun = core.getInput('dry-run') || 'false';

        core.info(`Debug:\n 🔹json: ${jsonFile}\n 🔹ref: ${ref}\n 🔹distPath: ${distPath}\n`);

        const configPath = path.resolve(jsonFile);
        console.log(`💡 Reading asset config from ${configPath}`)

        if (!fs.existsSync(jsonFile)) {
            core.setFailed(`❗️ File not found: ${jsonFile}`);
            return;
        }

        const fileContent = fs.readFileSync(jsonFile, 'utf8');

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


        fs.mkdirSync(distPath, { recursive: true })

        if (Array.isArray(config.archives) && config.archives.length) {
            for (const archiveItem of config.archives) {
                let source = archiveItem.source;
                let outputName = archiveItem.outputName;
                let archiveType = archiveItem.archiveType;

                if (!fs.existsSync(source)) {
                    throw new Error(`❗️ Folder not found: ${source}`);
                }

                let outputFile = "";
                let command = "";

                if (archiveType == "tar.gz") {
                    outputFile = `${outputName}-${ref}.tar.gz`;
                    command = `tar -czf ${distPath}/${outputFile} ${source}`;

                }
                else if (archiveType == "zip") {
                    outputFile = `${outputName}-${ref}.zip`;
                    command = `zip -r ${distPath}/${outputFile} ${source}`;
                }
                else if (archiveType == "tar") {
                    outputFile = `${outputName}-${ref}.tar`;
                    command = `tar -cf ${distPath}/${outputFile} ${source}`;
                }

                execSync(command, {
                    cwd: process.env.GITHUB_WORKSPACE,
                    stdio: "inherit",
                });

                core.info(`🧱 Creating archive ${outputFile} from ${source} archiveType: ${archiveType}`);;
            }
        }
        else {
            core.info(`⚠️ No archives provided for processing`);
        }

        if (Array.isArray(config.files) && config.files.length) {
            for (const fileItem of config.files) {
                const source = fileItem.source;
                const outputName = fileItem.outputName;

                if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
                    throw new Error(`❗️ File not found: ${source}`);
                }

                const ext = path.extname(source) || '';
                const destName = `${outputName}-${ref}.${ext}`;
                const destPath = path.join(distPath, destName);
                fs.copyFileSync(source, destPath);
                core.info(`🗂️ Copied file ${source} → ${destPath}`);
            }
        } else {
            core.info(`⚠️ No individual files provided for processing`);
        }

        if (dryRun === 'true') {
            core.warning(` Dry run mode: no files will be uploaded to assets.`);
            return;
        }

        await assetsUpload(distPath, ref);
        core.info('✅ Action completed successfully!');
    }
    catch (error) {
        core.setFailed(`❌ Action failed: ${error.message}`);
    }
}

run();