# 🚀 Docker Publish Workflow

This **Docker Publish** GitHub Workflow automates building and publishing Docker images to the GitHub Container Registry (GHCR).

## Features

- Automates building and publishing Docker images.
- Supports multiple platforms and components.
- Allows for dry-run mode to test the workflow without pushing images.
- Supports custom tags and metadata extraction.

## 📌 Inputs

| Name               | Description                                                                 | Required | Default |
| ------------------ | --------------------------------------------------------------------------- | -------- | ------- |
| `ref`              | Tag or branch name to create release from.                                 | No       | None    |
| `artifact-id`      | Artifact ID to use for naming the Docker image.                            | No       | None    |
| `context`          | Docker build context. Can be `git` or `workflow`.                          | No       | `git`   |
| `dry-run`          | If true, performs a dry run without pushing the image.                     | No       | `false` |
| `download-artifact`| If true, downloads the artifact before building the Docker image.           | No       | `false` |
| `component`        | JSON string describing components for building Docker images.              | No       | `[{"name": "default", "file": "./Dockerfile", "context": "."}]` |
| `platforms`        | Platforms to build the Docker image for (e.g., `linux/amd64`).             | No       | `linux/amd64` |
| `tags`             | Custom tags to override the default tagging strategy.                      | No       | None    |

### Detailed Description of Variables

- **`ref`**: Tag or branch name to create the release from. If not specified, the current branch is used. For example, if a tag like `v1.0.1` is provided, the Docker image will be tagged as `latest`, `1.0.1`, `1.0`, and `1`.
- **`artifact-id`**: Artifact ID to use for naming the Docker image. This is the name of the artifact to download and will also be used as the name for the Docker image.
- **`context`**: Docker build context. Can be `git` (default) or `workflow`. If `git`, the current repository is used as the context. If `workflow`, the context is the directory where the workflow is running.
- **`dry-run`**: If set to `true`, the workflow will perform all steps except pushing the Docker image. Useful for testing.
- **`download-artifact`**: If set to `true`, the workflow will download the artifact before building the Docker image. This is useful for downloading an artifact uploaded in a previous step of the workflow.
- **`component`**: JSON string describing components for building Docker images. Each component includes:
  - `name`: Name of the component.
  - `file`: Path to the Dockerfile.
  - `context`: Build context for the Docker image.
  The default is one component with the name `default`, a Dockerfile in the root of the repository, and the context `.`.
- **`platforms`**: Platforms to build the Docker image for. Default is `linux/amd64`.
- **`tags`**: Custom tags to override the default tagging strategy. Tags should be provided as a comma-separated string.

### Example for Multiple Components

If you have multiple components, you can define them as follows:

```json
[
  {"name": "default", "file": "./Dockerfile", "context": "."},
  {"name": "another-component", "file": "./another/Dockerfile", "context": "./another"}
]
```

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Docker Publish Workflow

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  call-docker-publish:
    uses: netcracker/qubership-workflow-hub/.github/workflows/docker-publish.yml@v1.0.1
    with:
      ref: "main"
      artifact-id: "my-artifact"
      context: "."
      dry-run: false
      download-artifact: true
      component: '[{"name": "default", "file": "./Dockerfile", "context": "."}]'
      platforms: "linux/amd64,linux/arm64"
      tags-override: "v1.0.0, latest"
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Additional Information

- Custom Tags: If tags-override is provided, the workflow will use these tags instead of the default tagging strategy.
- Default Tagging Strategy: If tags-override is not provided, the workflow uses the docker/metadata-action to generate tags based on the following strategy branch/tags (SemVer based):

```yaml
tags: |
  type=ref,event=branch
  type=semver,pattern={{version}}
  type=semver,pattern={{major}}.{{minor}}
  type=semver,pattern={{major}}
```

- Metadata Extraction: The workflow uses the docker/metadata-action to extract metadata such as tags and labels based on the GitHub context.
- Multi-Platform Support: The workflow supports building images for multiple platforms using docker/setup-buildx-action.
