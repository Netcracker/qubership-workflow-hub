# Action & Workflow Conventions

Description: This document defines the mandatory (MUST) and recommended (SHOULD) conventions for creating, updating, reviewing and deprecating GitHub Actions and reusable workflows in this repository. It standardises naming (inputs/outputs), version pinning, permission model, security expectations, deprecation lifecycle, release/readiness checklists, and the required structure of bug / feature reports.

Use when you: (a) add or modify an action/workflow, (b) review a PR, (c) investigate or file an issue, (d) audit security / reproducibility.

In scope: inputs & outputs style, version pinning strategy, minimal permissions, deprecation stages, checklists, issue template.
Out of scope: organization-wide security disclosure details (see Security Policy), project-specific business logic.

Legend: MUST = required, SHOULD = recommended, MAY = optional.

Bug template location: Section 9 (always include action version + minimal workflow snippet).

---
## Table of Contents
- [Action \& Workflow Conventions](#action--workflow-conventions)
  - [Table of Contents](#table-of-contents)
  - [1. Quick Rules](#1-quick-rules)
  - [2. Standard Inputs](#2-standard-inputs)
  - [3. Version Pinning](#3-version-pinning)
  - [4. Outputs](#4-outputs)
  - [5. Security](#5-security)
  - [6. Deprecation](#6-deprecation)
  - [7. New Action Checklist](#7-new-action-checklist)
  - [8. PR Review Checklist](#8-pr-review-checklist)
  - [9. Bug / Issue Reporting](#9-bug--issue-reporting)
    - [Expected](#expected)
    - [Actual](#actual)
    - [Logs](#logs)
    - [Env](#env)


---
## 1. Quick Rules
| Area | MUST / SHOULD |
|------|---------------|
| Versions | MUST use `@v1` (major) or SHA. No `@main` in prod. |
| Permissions | MUST start minimal (`contents: read`). Elevate only where used. |
| Inputs | SHOULD kebab-case (`dry-run`). |
| Outputs | SHOULD short nouns (`version`). |
| Dry run | SHOULD offer `dry-run` for destructive steps. |
| Debug | MAY add `debug` (no secrets). |
| Secrets | MUST never echo / partially mask. |
| Deprecation | MUST list replacement before removal. |

---
## 2. Standard Inputs
| Input | Meaning |
|-------|---------|
| `dry-run` | Simulate (no writes) |
| `debug` | Verbose logs |
| `ref` | Override branch/tag |
| `config-file` | External config path |
| `version-strategy` | Version mode (`auto` / `calendar` / `file`) |
| `force-create` | Overwrite existing tag/resource |
One spelling per concept; keep legacy alias only if needed.

---
## 3. Version Pinning
MUST pin to major tag or SHA. Critical flows: prefer SHA. Bad: `uses: repo/action@main`.

---
## 4. Outputs
Use stable nouns only. Example:
```yaml
steps:
  - id: meta
    uses: repo/metadata-action@v1
  - run: echo Version=${{ steps.meta.outputs.version }}
```

---
## 5. Security
Baseline:
```yaml
permissions:
  contents: read
```
Add only what you need (e.g. `contents: write`, `packages: write`). Prefer OIDC. No secret echoing.

---
## 6. Deprecation
Stages: Active → Deprecated (announce + replacement) → Sunset (deadline) → Removed.
Current map:
| Old | Replacement |
|-----|-------------|
| docker-publish (workflow) | docker-action |
| tag-creator (workflow) | tag-action |
| tag-checker | tag-action |
| commit-and-push | inline git steps |
| pom-updater | metadata-action + build tooling |

## 7. New Action Checklist
1. Folder + `action.yml`
2. Minimal inputs
3. Stable outputs
4. README (purpose/inputs/outputs/example)
5. Smoke workflow
6. Tag `v1`
7. Add to index/map

## 8. PR Review Checklist
| Item | OK? |
|------|-----|
| Inputs minimal + kebab-case | |
| Outputs documented | |
| Version pin correct | |
| Permissions minimal | |
| Dry-run (if destructive) | |
| README updated | |
| Deprecation map updated | |

## 9. Bug / Issue Reporting
Create issues at: https://github.com/nookyo/qubership-workflow-hub/issues

Minimum required:
1. Action / workflow name + version (tag or SHA)
2. Minimal reproducible workflow snippet (only failing job/step)
3. Expected vs Actual behaviour (1–2 lines each)
4. Key log fragment (redact secrets) – avoid full dumps
5. Runner environment: `ubuntu-22.04`, matrix vars (language version, etc.)

Bug template (paste into issue):
```
### Summary
<clear one-line problem>

### Action / Workflow Version
<name>@<tag or SHA>

### Minimal Snippet
```yaml
<workflow excerpt>
```

### Expected
<what you wanted>

### Actual
<what happened>

### Logs
```
<key lines>
```

### Env
Runner: ubuntu-22.04
Matrix: <if any>
```

Feature request: describe the use case first (problem > why existing actions insufficient > proposed behaviour). Avoid “add flag X” without context.
Security / sensitive: do NOT disclose publicly. Use the private disclosure channel (Security Policy) or contact maintainers directly.
Triage (internal): label (bug/enhancement/question) → reproduce → assign → milestone → close with resolution.
Response targets (not guaranteed): bug acknowledgement <= 2 business days; critical security ASAP.

