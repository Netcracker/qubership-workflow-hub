# pr-description

Generate and apply a pull request title and description following the project conventions.

## Usage

```
/pr-description [update] [base-branch]
```

## Arguments

- `update` — if provided, update the description of the already-open PR for the current branch instead of creating a new one.
- `base-branch` — branch to compare against. Default: `main`.

## Examples

```
/pr-description
/pr-description update
/pr-description develop
/pr-description update develop
```

## What this command does

Execute the pr-description skill logic defined in `.claude/skills/pr-description/SKILL.md` with the arguments: $ARGUMENTS
