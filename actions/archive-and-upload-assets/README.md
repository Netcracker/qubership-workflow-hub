# 🚀 Archive and Upload Assets GitHub Action

This GitHub Action automates the process of archiving specified folders and files and optionally uploading them as release assets.

---

## Features

- Archives specified folders into `tar`, `tar.gz`, or `zip` formats.
- Validates configuration files against a JSON schema.
- Supports copying individual files with custom names.
- Uploads the archived files and copied files as release assets.
- Supports dry-run mode for testing without uploading files.
- Preserves file extensions for all uploaded files.

---

## 📌 Inputs

| Name            | Description                                                                 | Required | Default                     |
| --------------- | --------------------------------------------------------------------------- | -------- | --------------------------- |
| `config-path`   | The path to the configuration file that specifies the folders and files to archive. | Yes       | `./.github/assets-config.yml` |
| `ref`           | The reference (e.g., tag or branch name) for the release. If not provided, it defaults to the `GITHUB_REF_NAME` environment variable. | No       |                             |
| `dist-path`     | The destination path where the archives and copied files will be stored.    | No       | `dist`                      |
| `upload`        | **Deprecated.** Whether to upload the archives and copied files as release assets. If set to `true`, the files will be uploaded to the release specified by `ref`. | No       | `false`                     |
| `dry-run`       | Run the action in dry-run mode. No files will be uploaded to assets. Useful for testing workflows. | No       | `false`                     |
| `files`         | A list of individual files to upload.                                       | No       |                             |
| `folders`       | A list of folders to upload.                                                | No       |                             |

---

## 📌 Outputs

This action does not produce any explicit outputs but logs detailed information about the archiving and uploading process.

---

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Archive and Upload Assets

on:
  workflow_dispatch:

jobs:
  archive-and-upload:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Run Archive and Upload Assets Action
        uses: netcracker/qubership-workflow-hub/actions/archive-and-upload-assets@main
        with:
          config-path: "./.github/assets-config.yml"
          ref: "v1.0.0"
          dist-path: "./dist"
          dry-run: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Configuration File

The configuration file specifies the folders and files to archive or copy. It must follow the JSON schema provided in the repository. The configuration file supports two main sections:
1. `archives`: Specifies folders to archive.
2. `files`: Specifies individual files to copy.

### Example Configuration File

```yaml
archives:
  - source: "src"
    outputName: "source-code"
    archiveType: "zip"
  - source: "docs"
    outputName: "documentation"
    archiveType: "tar.gz"

files:
  - source: "README.md"
    outputName: "readme"
  - source: "LICENSE"
    outputName: "license"
```

**Note**: The file extensions will be preserved for all uploaded files. For example, if the source file is `README.md`, the uploaded file will also have the `.md` extension.

---

## JSON Schema for Configuration File

The configuration file must adhere to the following JSON schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Archive Configuration Schema",
  "type": "object",
  "properties": {
    "archives": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source": {
            "type": "string"
          },
          "outputName": {
            "type": "string"
          },
          "archiveType": {
            "type": "string",
            "enum": ["zip", "tar", "tar.gz"]
          }
        },
        "required": ["source", "outputName", "archiveType"],
        "additionalProperties": false
      }
    },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source": {
            "type": "string"
          },
          "outputName": {
            "type": "string"
          }
        },
        "required": ["source", "outputName"],
        "additionalProperties": false
      }
    }
  },
  "required": ["archives"],
  "additionalProperties": false
}
```

---

### Note

In the current implementation, it is mandatory to declare a configuration file. The action will not work without it. Ensure that the configuration file is properly defined and adheres to the schema.
