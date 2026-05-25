---
name: pull-request
description: Generate a PR title and description following project conventions, then create or update the PR via gh CLI
arguments: [mode, base-branch]
---

# pull-request

Generate a pull request title and body following project conventions.
Default flow: **preview first** — show title + body, wait for confirmation, then execute `gh`.

## Arguments

- `$mode` — `update` to update an existing open PR; omit to create a new PR.
- `$base-branch` — branch to compare against. Overrides auto-detected base (see step 2).

## Conventions reference

PR title format:

```text
<type>(<scope>): <imperative statement>
```

- Max 72 characters, no trailing period, no issue number in the title.
- Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `perf`, `ci`, `build`, `test`, `deprecate`, `revert`.
- Scope: path or component name, e.g. `actions/metadata-action`, `docs`, `.github/workflows`.

## Steps

### 1. Parse arguments

- If first argument is `update` → `MODE` = `update`; second argument (if any) = `BASE_ARG`
- Otherwise → `MODE` = `create`; first argument (if any) = `BASE_ARG`

### 2. Resolve BASE branch

Run in parallel:

```bash
git rev-parse --abbrev-ref HEAD
```

→ `CURRENT_BRANCH`

```bash
gh pr view --json baseRefName,number,url,state,isDraft 2>$null
```

→ `EXISTING_PR` (may be empty)

```bash
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
```

→ `DEFAULT_BRANCH`

Resolve `BASE` in priority order:

1. `$BASE_ARG` if provided
1. `EXISTING_PR.baseRefName` if an open PR exists
1. `DEFAULT_BRANCH` from `gh repo view`
1. `main` as final fallback if `gh repo view` fails — warn the user

If `CURRENT_BRANCH` == `BASE` — inform the user and stop.

### 3. Collect diff

```bash
git log BASE..HEAD --oneline
git diff BASE..HEAD --name-only
git diff BASE..HEAD
```

→ `COMMITS`, `CHANGED_FILES`, `FULL_DIFF`

If `COMMITS` is empty — inform the user there are no commits ahead of `BASE` and stop.

### 4. Lint audit (non-blocking)

Audit all changed files:

- `.md` files → apply `.claude/skills/markdown-rules/SKILL.md` rules, fix with Edit.
- `.yml`/`.yaml` workflow and action files → apply `.claude/skills/zizmor/SKILL.md` rules,
  fix with Edit.

Fix everything that is safe to auto-fix. For violations that cannot be safely auto-fixed —
collect them into `AUDIT_WARNINGS` and continue. Never block the preview or the PR flow.

### 5. Determine scope

From `CHANGED_FILES`:

- All under `actions/<name>/` → `SCOPE` = `actions/<name>`
- All under `.github/workflows/` → `SCOPE` = `.github/workflows`
- All under `docs/` → `SCOPE` = `docs`
- All under `packages/<name>/` → `SCOPE` = `packages/<name>`
- Mixed → most-changed area, or most specific common ancestor path
- Root-level config only → omit scope from title

### 6. Determine type

From commit messages and `FULL_DIFF`:

| Type | When |
| --- | --- |
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Restructuring without behaviour change |
| `chore` | Maintenance, deps, config |
| `perf` | Performance improvement |
| `ci` | CI/CD workflows or configuration |
| `build` | Build system |
| `test` | Adding or updating tests |
| `deprecate` | Marking something deprecated |
| `revert` | Reverting a previous commit |

### 7. Detect issue references and breaking changes

**Issue:** search commit messages for `Fixes #NNN`, `Closes #NNN`, `Resolves #NNN`,
`Related to #NNN`. If found → `ISSUE_REF` = full reference. If not → `ISSUE_REF` = none.

**Breaking:** flag if commit contains `BREAKING CHANGE` or `!` after type, or if required
inputs/outputs are removed or renamed in `action.yml` / workflow yml.

### 8. Generate title and body

**Title:** `<type>(<scope>): <imperative statement>`

- Imperative mood: "add", "fix", "update", "remove"
- Max 72 characters, no trailing period, no issue number

**Body:** read `.github/pull_request_template.md` as the skeleton. Fill each section:

| Section | How to fill |
| --- | --- |
| `## Summary` | 2–3 sentences: what changed, why, key result. Be specific — component names, inputs, behaviour. |
| `## Issue` | `ISSUE_REF` if found; otherwise "No linked issue." Remove placeholder text. |
| `## Breaking Change?` | Check `[x] Yes` or `[x] No`. If Yes — describe impact. Remove placeholder text. |
| `## Scope / Project` | `SCOPE` value from step 5. Remove placeholder text. |
| `## Implementation Notes` | Bullet list of technical decisions and non-obvious changes. For `docs`/`chore` PRs with small diffs: "Documentation update only — no behaviour change." |
| `## Tests / Evidence` | Test command + result, dry-run output, or manual validation steps. |
| `## Additional Notes` | Limitations, follow-ups, reviewer instructions. If none: "None." |

If `.github/pull_request_template.md` does not exist — generate body with these same
sections using standard markdown headings.

Do not leave any placeholder or instructional text from the template in the output.

### 9. Preview

Show the user:

```text
Title: <TITLE>

Body:
<BODY>
```

If `AUDIT_WARNINGS` is non-empty — show them as a warning block before the preview.

**Wait for user confirmation before proceeding.** Ask: "Create/update the PR with this
title and body?"

### 10. Execute

**If `MODE` = `create`:**

- If `EXISTING_PR` exists and `state` is `OPEN` → inform user (show number and URL), ask
  whether to update it or create a new one. Wait for answer.
- If no open PR → create:

```bash
gh pr create --title "<TITLE>" --body "<BODY>" --base BASE
```

**If `MODE` = `update`:**

- If no open PR found → inform user and suggest running without `update`. Stop.
- If open PR found → update:

```bash
gh pr edit --title "<TITLE>" --body "<BODY>"
```

After success, print the PR URL.

### 11. Fallback matrix

| Situation | Behaviour |
| --- | --- |
| `gh` not installed | Stop immediately. Inform user: install gh CLI and authenticate. |
| `gh repo view` fails (no remote) | Fall back to `main` as BASE. Warn user that BASE could not be auto-detected. |
| No `.github/pull_request_template.md` | Generate body with standard sections (see step 8). |
| No commits ahead of BASE | Stop. Inform user. |
| No issue reference found | Write "No linked issue." in `## Issue` — do not leave placeholder. |
| `EXISTING_PR` absent in `update` mode | Stop. Inform user. Suggest running without `update`. |
| `EXISTING_PR` present in `create` mode | Ask user: update existing PR or create a new one? Wait for answer. |
| Audit finds non-auto-fixable violations | Add to `AUDIT_WARNINGS` shown at preview. Never block the flow. |
