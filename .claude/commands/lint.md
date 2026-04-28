# lint

Audit all changed files on the current branch for markdownlint and zizmor violations,
fix them in-place, and commit the fixes.

## Usage

```text
/lint [base-branch]
```

## Arguments

- `base-branch` — branch to compare against. Default: `main`.

## Examples

```text
/lint
/lint develop
/lint release/2.0
```

## What this command does

Execute the lint skill logic defined in `.claude/skills/lint/SKILL.md` with the arguments: $ARGUMENTS
