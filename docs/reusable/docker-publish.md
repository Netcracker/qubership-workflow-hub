# 🚀 Docker Publish Workflow

This **Docker Publish** GitHub Workflow automates building and publishing Docker images.

## Features

- Automates building and publishing Docker images.
- Supports multiple platforms.
- Allows for dry-run mode.

## 📌 Inputs

| Name         | Description                              | Required | Default |
| ------------ | ---------------------------------------- | -------- | ------- |
| `ref`        | Branch name to create release from       | No       | None    |
| `artifact-id`| Artifact ID to use                       | No       | None    |
| `context`    | Docker build context                     | No       | `git`   |
| `dry-run`    | If true, performs a dry run without pushing the image | No       | `false` |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Docker Publish Workflow

on:
  push:
    branches:
      - main

jobs:
  call-docker-publish:
    uses: netcracker/qubership-workflow-hub/.github/workflows/docker-publish.yml@main
    with:
      ref: "main"
      artifact-id: "my-artifact"
      context: "."
      dry-run: false
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}