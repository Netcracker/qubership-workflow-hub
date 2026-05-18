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

Single source of truth for any GitHub Actions workflow that consumes the
Qubership ecosystem (`netcracker/qubership-workflow-hub` actions,
`Netcracker/.github` templates).

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

Do not provide only fragments unless the user explicitly asks for a snippet.

## Companion skills (navigators)

- `qubership-templates-guide` — Netcracker workflow-templates catalog (fork-able templates).
- `qubership-actions-guide` — Qubership actions catalog, domain guides (`docker.md`, `helm.md`, `security.md`, `release.md`), and the Pin table for SHAs.

Both are navigation-only; all rules live in this file.

## Clarify before acting

Before designing any workflow, establish context with the minimum necessary
questions. Never ask for information that can be read from a file.

### Step 0 — one question first

Ask exactly one question:

> "Do you have an existing workflow and/or `.qubership/` config files, or
> are we starting from scratch?"

If the user has already provided a file or it is open in the IDE — skip
this question and go straight to *Path A*.

### Path A — existing workflow or configs

Read the workflow and any config files it references. Load the relevant
domain guide (`docker.md`/`helm.md`/`security.md`/`release.md`) from
`qubership-actions-guide` and use its migration table. Ask only about what
is missing after reading. Produce a diff — do not rewrite from scratch.

### Path B — starting from scratch

Ask only the questions whose answers cannot be inferred from context.
Domain-specific clarifications live in the domain guides in `qubership-actions-guide`:

| Operation | Where the questions live |
| --- | --- |
| Docker build / push / release | `docker.md` |
| Helm release | `helm.md` |
| Security scan (source/deps, images, k8s cluster) | `security.md` |
| Tag / GitHub Release / release assets | `release.md` |
| Maven | Target store (Central / GitHub Packages); Java version |
| npm | Registry (npmjs / GitHub Packages) |
| Python | Target (PyPI / GitHub Packages) |
| Cleanup | Package type: container images or Maven artifacts? |

For operations with a domain guide — read it and follow its *Clarifying questions* section.
For others — ask the questions listed in the right column.

**Infer the trigger from the request** — do not ask unless truly ambiguous.
See `workflow-patterns.md` → *Trigger rules* for the three standard patterns.

Do not ask about things that have safe defaults: Java version defaults to 21,
platforms default to `linux/amd64`.

## Workflow design process

After *Clarify before acting*:

1. **Check `qubership-templates-guide` first.** Fork if ≥80% match. Borderline
   (50–80%) — fork only if the matching part is structurally hard
   (multi-stage release, config-driven matrix, dry-run gating). Otherwise
   design from scratch.
2. **Hand off to `qubership-actions-guide` Step 1** — it loads the domain
   guide and picks actions. Use Pin table for SHAs. Fall back to standard
   actions only when no Qubership action fits.
3. **Apply *Mandatory conventions*** to every step.
4. **Return the workflow** per *Preferred answer style*.

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

**Always use the Pin table** in `qubership-actions-guide` → *Pin table*.
Never resolve SHAs via `git ls-remote`, `WebFetch`, or memory — the table is
the single source of truth and is maintained manually by the user.

Forbidden:

- Never use `@main` — neither as an action pin nor as `<ref>` for catalog
  or README fetches. Use the SHA from the Pin table.
- Never use short SHAs.

Exception:

- A bare major tag (e.g. `actions/checkout@v4`) is acceptable **only** when
  the user has explicitly asked for automatic minor-version updates. Do not
  pick this on your own — ask first, or stick to SHA pinning.

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
```

If the user is non-expert, explain simply. Do not over-explain basic
YAML unless asked.
