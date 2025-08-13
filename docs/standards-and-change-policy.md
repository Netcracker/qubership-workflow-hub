# Standards & Change Policy

 This document defines stable interface rules (naming, inputs/outputs), version pinning requirements, minimal permissions & security expectations, how to safely modify or deprecate existing actions/workflows, and essentials for issue reporting. For issue / PR formatting see `issue-guidelines.md` and `code-of-conduct-prs.md`.

# Action & Workflow Conventions (Legacy Heading)

Description: Mandatory (MUST) and recommended (SHOULD) rules for creating, updating, reviewing and deprecating Actions & reusable workflows. Covers naming (inputs/outputs), version pinning, permissions, security expectations, deprecation lifecycle, readiness checklists, and where to find issue / PR process.

Use when you: (a) add or modify an action/workflow, (b) review a PR, (c) file or triage an issue, (d) audit reproducibility & security.

In scope: inputs & outputs style, version pinning strategy, minimal permissions, deprecation stages, checklists.
Out of scope: org‑wide security disclosure flow, business logic specifics.

Legend: MUST = required, SHOULD = recommended, MAY = optional.

Issue / PR process is NOT duplicated here—see `docs/issue-guidelines.md` and `docs/code-of-conduct-prs.md`.

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
| Issue types | MUST use only: bug / feature / task (see issue guidelines). |

---
## 2. Naming & Style Conventions
| Entity | Convention | Examples / Notes |
|--------|------------|------------------|
| Action folder | kebab-case | `metadata-action`, `tag-action` |
| Reusable workflow file | kebab-case .md | `release-drafter.md` |
| Input names | kebab-case, nouns or imperative hints | `dry-run`, `force-create`, `version-strategy` |
| Boolean inputs | default false; name describes feature enabled | `dry-run`, `debug`; avoid `enable-dry-run` |
| Outputs | short singular nouns | `version`, `tag`, `digest` |
| Internal step ids | kebab-case (avoid generic `build1`) | `compute-tags`, `push-image` |
| Environment vars | UPPER_SNAKE_CASE if needed | `IMAGE_TAG`, `CACHE_KEY` |
| File / script names | kebab-case | `image-versions-replace.py` |
| Deprecation notice | comment + README + map entry | `# DEPRECATED: use metadata-action` |

Rules:
1. Avoid abbreviations unless standard (`ref`, `sha`).
2. Prefer explicit over clever: `version-strategy` not `mode`.
3. Do not reuse one input for multiple unrelated concepts.
4. Add new outputs instead of overloading existing ones.

## 3. Modification Rules (Changing Existing Actions / Workflows)
When you change an existing action or reusable workflow you MUST follow these rules:

| Change Type | Allowed? | Requirements |
|-------------|----------|--------------|
| Add optional input | Yes (non-breaking) | Provide sensible default; document in README & examples |
| Add required input | Avoid | If unavoidable: treat as breaking → new major tag |
| Rename input | Not directly | Add new input, mark old as deprecated, maintain both ≥1 cycle |
| Remove deprecated input | Yes | Must be listed in deprecation map with prior notice |
| Change input semantics | Caution | Provide migration notes; if behaviour changes silently → breaking |
| Add output | Yes | Document; stable name (no future rename) |
| Remove / rename output | Breaking | Plan new major; keep old output until then |
| Permission escalation | Minimise | Justify in PR body; least privilege; document why needed |
| New external dependency | Yes if pinned | Pin version/SHA; verify license compatibility |
| Introduce secret usage | Caution | Avoid if possible; never echo; document required secrets |
| Breaking behaviour change | Only with major | Open issue first; migration notes; update README + deprecation map |
| Deprecate action/workflow | Yes | Add replacement, update map, announce in README if widely used |

Process for breaking changes:
1. Open issue (type: feature or task) with migration plan & rationale.
2. Mark impacted inputs/outputs as deprecated (soft stage) but keep functional.
3. Update deprecation map (old → replacement / removal date).
4. Release new major tag (e.g. create `v2`); keep `v1` stable (security patches only).
5. Communicate in PR description + README if widely adopted.

Permission changes checklist:
- List existing vs requested permissions diff.
- Justify every addition; remove any no longer required.
- Prefer job-level over workflow-wide broad permissions.

Version tag updates:
- For non-breaking additions: retag the moving major (e.g. move `v1` to new commit) after tests & review.
- For breaking: create new annotated tag `v2` and DO NOT move older majors.

Deprecating inputs/outputs:
1. Add comment in `action.yml` (if YAML) or README section.
2. Keep functional; emit warning log once (not every loop) when used.
3. Track in deprecation map until removal.

Security notes:
- Any new shell execution MUST quote variables.
- Validate externally supplied inputs (length / pattern) before using in commands.
- Use `set -euo pipefail` (bash) in added scripts.

## 4. Standard Inputs
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
## 5. Version Pinning
MUST pin to major tag or SHA. Critical flows: prefer SHA. Bad: `uses: repo/action@main`.

---
## 6. Outputs
Use stable nouns only. Example:
```yaml
steps:
    - id: meta
      uses: repo/metadata-action@v1
    - run: echo Version=${{ steps.meta.outputs.version }}
```

---
## 7. Security
Baseline:
```yaml
permissions:
    contents: read
```
Add only what you need (e.g. `contents: write`, `packages: write`). Prefer OIDC. No secret echoing.

---
## 8. Deprecation
Stages: Active → Deprecated (announce + replacement) → Sunset (deadline) → Removed.
Current map:
| Old | Replacement |
|-----|-------------|
| docker-publish (workflow) | docker-action |
| tag-creator (workflow) | tag-action |
| tag-checker | tag-action |
| commit-and-push | inline git steps |
| pom-updater | metadata-action + build tooling |

## 9. Issue Reporting (Pointer)
Full templates & acceptance bar: see `docs/issue-guidelines.md`.

Essentials you MUST include for a bug (summary only—do not duplicate template here):
1. Action/workflow name + exact version (tag or SHA)
2. Minimal reproducible workflow snippet (only failing job/step)
3. Expected vs actual (1–2 lines each)
4. Trimmed log fragment (redacted; no full dumps)
5. Environment (runner + key matrix vars)

For features: problem (motivation) before solution, acceptance criteria, boundaries. For tasks: rationale (tech debt / maintenance) + clear scope (no behaviour change unless declared).

Security-sensitive details: never in public issue—use private disclosure channel.

Triage flow: classify (bug / feature / task / question) → verify / reproduce (bugs) or validate scope (feature/task) → assign → milestone (if needed) → implement → close with resolution (PR link).

Response goals (not guarantees): initial triage <= 2 business days; critical security ASAP.