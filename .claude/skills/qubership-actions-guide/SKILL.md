---
name: qubership-actions-guide
description: Use when writing or reviewing GitHub Actions workflows that should consume reusable actions from netcracker/qubership-workflow-hub (Docker build/push, version/tag rendering, Maven/npm/Python publishing, package cleanup, Helm charts, security scans, etc.). Points to the catalog and per-action READMEs as the source of truth, and supplies pinning, permissions, and anti-hallucination rules.
---

# qubership-actions-guide

Navigator for actions in `netcracker/qubership-workflow-hub`.

The catalog and per-action READMEs are the source of truth — this skill
helps you fetch only what you need, write inputs correctly without
hallucinating, and apply the right pinning and permissions.

## Hard rule: never write identifiers from memory

LLMs invent plausible-sounding identifiers when they don't have the
exact spelling at hand. This applies to **any** identifier consumed by
an action: input names, output names, field names inside JSON config
payloads, environment variable names, step IDs, and tag formats. A name
that "sounds right" because it resembles something in a related action
may not exist at all — and a workflow that references a non-existent
input silently no-ops or fails on first run.

Before writing any reference to an identifier from this action library:

1. Read the action's README (see the README lookup step in **How to
   use** for the right method per context).
1. Locate the relevant table or section: **Inputs**, **Outputs**, the
   config-file schema, or the example payload.
1. Copy the identifier verbatim. Do not transliterate, pluralise,
   rename, or "obviously fix" it.
1. If the identifier you expect is not there — it does not exist.
   Either pick a different action, restructure the workflow, or tell
   the user the action does not support that capability.

This applies even when:

- You remember the identifier from an earlier task in this session.
- A similar action has a similar-looking identifier.
- The identifier appears in the **output** of a related action —
  outputs and inputs are different namespaces. A field that lives
  inside another action's output JSON is not an input here.

When in doubt, re-read the README. The cost of an extra lookup is
negligible; the cost of a hallucinated identifier is a broken workflow.

## How to use

1. **Read the user's task.** Identify the CI/CD operations needed
   (build/push image, render a version, create a tag, publish a package,
   security scan, etc.).

1. **Fetch the catalog ONCE** to see what's available:

   ```text
   WebFetch → https://raw.githubusercontent.com/netcracker/qubership-workflow-hub/<ref>/docs/actions-workflows-catalog.md
   ```

   The catalog has a one-line Purpose per action. Use it to pick the
   actions whose Purpose matches a step in the task. Do not fetch any
   action README at this stage — the catalog is enough to decide.

1. **For each picked action, fetch its README ONCE on demand:**

   ```text
   WebFetch → https://raw.githubusercontent.com/netcracker/qubership-workflow-hub/<ref>/actions/<name>/README.md
   ```

   The README is authoritative for inputs, outputs, examples, edge
   cases, and required permissions. Read it before writing the `with:`
   block — see the **Hard rule** above.

1. **Skip the README fetch** for actions you are not actually using —
   no "just in case" lookups.

1. **Apply Pinning and Permissions rules below** to every `uses:` line.

`<ref>` in fetch URLs: resolve the **latest stable release tag** of
`netcracker/qubership-workflow-hub` first (or its commit SHA), then use
that as `<ref>` for the catalog and README fetches. Do not use `main`
for production reads — its content can drift ahead of the latest
release and lead you to inputs that are not yet in any tagged version.

Resolve the latest tag with:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub 'refs/tags/v*' \
  | awk -F/ '{print $NF}' | sort -V | tail -1
```

This keeps the README you read aligned with the SHA you will pin —
both reflect the same released version.

## No fake examples in this skill

This skill deliberately does not include sample workflows with concrete
`with:` blocks. Any such example would risk encoding hallucinated input
names. Each action's README contains correct, maintained examples — use
those when generating workflows.

## Pinning

Always pin to the **latest stable release** as a full 40-character
commit SHA, with the release tag as a trailing comment for readability:

```yaml
uses: netcracker/qubership-workflow-hub/actions/<name>@<sha>  # vX.Y.Z
```

The SHA is the immutable pin; the comment shows the release. Resolve
both the latest tag and its SHA at write time — do not copy SHAs from
this skill (the example above uses placeholders), from memory, or
unchanged from a forked template. Templates can lag behind the
current release.

Resolution procedure:

```bash
# 1. Latest stable tag
git ls-remote https://github.com/netcracker/qubership-workflow-hub 'refs/tags/v*' \
  | awk -F/ '{print $NF}' | sort -V | tail -1

# 2. SHA for that tag
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/<tag>
```

**Exception:** a bare tag (e.g. `@v2`) is acceptable **only** when the
user has explicitly asked for automatic minor-version updates within a
release line. Do not pick this on your own — ask first, or stick to
SHA pinning.

Never use `@main` or short SHAs.

## Permissions

Set permissions at the **job level**, not the workflow level. Start from
`contents: read` and elevate only where the action's README says it
needs more (for example, `packages: write` for actions that push to
GHCR, `pull-requests: write` for actions that comment on pull requests).

The action's README is authoritative for required permissions — check
it when generating the `permissions:` block.

## Conventions

- Inputs are `kebab-case`. Outputs are short singular nouns.
- Actions that write or push usually offer a `dry-run` input for safe
  previews — check the README to confirm and use it during exploration.
- Org name in `uses:` is always lowercase `netcracker`, never
  `Netcracker`.

## What this skill does NOT do

- It does not generate full workflows on its own — it supplies facts and
  rules; the AI assembles the workflow.
- It does not duplicate the catalog or the per-action READMEs — those
  are the source of truth and are fetched on demand.
- It does not cover reusable workflows (`re-*.yml`) — only individual
  actions.
