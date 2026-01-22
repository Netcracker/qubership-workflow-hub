# 🚀 Add Commit Messages to PR's Description Action

This **Add Commit Messages to PR's Description** GitHub Action collects commit messages from a pull request and adds them to the pull request description.

## Features

- Collects commit messages from a pull request.
- Adds collected commit messages to the pull request description.

## 📌 Inputs

This action does not require any inputs.

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Add commit messages to PR body

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  update-pr-body:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Update PR body
        uses: netcracker/qubership-workflow-hub/actions/pr-add-messages@v2.0.8