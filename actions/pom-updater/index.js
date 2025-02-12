const core = require('@actions/core');
const { DOMParser, XMLSerializer } = require('xmldom');
const xpath = require('xpath');
const fs = require('fs');

async function run() {
  try {
    // const filePath = core.getInput('file_path') || 'pom.xml';
    // {"pom1": "path/to/pom1.xml", "pom2": "path/to/pom2.xml"}
    const filePathsInput = core.getInput('file_paths') || '{"default": "pom.xml"}';
    let filePathsObj;
    try {
      filePathsObj = JSON.parse(filePathsInput);
    } catch (err) {
      throw new Error('❗️ Input "file_paths" should be valid JSON object.');
    }
    const filePaths = Object.values(filePathsObj);


    const xpathExpression = core.getInput('path') || '//p:project/p:properties/p:revision';
    const newValue = core.getInput('new_value');

    if (!newValue) {
      throw new Error('❗️ Input "newValue" is required but not provided.');
    }

    const select = xpath.useNamespaces({ p: 'http://maven.apache.org/POM/4.0.0' });

    filePaths.forEach(element => {

      const xml = fs.readFileSync(element, 'utf8');
      const doc = new DOMParser().parseFromString(xml);
      const nodes = select(xpathExpression, doc);

      if (nodes.length === 0) {
        throw new Error(`No nodes found for expression: ${xpathExpression}`);
      }

      core.info(`Found ${nodes.length} nodes for expression: ${xpathExpression}`);

      nodes.forEach((node) => {
        core.info(`🔷 Updated node value ${node.textContent} ->: ${newValue}`);
        node.textContent = newValue;

      });

      const serializedXml = new XMLSerializer().serializeToString(doc);
      fs.writeFileSync(element, serializedXml);

      core.warning(`💡 Updated file: ${element}`);
    });

    //const updatedXml = fs.readFileSync(filePath, 'utf8');
    //core.info(`Updated XML:\n${updatedXml}`);
    core.info('✅ Action completed successfully!');

  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

run();
