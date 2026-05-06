---
name: qubership-actions-guide
description: Navigation-only skill for individual actions in netcracker/qubership-workflow-hub. Use when a workflow needs to consume a specific Qubership action (Docker build/push, version/tag rendering, Maven/npm/Python publishing, package cleanup, Helm charts, security scans, etc.) and you need to find the right action and read its authoritative README. All rules (pinning, permissions, anti-hallucination, naming) live in qubership-workflow-conventions — this skill does not restate them.
---

# qubership-actions-guide

Navigator for actions in `netcracker/qubership-workflow-hub`. The
catalog and per-action READMEs are the source of truth — this skill
helps you fetch only what you need.

## This skill is navigation-only

All rules — pinning, permissions, anti-hallucination, naming
conventions, secrets handling — live in **`qubership-workflow-conventions`**
(*Mandatory conventions*). They are **not** restated here. Apply them
when assembling a workflow that uses any action surfaced through this
skill.

## How to use

1. **Read the user's task.** Identify the CI/CD operations needed
   (build/push image, render a version, create a tag, publish a package,
   security scan, etc.).

1. **Resolve the latest stable tag** of `netcracker/qubership-workflow-hub`
   first — use it as `<ref>` for catalog and README fetches so the
   README you read aligns with the SHA you will pin:

   ```bash
   git ls-remote https://github.com/netcracker/qubership-workflow-hub 'refs/tags/v*' \
     | awk -F/ '{print $NF}' | sort -V | tail -1
   ```

   Do not use `main` for production reads — its content can drift ahead
   of the latest release and lead you to inputs that are not yet in
   any tagged version.

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
   cases, and required permissions.

1. **Skip the README fetch** for actions you are not actually using —
   no "just in case" lookups.

1. **Hand off to `qubership-workflow-conventions`** for all rules
   when assembling the workflow.

## Resolving the SHA for a tag

Once `qubership-workflow-conventions` (*Mandatory conventions →
Pinning*) tells you to pin to a specific tag, resolve its SHA via:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/<tag>
```

## No fake examples in this skill

This skill deliberately does not include sample workflows with
concrete `with:` blocks. Any such example would risk encoding
hallucinated input names. Each action's README contains correct,
maintained examples — use those when generating workflows.

## What this skill does NOT do

- It does not generate full workflows — for that, follow
  `qubership-workflow-conventions`.
- It does not duplicate the catalog or per-action READMEs — those are
  the source of truth and are fetched on demand.
- It does not restate pinning, permissions, naming, or
  anti-hallucination rules — those live in
  `qubership-workflow-conventions`.
- It does not cover reusable workflows (`re-*.yml`) — only individual
  actions.
