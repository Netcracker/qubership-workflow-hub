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

Execute the zizmor skill logic defined in `.claude/skills/zizmor/SKILL.md` with the arguments: $ARGUMENTS
