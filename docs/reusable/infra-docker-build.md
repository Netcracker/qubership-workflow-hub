# 🚀 [REUSABLE] [INFRA] Docker Build Workflow

Builds Docker images for components declared in a JSON configuration file. The workflow can limit
builds to components affected by changed files, generate image tags, and build components in
parallel with `docker-action`.

## Features

- Resolves Docker component configuration and applies its defaults.
- Optionally filters components by their `changeset` paths for diff-based builds.
- Generates image tags from the current GitHub ref and optional extra tags.
- Builds each selected component as a separate matrix job.
- Supports multi-platform Docker builds and GitHub Actions cache scopes per component.
- Supports dry-run builds that do not push images.

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `tags` | Optional comma-separated extra image tags passed to the metadata action. | No | `""` |
| `dry-run` | Dry-run mode passed to `docker-action`; set to `"true"` to build without pushing images. | No | `"false"` |
| `replace-symbol` | Symbol used by the metadata action to replace `/` in branch or tag names. | No | `"_"` |
| `config-file` | Path to the JSON Docker components configuration file. The file must contain a `components` array. | Yes | - |
| `diff-build` | When `"true"`, only components whose `changeset` path matches a changed file are built. | No | `"true"` |
| `max-parallel` | Maximum number of component build jobs that may run in parallel. | No | `4` |

## 📌 Secrets

The workflow does not declare explicit `workflow_call` secrets. The called workflow uses the
automatically provided `GITHUB_TOKEN` to authenticate Docker operations against GitHub Packages.
The caller must grant `packages: write` for normal image publishing; `contents: read` is also
required.

| Name | Description | Required |
| --- | --- | --- |
| `GITHUB_TOKEN` | Automatically provided token used by `docker-action` for GitHub Packages authentication. | For publishing |

## How it works

The `prepare` job checks out the repository, optionally writes the changed-file list, and filters
the configuration when `diff-build` is `"true"`. A component is selected when any changed file
starts with one of its `changeset` entries. If no component matches, the build job is skipped.

The selected configuration is resolved into a JSON array. Each component becomes one matrix entry
for the `build` job, which calls `docker-action` with the component descriptor, its configured
platforms, generated tags, and a component-specific GitHub Actions cache scope. The workflow uses
`github.ref` as the Docker action ref and always disables artifact download.

When `diff-build` is `"false"`, all components in the configuration are passed to the build matrix.
When `dry-run` is `"true"`, Docker images are built without being pushed.

## Additional Information

### Configuration File

The configuration file is JSON and follows the format accepted by
[docker-config-resolver](../../actions/docker-config-resolver/README.md). Each component should
include a `name` and one or more `changeset` path prefixes. Defaults can provide shared Docker
settings such as `dockerfile`, `context`, and `platforms`.

```json
{
  "registry": "ghcr.io",
  "defaults": {
    "dockerfile": "Dockerfile",
    "context": ".",
    "platforms": "linux/amd64,linux/arm64"
  },
  "components": [
    {
      "name": "api",
      "changeset": ["services/api/", "shared/"]
    },
    {
      "name": "worker",
      "dockerfile": "services/worker/Dockerfile",
      "context": "services/worker",
      "changeset": ["services/worker/"]
    }
  ]
}
```

A changed file such as `services/api/src/server.js` selects `api` because it starts with
`services/api/`. If no changed file matches any component, the workflow records a summary warning
and skips image builds.

### Tagging

The workflow uses `{{ref-name}}` as the default tag template. The `replace-symbol` input controls
how slashes in branch names are rendered, so a branch such as `feature/api` produces
`feature_api` with the default setting. Values in `tags` are appended as extra tags.

## Usage Example

```yaml
jobs:
  call-infra-docker-build:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-infra-docker-build.yaml@27fd7674286e5f561a6fd8277f2f389ff96ddb9 # v2.6.0
    permissions:
      contents: read
      packages: write
    with:
      config-file: .qubership/docker.cfg
      diff-build: "true"
      max-parallel: 4
      dry-run: "false"
    secrets: inherit
```

## Notes

- The `config-file` path is evaluated after checkout and must be available in the repository.
- `diff-build` and `dry-run` are string inputs; pass quoted values such as `"true"` or `"false"`.
- The build job uses `packages: write`, so callers must grant that permission even when the
  component configuration targets GitHub Container Registry.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@27fd7674286e5f561a6fd8277f2f389ff96ddb9 # v2.6.0`. The SHA is the immutable pin; the comment
  shows which release it points to. Tags alone are mutable. Never use `@main` or short SHAs.
