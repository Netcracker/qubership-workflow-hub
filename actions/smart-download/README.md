# 🚀 Smart Download Artifact Composite Action

This **Smart Download Artifact** GitHub Action automates the process of downloading artifacts from GitHub Actions workflows using flexible options: by name, IDs, or glob patterns. It supports custom destination paths and integrates seamlessly with other actions.

---

## Features

- Download artifacts by exact name, comma-separated IDs, or glob patterns.
- Flexible destination path configuration.
- Supports multiple download modes for different use cases.
- Composite action for easy integration into workflows.

---

## 📌 Inputs

| Name          | Description                                                                 | Required | Default     |
|---------------|-----------------------------------------------------------------------------|----------|-------------|
| `name`        | Artifact name to download.                                                  | No       | `""`        |
| `artifact-ids`| IDs of artifacts to download, comma-separated.                             | No       | `""`        |
| `pattern`     | Glob pattern to match artifact names for download.                         | No       | `""`        |
| `path`        | Folder to download artifacts to. Supports basic tilde expansion.           | No       | `artifacts` |

**Note:** Use only one of `name`, `artifact-ids`, or `pattern` at a time, as the action checks conditions sequentially.

---

## Permissions

- Minimum permissions: `contents: read` and `packages: read` to access and download artifacts.

---

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Download Artifacts

on:
  workflow_dispatch: {}

permissions:
  contents: read
  packages: read

jobs:
  download:
    runs-on: ubuntu-latest
    steps:
      - name: Download Artifact by Name
        uses: netcracker/qubership-workflow-hub/actions/smart-download@v2.0.8
        with:
          name: my-artifact
          path: ./downloads

      - name: Download Artifacts by IDs
        uses: netcracker/qubership-workflow-hub/actions/smart-download@v2.0.8
        with:
          artifact-ids: 123456789,987654321
          path: ./artifacts

      - name: Download Artifacts by Pattern
        uses: netcracker/qubership-workflow-hub/actions/smart-download@v2.0.8
        with:
          pattern: build-*
          path: ./builds
```
