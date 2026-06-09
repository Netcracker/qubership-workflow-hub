---
name: project_apm_skill_mirror
description: APM skills live in agent-packages/ — the canonical location for qubership-actions-guide, qubership-templates-guide, qubership-workflow-conventions
metadata:
  type: project
---

APM skills are stored in:

```
agent-packages/qubership-workflow-hub-usage/.apm/skills/<skill-name>/
```

Confirmed skills at this location:

| Skill | APM path |
| --- | --- |
| `qubership-actions-guide` | `agent-packages/qubership-workflow-hub-usage/.apm/skills/qubership-actions-guide/` |
| `qubership-templates-guide` | `agent-packages/qubership-workflow-hub-usage/.apm/skills/qubership-templates-guide/` |
| `qubership-workflow-conventions` | `agent-packages/qubership-workflow-hub-usage/.apm/skills/qubership-workflow-conventions/` |

`.claude/skills/` only contains repo-internal tooling: `editorconfig`, `markdown-rules`, `pull-request`, `doc-update`, `zizmor`. The three APM skills do NOT exist in `.claude/skills/`.

**Why:** APM is the authoritative runtime for these skills; `.claude/skills/` is for Claude Code slash-command tooling only.
**How to apply:** Always edit APM skills directly in `agent-packages/...` — do not look in `.claude/skills/` for `qubership-actions-guide`, `qubership-templates-guide`, or `qubership-workflow-conventions`.
