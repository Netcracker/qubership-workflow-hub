# 🚀 Docker Build and Publish Composite Action

This **Docker Build and Publish** GitHub Action automates the process of building and publishing Docker images using Docker Buildx. It supports multi-platform builds, custom tagging, and integration with GitHub Container Registry and Docker Hub.

---

## Features

- Automatically builds and pushes Docker images to container registries (GitHub Container Registry and/or Docker Hub).
- Supports multi-platform builds using Docker Buildx.
- Allows custom image names and tags.
- Provides dry-run mode for testing without pushing images.
- Supports metadata extraction for automatic tagging.
- Supports downloading artifacts with flexible configuration.
- SBOM (Software Bill of Materials) generation support.
- Configurable build arguments.

---

## 📌 Inputs

| Name                               | Description                                                                                          | Required | Default                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `ref`                              | Git reference (branch/tag/SHA) to checkout.                                                          | No       | `""`                                                                        |
| `custom-image-name`                | Custom name for the Docker image. If not provided, it will be auto-generated.                        | No       | `""`                                                                        |
| `context`                          | Context for docker/metadata-action (e.g., `git`, `workflow`).                                        | No       | `git`                                                                       |
| `dry-run`                          | Run without pushing (dry run).                                                                       | No       | `false`                                                                     |
| `download-artifact`                | Flag to download the artifact.                                                                       | No       | `false`                                                                     |
| `component`                        | Component configuration in JSON format (an array with a single object).                              | No       | `[{"name": "default", "dockerfile": "./Dockerfile", "build_context": "."}]` |
| `platforms`                        | Platforms for which the Docker image will be built.                                                  | No       | `linux/amd64`                                                               |
| `tags`                             | Docker image tags. If empty, tags will be generated automatically.                                   | No       | `""`                                                                        |
| `download-artifact-name`           | Name of the artifact to download. Either `name` or `ids` can be used, but not both.                  | No       | `""`                                                                        |
| `download-artifact-ids`            | IDs of the artifacts to download, comma-separated. Either `ids` or `name` can be used, but not both. | No       | `""`                                                                        |
| `download-artifact-path`           | Destination path. Supports basic tilde expansion. Default is `$GITHUB_WORKSPACE`                     | No       | `""`                                                                        |
| `download-artifact-pattern`        | A glob pattern to the artifacts that should be downloaded. Ignored if name is specified.             | No       | `""`                                                                        |
| `download-artifact-merge-multiple` | When download multiple artifacts unpack them as is or into separate directories.                     | No       | `false`                                                                     |
| `sbom`                             | Flag to enable SBoM (Software Bill of Materials) generation.                                         | No       | `false`                                                                     |
| `build-args`                       | Build arguments for the Docker image. Supports comma-separated or newline-delimited format.          | No       | `""`                                                                        |
| `checkout`                         | Flag to enable repository checkout.                                                                  | No       | `true`                                                                      |
| `registry`                         | Registry name to publish images to. Can be set to `ghcr.io`, `docker.io` or `ghcr.io,docker.io`      | No       | `ghcr.io`                                                                   |
| `docker-io-login`                  | Username to login to docker.io                                                                       | Yes*     | -                                                                           |
| `docker-io-token`                  | Token to login to docker.io                                                                          | Yes*     | -                                                                           |
| `skip-qemu-buildx`                 | DEPRECATED: Use setup-qemu and setup-buildx instead. Skip the setup of both QEMU and Buildx.         | No       | `false`                                                                     |
| `setup-qemu`                       | Setup QEMU for multi-platform builds.                                                                | No       | `true`                                                                      |
| `setup-buildx`                     | Setup Docker Buildx.                                                                                 | No       | `true`                                                                      |

**\* Required only if `registry` contains `docker.io` and `dry-run` is `false`**

---

## 📤 Outputs

| Name                   | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `image-name`           | The name of the built Docker image.                    |
| `metadata_path`        | Path to the generated metadata file.                   |
| `metadata-filename`    | Name of the generated metadata file.                   |
| `component-name`       | The name of the component being built.                 |
| `component-file`       | The Dockerfile used for the build.                     |
| `component-context`    | The build context used for the build.                  |
| `component-build-args` | The build arguments used for the build.                |
| `final-tags`           | The final tags applied to the Docker image.            |
| `final-labels`         | The final labels applied to the Docker image.          |
| `final-build-args`     | The final build arguments applied to the Docker image. |
| `final-platforms`      | The final platforms for which the image was built.     |

---

## Permissions

- **Dry-run mode**: Minimum permissions level `contents: read`
- **Normal mode**: Required permissions:
  - `contents: read`
  - `packages: write` (for GitHub Container Registry)
  - `security-events: write` (for SBOM generation)
  - `pull-requests: write` (optional, for PR comments)

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

permissions:
  contents: read
  packages: write
  security-events: write
  pull-requests: write

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Build and Publish Docker Image
        uses: netcracker/qubership-workflow-hub/actions/docker-action@main
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

## Additional Information

### Dry-Run Mode

When `dry-run` is set to `true`, the action will simulate the build process without actually pushing the image to the registry. This is useful for testing and debugging.

### Multi-Platform Builds

The `platforms` input allows you to specify multiple platforms (e.g., `linux/amd64,linux/arm64`) for the Docker image. This creates images that can run on different architectures.

### Registry Support

The action supports publishing to multiple registries:

- **GitHub Container Registry** (`ghcr.io`) - Uses `GITHUB_TOKEN` for authentication
- **Docker Hub** (`docker.io`) - Requires `docker-io-login` and `docker-io-token` inputs
- **Both registries** - Set `registry: ghcr.io,docker.io`

### Automatic Tagging

If the `tags` input is empty, the action will automatically generate tags based on:

- Branch name (for branch pushes)
- Semantic versioning (for tagged releases)
- PR number (for pull requests)

### Artifact Download

When `download-artifact` is set to `true`, the action will download artifacts from the current workflow run:

```yaml
with:
  download-artifact: true
  download-artifact-name: build-artifacts
  download-artifact-path: ./artifacts
  download-artifact-merge-multiple: true
```

### SBoM Generation

Enable Software Bill of Materials generation for security scanning:

```yaml
with:
  sbom: true
```

### Logic for Determining the Docker Image Name

The action uses the following priority order to determine the Docker image name:

1. **`custom-image-name` input** - Direct override
2. **Component configuration name** - From `component.name` (if not "default")
3. **Repository name** - Extracted from `GITHUB_REPOSITORY` as fallback

### Component Configuration

Advanced users can specify component configuration in JSON format:

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

**Component Fields**:
| Field           | Description                              | Default          |
| --------------- | ---------------------------------------- | ---------------- |
| `name`          | Component name (used for image naming)   | `"default"`      |
| `dockerfile`    | Path to Dockerfile                       | `"./Dockerfile"` |
| `build_context` | Docker build context path                | `"."`            |
| `arguments`     | Build arguments (comma-separated format) | `""`             |

**Notes**:
- Deprecated keys: `file` and `context` are still supported for compatibility, but prefer `dockerfile` and `build_context`.
- `component.build_context` is the Docker build context. It is different from the top-level `context` input, which controls the metadata-action context (e.g., `git`).
- Component build arguments take precedence over the `build-args` input.

### Build Arguments

Pass build-time variables to Docker. The action supports two formats:

**1. Comma-separated format** (simple, one-line):
```yaml
with:
  build-args: NODE_VERSION=18,BUILD_DATE=2024-01-01,COMMIT_SHA=${{ github.sha }}
```

**2. Newline-delimited format** (multi-line):
```yaml
with:
  build-args: |
    NODE_VERSION=18
    BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    COMMIT_SHA=${{ github.sha }}
```

**Priority**: Build arguments from component metadata (`component.arguments`) take precedence over the `build-args` input.

### Self-Hosted Runners

For self-hosted runners with pre-configured QEMU and Docker Buildx:

```yaml
with:
  setup-qemu: false
  setup-buildx: false
```

---

## Troubleshooting

### Docker Hub Authentication

If using Docker Hub (`docker.io`), ensure you have:

1. Created a Docker Hub access token with Read/Write permissions
2. Added `docker-io-login` and `docker-io-token` as repository secrets
3. Set `registry` to include `docker.io`

### Permission Errors

Ensure your workflow has the required permissions, especially `packages: write` for registry operations.
