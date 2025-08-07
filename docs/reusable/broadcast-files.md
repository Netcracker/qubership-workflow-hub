# 🚀 Broadcast files Workflow

This **Broadcast files** GitHub Workflow automates propagation of common files across github organization.
This workflow usually dont needs to be added to component repo. It should be operated via [.github repository](https://github.com/Netcracker/.github).

If new functionality needed please create the [issue](https://github.com/Netcracker/qubership-workflow-hub/issues)

## Features

- Propagates common workflows to all qubership repos.
- Propagates .gitattributes to all qubership repos.
- Propagates Cloud-Core specific dependabot config to Core repos.

## 📌 Inputs

| Name              | Description                                                                 | Required | Default |
| ----------------- | --------------------------------------------------------------------------- | -------- | ------- |
| `repo_name`       | The name of target repository to propagate.                                 | No       | None    |


### Detailed Description of Variables

- `repo_name`: The name of target repository to propagate. If not set files will be propagated to all repos in organization except the REPOS_TO_IGNORE list


## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Broadcast files to organization
on:
  push:
    branches:
      - main
  pull_request_target:
    branches:
      - main
  workflow_dispatch:
    inputs:
      repo_name:
        description: >-
          You can specify name of the repository where workflows should be
          pushed manually. As long as repository is not ignored by workflow
          settings. If you do not specify exact repository name, the workflow
          will try to replicate all missing changes to all repositories.
        required: false
permissions:
  actions: write
  contents: write
  pull-requests: write
  statuses: write
jobs:
  broadcast_files:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/broadcast-files.yml@main
    secrets:
      GH_ACCESS_TOKEN: '${{ secrets.GH_ACCESS_TOKEN }}'
```