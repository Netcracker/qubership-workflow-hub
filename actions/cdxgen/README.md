# 🚀 Generate SBOM File for Project Action

This **Generate SBOM File for Project** GitHub Action generates a Software Bill of Materials (SBOM) file for the project and a CycloneDX vulnerability report.

## Features

- Generates an SBOM file for the project.
- Automatically detects the project type if not provided.
- Generates a CycloneDX vulnerability report.
- Uploads the SBOM file and vulnerability report as artifacts.

## 📌 Inputs

| Name          | Description                | Required | Default |
| ------------- | -------------------------- | -------- | ------- |
| `project_type` | Type of the project.       | No       | None    |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Generate SBOM and Vulnerability Report

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  generate-sbom:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Generate SBOM and Vulnerability Report
        uses: netcracker/qubership-workflow-hub/actions/cdxgen@v2.0.9
        with:
          project_type: "npm"