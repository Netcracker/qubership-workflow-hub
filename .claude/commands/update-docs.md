# update-docs

Scan the last N commits, find all changed actions and reusable workflows, and update their documentation.

## Usage

```
/update-docs [commits]
```

## Arguments

- `commits` — number of past commits to scan. Default: `1`.

## Examples

```
/update-docs
/update-docs 5
/update-docs 10
```

## What this command does

Execute the update-docs skill logic defined in `.claude/skills/update-docs/SKILL.md` with the arguments: $ARGUMENTS

### Step 1 — Get changed files

Run:
```
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

For each target apply the full doc-updater skill logic from `.claude/skills/doc-updater/SKILL.md` using `N` as the commits depth.

### Step 5 — Report

Print a summary of everything that was created or updated.
