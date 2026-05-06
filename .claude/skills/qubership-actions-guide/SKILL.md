---
name: qubership-actions-guide
description: Navigation-only skill for individual actions in netcracker/qubership-workflow-hub. Use when a workflow needs to consume a specific Qubership action (Docker build/push, version/tag rendering, Maven/npm/Python publishing, package cleanup, Helm charts, security scans, etc.) and you need to find the right action and read its authoritative README. All rules (pinning, permissions, anti-hallucination, naming) live in qubership-workflow-conventions — this skill does not restate them.
---

# qubership-actions-guide

Navigator for actions in `netcracker/qubership-workflow-hub`. The
catalog and per-action READMEs are the source of truth — this skill
helps you fetch only what you need.

## How to use

1. **Read the user's task.** Identify the CI/CD operations needed
   (build/push image, render a version, create a tag, publish a package,
   security scan, etc.).

1. **Resolve the latest stable tag** of `netcracker/qubership-workflow-hub`
   first (see *Resolving the latest tag and its SHA* below). Use it as
   `<ref>` for the catalog and README fetches below so the README you
   read aligns with the SHA you will pin.

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

## Resolving the latest tag and its SHA

Latest stable tag:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub 'refs/tags/v*' \
  | awk -F/ '{print $NF}' | sort -V | tail -1
```

SHA for a specific tag:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/<tag>
```

## What this skill does NOT do

- It does not generate full workflows — for that, follow
  `qubership-workflow-conventions`.
- It does not duplicate the catalog or per-action READMEs — those are
  the source of truth and are fetched on demand.
- It does not cover reusable workflows (`re-*.yml`) — only individual
  actions.
