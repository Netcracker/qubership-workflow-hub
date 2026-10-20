# 🚀 On-Demand Security Scan Workflow (Grype + Trivy)

This **On-Demand Security Scan** GitHub Workflow performs security scans using Grype and Trivy for Docker images or source code. It supports filtering by severity levels and uploading results to GitHub Security tab.

## Features

- Scans Docker images or source code for vulnerabilities.
- Supports Grype and Trivy scanners.
- Filters results to high and critical severity by default.
- Uploads SARIF files for integration with GitHub Security.
- Configurable to continue on errors or fail builds.

## 📌 Inputs

| Name                | Description                                                                 | Required | Default |
|---------------------|-----------------------------------------------------------------------------|----------|---------|
| `target`            | Scan target: "docker" or "source"                                           | Yes      | `docker` |
| `image`             | Docker image to scan (for docker target). Defaults to ghcr.io/<owner>/<repo>:latest | No       | `""`    |
| `only-high-critical`| Filter results to only HIGH and CRITICAL severity                          | No       | `true`  |
| `trivy-scan`        | Enable Trivy scan                                                          | No       | `true`  |
| `grype-scan`        | Enable Grype scan                                                          | No       | `true`  |
| `continue-on-error` | Continue workflow on scan errors                                           | No       | `true`  |

## Permissions

- `contents: read` - To access repository contents.
- `security-events: write` - To upload SARIF files.
- `packages: read` - To access packages for Docker scans.

## Code scanning categories

Docker scans use a separate category for each image tag, for example `collector:latest`
and `collector:main`. An image without an explicit tag uses `<image>:latest`.
Digest references retain their previous category (for example `collector@sha256`),
and source scans use `source`. Grype and Trivy are tracked as separate tools.

Earlier versions used the same category for all tags of an image. After upgrading,
successfully scan all required tags before retiring the old category. Uploading an
empty SARIF for each tool into the old category closes its alert instances without
deleting the analysis history. This workflow does not perform that migration automatically.
Callers pinned to an older release or commit must update their workflow reference to use this change.

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Security Scan Workflow

on:
  workflow_dispatch:
    inputs:
      target:
        description: "Scan target"
        required: true
        default: "docker"
      image:
        description: "Docker image"
        required: false

permissions:
  contents: read
  security-events: write
  packages: read

jobs:
  security-scan:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-security-scan.yml@main
    with:
      target: ${{ inputs.target }}
      image: ${{ inputs.image }}
      only-high-critical: true
      trivy-scan: true
      grype-scan: true
      continue-on-error: true
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
