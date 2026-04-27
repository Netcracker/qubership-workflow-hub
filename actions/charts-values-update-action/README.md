# 🚀 Charts Values Update Action

Updates Docker image versions in Helm chart `values.yaml` files and `Chart.yaml`, then optionally
packages and publishes the charts and creates a release branch.

---

## Features

- Validates that `release-version` is a valid Docker image tag before making any changes
- Supports two version-resolution modes: direct (`replace`) and template-based (`parse`)
  with regex auto-discovery via `skopeo`
- Updates `version` in `Chart.yaml` and image tags in `values.yaml` across multiple charts in one pass
- Optionally creates a `release-<version>` branch, commits all changed files, and pushes it
- Optionally packages charts with `helm package` and publishes them to GHCR via `oci://`
- Emits a collapsible GitHub Actions job summary listing each updated image and its resolved version
- Outputs updated image versions as JSON for downstream steps

---

## 📌 Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `release-version` | Release version to set for the Helm chart and Docker images. Must be a valid Docker tag (alphanumeric, `.`, `_`, `-`, up to 128 chars). | Yes | - |
| `default-tag` | Fallback image tag used when `release-version` does not exist in the registry. | No | `main` |
| `chart-version` | Chart version written into `Chart.yaml`. Defaults to `release-version` when omitted. | No | - |
| `config-file` | Path to the YAML configuration file mapping charts to values files and image lists. | Yes | - |
| `create-release-branch` | When `true`, creates a `release-<version>` branch, commits the updated files, and pushes. | No | `true` |
| `version-replace-method` | Tag resolution strategy: `replace` sets tags verbatim; `parse` evaluates templates and regex patterns. | No | `parse` |
| `working-directory` | Working directory for all action steps. Useful for monorepos or test pipelines. | No | `.` |
| `package-charts` | When `true`, packages each chart with `helm package`. | No | `false` |
| `publish-charts` | When `true`, pushes packaged charts to `oci://ghcr.io/<repository>/` and uploads metadata. | No | `false` |

---

## 📌 Outputs

| Name | Description |
|------|-------------|
| `images-versions` | JSON object mapping each image name to its resolved version. |
| `chart-metadata` | JSON object with published chart metadata (name, version, appVersion, OCI reference). Available only when `publish-charts` is `true`. |
| `released-chart-artifact` | Artifact ID of the uploaded `.tgz` chart packages. Available only when `package-charts` is `true`. |

---

## How it works

Given a config file that maps Helm charts to their `values.yaml` files and image lists, the action
resolves each image tag (via the selected version method), updates the `version` field in
`Chart.yaml`, and rewrites every matched image line in the corresponding `values.yaml`.

The resolved versions are emitted as the `images-versions` output — a JSON object keyed by image
name, for example:

```json
{
  "qubership-zookeeper-operator": "1.1.8",
  "qubership-docker-zookeeper": "1.1.8",
  "qubership-zookeeper-monitoring": "1.1.8"
}
```

When `create-release-branch` is `true`, the action creates a `release-<version>` branch, commits
all modified files, and pushes it. When `publish-charts` is `true`, packaged charts are pushed to
GHCR and a `chart-metadata` JSON output is produced, for example:

```json
{
  "appVersion": "2.10.0",
  "mime-type": "application/vnd.qubership.helm.chart",
  "name": "qubership-jaeger",
  "reference": "oci://ghcr.io/netcracker/qubership-jaeger/qubership-jaeger:0.0.8",
  "type": "application",
  "version": "0.0.8"
}
```

After all updates, a collapsible job summary is appended to the GitHub Actions run listing each
image and its resolved version.

---

## Additional Information

### Config file format

The `config-file` must be a YAML file with a top-level `charts` list. Each entry maps one Helm
chart to its values file and the images to update:

```yaml
charts:
  - name: my-service
    chart_file: charts/helm/my-service/Chart.yaml
    values_file: charts/helm/my-service/values.yaml
    image:
      - ghcr.io/${owner}/my-service:${tag}
      - ghcr.io/${owner}/my-service-ui:${tag}-${THIRD_PARTY_VERSION}
      - ghcr.io/${owner}/sidecar:#5\.\d+\.\d+
      - ghcr.io/${owner}/sidecar-v2:#latest
```

Each image entry is a full image reference including a tag template:

- `${tag}` and `${release}` are replaced with `release-version`.
- `${owner}` is replaced with `GITHUB_REPOSITORY_OWNER` (lowercased).
- Any other `${VAR}` token is resolved from the environment (e.g. repository variables).
- A tag prefixed with `#` is treated as a regex pattern (see below).

An example config file is included at
[`charts-values-update-config.yaml`](./charts-values-update-config.yaml).

### version-replace-method

| Method | Behaviour |
|--------|-----------|
| `replace` | Sets every image tag to `release-version` verbatim — no template evaluation. |
| `parse` | Evaluates `${tag}`, `${release}`, `${owner}`, and other `${VAR}` tokens; resolves regex patterns via `skopeo`. |

**Regex tag resolution** (`parse` mode only): prefix the tag portion with `#` followed by a Python
`re` fullmatch pattern.

- `#latest` resolves to the highest stable SemVer tag — not the Docker `latest` tag.
- `#4\.\d+\.\d+` resolves to the highest tag matching that pattern.

The action installs `skopeo` automatically if it is not present on the runner, and uses it to query
available tags. `GITHUB_TOKEN` and `GITHUB_ACTOR` must be available in the environment for registry
authentication.

---

## Example Usage

```yaml
name: Release Helm Charts

on:
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Release Helm Charts
        uses: netcracker/qubership-workflow-hub/actions/charts-values-update-action@v2.2.1
        with:
          release-version: '1.0.0'
          chart-version: '1.0.0'
          config-file: './config/charts-config.yaml'
          create-release-branch: 'true'
          version-replace-method: 'parse'
          working-directory: './charts'
        env:
          ${{ insert }}: ${{ vars }} # This will insert all repository variables into env context
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_ACTOR: ${{ github.actor }}
```

---

## Notes

- `GITHUB_TOKEN` and `GITHUB_ACTOR` must be set in the step `env` block for `skopeo` to
  authenticate with `ghcr.io` when using `parse` mode with regex patterns or `default-tag` fallback.
- When `create-release-branch` is `true`, the workflow token requires `contents: write` permission
  to create and push the release branch.
- When `publish-charts` is `true`, the token additionally requires `packages: write` permission to
  push charts to GHCR.
- Always pin to `@v2.2.1` or a specific SHA — never `@main` in production.
