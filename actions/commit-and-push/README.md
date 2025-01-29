# 🚀 Commit and Push GitHub Action

**Category:** Source Code Management

This **Commit and Push** GitHub Action automates the process of committing changes and pushing them to a remote repository.

## 📌 Features

- Automatically commits and pushes modified files.
- Allows customization of commit author name and email.
- Supports configurable commit messages.
- Pushes changes to a specified branch.
- Skips commits if there are no changes.

## 🛠️ Inputs

| Name              | Description                                                | Required | Default |
|-------------------|------------------------------------------------------------|----------|---------|
| `author_name`    | The name of the commit author.                             | ❌ No    | `qubership-actios[bot]` |
| `author_email`   | The email of the commit author.                            | ❌ No    | `qubership-actios[bot]@qubership.com` |
| `commit_message` | The commit message for the new commit.                     | ❌ No    | `Automated commit` |
| `branch_name`    | The branch to push the changes to.                         | ❌ No    | `main` |

## 🔑 Environment Variables

| Name           | Description                          | Required |
|---------------|--------------------------------------|----------|
| `GITHUB_TOKEN` | GitHub token for authentication   | ✅ Yes |

## 📝 Usage Example

Here’s an example of how to use this action in a GitHub workflow:

```yaml
name: Auto Commit and Push

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  commit-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Make changes
        run: echo "Automated update" >> update.log

      - name: Run Commit and Push Action
        uses: Netcracker/qubership-workflow-hub/actions/commit-and-push@main
        with:
          author_name: "Bot User"
          author_email: "bot@example.com"
          commit_message: "Automated commit from GitHub Actions"
          branch_name: "main"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}