# Issue Guidelines (Bug, Task & Feature Requests)

Purpose: ensure every issue is actionable, unambiguous, and reviewable before any PR starts.

---
## 1. Decide: Bug vs Feature vs Task
| Pick | When |
|------|------|
| Bug | Expected behaviour is broken or regressed |
| Feature | Net‑new capability or user visible expansion |
| Task | Internal maintenance: refactor, docs restructuring, CI/build, cleanup (no user visible feature) |

Unsure? Default to Feature (user facing) or Task (internal). Maintainers can relabel.

---
## 2. Title Conventions
Keep titles short (≤ 72 chars), specific, and solution‑agnostic.

| Type | Pattern | Examples |
|------|---------|----------|
| Bug | bug(scope): concise problem | `bug(container-cleanup): fails on 403 from API` |
| Feature | feat(scope): capability | `feat(metadata-action): dry-run preview mode` |
| Task | task(scope): maintenance goal | `task(ci): unify action version pinning` |

Scope = folder / component (e.g. `metadata-action`, `docker-action`, `docs`). Use lowercase kebab-case.

You may omit the prefix if using the issue form UI that already classifies it (but keep it for clarity if possible). PR titles MUST still follow Conventional Commits.

---
## 3. Required Fields – Bug
Provide ALL of the following. Incomplete bug reports may be closed as `invalid` after clarification ping.

```md
### Summary
<one sentence problem statement>

### Expected Behaviour
<what you thought would happen>

### Actual Behaviour
<what actually happened>

### Reproduction Steps
1. ...
2. ...
3. ...

### Minimal Example / Logs
<trimmed logs, command, workflow snippet>

### Environment
- Action / workflow version(s):
- Runner OS / architecture:
- Relevant inputs:

### Impact / Severity
<e.g. blocks release / minor annoyance / data risk>

### Hypothesis (Optional)
<what you think is wrong>

### Proposed Fix (Optional)
<idea if you have one>
```

Labels to add: `bug` + `scope:<area>` (+ `impact:performance` / `impact:security` if relevant).

---
## 4. Required Fields – Feature
```md
### Summary
<one sentence capability>

### Problem / Motivation
<why current state is insufficient>

### Proposed Solution
<high-level behaviour; avoid deep implementation details>

### Scope / Boundaries
In scope: ...
Out of scope: ...

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Alternatives Considered
- Option A – why rejected
- Option B – why rejected

### Risks / Considerations
<compatibility, security, performance>

### Follow-up / Future (Optional)
<items deliberately deferred>
```

Labels: `feature` + `scope:<area>`.

---
## 5. Required Fields – Task
For refactors, CI tweaks, dependency bumps, documentation restructuring.
```md
### Summary
<one sentence maintenance goal>

### Rationale
<why this is needed (tech debt, speed, reliability)>

### Scope / Boundaries
In scope: ...
Out of scope: ... (explicitly NOT changing behaviour)

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Risks / Considerations
<regression risk, rollout plan>
```

Labels: `task` + `scope:<area>`.

---
## 6. Project & Metadata
| Field | Guidance |
|-------|----------|
| Projects | Add to `Qubership-DevOps` (or relevant project board) |
| Assignees | Leave blank unless you plan to implement soon |
| Milestone | Set only if agreed with maintainers |
| Linked PRs | Create after issue is accepted, not before |

Fork contributors: you still can open issues; labels may need maintainer adjustment—ping politely if missing after 24h.

---
## 7. Labels (Quick Reference)
| Category | Examples | Notes |
|----------|----------|-------|
| Type | bug, feature, task | Exactly one |
| Scope | scope:actions, scope:workflows, scope:docs | Choose most specific |
| Impact | impact:security, impact:performance, impact:breaking | Add only if true |
| Help | help wanted, good first issue | Maintainers add after vetting |
| Status | blocked, needs-info | Keep updated for triage |

Maintainers may refine labels for consistency.

---
## 8. Quality Bar (Triage Criteria)
| Aspect | Bug | Feature | Task |
|--------|-----|---------|------|
| Clear summary | Required | Required | Required |
| Reproduction / Motivation | Steps + actual vs expected | Motivation + problem statement | Rationale (benefit / debt) |
| Logs / Evidence | Trimmed to essentials | Optional (unless perf/security) | Optional (unless perf impact) |
| Acceptance Criteria | Expected behaviour stated | Checklist | Checklist |
| Scope control | N/A | In/Out boundaries listed | In/Out boundaries (no behaviour change) |

Issues not meeting the bar may be tagged `needs-info` and closed if idle.

---
## 9. Example – Bug
```md
Title: bug(container-package-cleanup): fails on 403 from API

### Summary
Cleanup action aborts when registry returns transient 403 during layer deletion.

### Expected Behaviour
Action should retry limited times and continue cleaning remaining layers.

### Actual Behaviour
Fails immediately on first 403; leaves stale layers.

### Reproduction Steps
1. Trigger workflow with action version v1.2.3 against registry X
2. Observe 403 on second delete call
3. Action exits non-zero

### Minimal Example / Logs
`DELETE https://registry/v2/...` -> 403 (attached snippet)

### Environment
- Action version: v1.2.3
- Runner: ubuntu-22.04

### Impact / Severity
Leaves >300 stale layers; storage costs rising.

### Hypothesis
No retry logic for 403 (treated as fatal).
```

---
## 10. Example – Feature
```md
Title: feat(metadata-action): dry-run preview mode

### Summary
Add a dry-run mode to show computed tag values without pushing.

### Problem / Motivation
Users evaluating tagging logic need safe preview; current behaviour always pushes tags.

### Proposed Solution
Optional `dry-run` boolean input; when true, compute & log tags but skip push steps.

### Scope / Boundaries
In scope: input, logging, docs. Out: integration with docker-action (separate issue).

### Acceptance Criteria
- [ ] New input documented
- [ ] Logs show tags when dry-run true
- [ ] No tag push occurs in dry-run mode

### Alternatives Considered
Manual fork modifications – high friction.

### Risks / Considerations
Ensure no side effects executed before condition check.
```

---
## 11. Example – Task
```md
Title: task(ci): unify action version pinning

### Summary
Ensure all workflows pin internal actions to tagged major instead of @main.

### Rationale
Reduce drift risk and accidental breaking changes from unreleased commits.

### Scope / Boundaries
In scope: update YAML in reusable workflows + docs snippet.
Out of scope: changing action implementation.

### Acceptance Criteria
- [ ] All references use `@v1`
- [ ] Documentation updated

### Risks / Considerations
Need to create missing tags before updating references.
```

## 12. After Issue Creation
| Step | When |
|------|------|
| Maintainer triage (labels/clarify) | Within a few days |
| Convert to PR (self-assigned) | After approval / green light |
| Link PR to issue (`Fixes #id`) | In PR description |
| Close issue | Auto on merge if `Fixes` used |

---
Consistent, structured issues accelerate reviews and reduce back-and-forth.
