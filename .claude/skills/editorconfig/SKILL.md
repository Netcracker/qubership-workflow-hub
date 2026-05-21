---
name: editorconfig
description: Audit files for EditorConfig violations (final newline, trailing whitespace) and fix them in-place
arguments: [files]
---

# editorconfig

Audit files for EditorConfig violations defined in `.editorconfig` and fix them in-place.

## Arguments

- `$files` — space-separated list of files to audit. If omitted, audit all changed files
  in the current branch.

## Step-by-step instructions

### 1. Resolve target files

If `$files` is provided → use that list.

Otherwise run:

```bash
git diff main..HEAD --name-only
```

If no files changed — report "No changed files" and stop.

### 2. Read `.editorconfig` rules

The active `.editorconfig` at the repo root defines:

```ini
[{*,.*}]
charset = utf-8
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Key rules that can be auto-fixed:

| Rule                      | Applies to        | Value  |
| ------------------------- | ----------------- | ------ |
| `insert_final_newline`    | all files         | `true` |
| `trim_trailing_whitespace`| all except `*.md` | `true` |

### 3. Audit and fix each file

For each target file:

#### Rule: insert_final_newline

Read the file content. If the file does not end with `\n` — append a trailing newline using Edit.

#### Rule: trim_trailing_whitespace

Skip if the file matches `*.md`.

For all other files: if any line ends with one or more spaces or tabs — strip the trailing
whitespace from those lines using Edit.

### 4. Report to user

Print a summary:

- Files audited
- Violations found and fixed per rule (file path + line numbers where applicable)
- If no violations — confirm all files are clean
