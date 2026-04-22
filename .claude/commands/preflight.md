# preflight

Run markdown and zizmor audits on all changed files, fix violations, and commit the fixes.

## Usage

```text
/preflight [base-branch]
```

## Arguments

- `base-branch` — branch to compare against. Default: `main`.

## Examples

```text
/preflight
/preflight develop
/preflight release/2.0
```

## What this command does

Execute the preflight skill logic defined in `.claude/skills/preflight/SKILL.md` with the arguments: $ARGUMENTS
