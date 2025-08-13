# Contribution & Pull Request Conduct

Purpose: fast, traceable, low‑risk merges. Use this checklist before requesting review.

---
## 1. At a Glance Checklist
| Item | Requirement | OK? |
|------|-------------|-----|
| Issue linked | `Fixes #123` / `Related to #123` | |
| Title format | `<type>(scope): imperative` | |
| Scope stated | Folder/component name | |
| Tests / evidence | Output, log, or rationale | |
| Docs updated (if inputs/outputs change) | README / conventions | |
| Permissions unchanged or justified | Least privilege | |
| Labels set | At least one type | |
| All CI checks green | Required workflows pass | |

If any cell blank → keep as draft.

---
## 2. Required PR Fields
| Field | What to Put | Example |
|-------|-------------|---------|
| Title | Conventional commit | `feat(metadata-action): add dry-run` |
| Scope / Project | Path or component | `actions/metadata-action` |
| Issue | `Fixes #342` | `Fixes #342` |
| Summary | 1–3 lines what & why | "Add dry-run preview mode" |
| Type | feat / fix / docs / refactor / chore / perf / ci / build / test / deprecate / revert | `feat` |
| Breaking | Yes/No (+ migration if Yes) | `No` |
| Evidence | Test run, log snippet, rationale | "Existing tests cover" |
| Labels | One+ classification label | `feature` |

Template:
```md
### Summary
<what & why>
### Issue
Fixes #<id>
### Type
feat | fix | docs | refactor | chore | perf | ci | build | test | deprecate | revert
### Breaking Change?
No
### Scope / Project
<component>
### Implementation Notes
<optional>
### Tests / Evidence
<how verified>
### Additional Notes
<optional>
```

### Title Rules
Format: `<type>(optional-scope): imperative statement` (≤ 72 chars, no trailing period, no issue number).
Types: feat, fix, docs, refactor, perf, test, ci, build, chore, revert, deprecate.
Good: `fix(container-package-cleanup): handle 403 errors`.

---

## 3. Labels (Quick)
Primary: feature, enhancement, bug, documentation, refactor.
Supporting: ci, perf, question, help wanted, good first issue, wontfix, duplicate, invalid.
Rule: pick ONE primary; do not mix feature + enhancement. Behaviour change ≠ refactor.

**IMPORTANT:** If your PR is from a fork, labels will NOT be set automatically. You MUST add them manually in the GitHub UI after opening the PR.

---
## 4. Issue Linking
Always link an issue (except trivial typo). Use auto-close keywords:
`Fixes #123` / `Closes #123`; use `Related to #456` for non-closing references.
No issue? Create it first with context + acceptance criteria.
For detailed guidelines on creating issues, see `docs/issue-guidelines.md`.

---
## 5. Quality & Review
| Aspect | Expectation |
|--------|-------------|
| Style | Follow existing patterns; no mass reformat |
| Security | No new secrets; minimal permissions |
| Compatibility | Avoid breaking change or document migration |
| Tests | Cover new logic OR justify absence |
| Commits | Prefer squash (clean history) |
| Diff | Only related changes |

Review Flow: Draft (early) → Fill template → Add labels → Request reviewers → Address comments (amend) → All checks green → Final title/summary pass → Merge.

---
## 6. Example PR (Good)
Real example: https://github.com/Netcracker/qubership-workflow-hub/pull/293
```md
### Summary
Add 'dry-run' input to metadata-action to allow safe preview of computed tags.
### Issue
Fixes #342
### Type
feat
### Breaking Change?
No
### Scope / Project
actions/metadata-action
### Implementation Notes
Adds optional input `dry-run`; skips tag push when true. Updated README.
### Tests / Evidence
Manual run in fork (logs). Existing computation test still passes.
```

---
## 7. Common Rejection Reasons
| Reason | Fix |
|--------|-----|
| No linked issue | Add `Fixes #id` |
| Title not conventional | Rephrase to `<type>(scope): ...` |
| Missing labels | Add primary type label |
| Undocumented new input/output | Update README / conventions |
| Hidden breaking change | Add section + migration notes |
| Excess unrelated changes | Split into separate PRs |
| Opaque branch name | Rename or clarify in summary |

---
## 8. After Merge
| Action | When |
|--------|------|
| Confirm auto-closed issue | Immediately |
| Update changelog / release notes | Feature / fix merge |
| Tag action version (if changed) | Post-merge validation |
| Announce deprecation (if any) | Before tagging |
| Delete merged branch | Once rollback risk low |

Support: questions → issue with `documentation` label.

Consistent hygiene keeps reviews fast and predictable.
