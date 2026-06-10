# 🚀 Update APM packages

Updates APM-managed packages in the current repository and creates a pull request with the changes.

## Features

- Validates that `apm.yml` exists and contains the specified APM target — adds it automatically if missing
- Installs [yq](https://github.com/mikefarah/yq) v4.53.3 for YAML manipulation
- Runs `apm update --yes` non-interactively via [microsoft/apm-action](https://github.com/microsoft/APM)
- Opens a pull request on branch `chore/update-apm-packages` with the resulting changes
- Reports the PR URL or "no changes" to the workflow job summary

## 📌 Inputs

| Name     | Description                                                       | Required | Default  |
| -------- | ----------------------------------------------------------------- | -------- | -------- |
| `branch` | Base branch for the pull request (must match the checked-out ref) | No       | `main`   |
| `target` | APM target name configured in `apm.yml` (e.g. `claude`)           | No       | `claude` |
| `token`  | GitHub token with permission to create branches and pull requests | Yes      | -        |

## How it works

1. Installs `yq` v4.53.3.
2. Reads `apm.yml` and verifies that `inputs.target` is listed under `.targets`.
   If the entry is missing, it is added automatically.
3. Sets up APM via `microsoft/apm-action` (setup-only mode).
4. Runs `apm update --yes` to update all managed packages.
5. Creates or updates a PR on branch `chore/update-apm-packages` (base: `inputs.branch`).
   The branch is deleted automatically after merge.
6. Logs the PR URL to the job summary, or reports "no changes" if nothing was updated.

## Usage

The caller workflow is responsible for checking out the repository before invoking this action.

```yaml
name: Update APM packages

on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * 1"

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10  # v6.0.3
        with:
          token: ${{ secrets.APM_UPDATE_TOKEN }}
          persist-credentials: false

      - name: Update APM packages
        uses: netcracker/qubership-workflow-hub/actions/apm-packages-update@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
        with:
          token: ${{ secrets.APM_UPDATE_TOKEN }}
```

## Notes

- The caller workflow must check out the repository before invoking this action.
- `apm.yml` must exist at the repository root. The action fails with exit code 1 if it is not found.
- The PR branch is always `chore/update-apm-packages`. If a branch with that name already exists,
  `peter-evans/create-pull-request` updates the existing PR rather than opening a new one.
- The `token` input must have permission to push branches and open pull requests.
  The org-level secret `APM_UPDATE_TOKEN` is the recommended value.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@cabbb90e9471163cfac84bd50ff0296b2803b44c # v2.3.0`. The SHA is the immutable pin;
  the comment shows which release it points to. Tags alone are mutable.
  Never use `@main` or short SHAs.
