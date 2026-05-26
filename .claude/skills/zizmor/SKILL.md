---
name: zizmor
description: Audit GitHub Actions workflow and action.yml files for security issues using zizmor rules, then fix violations
arguments: [files]
---

# zizmor

Security audit for GitHub Actions workflow and `action.yml` files.
Apply all rules in-memory when writing or editing any `.yml` workflow or action file.
When invoked via `/workflow-audit [files]`, audit and fix target files directly.

## Configuration

```yaml
rules:
  dangerous-triggers:
    ignore:
      - cla.yaml
      - pr-assigner.yml
```

Pedantic rules disabled — skip: `anonymous-definition`, `self-hosted-runner`,
`stale-action-refs`, `undocumented-permissions`.

## Rules

| Rule | Flag if | Fix |
| --- | --- | --- |
| `template-injection` | Attacker-controlled `github.event.*` value used inside `${{ }}` in a `run:` block or `actions/github-script` `script:`. Sources: `github.event.pull_request.title/body/head.ref/head.label`, `github.event.issue.title/body`, `github.event.comment.body`, `github.event.review.body`, `github.event.discussion.title/body`, `github.head_ref`, `github.event.workflow_run.head_branch/head_commit.message` | Pass through `env:` var instead of direct interpolation |
| `excessive-permissions` | `permissions: write-all` anywhere; `contents: write` at workflow level (not job level); any `write` permission a job doesn't actually need | Move to job level; start from `permissions: {}`; grant only what each job needs |
| `unpinned-uses` | Any `uses:` not pinned to a full 40-char SHA — branches (`@main`), mutable tags (`@v4`, `@v1.2.3`) are all flagged | Replace with SHA pin. Fetch: `gh api repos/<owner>/<repo>/git/ref/tags/<tag> --jq '.object.sha'`; if annotated tag: dereference with `gh api repos/<owner>/<repo>/git/tags/<sha> --jq '.object.sha'` |
| `artipacked` | `actions/checkout` without `persist-credentials: false` in a job that also uses `actions/upload-artifact` | Add `persist-credentials: false` to the checkout step |
| `secrets-inherit` | `secrets: inherit` in a reusable workflow call | Replace with explicit named secrets only |
| `dangerous-triggers` | `pull_request_target` or `workflow_run` AND any step checks out with PR head ref or runs shell using `github.event.pull_request.*` directly. **Ignore** if file matches config ignore list | Pin checkout `ref:` to `github.sha`; add `persist-credentials: false`; move untrusted input to env vars |
| `github-env` | Writing untrusted event data to `$GITHUB_ENV` or `$GITHUB_PATH` in privileged trigger context | Use `$GITHUB_OUTPUT` for inter-step data; never write raw event data to `GITHUB_ENV` |
| `github-app` | GitHub App token passed via `${{ steps.*.outputs.token }}` directly in shell interpolation | Always pass via `env:` var, never interpolate directly |
| `secrets-outside-env` | Deployment/publish job uses `${{ secrets.* }}` but has no `environment:` declaration | Add `environment:` block — apply judgment, not every workflow needs it |
| `bot-conditions` | `if:` checks `github.actor == 'dependabot[bot]'` or similar string comparison | Use `github.actor_id == '49699333'` or `github.event.sender.type == 'Bot'` |
| `unsound-contains` | `contains()` with attacker-controlled input as haystack in security-sensitive condition | Use exact equality `==` instead |
| `unsound-condition` | `if:` expression always evaluates to `true` due to type coercion (e.g. `${{ inputs.flag }}` where string `"false"` is truthy) | Use explicit string comparison: `inputs.flag == 'true'` |
| `misfeature` | `continue-on-error: true` on security-sensitive steps (scan, lint, auth); `workflow_dispatch` inputs used unsafely in shell | Remove `continue-on-error` from sensitive steps; pass dispatch inputs via `env:` |
| `unredacted-secrets` | Secret value transformed or concatenated in shell (substring, base64, concat) — bypasses GitHub's auto-redaction | Avoid transforming secrets in shell; if unavoidable, mask result with `::add-mask::` |
| `concurrency-limits` | Workflow triggered by `push` or `pull_request` with no `concurrency:` block | Add concurrency group — see `workflow-patterns.md` → *Concurrency* |
| `insecure-commands` | `ACTIONS_ALLOW_UNSECURE_COMMANDS: true` in any `env:` block | Remove it; use `$GITHUB_OUTPUT`, `$GITHUB_ENV`, `$GITHUB_STEP_SUMMARY` |
| `hardcoded-container-credentials` | Literal credential string in `registry-password:`, `password:`, or similar field | Move to `${{ secrets.* }}` |
| `unpinned-images` | `container.image` or `services.*.image` uses mutable tag (`ubuntu:latest`, `postgres:15`) | Pin to SHA256 digest: `ubuntu@sha256:<digest>` |
| `unpinned-tools` | `run:` step does `curl \| bash`, `pip install <pkg>` without version, `npm install -g <pkg>` without `@version` | Pin tool versions explicitly or use SHA-verified download |
| `cache-poisoning` | Release workflow uses `actions/cache` with cache key derived from untrusted input | Use only deterministic keys (e.g. hash of lock files) |
| `overprovisioned-secrets` | `secrets: ${{ secrets }}` — whole secrets context passed | Pass only named secrets the callee needs |
| `archived-uses` | `uses:` references an archived GitHub repository | Replace with maintained alternative or vendor locally. **Cannot auto-fix** — report to user |
| `impostor-commit` | SHA pin that cannot be verified as a real commit in the upstream repo | **Cannot auto-fix** — report to user; verify with `gh api repos/<owner>/<repo>/commits/<sha>` |
| `known-vulnerable-actions` | `uses:` references action version with known CVE or GitHub Security Advisory | **Cannot auto-fix** — report action name and version to user |
| `obfuscation` | `run:` contains `base64 -d`, `eval`, or piped decode patterns | **Cannot auto-fix** — report to user for manual review |
| `ref-confusion` | `uses:` references a ref that exists as both branch and tag in upstream repo | Pin to full SHA |
| `ref-version-mismatch` | SHA pin comment doesn't match the actual tag for that SHA | Update comment: `gh api repos/<owner>/<repo>/git/tags/<sha> --jq '.tag'` |
| `superfluous-actions` | `uses:` calls an action whose functionality is already in the runner image | Remove the step. **Cannot always auto-fix** — report to user |
| `use-trusted-publishing` | Publishing to PyPI/npm/RubyGems using `${{ secrets.PYPI_TOKEN }}` etc. when registry supports OIDC | Migrate to OIDC trusted publishing with `id-token: write` |

## SHA pin reference

Known pins used in this repo (always verify with API before applying):

| Action | SHA | Tag |
| --- | --- | --- |
| `actions/checkout` | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` | v6.0.2 |
| `actions/upload-artifact` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | v7.0.1 |
| `actions/download-artifact` | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | v8.0.1 |
| `actions/setup-python` | `a309ff8b426b58ec0e2a45f0f869d46889d02405` | v6.2.0 |
| `actions/setup-node` | `53b83947a5a98c8d113130e565377fae1a50d02f` | v6.3.0 |
| `actions/setup-go` | `4a3601121dd01d1626a1e23e37211e3254c1c06c` | v6.4.0 |
| `actions/cache` | `668228422ae6a00e4ad889ee87cd7109ec5666a7` | v5.0.4 |

For actions not in this table — always fetch the current SHA via API before applying.

## When invoked via /workflow-audit

1. If files provided → audit those files. Otherwise:

   Resolve base ref in priority order:

   - `baseRefName` from the open PR for the current branch (`gh pr view --json baseRefName`)
   - Default branch of the repository (`gh repo view --json defaultBranchRef`)
   - `main` as final fallback — warn the user if this fallback is used

   Then collect changed files:

   ```bash
   git diff <BASE>..HEAD --name-only
   ```

   Keep only `.yml`/`.yaml` files matching `.github/workflows/` or `actions/*/action.yml`.

1. Read each file, check all rules above, collect violations.
1. Fix all auto-fixable violations directly with Edit. Do not ask the user.
1. Report violations that cannot be auto-fixed (archived-uses, impostor-commit,
   known-vulnerable-actions, obfuscation, superfluous-actions) — explain why.
1. Report: files audited, violations found per rule, fixed vs skipped.
