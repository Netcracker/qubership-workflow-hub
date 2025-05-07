# 🚀 POM Updater Action

This Action updates specified nodes in a Maven `pom.xml` file with a new value.

## Features

- Updates specified nodes in `pom.xml` files.
- Supports multiple file paths.
- Allows customization of XPath expressions.
- Outputs the `artifactId` from the `pom.xml` file.

## 📌 Inputs

| Name        | Description                                      | Required | Default                |
| ----------- | ------------------------------------------------ | -------- | ---------------------- |
| `file_path` | JSON object mapping names to file paths to update. | No       | `{"default": "pom.xml"}` |
| `path`      | XPath expression to select nodes to update.      | No       | `//p:project/p:properties/p:revision` |
| `new_value` | The new value to set for the selected nodes.     | Yes      | None                   |

## Outputs

| Name          | Description                |
| ------------- | -------------------------- |
| `artifact_id` | The `artifactId` from the `pom.xml` file. |

## Usage

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Update POM Workflow

on:
  push:
    branches:
      - main

jobs:
  update-pom:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Update POM version
        uses: netcracker/qubership-workflow-hub/actions/pom-updater@v1.0.1
        with:
          file_path: '{"default": "pom.xml"}'
          path: '//p:project/p:properties/p:revision'
          new_value: '1.2.3'

      - name: Output artifact ID
        run: echo "Artifact ID ${{ steps.update-pom.outputs.artifact_id }}"
```
