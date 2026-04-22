# markdown

Audit markdown files for markdownlint violations and fix them.

## Usage

```text
/markdown [files...]
```

## Arguments

- `files` — one or more specific `.md` files to audit. If omitted, audits all changed
  `.md` files in the current branch.

## Examples

```text
/markdown
/markdown actions/my-action/README.md
/markdown actions/my-action/README.md docs/reusable/docker-publish.md
```

## What this command does

Execute the markdown skill logic defined in `.claude/skills/markdown/SKILL.md` with the arguments: $ARGUMENTS
