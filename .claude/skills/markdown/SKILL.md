---
name: markdown
description: Audit markdown files for markdownlint violations and fix them, or validate generated content before writing
arguments: [files]
---

# markdown

Audit `.md` files for markdownlint violations using the project's active ruleset,
then fix all violations directly. Also used as a pre-write validator when other skills
generate markdown content.

## Arguments

- `$files` — space-separated list of files to audit. If omitted, audit all changed `.md`
  files in the current branch.

## Configuration

Active config: `netcracker/.github` → `config/linters/.markdownlint.json`

```json
{
  "default": true,
  "MD004": { "style": "consistent" },
  "MD007": { "indent": 2 },
  "MD013": { "line_length": 120, "code_blocks": false, "tables": false },
  "MD024": { "siblings_only": true },
  "MD029": { "style": "one" },
  "MD033": { "allowed_elements": ["img", "br", "a", "p"] },
  "MD041": false,
  "MD046": { "style": "fenced" }
}
```

`default: true` enables all rules not explicitly overridden.

## Step-by-step instructions

### 1. Resolve target files

If `$files` is provided → use that list.

Otherwise run:

```bash
git diff main..HEAD --name-only | grep '\.md$'
```

If no `.md` files found — report "No markdown files changed" and stop.

### 2. Read each file

Read the full content of every target file. Run all checks in step 3 against each file.

### 3. Audit rules

Check every active rule below in order. Collect all violations before fixing.

#### MD001 — heading-increment

Heading levels must only increment by one at a time (e.g. `##` → `###`, not `##` → `####`).

**Flag if:** a heading skips a level compared to the previous heading.

**Fix:** Add the missing intermediate heading level or adjust the heading depth.

#### MD003 — heading-style

All headings in a file must use the same style (ATX: `# Heading`, not setext underline style).

**Flag if:** any heading uses `===` or `---` underline style.

**Fix:** Convert to ATX style (`# H1`, `## H2`).

#### MD004 — ul-style (config: `consistent`)

Unordered list markers must be consistent within a file. Project uses `-` by convention.

**Flag if:** a file mixes `-`, `*`, and `+` markers.

**Fix:** Standardise all bullet markers to `-`.

#### MD005 — list-indent

List items at the same nesting level must use consistent indentation.

**Flag if:** sibling list items have different indentation depths.

**Fix:** Align sibling items to the same indent level.

#### MD007 — ul-indent (config: indent 2)

Unordered list items must be indented by exactly 2 spaces per nesting level.

**Flag if:** nested list items use 4-space or other indentation.

**Fix:** Re-indent to 2-space increments per level.

#### MD009 — no-trailing-spaces

Lines must not have trailing whitespace.

**Flag if:** any line ends with one or more spaces (except intentional `  ` line breaks).

**Fix:** Strip trailing spaces from every line.

#### MD010 — no-hard-tabs

Hard tab characters must not be used.

**Flag if:** any line contains a `\t` tab character.

**Fix:** Replace tabs with the appropriate number of spaces (2 for lists, 4 for code alignment).

#### MD011 — no-reversed-links

Link syntax must not be reversed.

**Flag if:** `(text)[url]` appears instead of `[text](url)`.

**Fix:** Swap the brackets and parentheses.

#### MD012 — no-multiple-blanks

No more than one consecutive blank line is allowed.

**Flag if:** two or more consecutive blank lines appear anywhere in the file.

**Fix:** Collapse multiple blank lines to a single blank line.

#### MD013 — line-length (config: 120 chars, code blocks and tables exempt)

Lines must not exceed 120 characters. Code block lines and table rows are exempt.

**Flag if:** any prose line exceeds 120 characters.

**Fix:** Wrap at a natural word boundary before the 120-character limit. URLs in link
syntax cannot be wrapped — leave them as-is.

#### MD014 — commands-show-output

Shell commands in code blocks must not be prefixed with `$` unless the output is also shown.

**Flag if:** a bash/sh code block has every command prefixed with `$` but shows no output.

**Fix:** Remove the `$` prefixes.

#### MD018 — no-missing-space-atx

ATX headings must have a space after the `#` characters.

**Flag if:** `#Heading` with no space.

**Fix:** Add a space: `# Heading`.

#### MD019 — no-multiple-space-atx

ATX headings must have only one space after the `#` characters.

**Flag if:** `#  Heading` with multiple spaces.

**Fix:** Reduce to one space.

#### MD022 — blanks-around-headings

Every heading must be preceded and followed by a blank line (except at the very start of the file).

**Flag if:** a heading has no blank line before it (when not at file start) or after it.

**Fix:** Insert blank lines around every heading.

#### MD023 — heading-start-left

Headings must start at the beginning of the line (no leading spaces or indentation).

**Flag if:** a heading line is indented.

**Fix:** Remove the leading spaces.

#### MD024 — no-duplicate-heading (config: `siblings_only`)

Duplicate heading text is only flagged for sibling headings (same level, no higher-level
heading between them).

**Flag if:** two headings at the same depth with identical text appear consecutively
with no intervening higher-level heading.

**Fix:** Rename one of the duplicate sibling headings to be distinct.

#### MD025 — single-h1

Only one top-level `# Heading` is allowed per file.

**Flag if:** more than one `#` heading appears in the file.

**Fix:** Demote the extra `#` headings to `##` or reorganise the structure.

#### MD026 — no-trailing-punctuation

Headings must not end with punctuation (`.`, `,`, `;`, `!`, `?`, `:`).

**Flag if:** a heading ends with any of those characters.

**Fix:** Remove the trailing punctuation from the heading.

#### MD027 — no-multiple-space-blockquote

Blockquotes must have exactly one space after the `>` marker.

**Flag if:** `>  text` with multiple spaces after `>`.

**Fix:** Reduce to one space.

#### MD029 — ol-prefix (config: `one`)

All ordered list items must use `1.` as the prefix — the renderer handles numbering.

**Flag if:** ordered list items use `2.`, `3.`, `4.`, etc.

**Note:** Code fences between list items reset the counter — markdownlint treats each
segment as a new list. For lists containing embedded code blocks, use bullet points (`-`)
instead to avoid the issue entirely.

**Fix:** Replace every numbered prefix with `1.`.

#### MD030 — list-marker-space

There must be exactly one space after a list marker (`-`, `*`, `+`, `1.`).

**Flag if:** `- text` has multiple spaces, or no space after the marker.

**Fix:** Normalise to exactly one space after each marker.

#### MD031 — blanks-around-fences

Fenced code blocks must have a blank line immediately before the opening ` ``` ` and
after the closing ` ``` `.

**Flag if:** a fence line is not preceded or followed by a blank line.

**Fix:** Insert the missing blank lines.

#### MD032 — blanks-around-lists

List blocks (bullet or numbered) must be surrounded by blank lines when adjacent to
non-list content.

**Flag if:** a list starts or ends without a blank line separating it from surrounding prose.

**Fix:** Insert blank lines before the first item and after the last item.

#### MD033 — no-inline-html (config: allowed `img`, `br`, `a`, `p`)

Only the allowed HTML tags may appear inline: `<img>`, `<br>`, `<a>`, `<p>`.

**Flag if:** any other HTML tag appears inline (e.g. `<div>`, `<span>`, `<b>`, `<table>`).

**Fix:** Replace with the markdown equivalent or remove. Bold → `**text**`,
italic → `_text_`, tables → markdown pipe tables.

#### MD034 — no-bare-urls

URLs must not appear bare — they must be wrapped in angle brackets or used in link syntax.

**Flag if:** a URL like `https://example.com` appears as plain text.

**Fix:** Wrap in angle brackets `<https://example.com>` or use `[label](url)` syntax.

#### MD035 — hr-style

Horizontal rules must use a consistent style throughout the file.

**Flag if:** the file mixes `---`, `***`, and `___` as horizontal rules.

**Fix:** Standardise to `---`.

#### MD036 — no-emphasis-as-heading

Bold or italic emphasis must not be used as a substitute for a heading.

**Flag if:** a paragraph consists of only `**text**` or `_text_` on its own line
(often used as a fake heading).

**Fix:** Replace with a proper markdown heading (`##`, `###`, etc.).

#### MD037 — no-space-in-emphasis

No spaces inside emphasis markers.

**Flag if:** `* text *` or `_ text _` with spaces inside.

**Fix:** Remove the inner spaces: `*text*`, `_text_`.

#### MD038 — no-space-in-code

No spaces inside backtick code spans.

**Flag if:** `` ` value ` `` with leading or trailing spaces inside the backticks.

**Fix:** Remove the spaces: `` `value` ``.

#### MD039 — no-space-in-links

No spaces inside link text brackets.

**Flag if:** `[ text ](url)` with leading or trailing spaces inside `[]`.

**Fix:** Remove the spaces: `[text](url)`.

#### MD040 — fenced-code-language

Every fenced code block must declare a language identifier.

**Flag if:** a ` ``` ` opening fence has no language after it.

**Common identifiers:** `bash`, `sh`, `yaml`, `json`, `text`, `markdown`, `python`,
`javascript`, `typescript`, `go`, `sql`, `xml`, `html`, `dockerfile`.

When the content is plain text or a directory tree → use `text`.

**Fix:** Add the appropriate language identifier on the opening fence line.

#### MD041 — first-line-h1

**Disabled** (`MD041: false`). No action needed — files do not need to start with `#`.

#### MD042 — no-empty-links

Links must not have empty targets.

**Flag if:** `[text]()` or `[text][]` with no URL or reference.

**Fix:** Add a valid URL or remove the link.

#### MD045 — no-alt-text

Images must have alt text.

**Flag if:** `![]( url)` with empty alt text.

**Fix:** Add descriptive alt text: `![description](url)`.

#### MD046 — code-block-style (config: `fenced`)

Code blocks must use fenced style (` ``` `) — never 4-space indented blocks.

**Flag if:** a block of 4-space indented lines is being interpreted as a code block.

**Fix:** Replace with ` ```text ` ... ` ``` ` fenced block.

#### MD047 — single-trailing-newline

Files must end with exactly one newline character.

**Flag if:** the file has no trailing newline or has multiple trailing newlines.

**Fix:** Ensure the file ends with a single `\n`.

#### MD048 — code-fence-style (default: backtick)

Fenced code blocks must use backtick style (` ``` `) — not tilde (`~~~`).

**Flag if:** any fence uses `~~~`.

**Fix:** Replace `~~~` with ` ``` `, preserving any language identifier.

#### MD049 — emphasis-style

Emphasis must use a consistent style — prefer `*` (asterisk) over `_` (underscore).

**Flag if:** the file mixes `*text*` and `_text_` for emphasis.

**Fix:** Standardise to `*text*`.

#### MD050 — strong-style

Strong emphasis must use a consistent style — prefer `**` over `__`.

**Flag if:** the file mixes `**text**` and `__text__`.

**Fix:** Standardise to `**text**`.

#### MD051 — link-fragments

Link fragments (anchors) must point to a heading that exists in the file.

**Flag if:** `[text](#some-heading)` where `some-heading` does not match any heading slug.

**Fix:** Correct the fragment to match an existing heading slug (lowercase, spaces → `-`,
punctuation removed).

#### MD053 — link-image-reference-definitions

All reference-style link and image definitions must be used.

**Flag if:** a `[label]: url` definition exists but `[label]` is never referenced.

**Fix:** Remove the unused definition.

#### MD055 — table-pipe-style

Table pipes must use a consistent style throughout the file (leading and trailing pipes).

**Flag if:** some table rows have leading/trailing `|` and others do not.

**Fix:** Standardise — always include leading and trailing `|` on every row.

#### MD056 — table-column-count

Every table row must have the same number of cells as the header row.

**Flag if:** a body or separator row has more or fewer `|`-delimited cells than the header.

**Fix:** Add or remove cells to match the header column count. If content is unknown,
add empty cells `| |`.

#### MD058 — blanks-around-tables

Tables must be surrounded by blank lines.

**Flag if:** a table starts or ends without a blank line separating it from adjacent content.

**Fix:** Insert blank lines before and after every table block.

### 4. Nested code blocks

Markdownlint does not allow ` ```lang ` inside another ` ```lang ` block, and MD048
prohibits tilde fences as a workaround. When content requires a code example inside
a larger block:

- Close the outer block before the inner example
- Show the inner example as its own standalone fenced block in a separate paragraph
- Never use 4-space indented blocks (MD046) or tilde fences (MD048) as alternatives

### 5. Self-check before writing (for skills generating content)

When called by another skill to validate generated markdown **before** writing to disk,
scan the generated content string against every rule in step 3 and fix all violations
in-memory. Only after the content passes every check should the calling skill proceed to Write.

### 6. Fix all violations

Apply all fixes directly to the file using Edit. Do not ask the user. After fixing all
files, report what was changed.

If a violation cannot be safely auto-fixed (e.g. MD056 where missing content is unknown,
or MD051 where the correct target heading is ambiguous), report it clearly and explain why.

### 7. Report to user

Print a summary:

- Files audited
- Violations found per rule (rule ID + count)
- Violations fixed vs skipped (with reason for skips)
- If no violations — confirm all files are clean
