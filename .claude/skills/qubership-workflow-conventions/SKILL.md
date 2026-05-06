---
name: qubership-workflow-conventions
description: >
  Single source of truth for Qubership GitHub Actions workflows. Use when
  designing, writing, reviewing, or debugging .github/workflows/*.yml that
  consume actions or templates from netcracker/qubership-workflow-hub or
  Netcracker/.github. Covers the workflow design process, mandatory
  conventions (pinning, permissions, anti-hallucination, naming, secrets,
  PR safety), structural patterns (matrix, dry-run gating, concurrency,
  timeouts, reusable workflow contracts), GitHub App tokens, and failed
  workflow debugging. Other Qubership skills (templates-guide,
  actions-guide) are navigators that defer to this one for all rules.
---

# qubership-workflow-conventions

This is the **single source of truth** for any GitHub Actions workflow
that consumes the Qubership ecosystem (`netcracker/qubership-workflow-hub`
actions, `Netcracker/.github` templates).

It does two things at once:

1. **Defines the mandatory conventions** every Qubership workflow must
   follow — pinning, permissions, anti-hallucination, naming, secrets,
   PR safety. No other Qubership skill duplicates these rules.
2. **Drives the workflow design process** — produces complete,
   copy-paste-ready workflows for users.

## Core responsibility

When the user asks for a workflow, produce a complete, copy-paste-ready
workflow file.

Always provide:

1. File path, for example `.github/workflows/ci.yml`.
1. Full YAML.
1. Which Qubership actions or templates were selected and why.
1. Required permissions.
1. Required secrets, variables, environments, or repository settings.
1. How the workflow is triggered.
1. How the user can test it.
1. What the user may need to customize.
1. **Pin upgrades.** When the workflow is forked from a template and any
   action pin SHA was updated to the latest stable release during the
   fork, list each upgraded pin: action name, the template's original
   SHA + tag, and the resolved replacement SHA + tag. If no pins were
   upgraded, say so explicitly. If written from scratch, say "N/A".

Do not provide only fragments unless the user explicitly asks for a
snippet.

## Companion skills (navigators)

These skills supply ground-truth references. Invoke them before writing
any identifier, pin, or template name from memory.

### qubership-templates-guide

Navigator for the curated workflow-templates catalog at
`Netcracker/.github/workflow-templates`. Use it **first** for any task
that may already have a canonical template. If a template fits, fork it
and apply this skill's conventions during the adaptation.

### qubership-actions-guide

Navigator for individual actions in `netcracker/qubership-workflow-hub`.
Invoke it before writing any `uses: netcracker/qubership-workflow-hub/...`
step that is not coming from a forked template, and whenever you need
to verify an action's inputs, outputs, or required permissions against
its README.

### Hard delegation rule

Both companion skills are **navigation-only**. They do **not** restate
pinning, permissions, naming, or anti-hallucination rules. All such
rules live in this skill. If a companion skill is unavailable, follow
its lookup procedure manually (fetch catalog and READMEs via `gh api` /
`WebFetch`). Do not skip the lookup.

## Workflow design process

For each user request:

1. Identify the CI/CD operation: validate, build, test, package,
   publish, scan, tag, release, deploy, cleanup.
1. Invoke `qubership-templates-guide` to check the catalog. If a
   curated template fits, fork and adapt it as the baseline, then
   continue this process to verify trigger, target, permissions,
   secrets, and user-specific configuration.
1. Identify trigger: `pull_request`, `push`, tag, `workflow_dispatch`,
   `schedule`, or `workflow_call`.
1. Identify target: branch, tag, package registry, image registry,
   environment, release, artifact.
1. Identify result: check status, artifact, image, package, tag,
   GitHub release, report.
1. Prefer a matching Qubership action if available. Use
   `qubership-actions-guide` to find and read the action's README.
1. Apply the **Mandatory conventions** below to every step.
1. Add safe defaults: timeout, concurrency where useful, no secrets in
   untrusted PR contexts.
1. Return the complete workflow and concise usage instructions.

## Mandatory conventions

These rules apply to every Qubership workflow. Companion skills defer
to this section.

### Anti-hallucination

LLMs invent plausible-sounding identifiers when they don't have the
exact spelling at hand. This applies to **any** identifier: action
names, input names, output names, fields inside JSON config payloads,
environment variable names, step IDs, and tag formats.

Rules:

- Never write a Qubership action identifier or `with:` block from memory.
- Before writing any reference to an identifier from the action library,
  read the action's README via `qubership-actions-guide`, locate the
  relevant **Inputs** / **Outputs** / config-schema section, and copy
  the identifier verbatim.
- If the identifier you expect is not in the README — it does not
  exist. Pick a different action, restructure the workflow, or tell
  the user the action does not support that capability.
- This applies even when:
    - you remember the identifier from earlier in the session;
    - a similar action has a similar-looking identifier;
    - the identifier appears in another action's **output** JSON —
      outputs and inputs are different namespaces.
- When in doubt, re-read the README. The cost of an extra lookup is
  negligible; the cost of a hallucinated identifier is a broken
  workflow that silently no-ops or fails on first run.

### Pinning

Pin every action — Qubership and third-party — as a full 40-character
commit SHA with a trailing `# vX.Y.Z` comment showing the release:

```yaml
uses: netcracker/qubership-workflow-hub/actions/<name>@<sha>  # vX.Y.Z
```

Resolution rules:

- **Always resolve every pin to the latest stable release SHA at write
  time.** Do not copy SHAs from this skill, from another skill, from
  memory, or unchanged from a forked template — those can be outdated.
- For Qubership actions, use `qubership-actions-guide` to look up the
  current latest tag, then resolve the SHA via `git ls-remote`.
- For third-party actions, use `git ls-remote` or
  `gh api repos/<org>/<repo>/releases/latest`.

```bash
# Latest stable Qubership tag
git ls-remote https://github.com/netcracker/qubership-workflow-hub 'refs/tags/v*' \
  | awk -F/ '{print $NF}' | sort -V | tail -1

# SHA for that tag
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/<tag>
```

Forbidden:

- Never use `@main`.
- Never use short SHAs.

Exception:

- A bare major tag (e.g. `actions/checkout@v4`, `netcracker/.../@v2`) is
  acceptable **only** when the user has explicitly asked for automatic
  minor-version updates within a release line. Do not pick this on your
  own — ask first, or stick to SHA pinning.

### Permissions

- Set `permissions:` at the **job level**, not the workflow level.
- Start every job from `contents: read` and elevate only where the
  action's README says it needs more (e.g. `packages: write` for GHCR
  pushes, `pull-requests: write` for PR comments, `id-token: write`
  for OIDC, `contents: write` for tag/release creation).
- The action's README is authoritative for required permissions —
  check it via `qubership-actions-guide` when generating each
  `permissions:` block.

### Naming and structure

- Inputs are `kebab-case` (`dry-run`, `force-create`).
- Outputs are short singular nouns (`version`, `tag`, `digest`).
- Org name in `uses:` is always lowercase `netcracker`, never
  `Netcracker`.
- Boolean inputs default `false`; the input name describes the feature
  when enabled.
- Actions that write or push must offer a `dry-run` input — check the
  README and use it during exploration.

### Secrets and PR safety

- Never put secret values in YAML. Use `${{ secrets.SECRET_NAME }}`.
- Never echo secrets; never use `set -x` near secret usage.
- Treat pull requests from forks as **untrusted**. Do not expose
  secrets, deployment credentials, package publish tokens, registry
  tokens, or release tokens to untrusted PR code.
- Avoid `pull_request_target` unless the workflow is intentionally
  designed for it and does not check out or execute untrusted code
  unsafely. CLA assistant is one of the few legitimate uses.
- For production deployment workflows, prefer **environment-scoped
  secrets** (declared on a GitHub Environment) over repository-wide
  secrets — see `security-model.md`.

### Action input contract

When using a Qubership action's outputs:

```yaml
- name: Use previous output
  run: echo "${{ steps.some_step.outputs.exact_output_name }}"
```

Use the exact output name from the action's README. Never infer output
names from examples of other actions.

## Qubership action priority

Prefer Qubership actions for operations that match the user's request:

- Docker build and push;
- version rendering;
- tag creation;
- GitHub release preparation;
- Maven publishing;
- npm publishing;
- Python package publishing;
- package cleanup;
- Helm chart operations;
- security scans;
- other operations listed in the Qubership workflow hub catalog (via
  `qubership-actions-guide`).

Use standard actions (`actions/checkout`, `actions/setup-node`,
`actions/setup-python`, `docker/*`, GitHub CLI) only when:

- no Qubership action fits;
- the user explicitly asks for standard actions;
- the Qubership action README does not support the required capability;
- a standard action is required as setup around a Qubership action.

If no Qubership template or action fits the requested operation, use
standard GitHub Actions patterns and explicitly say that no matching
Qubership template/action was selected.

## Supporting documents

Read these files when relevant:

- `workflow-patterns.md` — workflow structure, triggers, concurrency,
  timeouts, matrix, config-driven matrix, dry-run gating, reusable
  workflow contracts, artifacts.
- `security-model.md` — checkout credentials, environment-scoped
  secrets, GitHub App tokens for protected branches, environments.
- `debugging-playbook.md` — failure categories and the diagnosis
  procedure for broken workflows.

## Preferred answer style

Match the language of the user's request. If the user writes in Russian,
answer in Russian; if in English, answer in English. Translate the
section headers in the structure below to the same language. Keep YAML,
file paths, action identifiers, and code samples unchanged regardless
of language.

Use this structure (English form shown — translate headers as needed):

```text
File: .github/workflows/<name>.yml

<full YAML>

What to configure:
- secret/variable/environment

How to trigger:
- push, PR, tag, workflow_dispatch, etc.

How to verify:
- Actions tab, expected artifact/image/release/check

Pin upgrades (when forked from a template):
- <action> @<old-sha> # <old-tag>  →  @<new-sha> # <new-tag>
- (or "No pins upgraded" when forked verbatim, or "N/A" when written from scratch)
```

If the user is non-expert, explain simply. Do not over-explain basic
YAML unless asked.
