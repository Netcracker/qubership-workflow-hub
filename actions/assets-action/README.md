# 🚀 Upload Assets to Release

Upload files and folders from the workspace to a GitHub release. Directories are automatically archived before upload; individual files are uploaded as-is. Supports glob patterns, configurable archive format, compression level, and exponential-backoff retries.

---

## Features

- Accepts one or more comma-separated file/directory paths or glob patterns via `item-path`.
- Automatically archives directories using the configured archive type (`zip`, `tar`, `tar.gz`).
- Uploads individual files directly without archiving.
- Uploads all assets to a GitHub release identified by `tag` using the `gh` CLI with `--clobber` (overwrites existing assets of the same name).
- Retries failed uploads with configurable delay and exponential backoff factor.
- Writes a Job Summary table showing upload status (`Uploaded`, `Failed`, `NotFound`) for every processed item.

---

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `tag` | Git tag of the release to upload assets to. | Yes | — |
| `item-path` | Comma-separated list of file/folder paths or glob patterns to upload. Directories are archived; files are uploaded directly. | Yes | — |
| `archive-type` | Archive format used when packaging a directory. Supported values: `zip`, `tar`, `tar.gz`. | No | `zip` |
| `compression-level` | Compression level for the archive (0 = no compression, 9 = maximum). | No | `9` |
| `retries` | Number of upload retry attempts on failure. | No | `3` |
| `retry-delay-ms` | Initial delay between retry attempts in milliseconds. | No | `1000` |
| `factor` | Exponential backoff multiplier applied to the delay after each retry. `1` keeps the delay constant. | No | `1` |

---

## 📌 Outputs

This action does not produce any step outputs. Upload results are written to the GitHub Actions Job Summary.

---

## How it works

1. Reads all inputs: `tag`, `item-path`, `archive-type`, `compression-level`, `retries`, `retry-delay-ms`, `factor`.
2. Splits `item-path` on commas and expands each entry using `@actions/glob`. Directories and matching files are collected into a de-duplicated set.
3. Fails immediately if no files or directories match the provided patterns.
4. For each matched item:
   - If it is a **directory**, creates an archive (using the `archiver` library) named `<dir-name>.<archive-type>` beside the directory.
   - If it is a **file**, uses the file path directly.
5. Calls `gh release upload <tag> <asset> --repo <owner>/<repo> --clobber` to upload the asset. The `--clobber` flag replaces any existing release asset with the same name.
6. On upload failure, retries up to `retries` times with `retry-delay-ms` initial delay, multiplied by `factor` after each attempt.
7. After all items are processed, writes a Markdown table to the GitHub Actions Job Summary showing each item's path, asset file name, and upload status.

---

## Additional Information

### Glob patterns in `item-path`

`item-path` is split on commas and each part is passed to `@actions/glob`. You can mix exact paths with glob patterns:

```
item-path: "dist/my-app, artifacts/**/*.jar"
```

When a glob resolves to a directory, the directory is treated as a whole and archived.

### Archive naming

When a directory is archived, the output file is placed in the **same parent directory** as the source folder and named `<folder-name>.<archive-type>`. For example, archiving `dist/my-app` with `archive-type: zip` produces `dist/my-app.zip`.

### Retry backoff

With the default `factor: 1` the delay stays constant at `retry-delay-ms` between each retry. Setting `factor: 2` doubles the delay after every failed attempt (e.g. 1 s → 2 s → 4 s for three attempts).

---

## Usage

```yaml
name: Upload Release Assets

on:
  release:
    types: [created]

jobs:
  upload-assets:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Upload Assets to Release
        uses: netcracker/qubership-workflow-hub/actions/assets-action@v2.2.0
        with:
          tag: ${{ github.ref_name }}
          item-path: "dist/my-app, reports"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Upload with custom archive format and retries

```yaml
name: Upload Release Assets

on:
  workflow_dispatch:
    inputs:
      tag:
        required: true

jobs:
  upload-assets:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Upload Assets to Release
        uses: netcracker/qubership-workflow-hub/actions/assets-action@v2.2.0
        with:
          tag: ${{ inputs.tag }}
          item-path: "build/output, docs/api"
          archive-type: tar.gz
          compression-level: "6"
          retries: "5"
          retry-delay-ms: "2000"
          factor: "2"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Notes

- Always pin to `@v2.2.0` or a specific SHA — never `@main` in production.
- The job must have `permissions: contents: write` — without it `gh release upload` will fail with a 403 error.
- If a release asset with the same name already exists, `--clobber` overwrites it silently.
- Files that do not exist at runtime are logged as `NotFound` and skipped rather than failing the entire action.
