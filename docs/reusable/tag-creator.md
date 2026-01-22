# 🚀 Tag Creator Workflow

This **Tag Creator** GitHub Workflow creates a new tag in the repository.

## Features

- Creates a new tag in the repository.

## 📌 Inputs

| Name       | Description                          | Required | Default |
| ---------- | ------------------------------------ | -------- | ------- |
| `tag-name` | The version of the tag to create.    | Yes      | None    |
| `ref`      | The branch name to create the tag from. | No       | `main`  |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Create Tag Workflow

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  call-tag-creator:
    uses: netcracker/qubership-workflow-hub/.github/workflows/tag-creator.yml@v2.0.8
    with:
      tag-name: "v1.0.0"
      ref: "main"
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}