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
git diff main..HEAD --name-only | grep -E '\.(yml|yaml)$' | grep -E '(\.github/workflows/|actions/[^/]+/action\.(yml|yaml))'
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

**What it detects:** User-controlled expressions interpolated directly into `run:` scripts
or `actions/github-script` code.

**Dangerous sources** (attacker-controlled):

`github.event.*` fields:
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
- `github.event.workflow_run.head_branch`
- `github.event.workflow_run.head_commit.message`

`inputs.*` in `workflow_call` and `workflow_dispatch` — callers control these values
and they can contain arbitrary shell metacharacters:
- `${{ inputs.<any-string-input> }}` inside a `run:` block

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
- uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1
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

#### Rule: unpinned-uses (must be SHA-pinned)

**What it detects:** `uses:` references not pinned to an immutable SHA. Both branch refs
(`@main`, `@master`) and mutable tag refs (`@v4`, `@v1.2.3`) are flagged — tags can be
force-pushed and are not immutable.

**Flag if** `uses:` is anything other than a 40-character hex SHA:

- `uses: owner/repo@main` — branch ref
- `uses: owner/repo@master` — branch ref
- `uses: owner/repo@v4` — mutable tag
- `uses: owner/repo@v1.2.3` — mutable tag

**Do NOT flag:** `uses: owner/repo@<40-char-sha> # vX.Y.Z` — correct form.

**Fix:** Replace the tag with the SHA of the latest release. To find the correct SHA,
run the GitHub API for the latest release tag of that action:

```bash
gh api repos/<owner>/<repo>/git/ref/tags/<tag> --jq '.object.sha'
```

If the tag points to an annotated tag object (not a commit directly), dereference it:

```bash
gh api repos/<owner>/<repo>/git/tags/<object-sha> --jq '.object.sha'
```

**Then replace in the file:**

```yaml
# Before (mutable tag):
uses: actions/checkout@v4

# After (SHA-pinned with version comment):
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

**Known SHA pins used in this repo** (use these as reference, but always verify with
the API that they match the latest release tag before applying):

| Action | Latest SHA seen in repo | Tag |
|--------|------------------------|-----|
| `actions/checkout` | `8e8c483db84b4bee98b60c0593521ed34d9990e8` | v6.0.1 |
| `actions/cache` | `668228422ae6a00e4ad889ee87cd7109ec5666a7` | v5.0.4 |
| `actions/upload-artifact` | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` | v7.0.0 |
| `actions/download-artifact` | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | v8.0.1 |
| `actions/setup-node` | `53b83947a5a98c8d113130e565377fae1a50d02f` | v6.3.0 |
| `actions/setup-python` | `a309ff8b426b58ec0e2a45f0f869d46889d02405` | v6.2.0 |
| `actions/setup-go` | `4a3601121dd01d1626a1e23e37211e3254c1c06c` | v6.4.0 |

For any action **not** in the table above, always fetch the current SHA via the API
before applying the fix — never guess or reuse stale SHAs.

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

#### Rule: archived-uses

**What it detects:** `uses:` references pointing to archived GitHub repositories that are
no longer maintained.

**Flag if:** any `uses:` clause references a repository that is archived on GitHub.

**Fix:** Replace with an actively maintained alternative, or vendor the action locally.
Cannot be auto-fixed — report to user with repository URL to verify manually.

#### Rule: bot-conditions

**What it detects:** Conditions that check `github.actor` to detect bots — these can be
spoofed by creating an account with a bot-like username.

**Flag if:** any `if:` condition checks `github.actor == 'dependabot[bot]'` or similar
pattern using string comparison against `github.actor`.

**Fix:** Use `github.actor_id` instead of `github.actor` for bot detection, or use
`github.event.sender.type == 'Bot'`.

#### Rule: cache-poisoning

**What it detects:** Cache restore steps in release workflows where cache keys can be
influenced by untrusted input, allowing an attacker to poison the build cache.

**Flag if:** a release workflow (triggered by `push` to default branch, `release`, or
`workflow_dispatch`) uses `actions/cache` or similar with a cache key derived from
untrusted input (e.g. PR title, branch name from event).

**Fix:** Use only trusted, deterministic cache keys in release contexts (e.g. hash of
lock files). Never derive cache keys from user-controlled event inputs.

#### Rule: concurrency-limits

**What it detects:** Workflows without concurrency limits that could lead to race
conditions or resource exhaustion.

**Flag if:** a workflow triggered by `push` or `pull_request` does not define a
`concurrency:` block.

**Fix:** Add a concurrency group to cancel in-progress runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

#### Rule: github-app

**What it detects:** Dangerous usage of GitHub App installation tokens — e.g. tokens
generated and then passed to untrusted code or logged.

**Flag if:** a step generates a GitHub App token (via `actions/create-github-app-token`
or similar) and the token is then passed to a `run:` step using `${{ steps.*.outputs.token }}`
directly in shell interpolation rather than via an env var.

**Fix:** Always pass tokens through environment variables, never interpolate directly:

```yaml
env:
  APP_TOKEN: ${{ steps.generate-token.outputs.token }}
run: |
  gh api ... --header "Authorization: Bearer $APP_TOKEN"
```

#### Rule: impostor-commit

**What it detects:** `uses:` SHA pins that do not correspond to any commit in the
referenced repository — possible sign of a supply chain attack or typosquatting.

**Flag if:** a SHA-pinned `uses:` clause references a commit SHA that cannot be verified
in the upstream repository.

**Fix:** Cannot be auto-fixed — report to user. Verify the SHA matches a real commit in
the action's repository via `gh api repos/<owner>/<repo>/commits/<sha>`.

#### Rule: known-vulnerable-actions

**What it detects:** `uses:` references to action versions with known, publicly disclosed
vulnerabilities (CVEs or GitHub Security Advisories).

**Flag if:** any `uses:` clause references an action at a version known to be vulnerable.

**Fix:** Upgrade to a patched version. Cannot be auto-fixed without knowing the safe
version — report the action name and current version to the user.

#### Rule: misfeature

**What it detects:** Usage of GitHub Actions features considered problematic or unsafe:

- `actions/github-script` with untrusted input in `script:`
- `workflow_dispatch` inputs used unsafely
- `continue-on-error: true` in security-sensitive steps

**Flag if:** any of the above patterns appear.

**Fix:** Remove or restrict the problematic feature usage. Apply judgment based on context.

#### Rule: obfuscation

**What it detects:** Obfuscated content in workflow files — base64-encoded payloads in
`run:` blocks, eval of encoded strings, or unusual Unicode in identifiers.

**Flag if:** a `run:` step contains `base64 -d`, `eval`, or piped decode patterns that
obscure what code is being executed.

**Fix:** Cannot be auto-fixed — report to user. Obfuscated steps must be reviewed manually.

#### Rule: ref-confusion

**What it detects:** Actions pinned to symbolic refs (branches or tags) that could be
confused with each other — e.g. a branch named the same as a tag.

**Flag if:** `uses:` references a ref that exists as both a branch and a tag in the
upstream repository, creating ambiguity about which is resolved.

**Fix:** Pin to a full SHA to eliminate ref ambiguity.

#### Rule: ref-version-mismatch

**What it detects:** SHA-pinned `uses:` where the version comment does not match the
actual tag that SHA points to.

**Flag if:** `uses: owner/repo@<sha> # v1.0.0` but the SHA actually corresponds to a
different tag (e.g. `v1.0.1`).

**Fix:** Update the version comment to match the actual tag for the SHA:

```bash
gh api repos/<owner>/<repo>/git/tags/<sha> --jq '.tag'
```

#### Rule: secrets-outside-env

**What it detects:** Use of the `secrets` context in jobs that do not run in a dedicated
GitHub environment — secrets should be scoped to environments with protection rules.

**Flag if:** a job uses `${{ secrets.* }}` but does not define `environment:`.

**Fix — regular workflow:** Add an `environment:` block directly to the job:

```yaml
jobs:
  deploy:
    environment: production
    steps:
      ...
```

**Fix — reusable workflow (`workflow_call`):** Do NOT hardcode the environment name —
callers may use different environment names or none at all. Instead, add `environment`
as an optional input and pass it through:

```yaml
on:
  workflow_call:
    inputs:
      environment:
        required: false
        type: string
        default: ''

jobs:
  build:
    environment: ${{ inputs.environment || '' }}
```

The caller then passes their environment name:
```yaml
jobs:
  call:
    uses: org/repo/.github/workflows/reusable.yml@SHA
    with:
      environment: production
```

#### Rule: superfluous-actions

**What it detects:** Actions that duplicate functionality already provided natively by
the GitHub Actions runner (e.g. using `actions/setup-node` when the runner already has
the required Node version).

**Flag if:** a `uses:` step calls an action whose functionality is already available in
the runner image being used.

**Fix:** Remove the superfluous action step. Cannot always be auto-fixed — report to user
with explanation of what the runner already provides.

#### Rule: unpinned-images

**What it detects:** Container image references in `container:` or `services:` blocks
that are not pinned to an immutable digest.

**Flag if:** `container.image` or `services.*.image` uses a mutable tag (e.g. `ubuntu:latest`,
`postgres:15`) instead of a SHA256 digest.

**Fix:** Pin the image to a specific digest:

```yaml
container:
  image: ubuntu@sha256:<digest>
```

#### Rule: unpinned-tools

**What it detects:** Steps where referenced actions may download and execute unpinned
external tools at runtime (e.g. `curl | bash`, `pip install` without version pin).

**Flag if:** a `run:` step downloads and executes tools without version pinning:

- `curl ... | bash` or `curl ... | sh`
- `pip install <package>` without `==version`
- `npm install -g <package>` without `@version`

**Fix:** Pin tool versions explicitly or use a SHA-verified download.

#### Rule: unredacted-secrets

**What it detects:** Potential secret leakage through redaction failures — e.g. secrets
split across multiple lines, transformed before use, or concatenated in ways that bypass
GitHub's automatic redaction.

**Flag if:** a `run:` step manipulates a secret value (substring, concatenation, encoding)
before using it, which could bypass redaction.

**Fix:** Avoid transforming secret values in shell. If transformation is needed, ensure
the result is also masked using `::add-mask::`.

#### Rule: unsound-condition

**What it detects:** `if:` conditions that are inadvertently always `true` due to
YAML/expression parsing quirks — e.g. comparing a string to a non-empty object.

**Flag if:** an `if:` expression compares `github.event_name` or similar to a value using
`==` where the comparison will always evaluate to `true` due to type coercion.

**Fix:** Rewrite the condition to use explicit string comparison and test both branches.

#### Rule: unsound-contains

**What it detects:** Usage of the `contains()` function in conditions that can be bypassed
by an attacker controlling the input — e.g. `contains(github.event.label.name, 'safe')`.

**Flag if:** `contains()` is used with attacker-controlled input as the haystack in a
security-sensitive condition (e.g. gating privileged steps).

**Fix:** Use exact equality (`==`) instead of `contains()` for security-sensitive checks,
or validate the full value.

#### Rule: use-trusted-publishing

**What it detects:** Workflows that publish packages (PyPI, npm, RubyGems) using long-lived
credentials (secrets) instead of OIDC trusted publishing.

**Flag if:** a publishing step uses `${{ secrets.PYPI_TOKEN }}`, `${{ secrets.NPM_TOKEN }}`,
or similar long-lived credentials for package publishing to a registry that supports
trusted publishing.

**Fix:** Migrate to OIDC trusted publishing — removes the need for long-lived tokens:

```yaml
permissions:
  id-token: write
```

Then use the official trusted publishing action for the registry.

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
