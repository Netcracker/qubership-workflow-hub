# md-lint

Audit markdown files for markdownlint violations and fix them.

## Usage

```text
/md-lint [files...]
```

## Arguments

- `files` — one or more specific `.md` files to audit. If omitted, audits all changed
  `.md` files in the current branch.

## Examples

```text
/md-lint
/md-lint actions/my-action/README.md
/md-lint actions/my-action/README.md docs/reusable/docker-publish.md
```

## What this command does

Execute the markdown-rules skill logic defined in `.claude/skills/markdown-rules/SKILL.md` with the arguments: $ARGUMENTS
