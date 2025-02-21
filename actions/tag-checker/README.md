# 🚀 Tag Checker Action

This **Tag Checker** GitHub Action checks whether a specified tag exists in a repository.

## Features

- Checks if a specified tag exists in the repository.
- Outputs whether the tag exists or not.

## 📌 Inputs

| Name           | Description                      | Required | Default |
| -------------- | -------------------------------- | -------- | ------- |
| `tag`          | The tag name to check.           | Yes      | None    |
| `GITHUB_TOKEN` | GitHub Token for authentication. | Yes      | None    |

## Outputs

| Name     | Description                                  |
| -------- | -------------------------------------------- |
| `exists` | `True` if the tag exists, `False` otherwise. |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Check Tag Workflow

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  check-tag:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check if tag exists
        uses: netcracker/qubership-workflow-hub/actions/tag-checker@master
        with:
          tag: 'v1.0.0'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Output result
        run: echo "Tag exists: ${{ steps.check-tag.outputs.exists }}"