const core = require("@actions/core");
const fs = require("fs");
const { DOMParser, XMLSerializer } = require("xmldom");
const xpath = require("xpath");

const NAMESPACES = { p: "http://maven.apache.org/POM/4.0.0" };
const select = xpath.useNamespaces(NAMESPACES);

const parseXml = (filePath) =>
  new DOMParser().parseFromString(fs.readFileSync(filePath, "utf8"));

const writeXml = (doc, filePath) =>
  fs.writeFileSync(filePath, new XMLSerializer().serializeToString(doc));

async function getArtifactId() {
  const doc = parseXml("pom.xml");
  const nodes = select("//p:project/p:artifactId", doc);
  if (!nodes.length) {
    throw new Error("❗️ No artifactId node found in pom.xml");
  }
  return nodes[0].textContent;
}

async function run() {
  try {
    const filePathsInput =
      core.getInput("file_path") || '{"default": "pom.xml"}';
    let filePathsObj;
    try {
      filePathsObj = JSON.parse(filePathsInput);
    } catch {
      throw new Error('❗️ Input "file_paths" should be a valid JSON object.');
    }
    const filePaths = Object.values(filePathsObj);

    const xpathExpression =
      core.getInput("path") || "//p:project/p:properties/p:revision";
    const newValue = core.getInput("new_value");
    if (!newValue) throw new Error('❗️ Input "new_value" is required.');

    for (const filePath of filePaths) {
      const doc = parseXml(filePath);
      const nodes = select(xpathExpression, doc);
      if (!nodes.length) {
        throw new Error(
          `❗️ No nodes found for expression: ${xpathExpression} in ${filePath}`,
        );
      }
      nodes.forEach((node) => {
        core.info(
          `🔷 Update node value "${node.textContent}" -> "${newValue}"`,
        );
        node.textContent = newValue;
      });
      writeXml(doc, filePath);
      core.info(`💡 Updated file: ${filePath}`);
    }

    let = artifact = await getArtifactId();
    core.setOutput("artifact_id", artifact);

    core.info(`🔷 Updated artifactId: ${artifact}`);

    core.info("✅ Action completed successfully!");
  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
  }
}

run();
