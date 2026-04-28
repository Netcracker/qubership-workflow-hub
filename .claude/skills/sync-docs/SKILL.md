---
name: sync-docs
description: Scan the last N commits and update documentation for all changed actions and reusable workflows
arguments: [commits]
---

# update-docs

Scan the last N commits, find all changed actions and reusable workflows, and update their documentation.

## Arguments

- `$commits` — number of past commits to scan. Default: `1`.

## Step-by-step instructions

### 1. Parse arguments

- `N` = `$commits` if provided, otherwise `1`

### 2. Get changed files

Run:

```bash
git diff --name-only HEAD~N..HEAD
```

### 3. Filter relevant files

From the changed files list, keep only:

- `actions/*/action.yml`, `actions/*/action.yaml` — action definition changed
- `actions/*/src/**` — Node.js action logic changed
- `actions/*/*.py` — Python script changed
- `actions/*/action.yml`, `actions/*/action.yaml` steps — composite action logic changed
- `.github/workflows/re-*.yml`, `.github/workflows/re-*.yaml` — reusable workflow changed

### 4. Extract targets

From the filtered list, extract unique targets:

- For `actions/<name>/...` → target = `<name>`
- For `.github/workflows/re-<name>.yml` or `.github/workflows/re-<name>.yaml` → target = `reusable/<name>`

### 5. Process each target

For each unique target, apply the full `doc-update` logic:

- Resolve paths
- Read `action.yml` / workflow yml
- Read current doc (if exists)
- Decide create or update
- Update auto-managed sections
- Sync catalog

Use `N` as the commits depth for the diff in each target's processing.

### 6. Report to user

After processing all targets, print a summary:

- List of targets processed
- For each: what was created or updated
- Whether the catalog was updated
- If no relevant files changed — inform the user and stop
