# Pom update Action

**Category**: File Management

**Description**: This action updates an XML node's value in a specified file using an XPath expression.

## Inputs

| Name         | Required  | Description                                                                                     | Default                                   |
|--------------|-----------|-------------------------------------------------------------------------------------------------|-------------------------------------------|
| `filePath`   | No        | The path to the XML file to update.                                                             | `./pom.xml`                               |
| `path`       | No        | The XPath expression to locate the node to update.                                              | `//p:project/p:properties/p:revision`     |
| `new_value`   | Yes       | The new value to set for the selected XML node.                                                 | N/A                                       |

## Example Usage

```yaml
name: Update Pom
on:
  workflow_dispatch:

jobs:
  update-xml:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Update Pom
        uses: netcracker/qubership-workflow-hub/actions/pom-updater@main
        with:
          file_path: './pom.xml'
          path: '//p:project/p:properties/p:revision'
          new_value: '1.0.1'
