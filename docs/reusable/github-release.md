# 🚀 Create GitHub Release Workflow

This **Create GitHub Release** GitHub Workflow automates creating and tagging releases on GitHub.

## Features

- Automates creating and tagging releases on GitHub.
- Supports draft and pre-release options.
- Allows adding custom release information.

## 📌 Inputs

| Name          | Description                              | Required | Default |
| ------------- | ---------------------------------------- | -------- | ------- |
| `revision`    | The version of the release               | Yes      | None    |
| `draft`       | Whether the release is a draft           | No       | `false` |
| `prerelease`  | Whether the release is a pre-release     | No       | `false` |
| `release_info`| Additional information for the release   | No       | None    |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Create GitHub Release Workflow

on:
  push:
    branches:
      - main

permissions:
  contents: write
  packages: write
  pull-requests: write

jobs:
  call-create-github-release:
    uses: netcracker/qubership-workflow-hub/.github/workflows/create-github-release.yml@main
    with:
      revision: "1.0.0"
      draft: false
      prerelease: false
      release_info: "Initial release"
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}