# sync-docs

Scan the last N commits, find all changed actions and reusable workflows, and update their documentation.

## Usage

```text
/sync-docs [commits]
```

## Arguments

- `commits` — number of past commits to scan. Default: `1`.

## Examples

```text
/sync-docs
/sync-docs 5
/sync-docs 10
```

## What this command does

Execute the sync-docs skill logic defined in `.claude/skills/sync-docs/SKILL.md` with the arguments: $ARGUMENTS

### Step 1 — Get changed files

Run:

```bash
git diff --name-only HEAD~N..HEAD
```

### Step 2 — Filter relevant files

Keep only:

- `actions/*/action.yml`
- `actions/*/src/**`
- `actions/*/*.py`
- `.github/workflows/re-*.yml`

### Step 3 — Extract unique targets

- `actions/<name>/...` → target = `<name>`
- `.github/workflows/re-<name>.yml` → target = `reusable/<name>`

### Step 4 — Process each target

For each target apply the full doc-update skill logic from `.claude/skills/doc-update/SKILL.md` using `N` as the commits depth.

### Step 5 — Report

Print a summary of everything that was created or updated.
