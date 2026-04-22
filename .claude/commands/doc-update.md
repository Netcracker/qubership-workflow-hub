# doc-update

Update or create documentation for a specific GitHub Action or reusable workflow.

## Usage

```text
/doc-update <target> [commits|--full]
```

## Arguments

- `target` — action name (e.g. `metadata-action`) or reusable workflow name prefixed with `reusable/` (e.g. `reusable/docker-publish`). Required.
- `commits` — number of past commits to diff against. Default: `1`.
- `--full` — skip git diff, do a full resync of current code vs current docs.

## Examples

```text
/doc-update metadata-action
/doc-update metadata-action 5
/doc-update metadata-action --full
/doc-update reusable/docker-publish 3
```

## What this command does

Execute the doc-update skill logic defined in `.claude/skills/doc-update/SKILL.md` with the arguments: $ARGUMENTS
