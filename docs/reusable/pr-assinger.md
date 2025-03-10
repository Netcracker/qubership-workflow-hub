# 🚀 PR Auto-Assignment Workflow

This **PR Auto-Assignment** GitHub Workflow automates the assignment of reviewers to pull requests.

## Features

- Automatically assigns reviewers to pull requests based on a configuration file.

## 📌 Inputs

This workflow does not require any inputs.

## 📌 Secrets

| Name           | Description                          | Required |
| -------------- | ------------------------------------ | -------- |
| `GITHUB_TOKEN` | GitHub token for authentication      | Yes      |

## 📌 Permissions

This workflow requires the following permissions:

| Permission       | Description                          |
| ---------------- | ------------------------------------ |
| `pull-requests`  | Write access to pull requests        |
| `contents`       | Read access to repository contents   |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Example Workflow

on:
  pull_request:
    types: [opened, reopen, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  call-pr-auto-assign:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-pr-assigner.yml@main
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

