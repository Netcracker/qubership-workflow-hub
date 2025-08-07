# 🚀 Docker Build and Publish Composite Action

This **Docker Build and Publish** GitHub Action automates the process of building and publishing Docker images using Docker Buildx. It supports multi-platform builds, custom tagging, and integration with GitHub Container Registry.

---

## Features

- Automatically builds and pushes Docker images to a container registry.
- Supports multi-platform builds using Docker Buildx.
- Allows custom image names and tags.
- Provides dry-run mode for testing without pushing images.
- Supports metadata extraction for automatic tagging.
- Supports downloading artifacts with flexible configuration.

---

## 📌 Inputs

| Name                      | Description                                                                                                                        | Required | Default                                                      |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------|----------|--------------------------------------------------------------|
| `ref`                     | Branch to create a release from.                                                                                                   | No       | `""`                                                         |
| `custom-image-name`       | Custom name for the Docker image. If not provided, it will be auto-generated.                                                      | No       | `""`                                                         |
| `context`                 | Pipeline context.                                                                                                                  | No       | `git`                                                        |
| `dry-run`                 | Run without pushing (dry run).                                                                                                     | No       | `false`                                                      |
| `download-artifact`       | Flag to download the artifact.                                                                                                     | No       | `false`                                                      |
| `component`               | Component configuration in JSON format (an array with a single object).                                                            | No       | `[{"name": "default", "file": "./Dockerfile", "context": "."}]` |
| `platforms`               | Platforms for which the Docker image will be built.                                                                                | No       | `linux/amd64`                                                |
| `tags`                    | Docker image tags. If empty, tags will be generated automatically.                                                                 | No       | `""`                                                         |
| `download-artifact-ids`   | IDs of the artifacts to download, comma-separated. Either inputs `artifact-ids` or `name` can be used, but not both. Optional      | No       | `""`                                                         |
| `download-artifact-path`  | Destination path. Supports basic tilde expansion. Optional. Default is `$GITHUB_WORKSPACE`                                         | No       | `""`                                                         |
| `download-artifact-pattern`| A glob pattern to the artifacts that should be downloaded. Ignored if name is specified. Optional.                                | No       | `false`                                                         |
| `sbom`                    | Flag to enable SBoM generation. | No | `false` |
| `build-args`              | List of build-time variables, newline-delimited string. | No | `""` |
| `security-scan`           | Perform security scan of the built image by docker-scout. | No | `false` |
| `docker-io-user`          | Docker Hub username for security scanning. Required if `security-scan` is `"true"`| No | `""` |
| `docker-io-password`      | Docker Hub user password for security scanning. Required if `security-scan` is `"true"`| No | `""` |

---

## Permisions

- Minimum permissions level `contents: read` in dry-run mode.
- In normal mode it is required to set `packages: write`.
- If `security-scan: 'true'` then need to set `security-events: write`.
- If action used in workflow which triggered by `pool_request` and `security-scan: true`, then need to set `pull-requests: write` permission. The summary of seurity scan will be added to pull request as a comment.

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
permissions: {}
jobs:
  build-and-push:
    permissions:
      contents: read
      packages: write
      security-events: write
      pull-requests: write
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Build and Publish Docker Image
        uses: netcracker/qubership-workflow-hub/actions/docker-action@main
        with:
          ref: main
          custom-image-name: my-custom-image
          platforms: linux/amd64,linux/arm64
          tags: latest, v1.0.0
          dry-run: false
          download-artifact: true
          download-artifact-path: ./artifacts
          security-scan: true
          docker-io-user: ${{ secrets.DOCKERHUB_USER }}
          docker-io-password: ${{ secrets.DOCKERHUB_RW_TOKEN }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Additional Information

### Dry-Run Mode

When `dry-run` is set to `true`, the action will simulate the build and push process without actually pushing the image to the registry. This is useful for testing and debugging.

### Multi-Platform Builds

The `platforms` input allows you to specify multiple platforms (e.g., `linux/amd64,linux/arm64`) for the Docker image. This is useful for creating images that can run on different architectures.

### Automatic Tagging

If the `tags` input is empty, the action will automatically generate tags based on the branch name, semantic versioning, or other metadata.

### Download Artifact

When the `download-artifact` input is set to `true`, the action will attempt to download an artifact that was previously uploaded in the same workflow using the standard `actions/upload-artifact@v4` action.

#### Additional Download Options

- **`download-artifact-path`**: Define the destination path for downloaded artifacts. Defaults to `$GITHUB_WORKSPACE`.
- **`download-artifact-artifact-ids`**: Specify artifact IDs to download, separated by commas. **`In Desing`**
- **`download-artifact-pattern`**: Use a glob pattern to filter artifacts for download. Ignored if `name` is specified. **`In Desing`**

### Logic for Determining the Docker Image Name

The action uses the following logic to determine the final name of the Docker image (`CONTAINER_NAME_RESULT`):

1. **Check if the `custom-image-name` input is provided**:
   - If the `custom-image-name` input is specified by the user, it is directly used as the name of the Docker image.

2. **Fallback to the component name**:
   - If `custom-image-name` is not provided, the action calculates the repository name (extracted from the `GITHUB_REPOSITORY` environment variable) and uses it as the Docker image name.
   - If `custom-image-name` is provided and a component file is defined, the names will be taken from the component configuration instead.

---

## Example Configuration

Below is an example of how to configure the action to use a component file for determining the image name:

```yaml
with:
  component: |
    [
      {
        "name": "custom-image-name",
        "file": "./Dockerfile",
        "context": "."
      }
    ]
```

In this configuration:

- If `custom-image-name` is left empty, the action will use the `name` field from the `component` configuration (`custom-image-name`) as the Docker image name.
- If no `component` is provided, the repository name will be used as the fallback.
