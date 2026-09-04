# 🚀 [REUSABLE] [INFRA] Helm Charts Release Workflow

Releases Helm charts and their Docker images from a versioned release branch. The workflow validates
the requested tag, performs a matrix dry-run of Docker builds, updates and publishes Helm charts,
builds release images, and publishes a GitHub Release with the chart packages.

## Features

- Verifies that the requested release tag exists before starting release work.
- Loads Docker components from a JSON configuration file.
- Performs a fail-fast, parallel dry-run Docker build for every configured component.
- Updates chart versions and image references from a Helm release configuration file.
- Packages and publishes Helm charts to GHCR.
- Creates or updates the `release-<version>` branch and builds release images from it.
- Publishes a GitHub Release and uploads the packaged chart archives as release assets.
- Limits concurrent matrix jobs with `max-parallel`.

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `release` | Release version and tag to validate, use for chart and image versions, and publish. | Yes | - |
| `docker-config-file` | Path to the JSON Docker components configuration file. | No | `.qubership/dev-build-config.cfg` |
| `helm-charts-config-file` | Path to the YAML configuration file that maps charts, values files, and images. | No | `.qubership/helm-charts-release-config.yaml` |
| `max-parallel` | Maximum number of Docker matrix jobs that may run in parallel during validation and release builds. | No | `4` |

## 📌 Secrets

The workflow does not declare explicit `workflow_call` secrets. GitHub automatically provides the
`GITHUB_TOKEN` to the called workflow. Pass additional repository or organization secrets with
`secrets: inherit` if they are required by repository configuration.

| Name | Description | Required |
| --- | --- | --- |
| `GITHUB_TOKEN` | Used to check tags, update the release branch, publish packages, create the GitHub Release, and upload release assets. | Yes |

## How it works

The workflow first checks that the value supplied to `release` is an existing Git tag. It then
loads the Docker component list and runs a dry-run Docker build for every component. These builds
use tags in the form `<release>_dry_run` and must all succeed before the release proceeds.

The chart-release phase updates chart metadata and image references using the Helm configuration,
creates the `release-<release>` branch, packages the charts, and publishes them to GHCR. It exposes
an internal JSON mapping of component names to resolved image versions. For example:

```json
{
  "api": "1.4.0",
  "worker": "1.4.0"
}
```

The release Docker matrix builds from `release-<release>`, using each component's resolved image
version and `latest` as image tags. Finally, the workflow checks out the release branch, publishes
a GitHub Release tagged with the requested version, and uploads the generated `.tgz` chart packages.

## Additional Information

### Docker Configuration

The Docker configuration is JSON and follows the format accepted by
[docker-config-resolver](../../actions/docker-config-resolver/README.md). It must contain a
`components` array; each component needs a `name` and may define fields such as `dockerfile`,
`context`, and `platforms`.

```json
{
  "registry": "ghcr.io",
  "defaults": {
    "dockerfile": "Dockerfile",
    "context": ".",
    "platforms": "linux/amd64"
  },
  "components": [
    { "name": "api", "dockerfile": "services/api/Dockerfile" },
    { "name": "worker", "context": "services/worker" }
  ]
}
```

### Helm Charts Configuration

The Helm configuration is YAML with a top-level `charts` list. Each entry identifies a chart,
its `Chart.yaml`, its `values.yaml`, and the image references whose tags should be updated.

```yaml
charts:
  - name: api
    chart_file: charts/api/Chart.yaml
    values_file: charts/api/values.yaml
    image:
      - ghcr.io/${owner}/api:${tag}
      - ghcr.io/${owner}/api-sidecar:${tag}
```

The workflow passes the requested release to `charts-values-update-action` as both the chart release
version and the default image tag. Repository variables are exported to the action environment, so
`${VAR}` placeholders in the Helm configuration can resolve from `vars`.

### Permissions

The caller must grant permissions on the calling job. The release phases require `contents: write`
and `packages: write`; read-only preparation uses `contents: read`.

## Usage Example

```yaml
jobs:
  release-helm:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-infra-helm-release.yaml@27fd7674286e5f561a6fd8277f2f389ff96ddb9e # v2.6.0
    permissions:
      contents: write
      packages: write
    with:
      release: "1.4.0"
      docker-config-file: .qubership/dev-build-config.cfg
      helm-charts-config-file: .qubership/helm-charts-release-config.yaml
      max-parallel: 4
    secrets: inherit
```

## Notes

- The `release` tag must already exist; the workflow does not create it.
- The Docker and Helm configuration paths are evaluated after checkout and must exist in the repository.
- The release action creates and pushes a `release-<release>` branch before the final Docker builds.
- The workflow publishes charts to GHCR and creates a GitHub Release, so do not use it with a token
  that lacks `contents: write` and `packages: write`.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@27fd7674286e5f561a6fd8277f2f389ff96ddb9e # v2.6.0`. The SHA is the immutable pin; the comment
  shows which release it points to. Tags alone are mutable. Never use `@main` or short SHAs.
