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
- **Workspace-scoped:** every `from`/`to` is resolved against `GITHUB_WORKSPACE` and rejected
  if it would resolve outside of it (e.g. via `../`).
- **Symlink-safe:** rejects a source that is a symlink, a source directory that contains a
  symlink, a source whose parent path contains a symlink, a destination that is a symlink, and
  a destination whose parent path contains a symlink — all with a clear error instead of
  silently following or overwriting them.
- Opens a pull request only when files actually changed; a run that produces no changes is a
  no-op — no empty PR is created.
- Pull request creation is controlled by `create-pr` (default `true`) — set it to `false` to
  only copy files, without touching branches or opening a PR.
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
| `pr-branch` | Branch to create/update with the synced files. | No | `chore/sync-files` |
| `title` | Pull request title. | No | `chore: sync files` |
| `commit-message` | Commit message for the synced files. | No | `chore: sync files` |
| `create-pr` | Open a pull request with the synced changes. Set to `false` to only copy files. | No | `true` |
| `auto-merge` | Automatically enable auto-merge for the created pull request. Has no effect when `create-pr` is `false`, when no files changed, or when no pull request was created. | No | `false` |
| `merge-method` | Merge method to use for auto-merge; one of `merge`, `squash`, or `rebase` (case-insensitive). Ignored unless `auto-merge` is `true`. | No | `squash` |
| `delete-branch` | Automatically delete `pr-branch` after it is merged. | No | `true` |
| `sign-off` | Sign off commits in the pull request. | No | `false` |
| `reviewers` | Comma-separated list of GitHub usernames to request review from. | No | `""` |
| `team-reviewers` | Comma-separated list of GitHub team slugs to request review from. | No | `""` |
| `token` | GitHub token with permission to create branches and pull requests. Required when `create-pr` is `true`; not needed when `create-pr` is `false`. | No | `""` |

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

1. Validates that `files` is a non-empty JSON array of objects with non-empty string `from`/`to`
   and an optional boolean `overwrite`.
2. For each mapping, resolves `from` and `to` against `GITHUB_WORKSPACE`, rejecting paths that
   are absolute or that escape the workspace (e.g. via `../`).
3. Rejects a source that is a symlink, a source directory that contains a symlink, a source
  whose parent path contains a symlink, a destination that is a symlink, and a destination
  whose parent path contains a symlink.
4. Copies the file, or recursively copies every file in the directory — a destination file with
   identical content is skipped, and `overwrite: false` leaves an existing destination file
   untouched. Copying a file onto an existing directory (or a directory onto an existing file)
   fails with a clear error.
5. If `create-pr: false`, stops here — no branch, commit, or pull request is created.
6. If nothing changed, stops here as well — no empty pull request is opened.
7. Otherwise opens or updates a pull request on `pr-branch` (base: `branch`) via
   [`peter-evans/create-pull-request`](https://github.com/peter-evans/create-pull-request),
   with a body listing the changed/skipped counts and a link to the triggering workflow run.
   Commit sign-off, requested reviewers/team reviewers, and post-merge branch deletion are
   controlled by `sign-off`, `reviewers`, `team-reviewers`, and `delete-branch` respectively.
8. If `auto-merge: true` and a pull request was created, enables GitHub auto-merge on it using
   `merge-method`. The step fails if `merge-method` is not `merge`, `squash`, or `rebase`.
9. Logs the PR URL to the job summary, or reports "no changes" if nothing was synced.

---

## Permissions

```yaml
permissions:
  contents: write
  pull-requests: write
```

Only needed when `create-pr: true` (the default). With `create-pr: false`, the action only
writes to the local filesystem of the runner and needs no `token`/permissions beyond what
`actions/checkout` requires:

```yaml
permissions:
  contents: read
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

Copy-only, no PR (no `token`/write permissions needed):

```yaml
      - name: Copy files
        uses: netcracker/qubership-workflow-hub/actions/sync-files-action@<sha> # v1.0.0
        with:
          files: |
            [
              { "from": "custom_doc/troubleshooting.md", "to": "out/troubleshooting.md" }
            ]
          create-pr: "false"
```

---

## Notes

- Paths in `files` are relative to the repository root as checked out by `actions/checkout`;
  the caller is responsible for checking out the repository before this action runs.
- Copying a directory does not delete files that already exist at the destination but are no
  longer present in the source — this action only adds/replaces, never deletes.
- `pr-branch` is reused across runs — a second run before the first PR merges updates the same
  branch/PR instead of opening a new one.
- `token` needs permission to push a branch and open a pull request in the target repository;
  a fine-grained PAT is required if branch protection rules should trigger required-check runs
  on the resulting PR (the default `GITHUB_TOKEN` does not trigger other workflows).

---

## Troubleshooting

- **`Input 'token' is required when create-pr is true`** — `token` was left empty (or omitted)
  while `create-pr` is `true` (the default). Either pass a `token`, or set `create-pr: "false"`
  for copy-only runs.
- **`Input 'files' must be a non-empty JSON array`** — `files` is not valid JSON, its root is
  not an array, or the array is empty. Wrap a single mapping in `[ ... ]`.
- **`Each mapping must be an object with non-empty string fields 'from' and 'to' ...`** — a
  mapping is missing `from`/`to`, one of them is empty, or `overwrite` is not a boolean.
- **`Path must be relative to repository root`** — `from`/`to` starts with `/`. Use a path
  relative to the repository root instead.
- **`Path escapes workspace`** — the resolved path falls outside `GITHUB_WORKSPACE`, most often
  from a `../` that walks past the repository root.
- **`Source path does not exist`** — the `from` path is not present in the checked-out
  repository. Check the path and that `actions/checkout` ran first.
- **`Source path contains a symlink`** / **`Source symlink is not supported`** /
  **`Directory source contains symlink(s), not supported`** — `from`, one of its existing parent
  directories, or a file inside a source directory is a symlink. Replace it with a real file, or
  exclude it from the mapping.
- **`Destination path contains a symlink`** — `to`, or one of its existing parent directories,
  is a symlink. This is rejected unconditionally, since writing through it could reach outside
  the intended destination.
- **`Cannot sync file to directory`** / **`Cannot sync directory to file`** — `from` and the
  existing `to` are of different types. Fix the mapping or remove the conflicting destination
  path first.
- **`jq is required but was not found in PATH`** / **`gh CLI is required to enable auto-merge
  but was not found in PATH`** — the runner image is missing a required CLI tool; both are
  preinstalled on `ubuntu-latest` GitHub-hosted runners.
- **`Unsupported merge method`** — `merge-method` was set to something other than `merge`,
  `squash`, or `rebase`.
- **No pull request appears** — check `changed` in the job summary/logs; if no files actually
  differed from the destination, the action intentionally skips PR creation.
