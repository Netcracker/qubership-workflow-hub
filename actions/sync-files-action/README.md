# 🚀 Sync Files Action

Copies files and directories inside the checked-out workspace according to a JSON list of
`from`/`to` mappings, then opens a pull request with the resulting changes.

---

## Features

- Copies a **file** or a **directory** (recursively) per mapping — the type is auto-detected,
  no separate flag needed.
- **`overwrite`** (per mapping, default `true`) controls what happens when the destination
  already exists:
  - `true` — matching files are replaced; files that already have identical content are
    skipped (not re-written, not counted as changed).
  - `false` — existing destination files are left untouched; only new files are added.
- Opens a pull request only when files actually changed; a run that produces no changes is a
  no-op — no empty PR is created.
- Supports a `dry-run` mode that copies files but skips pull request creation, for validating a
  mapping without touching the repository.
- Supports commit sign-off, requesting user/team reviewers, and a configurable branch-deletion
  policy on the created pull request.
- Optionally enables GitHub auto-merge on the created pull request with a configurable merge
  method (`merge`, `squash`, or `rebase`).
- Reports the PR URL, or "no changes", to the workflow job summary.

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `files` | JSON array of `{ "from": string, "to": string, "overwrite"?: boolean }` mappings, paths relative to the repository root. | Yes | - |
| `branch` | Base branch for the pull request (must match the checked-out ref). | No | `main` |
| `title` | Pull request title. | No | `chore: sync files` |
| `commit-message` | Commit message for the synced files. | No | `chore: sync files` |
| `dry-run` | Copy files but skip pull request creation. | No | `false` |
| `auto-merge` | Automatically enable auto-merge for the created pull request. Has no effect in `dry-run` mode, when no files changed, or when no pull request was created. | No | `false` |
| `merge-method` | Merge method to use for auto-merge; one of `merge`, `squash`, or `rebase` (case-insensitive). Ignored unless `auto-merge` is `true`. | No | `squash` |
| `delete-branch` | Automatically delete the pull request branch (`chore/sync-files`) after it is merged. | No | `true` |
| `sign-off` | Sign off commits in the pull request. | No | `false` |
| `reviewers` | Comma-separated list of GitHub usernames to request review from. | No | `""` |
| `team-reviewers` | Comma-separated list of GitHub team slugs to request review from. | No | `""` |
| `token` | GitHub token with permission to create branches and pull requests. | Yes | - |

### `files` format

```json
[
  { "from": "docs/troubleshooting.md", "to": "agent-package/references/troubleshooting.md" },
  { "from": "docs/examples", "to": "agent-package/references/examples", "overwrite": false }
]
```

- `from` — required, non-empty string. Must exist in the checked-out workspace.
- `to` — required, non-empty string.
- `overwrite` — optional boolean, defaults to `true`.

---

## 📌 Outputs

| Name | Description |
| ---- | ----------- |
| `changed` | Whether any file was actually written (`'true'`/`'false'`). |
| `changed-count` | Number of files actually written (new, or with different content). |
| `skipped-count` | Number of files skipped — either because `overwrite: false` and the destination already existed, or because the destination already had identical content. |
| `pull-request-number` | Number of the created/updated pull request, if any. |
| `pull-request-url` | URL of the created/updated pull request, if any. |

In an `if:` condition, compare explicitly (`steps.<id>.outputs.changed == 'true'`) — GitHub
Actions treats any non-empty string, including `"false"`, as truthy.

---

## How it works

1. Parses the `files` mapping with `jq` and, for each entry, copies the file or walks the
   directory and copies every file inside it — a destination file with identical content is
   skipped, and `overwrite: false` leaves an existing destination file untouched.
2. If `dry-run: true`, stops here — no branch, commit, or pull request is created.
3. If nothing changed, stops here as well — no empty pull request is opened.
4. Otherwise opens or updates a pull request on `chore/sync-files` (base: `branch`) via
   [`peter-evans/create-pull-request`](https://github.com/peter-evans/create-pull-request),
   with a body listing the changed/skipped counts and a link to the triggering workflow run.
   Commit sign-off, requested reviewers/team reviewers, and post-merge branch deletion are
   controlled by `sign-off`, `reviewers`, `team-reviewers`, and `delete-branch` respectively.
5. If `auto-merge: true` and a pull request was created, enables GitHub auto-merge on it using
   `merge-method`. The step fails if `merge-method` is not `merge`, `squash`, or `rebase`.
6. Logs the PR URL to the job summary, or reports "no changes" if nothing was synced.

---

## Permissions

```yaml
permissions:
  contents: write
  pull-requests: write
```

---

## Usage

```yaml
name: Sync documentation into APM skill

on:
  push:
    branches: [main]
    paths:
      - "custom_doc/troubleshooting.md"

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false

      - name: Sync documentation into skill
        uses: netcracker/qubership-workflow-hub/actions/sync-files-action@<sha> # v1.0.0
        with:
          files: |
            [
              { "from": "custom_doc/troubleshooting.md", "to": "agent-packages/troubleshoot-my-component/.apm/skills/troubleshoot-my-component/references/troubleshooting.md" }
            ]
          auto-merge: "true"
          token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Notes

- Paths in `files` are relative to the repository root as checked out by `actions/checkout`;
  the caller is responsible for checking out the repository before this action runs.
- Copying a directory does not delete files that already exist at the destination but are no
  longer present in the source — this action only adds/replaces, never deletes.
- The PR branch (`chore/sync-files`) is reused across runs — a second run before the first PR
  merges updates the same branch/PR instead of opening a new one.
- `token` needs permission to push a branch and open a pull request in the target repository;
  a fine-grained PAT is required if branch protection rules should trigger required-check runs
  on the resulting PR (the default `GITHUB_TOKEN` does not trigger other workflows).

---

## Troubleshooting

- **`Source path does not exist`** — the `from` path is not present in the checked-out
  repository. Check the path and that `actions/checkout` ran first.
- **`Input 'files' must contain at least one mapping`** — `files` parsed to an empty array.
- **`Cannot sync file to directory`** — `to` already exists as a directory where a file was
  expected. Fix the mapping or remove the conflicting destination path first.
- **`Unsupported merge method`** — `merge-method` was set to something other than `merge`,
  `squash`, or `rebase`.
- **No pull request appears** — check `changed` in the job summary/logs; if no files actually
  differed from the destination, the action intentionally skips PR creation.
