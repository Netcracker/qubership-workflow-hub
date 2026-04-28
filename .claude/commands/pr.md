# pr

Create or update a pull request with a title and description following the project conventions.

## Usage

```text
/pr [update] [base-branch]
```

## Arguments

- `update` — if provided, update the description of the already-open PR for the current branch instead of creating a new one.
- `base-branch` — branch to compare against. Default: `main`.

## Examples

```text
/pr
/pr update
/pr develop
/pr update develop
```

## What this command does

Execute the pull-request skill logic defined in `.claude/skills/pull-request/SKILL.md` with the arguments: $ARGUMENTS
