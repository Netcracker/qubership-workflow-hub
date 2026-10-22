# 🚀 On-Demand Security Scan Workflow (Grype + Trivy)

This **On-Demand Security Scan** GitHub Workflow performs security scans using Grype and Trivy for Docker images or source code. It supports filtering by severity levels and uploading results to GitHub Security tab.

## Features

- Scans Docker images or source code for vulnerabilities.
- Supports Grype and Trivy scanners.
- Filters results to high and critical severity by default.
- Uploads SARIF files for integration with GitHub Security.
- Separates Docker image tags and platforms into distinct categories and automatically retires matching legacy image-only instances.
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
| `runner` | Single runner label; an empty value falls back to `ubuntu-latest` | No | - |

## Permissions

- `contents: read` - To access repository contents.
- `security-events: write` - To upload SARIF files.
- `packages: read` - To access packages for Docker scans.

The workflow uses the automatically provided `GITHUB_TOKEN`; no custom secrets need to be
passed by the caller. For Docker scans, custom runners must provide Bash, Docker, `jq`,
and the GitHub CLI (`gh`).

## Code scanning categories

Docker scans use a separate category for each image tag and platform, for example
`image:main@linux/amd64` and `image:main@linux/arm64`. An image without an
explicit tag uses `latest`. Digest references append the platform to their previous
category (for example `image@sha256@linux/amd64`), and source scans use `source`.
Grype and Trivy are tracked as separate tools. The image name is the final path component;
registry and namespace are not part of the category.

The workflow automatically reads the Docker server's OS and architecture in the init job
and passes that same platform to both scanners. No new caller input is required:
use the existing `runner` input to select an arm64 runner, for example `ubuntu-24.04-arm`.
Docker report filenames also include the platform to distinguish their artifacts.

Earlier versions used the image short name without a tag as the category. After this invocation's
enabled Docker scanners and uploads succeed, the same workflow automatically looks up that exact
old category on the current Git ref, separately for Grype and Trivy. It verifies that the new
analyses have finished processing successfully by matching their SARIF IDs, category, and commit
before uploading empty reports into the old category. Failed old analyses are ignored when finding
the latest successful legacy results.
Those uploads close legacy instances without deleting analysis history or changing the new categories.

Absent or already empty legacy categories are skipped. Source scans,
disabled scanners, and disabled SARIF uploads do not trigger cleanup. API errors or unsuccessful
new analyses prevent cleanup. This check runs after successful image scans; subsequent runs upload
nothing for an already empty legacy category. No extra workflow or migration flag is required.

Cleanup is scoped to one image invocation, not the caller's complete tag/platform matrix.
A successful scan can retire the shared legacy instances while another scan is pending or fails.
Update all callers and ensure required tags and platforms receive new analyses when rolling out
this category change. Migration goes directly from the released image-only category to the final
tag/platform category; no migration from the unreleased tag-only format is performed.
Callers pinned to an older release or commit must update their workflow reference to use this change.

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow.
Replace `<full-commit-sha>` with a revision containing the tag/platform category fix and
automatic legacy cleanup, or the full SHA of a release containing these changes when available.

```yaml
name: Security Scan Workflow

on:
  workflow_dispatch:
    inputs:
      target:
        description: "Scan target"
        required: true
        default: "docker"
        type: choice
        options:
          - docker
          - source
      image:
        description: "Docker image"
        required: false
        type: string

permissions:
  contents: read
  security-events: write
  packages: read

jobs:
  security-scan:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-security-scan.yml@<full-commit-sha>
    with:
      target: ${{ inputs.target }}
      image: ${{ inputs.image }}
      only-high-critical: true
      trivy-scan: true
      grype-scan: true
      continue-on-error: true
```
