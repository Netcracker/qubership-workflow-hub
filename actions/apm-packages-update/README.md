# 🚀 Update APM packages

Updates APM-managed packages in the current repository and creates a pull request with the changes.

## Features

- Validates that `apm.yml` exists and resolves the APM target from the file or an explicit override
- Supports a safe `dry-run` mode for diagnostics and validation without creating a pull request
- Supports an opt-in `debug` mode that prints runner context and APM target-resolution diagnostics
- Installs [yq](https://github.com/mikefarah/yq) v4.53.3 for YAML manipulation
- Runs `apm update --yes --target <target>` non-interactively via [microsoft/apm-action](https://github.com/microsoft/APM), using its default APM CLI version unless explicitly pinned
- Opens a pull request on branch `chore/update-apm-packages` with the resulting changes
- Uses a dynamic PR title and body that include the resolved target, base branch, and workflow run link
- Supports commit sign-off, requesting user/team reviewers, and a configurable branch-deletion policy on the created pull request
- Optionally enables GitHub auto-merge on the created pull request with a configurable merge method (`merge`, `squash`, or `rebase`)
- Reports the PR URL or "no changes" to the workflow job summary

## 📌 Inputs

| Name     | Description                                                       | Required | Default  |
| -------- | ----------------------------------------------------------------- | -------- | -------- |
| `branch` | Base branch for the pull request (must match the checked-out ref) | No       | `main`   |
| `dry-run` | Run `apm update` in dry-run mode and skip pull request creation   | No       | `false`  |
| `debug`  | Print runner and APM diagnostics before updating packages         | No       | `false`  |
| `target` | Optional APM target override; accepts one target or a comma-separated list | No | `""` |
| `apm-version` | Optional APM CLI version to install; leave empty to use the `microsoft/apm-action` default | No | `""` |
| `auto-merge` | Automatically enable auto-merge for the created pull request. Has no effect in `dry-run` mode or when no pull request was created | No | `false` |
| `merge-method` | Merge method to use for auto-merge; one of `merge`, `squash`, or `rebase` (case-insensitive). Ignored unless `auto-merge` is `true` | No | `squash` |
| `delete-branch` | Automatically delete the `chore/update-apm-packages` branch after the pull request is merged | No | `true` |
| `sign-off` | Sign off commits in the pull request | No | `false` |
| `reviewers` | Comma-separated list of GitHub usernames to request review from | No | `""` |
| `team-reviewers` | Comma-separated list of GitHub team slugs to request review from | No | `""` |
| `token`  | GitHub token with permission to create branches and pull requests | Yes      | -        |

## How it works

1. Installs `yq` v4.53.3.
2. Reads `apm.yml`, migrates legacy `target:` to `targets:`, and resolves the target to use.
  If `inputs.target` is set, it overrides the file; otherwise the action uses the targets configured in `apm.yml`.
  Multiple targets are passed to APM as a comma-separated list, matching the CLI contract for `--target`.
3. Sets up APM via `microsoft/apm-action` (setup-only mode). By default the action uses the
   version selected by `microsoft/apm-action`; set `apm-version` only when the repository
   requires a specific compatible CLI version.
4. Optionally prints runner diagnostics, `apm targets`, and dry-run update output when `debug: true`.
5. Runs `apm update --yes --target <target>` using the resolved target.
6. If `dry-run: true`, skips pull request creation after printing the update result.
7. Otherwise creates or updates a PR on branch `chore/update-apm-packages` (base: `inputs.branch`).
  The PR title includes the resolved target, and the body includes the executed command,
  base branch, workflow run link, and a short review checklist. Commit sign-off, requested
  reviewers/team reviewers, and post-merge branch deletion are controlled by the `sign-off`,
  `reviewers`, `team-reviewers`, and `delete-branch` inputs respectively.
8. If `auto-merge: true` and a pull request was created (skipped in `dry-run` mode or when no
  PR was opened), enables GitHub auto-merge on the PR using `merge-method`. The step fails if
  `merge-method` is not `merge`, `squash`, or `rebase`.
9. Logs the PR URL to the job summary, or reports "no changes" if nothing was updated.

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
      pull-requests: write
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
          apm-version: ""
          token: ${{ secrets.APM_UPDATE_TOKEN }}  # PAT with `repo` scope (+ `read:org` for team-reviewers)
```

## Notes

- The caller workflow must check out the repository before invoking this action.
- `apm.yml` must exist at the repository root. The action fails with exit code 1 if it is not found.
- If `target` is omitted, the action uses the targets from `apm.yml`. Multiple configured targets are passed to APM as a comma-separated `--target` value.
- If `apm-version` is omitted, `microsoft/apm-action` selects the APM CLI version. Set it to a
  compatible version only when a repository must pin the CLI, for example while migrating a
  lockfile format.
- `debug: true` prints runner state, active harness markers, `apm targets`, and two dry-run plans: one without an explicit target and one with `--target`.
- `dry-run: true` skips pull request creation entirely and is intended for diagnostics or validation workflows.
- The PR branch is always `chore/update-apm-packages`. If a branch with that name already exists,
  `peter-evans/create-pull-request` updates the existing PR rather than opening a new one.
- The generated PR title is `chore(apm): update packages for <resolved-target>` and the body
  includes the resolved target, base branch, actor, and a link back to the originating workflow run.
- `auto-merge: true` only takes effect when a pull request was actually created (not in
  `dry-run` mode) and requires the "Allow auto-merge" repository setting to be enabled;
  merging itself still waits on required checks and reviews.
- `merge-method` accepts `merge`, `squash`, or `rebase` (case-insensitive). Any other value
  fails the "Enable auto-merge" step.
- The `token` input must have permission to push branches and open pull requests. Using
  `team-reviewers` additionally requires the token to read organization membership.
  The org-level secret `APM_UPDATE_TOKEN` is the recommended value.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@cabbb90e9471163cfac84bd50ff0296b2803b44c # v2.3.0`. The SHA is the immutable pin;
  the comment shows which release it points to. Tags alone are mutable.
  Never use `@main` or short SHAs.
