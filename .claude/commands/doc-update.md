# doc-updater

Update or create documentation for a specific GitHub Action or reusable workflow.

## Usage

```
/doc-updater <target> [commits|--full]
```

## Arguments

- `target` — action name (e.g. `metadata-action`) or reusable workflow name prefixed with `reusable/` (e.g. `reusable/docker-publish`). Required.
- `commits` — number of past commits to diff against. Default: `1`.
- `--full` — skip git diff, do a full resync of current code vs current docs.

## Examples

```
/doc-updater metadata-action
/doc-updater metadata-action 5
/doc-updater metadata-action --full
/doc-updater reusable/docker-publish 3
```

## What this command does

Execute the doc-updater skill logic defined in `.claude/skills/doc-updater/SKILL.md` with the arguments: $ARGUMENTS
