# 🚀 Docker Publish Workflow

This **Docker Publish** GitHub Workflow automates building and publishing Docker images.

## Features

- Automates building and publishing Docker images.
- Supports multiple platforms.
- Allows for dry-run mode.

## 📌 Inputs

| Name              | Description                                                                 | Required | Default |
| ----------------- | --------------------------------------------------------------------------- | -------- | ------- |
| `ref`             | Tag or branch name to create release from                                          | No       | None    |
| `artifact-id`     | Artifact ID to use                                                          | No       | None    |
| `context`         | Docker build context. Can be `git` or `workflow`                            | No       | `git`   |
| `dry-run`         | If true, performs a dry run without pushing the image                       | No       | `false` |
| `download-artifact` | If true, downloads the artifact before building the Docker image          | No       | `false`  |
| `component`       | JSON string describing components for building Docker images                | No       | `[{"name": "default", "file": "./Dockerfile", "context": "."}]` |

### Detailed Description of Variables

- `ref`: Tag or branch name to create release from. If not specified, the current branch is used. If a tag like `v1.0.1` is provided, the tags for the Docker image will be `latest`, `1.0.1`, `1.0`, and `1`.
- `artifact-id`: Artifact ID to use for building the Docker image. This is the name of the artifact to download and will be used as the name for the Docker image.
- `download-artifact`: If set to `true`, the workflow will download the artifact before building the Docker image. This is useful for downloading an artifact that was uploaded in a previous step of the same workflow with name `artifact-id`, such as a Maven build. The default is `false`.
- `context`: Docker build context. Can be `git` or `workflow`. The default is `git`, meaning the current repository will be used as the context. If set to `workflow`, the context will be the directory where the workflow is running.
- `dry-run`: If set to `true`, the workflow will perform all steps except pushing the Docker image. This is useful for testing.
- `component`: JSON string describing components for building Docker images. Each component should include a name (`name`), the path to the Dockerfile (`file`), and the build context (`context`). The default is one component with the name `default`, a Dockerfile in the root of the repository, and the context `.`. The name of the Docker image will be derived from the `artifact-id` or the `name` of the component if `artifact-id` is not specified.

For example, if you have multiple components defined as follows:
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
    uses: netcracker/qubership-workflow-hub/.github/workflows/docker-publish.yml@main
    with:
      ref: "main"
      artifact-id: "my-artifact"
      context: "."
      dry-run: false
      download-artifact: true
      component: '[
                     {"name": "default", "file": "./Dockerfile", "context": "."},
                     {"name": "another-component", "file": "./another/Dockerfile", "context": "./another"}
                  ]'
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```