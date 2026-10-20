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
| `target`            | Scan target: "docker" or "source"                                           | No       | `docker` |
| `image`             | Docker image to scan (for docker target). Defaults to ghcr.io/<owner>/<repo>:latest | No       | `""`    |
| `only-high-critical`| Filter results to only HIGH and CRITICAL severity                          | No       | `true`  |
| `trivy-scan`        | Enable Trivy scan                                                          | No       | `true`  |
| `grype-scan`        | Enable Grype scan                                                          | No       | `true`  |
| `continue-on-error` | Continue workflow on scan errors                                           | No       | `true`  |
| `trivy-version` | Trivy version to install | No | `latest` |
| `grype-version` | Grype release tag to install, for example `v0.118.0` | No | `latest` |
| `only-fixed` | Ignore vulnerabilities without a fix | No | `true` |
| `upload-sarif-to-security` | Upload reports to GitHub Code Scanning | No | `true` |
| `runner` | Runner label; an empty value falls back to `ubuntu-latest` | No | Empty |

## Permissions

- `contents: read` - To access repository contents.
- `security-events: write` - To upload SARIF files.
- `packages: read` - To access packages for Docker scans.

## Code scanning categories

Docker scans use a separate category for each image tag, for example `collector:latest`
and `collector:main`. An image without an explicit tag uses `<image>:latest`.
Digest references retain their previous category (for example `collector@sha256`),
and source scans use `source`. Grype and Trivy are tracked as separate tools.

Earlier versions used the image short name without a tag as the category. After this invocation's
enabled Docker scanners and uploads succeed, the same workflow automatically looks up that exact
old category on the current Git ref, separately for Grype and Trivy. It verifies that the new
analyses have finished processing before uploading empty reports into the old category.
Those uploads close legacy instances without deleting analysis history or changing the new categories.

Absent or already empty legacy categories are skipped. Source scans, unchanged digest categories,
disabled scanners, and disabled SARIF uploads do not trigger cleanup. API errors or unsuccessful
new analyses prevent cleanup. This check runs after successful image scans; subsequent runs upload
nothing for an already empty legacy category. No extra workflow or migration flag is required.

Cleanup is scoped to one image invocation, not the caller's complete tag matrix. A successful tag
can retire the shared legacy instances while another tag is pending or fails. Update all callers
and ensure required tags receive new analyses when rolling out this category change.
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
