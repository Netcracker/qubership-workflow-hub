---
name: zizmor
description: Audit GitHub Actions workflow and action.yml files for security issues using zizmor rules, then fix violations
arguments: [files]
---

# zizmor

Audit GitHub Actions workflow files and `action.yml` files for security vulnerabilities
using the zizmor ruleset, then fix all violations directly.

## Arguments

- `$files` — space-separated list of files to audit. If omitted, audit all changed files
  in the current branch that are workflow or action yml files.

## Configuration

Active config: `netcracker/.github` → `config/linters/zizmor.yaml`

```yaml
rules:
  dangerous-triggers:
    ignore:
      - cla.yaml
      - pr-assigner.yml
```

Pedantic rules are **not** enabled — skip: `anonymous-definition`, `self-hosted-runner`,
`stale-action-refs`, `undocumented-permissions`.

## Step-by-step instructions

### 1. Resolve target files

If `$files` is provided → use that list.

Otherwise run:

```bash
git diff main..HEAD --name-only | grep -E '\.(yml|yaml)$' | grep -E '(\.github/workflows/|actions/[^/]+/action\.yml)'
```

If no yml files changed — report "No workflow or action files changed" and stop.

### 2. Read each file

Read the full content of every target file. For each file, run all checks in step 3.

### 3. Audit rules

For each file, check every rule below in order. Collect all violations before fixing.

#### Rule: dangerous-triggers

**What it detects:** `pull_request_target` or `workflow_run` triggers combined with steps
that check out untrusted code or run it in the privileged context.

**Skip if:** the filename matches the ignore list in config (`cla.yaml`, `pr-assigner.yml`).

**Flag if** the workflow uses `pull_request_target` or `workflow_run` AND any step does one of:

- `actions/checkout` without `ref:` pinned to a safe ref (e.g. `github.sha`)
- runs arbitrary shell commands using `github.event.pull_request.*` or `github.event.workflow_run.*` inputs

**Fix:** Add `persist-credentials: false` to checkout steps; pin `ref:` to `github.sha` or
a trusted ref; move untrusted input handling to a separate unprivileged workflow.

#### Rule: template-injection

**What it detects:** User-controlled `github.event.*` expressions interpolated directly
into `run:` scripts or `actions/github-script` code.

**Dangerous sources** (attacker-controlled):

- `github.event.pull_request.title`
- `github.event.pull_request.body`
- `github.event.pull_request.head.ref`
- `github.event.pull_request.head.label`
- `github.event.issue.title`
- `github.event.issue.body`
- `github.event.comment.body`
- `github.event.review.body`
- `github.event.discussion.title`
- `github.event.discussion.body`
- `github.head_ref`

**Flag if** any of these appear inside `${{ ... }}` within a `run:` block or
`actions/github-script` `script:` input.

**Fix:** Pass the value through an environment variable instead:

```yaml
env:
  TITLE: ${{ github.event.pull_request.title }}
run: |
  echo "$TITLE"
```

#### Rule: excessive-permissions

**What it detects:** Overly broad `permissions:` at the workflow level or job level.

**Flag if:**

- `permissions: write-all` anywhere
- `contents: write` at the workflow (top) level instead of the specific job level
- Any permission set to `write` that the job does not actually need

**Fix:** Move permissions to job level; use the minimum required scope; add
`permissions: {}` at workflow level and grant only what each job needs.

#### Rule: artipacked

**What it detects:** `actions/checkout` that persists Git credentials into uploaded artifacts.

**Flag if:** `actions/checkout` is used without `persist-credentials: false` in a job that
also uploads artifacts (`actions/upload-artifact`).

**Fix:**

```yaml
- uses: actions/checkout@v4
  with:
    persist-credentials: false
```

#### Rule: secrets-inherit

**What it detects:** Reusable workflow calls that pass `secrets: inherit` instead of
explicitly forwarding only the secrets they need.

**Flag if:** a `uses:` job contains `secrets: inherit`.

**Fix:** Replace `secrets: inherit` with an explicit list of required secrets:

```yaml
secrets:
  MY_SECRET: ${{ secrets.MY_SECRET }}
```

#### Rule: overprovisioned-secrets

**What it detects:** Passing the entire `secrets` context object to a reusable workflow
or action instead of individual named secrets.

**Flag if:** `secrets: ${{ secrets }}` or similar whole-context passing appears.

**Fix:** Pass only the specific secrets the callee needs.

#### Rule: github-env

**What it detects:** Unsafe writes to `GITHUB_ENV` or `GITHUB_PATH` in privileged
trigger contexts (`pull_request_target`, `workflow_run`) using untrusted input.

**Flag if:** a step writes to `$GITHUB_ENV` or `$GITHUB_PATH` using values derived
from `github.event.*` in a privileged trigger context.

**Fix:** Sanitise input before writing; prefer `GITHUB_OUTPUT` for passing values
between steps; never write raw event data to `GITHUB_ENV`.

#### Rule: unpinned-uses (tag-only, not full SHA)

**What it detects:** `uses:` references pinned to a branch (`@main`, `@master`) instead
of a tag or SHA.

**Flag if:** `uses: owner/repo@main` or `uses: owner/repo@master` or any mutable branch ref.

**Do NOT flag:** `uses: owner/repo@v1.2.3` (tag pins are acceptable per project policy).
Full SHA pins are also acceptable.

**Fix:** Pin to a tag or SHA:

```yaml
uses: actions/checkout@v4
# or
uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v4
```

#### Rule: insecure-commands

**What it detects:** `ACTIONS_ALLOW_UNSECURE_COMMANDS=true` environment variable.

**Flag if:** any `env:` block sets `ACTIONS_ALLOW_UNSECURE_COMMANDS: true`.

**Fix:** Remove it. Use `$GITHUB_OUTPUT`, `$GITHUB_ENV`, `$GITHUB_STEP_SUMMARY` instead
of the old `::set-output` / `::add-path` commands.

#### Rule: hardcoded-container-credentials

**What it detects:** Docker registry credentials hardcoded in workflow files.

**Flag if:** any `registry-password:`, `password:`, or similar field contains a literal
string that looks like a credential (not a `${{ secrets.* }}` reference).

**Fix:** Move to encrypted secrets:

```yaml
password: ${{ secrets.REGISTRY_PASSWORD }}
```

### 4. Report violations

For each violation found, report:

- File path and line number
- Rule name
- What was found
- Recommended fix

### 5. Fix all violations

For each violation, apply the fix directly to the file using Edit. Do not ask the user —
apply judgment from the rule descriptions above. After fixing all files, report what was changed.

If a violation cannot be safely auto-fixed (e.g. requires understanding of business logic),
report it clearly and explain why it was skipped.

### 6. Report to user

Print a summary:

- Files audited
- Violations found per rule
- Violations fixed vs skipped (with reason)
- If no violations — confirm all files are clean
