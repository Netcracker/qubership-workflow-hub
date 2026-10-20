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
| `migrate-legacy-categories` | Retire the legacy image-only category after successful scans and uploads in this invocation | No | `false` |

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
deleting the analysis history. The optional migration job in this same workflow automates
cleanup after this invocation's enabled scans and uploads succeed.
Callers pinned to an older release or commit must update their workflow reference to use this change.

## Optional legacy category migration

The boolean input `migrate-legacy-categories` belongs to `re-security-scan.yml` and
defaults to `false`. Scanning and migration run in this single reusable workflow.
When the flag is disabled, the migration job is skipped without API checks or empty uploads.

When enabled, migration waits for all enabled scanners in this invocation to succeed
and upload their reports. A scanner failure, including one tolerated by
`continue-on-error`, prevents cleanup. Migration also skips source scans, unchanged
digest categories, disabled SARIF uploads, and invocations with both scanners disabled.

For each enabled tool, migration checks the latest analysis of the image-only category
on the current Git ref. It uploads an empty SARIF only if that category still has results,
closing legacy instances without deleting analysis history. Already empty or absent
categories are skipped; API and upload errors fail migration. Repeated enabled runs
check the API but do not upload another empty report for an empty legacy category.

Expose the flag as an unchecked checkbox in the caller and pass it to the existing scan job:

```yaml
name: Scan image and optionally migrate its legacy category

on:
  workflow_dispatch:
    inputs:
      image:
        description: Docker image reference
        required: true
        type: string
      migrate-legacy-categories:
        description: Migrate legacy code scanning categories
        type: boolean
        default: false

permissions:
  contents: read
  packages: read
  security-events: write

jobs:
  security-scan:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-security-scan.yml@main
    with:
      image: ${{ inputs.image }}
      migrate-legacy-categories: ${{ inputs.migrate-legacy-categories }}
      continue-on-error: false
```

Migration is scoped to this image invocation. It does not wait for other image tags in
the caller's matrix. Enable it only after all required tags have valid analyses in their
new categories. Otherwise a successful tag can retire the shared legacy instances while
another tag's scan is still pending or has failed. Older workflow versions can populate
the legacy category again, so update the relevant callers before migration.

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
