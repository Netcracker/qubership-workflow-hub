# workflow-audit

Audit GitHub Actions workflow and action files for security issues and fix violations.

## Usage

```text
/workflow-audit [files...]
```

## Arguments

- `files` — one or more specific files to audit (e.g. `.github/workflows/release.yaml`).
  If omitted, audits all changed workflow and action yml files in the current branch.

## Examples

```text
/workflow-audit
/workflow-audit .github/workflows/release.yaml
/workflow-audit .github/workflows/release.yaml actions/my-action/action.yml
```

## What this command does

1. Execute the zizmor skill logic defined in `.claude/skills/zizmor/SKILL.md` with the arguments: $ARGUMENTS
2. Execute the EditorConfig skill logic defined in `.claude/skills/editorconfig/SKILL.md` on the same files.
3. Execute the markdown skill logic defined in `.claude/skills/md-lint/SKILL.md` on any `.md` files among the same targets.
