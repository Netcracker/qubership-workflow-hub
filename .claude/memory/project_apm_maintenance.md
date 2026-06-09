---
name: project_apm_maintenance
description: Process for maintaining APM skill package in agent-packages/ — update order, drift prevention, checklist per action change
metadata:
  type: project
---

APM skill package lives at `agent-packages/qubership-workflow-hub-usage/.apm/skills/`.

## Three-layer model

- **Entry point**: `qubership-workflow-hub-usage.instructions.md` — user-facing instructions
- **Orchestration**: `qubership-workflow-conventions/SKILL.md` — routing rules, Path A/B, mandatory conventions
- **Domain guides + catalog**: `qubership-actions-guide/SKILL.md` + sibling `*.md` files

## Update order (always follow this sequence)

1. Action `README.md` in `actions/<name>/`
2. Domain guide in `qubership-actions-guide/<domain>.md`
3. Catalog routing table in `qubership-actions-guide/SKILL.md` (Step 1 table)
4. Orchestration text in `qubership-workflow-conventions/SKILL.md` (Path A + Path B) — only if route changes

## Checklist per action change

- [ ] `actions/<name>/README.md` updated
- [ ] Catalog line in `qubership-actions-guide/SKILL.md` updated
- [ ] Domain guide updated (or new guide created if new domain)
- [ ] Path A and Path B in `qubership-workflow-conventions/SKILL.md` include the guide
- [ ] Pin table SHA updated if release changed (grep old SHA across all `.apm/` files to catch drift)

## When to create a new domain guide vs catalog line only

Create a new `<domain>.md` guide when the action has its own use-case, clarifying questions, permissions pattern, or pipeline shape. A single catalog line is enough when the action is a utility with no special setup.

## Pinning rules

- `netcracker/qubership-workflow-hub` SHA: always resolve dynamically via GitHub API (see `qubership-actions-guide/SKILL.md` Pin table). Never hardcode; fallback to last known SHA only if API unavailable.
- Third-party actions: hardcoded in Pin table, update manually on upgrade.
- After any SHA update: `grep -r "old-sha" agent-packages/` to find all stale references.

## What lives where (no duplication rule)

- Security rules, pinning policy, permissions conventions → `qubership-workflow-conventions/SKILL.md` only
- Pipeline patterns, clarifying questions, canonical shapes → domain guide files
- Action inputs/outputs/permissions → action `README.md` is the source of truth; guides reference it, don't restate it

## Domain guides that exist

`docker.md`, `helm.md`, `security.md`, `release.md`, `notifications.md`, `maven.md`, `cleanup.md`, `utilities.md`, `pr.md`, `cla.md`

**Why:** Process was painful to reconstruct after email-action addition — multiple rounds of drift fixes across SKILL.md, conventions, utilities.md, and pin table.
**How to apply:** On any action change, run through the checklist above before closing the task.
