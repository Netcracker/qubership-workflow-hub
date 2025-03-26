# 🚀 Archive and Upload Assets GitHub Action

This Action automatically archives specified folders and uploads them as release assets.

## Features

- Archives specified folders into tar, tar.gz, or zip formats.
- Validates configuration files against a JSON schema.
- Uploads the archived files as release assets.

## 📌 Inputs

| Name            | Description                            | Required | Default |
| --------------- | -------------------------------------- | -------- | ------- |
| `config-path`   | The path to the configuration file.    | Yes      | N/A     |
| `ref`           | The reference for the release.         | Yes      | N/A     |
| `dist-path`     | The destination path for the archives. | No       | `dist`  |
| `upload`        | Whether to upload the archives.        | No       | `false` |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Archive and Upload Assets

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  archive-and-upload:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Run Archive and Upload Assets Action
        uses: netcracker/qubership-workflow-hub/actions/archive-and-upload-assets
        with:
          config-path: "./path/to/config.yaml"
          ref: "v1.0.0"
          dist-path: "./dist"
          upload: "true"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
## Example Configuration File

Here is an example of how the configuration file should look:

``` yaml
archives:
  - source: "src"
    outputName: "source-code"
    archiveType: "zip"
  - source: "docs"
    outputName: "documentation"
    archiveType: "tar.gz"
```

## Configuration Schema

The configuration file should follow this JSON schema:

``` json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Archive Configuration Schema",
  "type": "object",
  "properties": {
    "archives": {
      "type": "array",
      "minItems": 1,
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
    }
  },
  "required": ["archives"],
  "additionalProperties": false
}
```