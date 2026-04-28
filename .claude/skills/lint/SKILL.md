---
name: lint
description: Run markdown and zizmor audits on changed files, fix all violations, and commit the fixes
arguments: [base-branch]
---

# lint

Audit all changed files on the current branch for markdownlint and zizmor violations,
fix them in-place, and commit the fixes. Run this at any time to clean up the branch
before a PR or after making changes.

## Arguments

- `$base-branch` — branch to compare against. Default: `main`.

## Step-by-step instructions

### 1. Resolve base branch

- If argument provided → `BASE` = argument
- Otherwise → `BASE` = `main`

### 2. Collect changed files

Run in parallel:

```bash
git rev-parse --abbrev-ref HEAD
```

→ `CURRENT_BRANCH`

```bash
git diff $BASE..HEAD --name-only
```

→ `CHANGED_FILES`

If `CHANGED_FILES` is empty — inform the user that there are no changed files compared
to `$BASE` and stop.

### 3. Markdown audit

If any `.md` files are in `CHANGED_FILES`:

Apply the full audit logic from `.claude/skills/md-lint/SKILL.md` to those files.
Fix all violations in-place, then stage the fixes:

```bash
git add <fixed-md-files>
```

If no `.md` files in `CHANGED_FILES` — skip this step silently.

### 4. Zizmor audit

If any `.github/workflows/*.yml`, `.github/workflows/*.yaml`, or
`actions/*/action.yml`, `actions/*/action.yaml` files are in `CHANGED_FILES`:

Apply the full audit logic from `.claude/skills/zizmor/SKILL.md` to those files.
Fix all violations in-place, then stage the fixes:

```bash
git add <fixed-yml-files>
```

If no workflow or action yml files in `CHANGED_FILES` — skip this step silently.

### 5. Commit fixes

If any files were fixed and staged in steps 3 or 4:

```bash
git commit -m "fix(lint): fix markdown and security violations" && git push
```

If nothing was fixed — do not create an empty commit.

### 6. Report to user

Print a summary:

- Branch compared against (`BASE`)
- Files audited (markdown / yml — count each)
- Violations found and fixed per rule
- Files committed and pushed (or "nothing to fix — all clean")
