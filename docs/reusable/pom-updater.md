# 🚀 Update Version on `pom.xml` GitHub Action

This **Update Version on `pom.xml`** GitHub Action automates the process of updating the `<revision>` version in a specified `pom.xml` file and commits the change back to the repository.

## Features

- Automates the process of updating the `<revision>` version in a specified `pom.xml` file.
- Commits the change back to the repository.

## 📌 Inputs

| Name       | Description                                 | Required | Default                  |
| ---------- | ------------------------------------------- | -------- | ------------------------ |
| `file_path`| The path to the XML file to update.         | No       | `{"default": "pom.xml"}` |
| `path`     | The XPath expression to locate the node to update. Defaults to `//p:project/p:properties/p:revision`. | No       | `//p:project/p:properties/p:revision` |
| `new_value`| The new value to set for the selected XML node. | Yes      |                          |

## 📌 Outputs

| Name         | Description                              |
| ------------ | ---------------------------------------- |
| `artifact_id`| The artifact ID of the updated XML file. |

## Usage Example

Below is an example of how to call this workflow in another workflow:

```yaml
name: Call Update Version

on:
  push:
    branches:
      - main

jobs:
  call-update-version:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/update-version.yml
    with:
      file_path: '{"default": "path/to/pom.xml", "consul": "path/to/pom.xml"}'
      path: "//p:project/p:properties/p:revision"
      new_value: "1.0.1"