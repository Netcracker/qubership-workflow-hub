# 🚀 Update APM packages

Updates APM-managed packages in the current repository and creates a pull request with the changes.

## Features

- Runs `apm update --yes` non-interactively via [microsoft/apm-action](https://github.com/microsoft/APM)
- Uses APM native target resolution by default (`--target` is added only when `target` input is set)
- Supports a safe `dry-run` mode for diagnostics and validation without creating a pull request
- Supports an opt-in `debug` mode that prints runner context, `apm targets`, and the effective dry-run command
- Opens a pull request on branch `chore/update-apm-packages` with the resulting changes
- Uses a dynamic PR body that includes base branch, workflow run link, and whether an explicit target was set
- Reports the PR URL or "no changes" to the workflow job summary

## 📌 Inputs

| Name     | Description                                                       | Required | Default  |
| -------- | ----------------------------------------------------------------- | -------- | -------- |
| `branch` | Base branch for the pull request (must match the checked-out ref) | No       | `main`   |
| `dry-run` | Run `apm update` in dry-run mode and skip pull request creation   | No       | `false`  |
| `debug`  | Print runner and APM diagnostics before updating packages         | No       | `false`  |
| `target` | Optional APM target override; accepts one target or a comma-separated list | No | `""` |
| `token`  | GitHub token with permission to create branches and pull requests | Yes      | -        |

## How it works

1. Validates that `apm.yml` exists.
2. Sets up APM via `microsoft/apm-action` (setup-only mode).
3. Optionally prints runner diagnostics, `apm targets`, and a dry-run of the same command that will be executed.
4. Runs `apm update --yes`.
5. If `inputs.target` is set, appends `--target <target>` to the command.
6. If `dry-run: true`, skips pull request creation after printing the update result.
7. Otherwise creates or updates a PR on branch `chore/update-apm-packages` (base: `inputs.branch`).
  The body includes the executed command, base branch, workflow run link, and a short review checklist.
  The branch is deleted automatically after merge.
8. Logs the PR URL to the job summary, or reports "no changes" if nothing was updated.

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
          debug: "true"
          dry-run: "true"
          target: ""
          token: ${{ secrets.APM_UPDATE_TOKEN }}
```

## Notes

- The caller workflow must check out the repository before invoking this action.
- `apm.yml` must exist at the repository root. The action fails with exit code 1 if it is not found.
- If `target` is omitted, the action runs `apm update --yes` without `--target` and lets APM resolve targets from `apm.yml` or auto-detection.
- If `target` is provided, it is passed through as `--target <target>` (single value or comma-separated list).
- `debug: true` prints runner state, active harness markers, `apm targets`, and the effective dry-run update command.
- `dry-run: true` skips pull request creation entirely and is intended for diagnostics or validation workflows.
- The PR branch is always `chore/update-apm-packages`. If a branch with that name already exists,
  `peter-evans/create-pull-request` updates the existing PR rather than opening a new one.
- The generated PR title is `chore(apm): update packages` and the body includes base branch,
  actor, explicit target override (`auto` when omitted), and a link to the originating workflow run.
- The `token` input must have permission to push branches and open pull requests.
  The org-level secret `APM_UPDATE_TOKEN` is the recommended value.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@cabbb90e9471163cfac84bd50ff0296b2803b44c # v2.3.0`. The SHA is the immutable pin;
  the comment shows which release it points to. Tags alone are mutable.
  Never use `@main` or short SHAs.
