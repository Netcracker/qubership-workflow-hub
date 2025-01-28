const core = require('@actions/core');
const { DOMParser, XMLSerializer } = require('xmldom');
const xpath = require('xpath');
const fs = require('fs');

async function run() {
  try {
    const filePath = core.getInput('file_path') || 'pom.xml';
    const xpathExpression = core.getInput('path') || '//p:project/p:properties/p:revision';
    const newValue = core.getInput('new_value');

    if (!newValue) {
      throw new Error('Input "newValue" is required but not provided.');
    }

    const select = xpath.useNamespaces({ p: 'http://maven.apache.org/POM/4.0.0' });
    const xml = fs.readFileSync(filePath, 'utf8');
    const doc = new DOMParser().parseFromString(xml);
    const nodes = select(xpathExpression, doc);

    if (nodes.length === 0) {
      throw new Error(`No nodes found for expression: ${xpathExpression}`);
    }

    core.info(`Found ${nodes.length} nodes for expression: ${xpathExpression}`);

    nodes.forEach((node) => {
      node.textContent = newValue;
      core.info(`Updated node value to: ${newValue}`);
    });

    const serializedXml = new XMLSerializer().serializeToString(doc);
    fs.writeFileSync(filePath, serializedXml);

    core.info(`Updated file: ${filePath}`);
    //const updatedXml = fs.readFileSync(filePath, 'utf8');
    //core.info(`Updated XML:\n${updatedXml}`);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
