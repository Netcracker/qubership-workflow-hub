---
name: pull-request
description: Generate a PR title and description following project conventions, then create or update the PR via gh CLI
arguments: [mode, base-branch]
---

# pull-request

Generate a pull request title and body following the project conventions, then create a new PR or update the existing one.

## Arguments

- `$mode` — `update` to update an existing open PR; omit to create a new PR.
- `$base-branch` — branch to compare against. Default: `main`.

## Conventions reference

PR title format (from `docs/code-of-conduct-prs.md`):

```text
<type>(scope): imperative statement
```

- Max 72 characters, no trailing period, no issue number in the title.
- Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `perf`, `ci`, `build`, `test`, `deprecate`, `revert`.
- Scope: path or component name, e.g. `actions/metadata-action`, `docs`, `.github/workflows`.

## Step-by-step instructions

### 1. Parse arguments

- If first argument is `update` → `MODE` = `update`; remaining argument (if any) = `BASE`
- Otherwise → `MODE` = `create`; first argument (if any) = `BASE`
- If `BASE` not provided → `BASE` = `main`

### 2. Collect branch information

Run these commands in parallel:

```bash
git rev-parse --abbrev-ref HEAD
```

→ `CURRENT_BRANCH`

```bash
git log $BASE..HEAD --oneline
```

→ `COMMITS` (list of commits on this branch)

```bash
git diff $BASE..HEAD --name-only
```

→ `CHANGED_FILES` (list of changed files)

```bash
git diff $BASE..HEAD
```

→ `FULL_DIFF` (full diff for content analysis)

If `COMMITS` is empty — inform the user that there are no commits ahead of `$BASE` and stop.

### 3. Determine scope

From `CHANGED_FILES`, identify the primary scope:

- If all changes are under `actions/<name>/` → scope = `actions/<name>`
- If all changes are under `.github/workflows/` → scope = `.github/workflows`
- If all changes are under `docs/` → scope = `docs`
- If all changes are under `packages/<name>/` → scope = `packages/<name>`
- If changes span multiple top-level areas → pick the most significant one (where most files changed), or use the most specific common ancestor path
- If only root-level config files changed → scope = repo root (omit scope from title)

### 4. Determine type

Analyse commit messages and `FULL_DIFF` to pick the single best type:

| Type | When to use |
|---|---|
| `feat` | New feature or capability added |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `refactor` | Code restructuring without behaviour change |
| `chore` | Maintenance, dependency updates, config |
| `perf` | Performance improvement |
| `ci` | Changes to CI/CD workflows or configuration |
| `build` | Build system changes |
| `test` | Adding or updating tests |
| `deprecate` | Marking something as deprecated |
| `revert` | Reverting a previous commit |

### 5. Detect issue references

Search commit messages for patterns:

- `Fixes #NNN`, `Closes #NNN`, `Related to #NNN`, `Resolves #NNN`
- If found → `ISSUE_REF` = the full reference (e.g. `Fixes #342`)
- If not found → `ISSUE_REF` = `<!-- No issue linked — add Fixes #NNN or explain why -->`

### 6. Detect breaking changes

A change is breaking if any of these are true:

- Commit message contains `BREAKING CHANGE` or `!` after type (e.g. `feat!:`)
- An existing required input is removed or renamed in `action.yml` / workflow yml
- An existing output is removed or renamed
- Behaviour that callers depend on changes incompatibly

Set `BREAKING` = `Yes` or `No` accordingly. If `Yes`, describe the impact.

### 7. Generate PR title

Compose: `<type>(<scope>): <imperative statement>`

Rules:

- Imperative mood: "add", "fix", "update", "remove" — not "added", "fixes", "updating"
- Summarise WHAT changed, not HOW
- Max 72 characters total
- No trailing period
- No issue number

Example: `docs(actions/chart-version): sync README with current action.yml inputs`

### 8. Generate PR body

Read `.github/pull_request_template.md` — this is the authoritative template. Use its exact section headings and structure as the skeleton for the body. Do not add, remove, or rename sections.

Fill each section as follows:

| Section | How to fill |
|---|---|
| `## Summary` | 1–3 sentences: what changed and why. Be specific — name the action/workflow/file. |
| `## Issue` | `ISSUE_REF` value. If no issue found: explain that no linked issue was detected and the change is self-contained (or ask the user to add one). Remove the placeholder hint text. |
| `## Breaking Change?` | Check the `- [ ] Yes` / `- [ ] No` checkbox that applies (replace `[ ]` with `[x]`). If Yes, add description below the checkboxes. Remove the placeholder hint text. |
| `## Scope / Project` | The `scope` value determined in step 3. Remove the placeholder hint text. |
| `## Implementation Notes` | Technical details, trade-offs, design decisions derived from the diff. If straightforward, write "No special implementation notes." — never leave the placeholder text. |
| `## Tests / Evidence` | How the change was verified: existing tests cover it, manual run, no tests needed (docs-only), etc. Remove the placeholder hint text and bullet points that don't apply. |
| `## Additional Notes` | Dependencies introduced, follow-up tasks, reviewer instructions. If none, write "None." — never leave the placeholder text. |

Do not leave any placeholder or instructional text from the template in the output — replace every hint with real content.

### 9. Execute

**If `MODE` = `create`:**

Check whether an open PR already exists for the current branch:

```bash
gh pr view --json number,url,state,isDraft 2>/dev/null
```

- If a PR exists AND `state` is `OPEN` (regardless of `isDraft`) → inform the user that an open PR already exists (show number and URL), and ask whether to update it or create a new one. Wait for the user's answer before proceeding.
- If a PR exists but `state` is `CLOSED` or `MERGED` → treat as no open PR, proceed to create.
- If no PR exists → create it:

```bash
gh pr create \
  --title "<TITLE>" \
  --body "<BODY>" \
  --base $BASE
```

After success, print the PR URL.

**If `MODE` = `update`:**

Get the current PR:

```bash
gh pr view --json number,url,title,state,isDraft
```

- If no PR found, or `state` is `CLOSED` or `MERGED` → inform the user and suggest running `/pull-request` (without `update`) instead. Stop.
- If found and `state` is `OPEN` (draft or not) → update title and body:

```bash
gh pr edit \
  --title "<TITLE>" \
  --body "<BODY>"
```

After success, print the PR URL and what changed.

### 10. Wait for checks and fix failures

After creating or updating the PR, wait for all checks to complete:

```bash
gh pr checks <number> --watch --interval 10
```

When checks finish, get the full list of results:

```bash
gh pr checks <number>
```

For each **failed** check:

1. Get the run ID from the check URL and read the error log:

```bash
gh run view <run-id> --log-failed
```

2. Analyse the errors. For each error: read the message, understand what is wrong, fix the affected file directly. Do not ask the user. Apply your own judgment — the error message always contains enough information to understand what needs to change.

3. After fixing all errors from all failed checks, stage and commit:

```bash
git add <files> && git commit -m "fix(lint): fix linter errors" && git push
```

4. Wait for checks again — repeat this step if any check still fails (max 3 iterations).

5. If after 3 iterations a check still fails → report to the user exactly which check failed, the error details, and why it could not be fixed automatically.

### 11. Report to user

Print a short summary:

- PR title used
- PR URL
- Whether it was created or updated
- Check results (all green / what was fixed)
- Any sections left blank and why
