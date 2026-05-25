# doc-update

Update or create documentation for a specific GitHub Action or reusable workflow.

## Usage

```text
/doc-update <target>
/doc-update --all
```

## Arguments

- `target` — action name (e.g. `metadata-action`) or reusable workflow name prefixed with `reusable/` (e.g. `reusable/docker-publish`). Required unless `--all` is used.
- `--all` — find all changed actions and reusable workflows from `git diff main..HEAD` and update their docs. No `target` needed.

## Examples

```text
/doc-update metadata-action
/doc-update reusable/docker-publish
/doc-update --all
```

## What this command does

Execute the doc-update skill logic defined in `.claude/skills/doc-update/SKILL.md` with the arguments: $ARGUMENTS
