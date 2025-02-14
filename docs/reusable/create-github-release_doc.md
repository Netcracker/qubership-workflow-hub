# Documentation: Create GitHub Release GitHub Action

This documentation provides an overview of the `Create GitHub Release` GitHub Action, including its purpose, usage, and setup.

---

## Purpose

The `Create GitHub Release` action automates the process of creating and tagging a release on GitHub. It ensures the latest changes are tagged and pushed to the repository, and a corresponding GitHub release is created.

---

## Workflow Configuration

### Trigger

This workflow is designed to be triggered via a `workflow_call` event, allowing it to be reused in other workflows with the required and optional inputs.

### Inputs

The workflow accepts the following inputs:

| Input Name     | Type    | Required | Default | Description                              |
| -------------- | ------- | -------- | ------- | ---------------------------------------- |
| `revision`     | string  | true     |         | The version tag for the release.         |
| `draft`        | boolean | false    | `false` | Whether the release is a draft.          |
| `prerelease`   | boolean | false    | `false` | Whether the release is a prerelease.     |
| `release_info` | string  | false    |         | Additional release notes or information. |

---

## Workflow Jobs

### 1. **Job: `create-release`**

Runs on `ubuntu-latest` and consists of the following steps:

#### a. **Checkout Repository**

- Checks out the repository code from the `main` branch.

```yaml
uses: actions/checkout@v4
with:
  ref: main
  fetch-depth: 0
```

#### b. **Pull Latest Changes**

- Ensures the local repository is up to date with the latest changes from the `main` branch.

```bash
git fetch origin main
git reset --hard origin/main
git log -1
```

#### c. **Create and Push Tag**

- Creates a new tag with the specified revision and pushes it to the remote repository.

```bash
git config --global user.email "tech@qubership.com"
git config --global user.name "tech"
git tag -a v${{ inputs.revision }} -m "Release v${{ inputs.revision }}"
git push origin v${{ inputs.revision }}
```

#### d. **Create GitHub Release Using `gh` CLI**

- Creates a new GitHub release with the specified revision, using the GitHub CLI.

```bash
gh release create v${{ inputs.revision }} --title "Release v${{ inputs.revision }}" --notes "Release v${{ inputs.revision }}"
```

- Requires the `GITHUB_TOKEN` secret for authentication.

---

## Example Usage

Below is an example of how to call this workflow from another workflow:

```yaml
name: Call Create GitHub Release

on:
  push:
    branches:
      - main

jobs:
  call-create-release:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/create-release.yml
    with:
      revision: "1.0.0"
      draft: false
      prerelease: false
      release_info: "Initial release with all features."
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Notes

- Ensure the `GITHUB_TOKEN` secret is available and properly configured in the repository.
- Modify the `ref` in the checkout step if using a branch other than `main`.
- The `release_info` input can be used to provide detailed release notes for the GitHub release.

---

## Troubleshooting

- **Tag Already Exists**: Ensure the specified `revision` is unique and not already used.
- **Authentication Issues**: Verify that the `GITHUB_TOKEN` has sufficient permissions to create releases and push tags.
- **GitHub CLI Not Found**: Ensure that `gh` CLI is installed and accessible in the workflow environment.
