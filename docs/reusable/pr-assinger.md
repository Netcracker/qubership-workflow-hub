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
  pull_request_target:
    types: [opened, reopen, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  pr-auto-assign:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-pr-assigner.yml@main
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Assignee Configuration

The configuration file should be placed in `./.github/pr-assigner-config.yml`:

```yaml
assignees:
  - user1
  - user2
  - user3
count: 2
```

### Configuration Fields

- `assignees`: A list of GitHub usernames to be assigned as reviewers. The workflow will randomly select reviewers from this list.
- `count`: The number of reviewers to assign to each pull request. If not specified, the default value is `1`. This value will be chosen randomly by the workflow if specified.