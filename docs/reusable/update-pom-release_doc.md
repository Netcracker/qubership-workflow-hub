# Documentation: Update Version on `pom.xml` GitHub Action

This documentation provides an overview of the `Update Version on pom.xml` GitHub Action, including its purpose, usage, and setup.

---

## Purpose

The `Update Version on pom.xml` action automates the process of updating the `<revision>` version in a specified `pom.xml` file and commits the change back to the repository.

---

## Workflow Configuration

### Trigger

This workflow can be triggered via a `workflow_call` event, allowing it to be reused in other workflows by passing required inputs.

### Inputs

The workflow requires the following inputs:

| Input Name | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| `file`     | string | true     | Path to the `pom.xml` file to be updated.   |
| `version`  | string | true     | New version to set in the `<revision>` tag. |

---

## Workflow Jobs

### 1. **Job: `update`**

Runs on `ubuntu-latest` and performs the following steps:

#### a. **Checkout Repository**

- Uses the `actions/checkout@v4` action to clone the repository.

```yaml
uses: actions/checkout@v4
```

#### b. **Update Version in the POM File**

- Updates the `<revision>` tag in the specified `pom.xml` file using `sed`.

```bash
echo "Updating version in ${{ inputs.file }}..."
sed -i "s|<revision>.*</revision>|<revision>${{ inputs.version }}</revision>|" ${{ inputs.file }}
```

#### c. **Commit Changes**

- Configures Git user credentials, commits the changes, and pushes them to the `main` branch.

```bash
git config --global user.email "publisher@qubership.org"
git config --global user.name "Qubership User"
git add ${{ inputs.file }}
git commit -m "Update version to ${{ inputs.version }} for release"
git push origin main
```

---

## Example Usage

Below is an example of how to call this workflow in another workflow:

```yaml
name: Call Update Version

on:
  push:
    branches:
      - main

jobs:
  call-update-version:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/update-version.yml
    with:
      file: "path/to/pom.xml"
      version: "1.0.1"
```

---

## Notes

- Ensure that the user triggering this workflow has proper permissions to commit and push to the `main` branch.
- Modify `git push origin main` if your default branch is named differently.
- This workflow assumes `<revision>` tags are uniquely present in the specified `pom.xml`.

---

## Troubleshooting

- **File not found error**: Verify the `file` input and ensure the path is correct.
- **Commit failed**: Ensure the repository allows direct pushes to the `main` branch or modify branch protection rules accordingly.
