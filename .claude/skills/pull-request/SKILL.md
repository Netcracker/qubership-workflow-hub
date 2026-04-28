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

### 3. Lint audit

Before generating the PR, apply the full lint skill logic from
`.claude/skills/lint/SKILL.md` using `BASE` as the base branch.

This audits all changed `.md` and workflow/action `.yml` files, fixes violations
in-place, and commits the fixes. If nothing needs fixing the step completes silently.

### 4. Determine scope

From `CHANGED_FILES`, identify the primary scope:

- If all changes are under `actions/<name>/` → scope = `actions/<name>`
- If all changes are under `.github/workflows/` → scope = `.github/workflows`
- If all changes are under `docs/` → scope = `docs`
- If all changes are under `packages/<name>/` → scope = `packages/<name>`
- If changes span multiple top-level areas → pick the most significant one (where most files changed), or use the most specific common ancestor path
- If only root-level config files changed → scope = repo root (omit scope from title)

### 5. Determine type

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

### 6. Detect issue references

Search commit messages for patterns:

- `Fixes #NNN`, `Closes #NNN`, `Related to #NNN`, `Resolves #NNN`
- If found → `ISSUE_REF` = the full reference (e.g. `Fixes #342`)
- If not found → `ISSUE_REF` = `<!-- No issue linked — add Fixes #NNN or explain why -->`

### 7. Detect breaking changes

A change is breaking if any of these are true:

- Commit message contains `BREAKING CHANGE` or `!` after type (e.g. `feat!:`)
- An existing required input is removed or renamed in `action.yml` / workflow yml
- An existing output is removed or renamed
- Behaviour that callers depend on changes incompatibly

Set `BREAKING` = `Yes` or `No` accordingly. If `Yes`, describe the impact.

### 8. Generate PR title

Compose: `<type>(<scope>): <imperative statement>`

Rules:

- Imperative mood: "add", "fix", "update", "remove" — not "added", "fixes", "updating"
- Summarise WHAT changed, not HOW
- Max 72 characters total
- No trailing period
- No issue number

Example: `docs(actions/chart-version): sync README with current action.yml inputs`

### 9. Generate PR body

Read `.github/pull_request_template.md` — this is the authoritative template. Use its exact section headings and structure as the skeleton for the body. Do not add, remove, or rename sections.

Fill each section as follows:

| Section | How to fill |
|---|---|
| `## Summary` | 2–3 technically rich sentences: what changed, why, and what the key result is. For a new action/feature: name the action, what it produces (outputs, artifacts, events), and the key output shape or behaviour. For a fix: name what was broken, what caused it, and how it is now fixed. Be specific — mention component names, inputs, or API behaviour where relevant. |
| `## Issue` | `ISSUE_REF` value. If no issue found: explain that no linked issue was detected and the change is self-contained (or ask the user to add one). Remove the placeholder hint text. |
| `## Breaking Change?` | Check the `- [ ] Yes` / `- [ ] No` checkbox that applies (replace `[ ]` with `[x]`). If Yes, add description below the checkboxes. Remove the placeholder hint text. |
| `## Scope / Project` | The `scope` value determined in step 3. Remove the placeholder hint text. |
| `## Implementation Notes` | A detailed bullet list of technical decisions, architectural choices, and non-obvious changes. Include: what was added/changed/removed and why; any design choices (e.g. why a specific tool or approach was used); any gotchas or edge cases handled. Do NOT summarise what is already obvious from the diff. Write as many bullets as needed — this section should help a reviewer understand the reasoning, not just the what. If the change is docs-only, write "Documentation update only — no behaviour change." |
| `## Tests / Evidence` | Specific evidence: test command and result (e.g. "All 42 unit tests pass (`npm test`)"), dry-run output, manual test steps with observed results. If no tests exist, explain why and what manual validation was done. Remove the placeholder hint text and bullet points that don't apply. |
| `## Additional Notes` | Known limitations, follow-up tasks, reviewer-specific instructions, or external dependencies. If none, write "None." — never leave the placeholder text. |

Do not leave any placeholder or instructional text from the template in the output — replace every hint with real content.

### 10. Execute

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

### 11. Markdown authoring rules

All `.md` files written or fixed by this skill must comply with the project markdownlint ruleset.
Apply the full audit logic from `.claude/skills/md-lint/SKILL.md` (step 3 — all rules) to any
`.md` file before writing it. Fix all violations in-memory before calling the Write tool.

### 12. Report to user

Print a short summary:

- PR title used
- PR URL
- Whether it was created or updated
- Any sections left blank and why
