# Commit and Push Action

**Category**: Source Code Management

**Description**: This action automatically commits and pushes changes to the repository.

## Inputs

| Name             | Required  | Description                                                   | Default                |
|------------------|-----------|---------------------------------------------------------------|------------------------|
| `author_name`    | No        | The name of the commit author.                                | `qubership-actions[bot]`       |
| `author_email`   | No        | The email of the commit author.                               | `qubership-actions[bot]@qubership.com`   |
| `commit_message` | No        | The commit message for the commit.                           | `Automated commit`     |

## Example Usage

```yaml
name: Commit and Push
on:
  push:
    branches:
      - main

jobs:
  commit-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Commit and Push Changes
        uses: netcracker/qubership-workflow-hub/actions/commit-and-push@main
        with:
          author_name: 'Your Name'
          author_email: 'your-email@example.com'
          commit_message: 'Update files with automated script'
