# 🚀 Copy Files Action

Copies files and directories inside the checked-out workspace according to a JSON list of
`from`/`to` mappings, with safe defaults for path traversal, symlinks, and unchanged content.

---

## Features

- Copies a **file** or a **directory** (recursively) per mapping — the type is auto-detected,
  no separate flag needed.
- **`overwrite`** (per mapping, default `true`) controls what happens when the destination
  already exists:
  - `true` — matching files are replaced; files that already have identical content are
    skipped (not re-written, not counted as changed).
  - `false` — existing destination files are left untouched; only new files are added.
    For a directory mapping, extra files already present at the destination are never
    removed either way — this action only adds/replaces, it never deletes.
- **Workspace-scoped:** every `from`/`to` is resolved against `GITHUB_WORKSPACE` and rejected
  if it would resolve outside of it (e.g. via `../`).
- **Symlink-safe:** rejects a source that is a symlink, a source directory that contains a
  symlink, a destination that is a symlink, and a destination whose parent path contains a
  symlink — all with a clear error instead of silently following or overwriting them.
- **Type-safety:** copying a file onto an existing directory (or a directory onto an existing
  file) fails with a clear error instead of a raw filesystem error.
- Reports `changed`/`changed-count`/`skipped-count` so a following step can decide whether
  there is anything to do (e.g. open a pull request only when something actually changed).

## What this action does **not** do

It only writes to the local filesystem of the runner. It does not create branches, commits,
or pull requests, and needs no GitHub token or API permissions — that is left to whatever step
runs after it (e.g. `peter-evans/create-pull-request`).

---

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `files` | JSON array of `{ "from": string, "to": string, "overwrite"?: boolean }` mappings. Paths are relative to the repository root. | Yes | - |

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

In an `if:` condition, compare explicitly (`steps.<id>.outputs.changed == 'true'`) — GitHub
Actions treats any non-empty string, including `"false"`, as truthy.

---

## How it works

1. Parses and validates the `files` input: must be a non-empty JSON array; every entry must be
   an object with non-empty string `from`/`to` and, if present, a boolean `overwrite`.
2. For each mapping, resolves `from` and `to` against `GITHUB_WORKSPACE` and fails if either
   would resolve outside of it.
3. Fails if `from` does not exist, or if `from` (or, for a directory, anything inside it) is a
   symlink.
4. Fails if any existing path component of `to` is a symlink, or if `to` already exists as the
   wrong type (a file where a directory is expected, or vice versa).
5. Copies the file, or recursively copies every file in the directory:
   - a destination file that already has identical content is skipped and counted separately
     from files that are genuinely new/changed;
   - with `overwrite: false`, an existing destination file is left untouched.
6. Logs each file copied/skipped and sets `changed`, `changed-count`, `skipped-count`.

---

## Permissions

This action performs no GitHub API calls, so it needs no permissions of its own beyond what
`actions/checkout` requires to check out the repository:

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
  contents: read

jobs:
  copy:
    runs-on: ubuntu-latest
    outputs:
      changed: ${{ steps.copy.outputs.changed }}
    steps:
      - name: Checkout
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Copy documentation into skill
        id: copy
        uses: netcracker/qubership-workflow-hub/actions/copy-files-action@<sha> # v1.0.0
        with:
          files: |
            [
              { "from": "custom_doc/troubleshooting.md", "to": "agent-packages/troubleshoot-my-component/.apm/skills/troubleshoot-my-component/references/troubleshooting.md" }
            ]
```

Opening a pull request when `changed == 'true'` (and, optionally, enabling auto-merge) is left
to the calling workflow or a dedicated orchestrator action — see
[docs/actions-workflows-catalog.md](../../docs/actions-workflows-catalog.md) for the current
building blocks available for that.

---

## Notes

- Paths in `files` are relative to the repository root as checked out by `actions/checkout`;
  the caller is responsible for checking out the repository before this action runs.
- Copying a directory does not delete files that already exist at the destination but are no
  longer present in the source — this action only adds/replaces, never deletes. Mirroring with
  deletion is intentionally out of scope for this version.
- An empty source directory still creates an empty destination directory on disk. Note that Git
  does not track empty directories, so this has no effect on a resulting diff/PR.
- `overwrite` is per-mapping, not global — different mappings in the same `files` array can use
  different values.

---

## Troubleshooting

- **`Input 'files' must be a valid JSON array` / `must be a JSON array`** — `files` is not
  valid JSON, or its root is not an array. Wrap a single mapping in `[ ... ]`.
- **`files[N].from must be a non-empty string` / `files[N].to must be a non-empty string`** —
  a mapping is missing `from`/`to`, or it is an empty string.
- **`files[N].overwrite must be a boolean`** — `overwrite` was set to something other than
  `true`/`false` (e.g. a string).
- **`'from' escapes the workspace` / `'to' escapes the workspace`** — the resolved path falls
  outside `GITHUB_WORKSPACE`, most often from a `../` that walks past the repository root.
- **`Source path does not exist`** — the `from` path is not present in the checked-out
  repository. Check the path and that `actions/checkout` ran first.
- **`Source symlinks are not supported`** — `from` (or a file inside a source directory) is a
  symlink. Replace it with a real file, or exclude it from the mapping.
- **`Destination symlinks are not supported` / `Destination path contains a symlink`** — `to`,
  or one of its existing parent directories, is a symlink. This is rejected unconditionally
  (regardless of `overwrite`) since writing through it could reach outside the intended
  destination.
- **`Cannot sync file to directory` / `Cannot sync directory to file`** — `from` and the
  existing `to` are of different types (e.g. `from` is a file but `to` already exists as a
  directory). Fix the mapping or remove the conflicting destination path first.
- **`Unsupported source type`** — `from` is neither a regular file nor a directory (e.g. a
  FIFO, socket, or device file), which this action does not copy.
