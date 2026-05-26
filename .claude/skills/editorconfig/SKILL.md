---
name: editorconfig
description: Audit files for EditorConfig violations (final newline, trailing whitespace, indent, line endings) and fix them in-place
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

### 2. Active `.editorconfig` rules

The full `.editorconfig` at the repo root defines the following rules:

```ini
[{*,.*}]
charset = utf-8
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.sh]
end_of_line = lf
indent_size = 4

[{*.bat,*.cmd}]
end_of_line = crlf

[*.go]
end_of_line = lf

[{go.mod,go.sum,*.go,.gitmodules}]
indent_style = tab
indent_size = 4

[Dockerfile]
indent_size = 4

[*.py]
profile = black

[*.md]
trim_trailing_whitespace = false
```

Rules that can be auto-fixed per file type:

| Rule | Applies to | Value |
| --- | --- | --- |
| `insert_final_newline` | all files | `true` |
| `trim_trailing_whitespace` | all except `*.md` | `true` |
| `end_of_line` | `*.sh`, `*.go`, `go.mod`, `go.sum`, `.gitmodules` | `lf` |
| `end_of_line` | `*.bat`, `*.cmd` | `crlf` |
| `indent_style` | `*.go`, `go.mod`, `go.sum`, `.gitmodules` | `tab` |
| `indent_size` | `*.sh`, `Dockerfile` | `4` spaces |
| `indent_size` | `*.go`, `go.mod`, `go.sum`, `.gitmodules` | `4` (tabs) |

Rules that **cannot be auto-fixed** — report to user:

| Rule | Applies to | Note |
| --- | --- | --- |
| `charset = utf-8` | all files | Binary-safe check only; re-encoding risks data loss |
| `profile = black` | `*.py` | Black formatting — run `black` separately |

### 3. Audit and fix each file

For each target file, apply only the rules relevant to its extension.

#### Rule: `insert_final_newline`

Read the file. If the last byte is not `\n` — append a trailing newline with Edit.

#### Rule: `trim_trailing_whitespace`

Skip `*.md` files entirely.

For all other files: strip trailing spaces and tabs from every line that has them.

#### Rule: `end_of_line`

- `*.sh`, `*.go`, `go.mod`, `go.sum`, `.gitmodules` — must use LF (`\n`). If CRLF (`\r\n`)
  lines are found — convert to LF.
- `*.bat`, `*.cmd` — must use CRLF (`\r\n`). If bare LF lines are found — convert to CRLF.

#### Rule: `indent_style` and `indent_size`

- `*.go`, `go.mod`, `go.sum`, `.gitmodules` — indentation must use tabs, not spaces.
  If space-indented lines are found — report to user (auto-converting spaces→tabs in Go
  source risks gofmt conflicts; safer to run `gofmt` or `goimports`).
- `*.sh`, `Dockerfile` — indentation must use 4 spaces per level. If 2-space indented
  lines are found — report to user (indent size changes can affect heredocs and multiline
  strings).

### 4. Report to user

Print a summary:

- Files audited
- Violations found and fixed per rule (file path + line numbers where applicable)
- Violations reported but not auto-fixed (charset, black profile, Go indent, shell indent)
- If no violations — confirm all files are clean
