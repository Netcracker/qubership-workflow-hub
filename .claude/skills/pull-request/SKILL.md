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

### 2.5. Pre-flight audit

Before generating the PR, run proactive checks on the changed files to catch issues
before CI does. This avoids the create → fail → fix → retry cycle.

**Markdown audit** — if any `.md` files are in `CHANGED_FILES`:

Apply the full audit logic from `.claude/skills/markdown/SKILL.md` to those files.
Fix all violations in-place, then stage the fixes:

```bash
git add <fixed-md-files>
```

**Zizmor audit** — if any `.github/workflows/*.yml`, `.github/workflows/*.yaml`, or
`actions/*/action.yml` files are in `CHANGED_FILES`:

Apply the full audit logic from `.claude/skills/zizmor/SKILL.md` to those files.
Fix all violations in-place, then stage the fixes:

```bash
git add <fixed-yml-files>
```

**If any files were fixed:** commit all staged fixes before proceeding:

```bash
git commit -m "fix(lint): pre-flight markdown and security fixes" && git push
```

If no files of either type are in `CHANGED_FILES` — skip this step silently.

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

### 10. Markdown authoring rules

All `.md` files written or fixed by this skill must comply with the project markdownlint
ruleset. Full rule definitions are in `.claude/skills/markdown/SKILL.md`.

Key rules to keep in mind:

- Blank line before and after every heading, fenced block, and list (MD022, MD031, MD032)
- Every fenced block must have a language identifier — use `text` for plain content (MD040)
- Fenced blocks only — no 4-space indented blocks, no tilde fences (MD046, MD048)
- All ordered list items use `1.` — never `2.`, `3.`, etc. (MD029)
- No spaces inside backtick code spans (MD038)
- Table rows must have the same column count as the header (MD056)
- Lines ≤ 120 characters — code blocks and tables are exempt (MD013)
- No HTML tags except `<img>`, `<br>`, `<a>`, `<p>` (MD033)

### 11. Report to user

Print a short summary:

- PR title used
- PR URL
- Whether it was created or updated
- Any sections left blank and why
