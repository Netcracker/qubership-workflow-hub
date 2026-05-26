# 🚀 Docker Build and Publish Composite Action

Builds and pushes Docker images using Docker Buildx. Supports multi-platform builds, multiple
registries (GHCR and Docker Hub), custom or auto-generated tags, artifact download, SBOM generation,
and produces a signed metadata JSON artifact after a successful push.

---

## Features

- Builds and pushes Docker images to GitHub Container Registry (`ghcr.io`) and/or Docker Hub
  (`docker.io`).
- Supports multi-platform builds via Docker Buildx (e.g. `linux/amd64,linux/arm64`).
- Accepts a `component` JSON descriptor for Dockerfile path, build context, image name, and
  build arguments — compatible with the output of `docker-config-resolver`.
- Auto-generates tags from branch name, semver, and PR number when `tags` input is empty.
- Custom tags (comma-separated) are prefixed with the resolved registry URL automatically.
- Merges build arguments from `component.arguments` and the `build-args` input (component takes
  precedence).
- Downloads workflow artifacts before the build when `download-artifact: true`.
- SBOM generation via `docker/build-push-action` (`sbom: true`).
- Produces a metadata JSON file (image name, digest, version) and uploads it as a workflow
  artifact after a successful push.
- `dry-run: true` builds the image locally without pushing and skips metadata upload.

---

## 📌 Inputs

| Name                               | Description                                                                                                | Required | Default                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `ref`                              | Git ref (branch, tag, or SHA) to checkout. Ignored when `checkout` is `false`.                             | No       | `""`                                                                        |
| `custom-image-name`                | Override for the Docker image name. If not set, derived from component name or repository name.            | No       | `""`                                                                        |
| `context`                          | Context mode for `docker/metadata-action`: `git` reads metadata from git history, `workflow` reads it from the workflow event payload. Affects auto-generated tags. | No       | `"git"`                                                                     |
| `dry-run`                          | Build without pushing. Skips registry login validation, push, and metadata upload.                         | No       | `"false"`                                                                   |
| `download-artifact`                | Download a workflow artifact before the build.                                                             | No       | `"false"`                                                                   |
| `component`                        | Component descriptor in JSON format. Accepts an object or a single-element array.                          | No       | `[{"name": "default", "dockerfile": "./Dockerfile", "build_context": "."}]` |
| `platforms`                        | Target platforms for the build (comma-separated, e.g. `linux/amd64,linux/arm64`).                          | No       | `"linux/amd64"`                                                             |
| `tags`                             | Comma-separated image tags. If empty, tags are auto-generated from branch/semver/PR metadata.              | No       | `""`                                                                        |
| `download-artifact-name`           | Name of the artifact to download. Mutually exclusive with `download-artifact-ids`.                         | No       | `""`                                                                        |
| `download-artifact-ids`            | Comma-separated artifact IDs to download. Mutually exclusive with `download-artifact-name`.                | No       | `""`                                                                        |
| `download-artifact-path`           | Destination path for downloaded artifacts. Defaults to `$GITHUB_WORKSPACE`.                                | No       | `""`                                                                        |
| `download-artifact-pattern`        | Glob pattern for artifacts to download. Ignored if `download-artifact-name` is set.                        | No       | `""`                                                                        |
| `download-artifact-merge-multiple` | Unpack multiple artifacts into a single directory (`true`) or separate directories (`false`).              | No       | `"false"`                                                                   |
| `sbom`                             | Enable SBOM (Software Bill of Materials) generation.                                                       | No       | `"false"`                                                                   |
| `build-args`                       | Build arguments for Docker. Supports comma-separated or newline-delimited format.                          | No       | `""`                                                                        |
| `checkout`                         | Checkout the repository before the build. Set to `false` when the calling workflow already checked out the repo. | No       | `"true"`                                                                    |
| `registry`                         | Target registry: `ghcr.io`, `docker.io`, or `ghcr.io,docker.io` for both.                                  | No       | `"ghcr.io"`                                                                 |
| `docker-io-login`                  | Username for Docker Hub login. Required when `registry` contains `docker.io` and `dry-run` is `false`.     | No       | -                                                                           |
| `docker-io-token`                  | Access token for Docker Hub login. Required when `registry` contains `docker.io` and `dry-run` is `false`. | No       | -                                                                           |
| `skip-qemu-buildx`                 | **Deprecated.** Use `setup-qemu` and `setup-buildx` instead. Skips both QEMU and Buildx setup when `true`. | No       | `"false"`                                                                   |
| `setup-qemu`                       | Set up QEMU for multi-platform builds.                                                                     | No       | `"true"`                                                                    |
| `setup-buildx`                     | Set up Docker Buildx.                                                                                      | No       | `"true"`                                                                    |

---

## 📌 Outputs

| Name                   | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `image-name`           | Full image reference of the pushed image (first tag, e.g. `ghcr.io/org/repo:v1.0.0`). Only set when `dry-run` is `false`. |
| `metadata_path`        | Absolute path to the generated metadata JSON file on the runner. Only set when `dry-run` is `false`. Note: uses underscore (legacy naming). |
| `metadata-filename`    | Filename of the generated metadata JSON file. Only set when `dry-run` is `false`.     |
| `component-name`       | Resolved component name (from `component.name`).                                      |
| `component-file`       | Resolved Dockerfile path (from `component.dockerfile`).                               |
| `component-context`    | Resolved Docker build context path (from `component.build_context`).                  |
| `component-build-args` | Resolved build arguments from `component.arguments` (newline-delimited).              |
| `final-tags`           | Full image tags applied to the build (newline-delimited, registry URL included).      |
| `final-labels`         | OCI labels applied to the image (from `docker/metadata-action`).                      |
| `final-build-args`     | Final build arguments passed to `docker buildx build` (newline-delimited).            |
| `final-platforms`      | Platforms passed to the build.                                                        |

---

## How it works

The action resolves a component descriptor from the `component` input (accepts both a JSON object
and a single-element array — the first element is always used). From the descriptor it extracts the
Dockerfile path, build context, component name, and build arguments.

The image name is determined in priority order:

1. `custom-image-name` input (if set)
2. `component.name` (if not `"default"`)
3. Repository name extracted from `GITHUB_REPOSITORY`

The resolved name is combined with the registry host(s) to form the full image URL(s). When `tags`
is empty the action delegates tag generation to `docker/metadata-action`, which produces tags from
the branch name, semver ref, and PR number. When `tags` is provided (comma-separated), each value
is prefixed with every configured registry URL and **converted to lowercase** — Docker image
references must be lowercase and the action enforces this automatically.

Build arguments are merged: `component.arguments` takes full precedence over the `build-args`
input — if `component.arguments` is non-empty, `build-args` is ignored entirely.

After a successful push, the action generates a metadata JSON file containing the image name, OCI
digest, version, and component group, then uploads it as a workflow artifact. In `dry-run` mode
the image is built locally but not pushed, and the metadata step is skipped.

**Metadata JSON structure:**

```json
{
  "type": "container",
  "mime-type": "application/vnd.docker.image",
  "name": "<component-name>",
  "group": "",
  "version": "<tag>",
  "hashes": [{ "alg": "sha256", "content": "<digest-without-prefix>" }],
  "reference": "<image-name>:<tag>"
}
```

The file is named `<basename>-<tag>-<digest-short12>.json` and uploaded as a workflow artifact
under the same name.

---

## Additional Information

### Permissions

| Mode                 | Required permissions                                          |
| -------------------- | ------------------------------------------------------------- |
| `dry-run: true`      | `contents: read`                                              |
| Normal (GHCR push)   | `contents: read`, `packages: write`                           |
| With SBOM generation | `contents: read`, `packages: write`, `security-events: write` |

Place the `permissions` block at the **job level**, not the workflow level.

### Component Configuration

The `component` input accepts either a JSON object or a single-element array. Fields:

| Field           | Description                                  | Default          |
| --------------- | -------------------------------------------- | ---------------- |
| `name`          | Component name — used for image naming       | `"default"`      |
| `dockerfile`    | Path to the Dockerfile                       | `"./Dockerfile"` |
| `build_context` | Docker build context path                    | `"."`            |
| `arguments`     | Build arguments (comma-separated or newline) | `""`             |

Deprecated field aliases still accepted for compatibility: `file` → `dockerfile`,
`context` → `build_context`.

**Example:**

```yaml
with:
  component: |
    [
      {
        "name": "my-service",
        "dockerfile": "./docker/Dockerfile.prod",
        "build_context": "./src",
        "arguments": "NODE_ENV=production,DEBUG=false"
      }
    ]
```

This input is directly compatible with the `config` output of `docker-config-resolver`:

```yaml
- id: resolve
  uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@v2.2.1

- uses: netcracker/qubership-workflow-hub/actions/docker-action@v2.2.1
  with:
    component: ${{ steps.resolve.outputs.config }}
```

### Build Arguments

The action supports two formats for `build-args`:

**Comma-separated (inline):**

```yaml
with:
  build-args: NODE_VERSION=18,BUILD_DATE=2024-01-01,COMMIT_SHA=${{ github.sha }}
```

**Newline-delimited (multi-line):**

```yaml
with:
  build-args: |
    NODE_VERSION=18
    BUILD_DATE=2024-01-01
    COMMIT_SHA=${{ github.sha }}
```

`component.arguments` takes precedence over `build-args`. If the component descriptor contains
`arguments`, the `build-args` input is ignored entirely.

### Auto-Generated Tags

When `tags` is empty, `docker/metadata-action` generates tags automatically:

- `type=ref,event=branch` — branch name
- `type=semver,pattern={{version}}` — full semver for tagged releases
- `type=semver,pattern={{major}}.{{minor}}` — minor version alias
- `type=semver,pattern={{major}}` — major version alias

### Registry Support

| Registry    | Authentication                               |
| ----------- | -------------------------------------------- |
| `ghcr.io`   | `GITHUB_TOKEN` (via `env.GITHUB_TOKEN`)      |
| `docker.io` | `docker-io-login` + `docker-io-token` inputs |

Set `registry: ghcr.io,docker.io` to push to both simultaneously. When `docker.io` is in the
registry list and `dry-run` is `false`, both `docker-io-login` and `docker-io-token` are required
— the action fails early if either is missing.

### GITHUB_TOKEN for GHCR Login

GHCR authentication uses `env.GITHUB_TOKEN` — not a step input. You must pass the token via the
`env` block on the action step, not via `with`:

```yaml
- uses: netcracker/qubership-workflow-hub/actions/docker-action@v2.2.1
  with:
    registry: ghcr.io
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Passing it via `with` will not work — the composite action reads it from the environment.

### Skipping Checkout

Set `checkout: false` when the calling workflow has already checked out the repository (e.g.
via `actions/checkout` in a preceding step). In that case the `ref` input is also ignored:

```yaml
steps:
  - uses: actions/checkout@v6

  - uses: netcracker/qubership-workflow-hub/actions/docker-action@v2.2.1
    with:
      checkout: false
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Self-Hosted Runners

For runners with QEMU and Docker Buildx pre-installed:

```yaml
with:
  setup-qemu: false
  setup-buildx: false
```

### Artifact Download

Download a build artifact before the Docker build:

```yaml
with:
  download-artifact: true
  download-artifact-name: build-output
  download-artifact-path: ./dist
  download-artifact-merge-multiple: true
```

---

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Build and Publish Docker Image

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch: {}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      security-events: write
      pull-requests: write
    steps:
      - name: Build and Publish Docker Image
        uses: netcracker/qubership-workflow-hub/actions/docker-action@v2.2.1
        with:
          ref: main
          custom-image-name: my-custom-image
          platforms: linux/amd64,linux/arm64
          tags: latest,v1.0.0
          dry-run: false
          registry: ghcr.io,docker.io
          docker-io-login: ${{ secrets.DOCKER_USERNAME }}
          docker-io-token: ${{ secrets.DOCKER_TOKEN }}
          sbom: true
          build-args: |
            NODE_VERSION=18
            BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
          setup-qemu: false
          setup-buildx: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Notes

- `docker-io-login` and `docker-io-token` are required at runtime when `registry` contains
  `docker.io` and `dry-run` is `false` — the action fails early if either is missing.
- `component.arguments` takes full precedence over `build-args` — if both are set, `build-args`
  is ignored.
- `metadata_path` and `metadata-filename` outputs are only set when `dry-run` is `false`; guard
  downstream steps with `if: inputs.dry-run != 'true'`.
- `skip-qemu-buildx` is deprecated — use `setup-qemu: false` and `setup-buildx: false` instead.
- The action prints the contents of the resolved Dockerfile to the workflow log in the debug step.
  Avoid placing secrets directly in `ARG` / `ENV` instructions in the Dockerfile — use
  `--secret` mounts or build-time secrets instead.
- Always pin to `@v2.2.1` or a specific SHA — never `@main` in production.

---

## Troubleshooting

- **Docker Hub authentication fails:** ensure `docker-io-login` and `docker-io-token` are set as
  repository secrets and that the token has Read/Write permissions on Docker Hub.
- **`packages: write` permission error:** add `packages: write` to the job-level `permissions`
  block — the workflow-level block is insufficient for GHCR push in some contexts.
- **Multi-platform build fails:** confirm QEMU is set up (`setup-qemu: true`) or pre-installed on
  the runner. Single-platform (`linux/amd64`) builds do not need QEMU.
- **`image-name` output is empty:** this output is only set after a successful push (`dry-run:
  false`). In dry-run mode the metadata step is skipped entirely.
- **Component build args ignored:** if `component.arguments` is non-empty it overrides `build-args`
  completely — check your component descriptor.
