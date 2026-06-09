---
name: markdown-rules
description: Markdownlint ruleset from super-linter. Apply when writing or editing any .md file.
arguments: [files]
---

# markdown-rules

Project markdownlint ruleset. Apply all rules in-memory before writing or editing any `.md` file.
When invoked via `/md-lint [files]`, audit and fix target files directly.

## Configuration

```json
{
  "default": true,
  "MD004": { "style": "consistent" },
  "MD007": { "indent": 2 },
  "MD013": { "line_length": 120, "code_blocks": false, "tables": false },
  "MD024": { "siblings_only": true },
  "MD029": { "style": "ordered" },
  "MD033": { "allowed_elements": ["img", "br", "a", "p"] },
  "MD041": false,
  "MD046": { "style": "fenced" }
}
```

`default: true` — all rules enabled unless overridden above.

## Rules

| Rule | Violation | Fix |
| --- | --- | --- |
| MD001 | Heading skips a level (`##` → `####`) | Add missing intermediate level |
| MD003 | Setext-style heading (`===`, `---`) | Convert to ATX (`# H1`, `## H2`) |
| MD004 | Mixed list markers (`-`, `*`, `+`) | Standardise to `-` |
| MD005 | Sibling list items at different indent depths | Align to same indent level |
| MD007 | Nested list indent ≠ 2 spaces per level | Re-indent to 2-space increments |
| MD009 | Trailing whitespace | Strip trailing spaces |
| MD010 | Hard tab `\t` | Replace with spaces (2 for lists, 4 for code alignment) |
| MD011 | Reversed link `(text)[url]` | Swap to `[text](url)` |
| MD012 | Two or more consecutive blank lines | Collapse to one blank line |
| MD013 | Prose line > 120 chars (code blocks and tables exempt) | Wrap at word boundary; leave URLs as-is |
| MD014 | `$`-prefixed commands in code block with no output shown | Remove `$` prefixes |
| MD018 | No space after `#` in heading | Add space: `# Heading` |
| MD019 | Multiple spaces after `#` in heading | Reduce to one space |
| MD022 | Heading not preceded or followed by blank line | Insert blank lines around heading |
| MD023 | Heading indented (leading spaces) | Remove leading spaces |
| MD024 | Duplicate sibling heading (same level, no higher-level between them) | Rename one to be distinct |
| MD025 | More than one `#` heading in file | Demote extras to `##` |
| MD026 | Heading ends with `.`, `,`, `;`, `!`, `?`, `:` | Remove trailing punctuation |
| MD027 | Multiple spaces after `>` in blockquote | Reduce to one space |
| MD029 | Ordered list item numbers are not sequential (e.g. `1, 3, 4` or gap after code block) | Renumber sequentially: `1. 2. 3.` — never skip, never repeat |
| MD030 | More than one space after list marker | Normalise to one space |
| MD031 | No blank line before/after fenced code block | Insert missing blank lines |
| MD032 | List not surrounded by blank lines | Insert blank lines before first and after last item |
| MD033 | Inline HTML other than `img`, `br`, `a`, `p` | Replace with markdown equivalent |
| MD034 | Bare URL not wrapped | Wrap: `<https://…>` or `[label](url)` |
| MD035 | Mixed horizontal rule styles | Standardise to `---` |
| MD036 | Lone `**text**` or `_text_` used as fake heading | Replace with proper heading |
| MD037 | Spaces inside emphasis markers `* text *` | Remove inner spaces |
| MD038 | Spaces inside code span `` ` value ` `` | Remove inner spaces |
| MD039 | Spaces inside link text `[ text ](url)` | Remove inner spaces |
| MD040 | Fenced code block has no language identifier | Add language (`bash`, `yaml`, `json`, `text`, etc.) |
| MD041 | **Disabled** — files need not start with `#` | — |
| MD042 | Empty link target `[text]()` | Add URL or remove link |
| MD045 | Image with no alt text `![]()` | Add descriptive alt text |
| MD046 | 4-space indented code block | Replace with fenced block |
| MD047 | File does not end with a single newline | Ensure exactly one trailing `\n` |
| MD048 | Tilde fence `~~~` | Replace with backtick fence |
| MD049 | Mixed emphasis styles `*` and `_` | Standardise to `*` |
| MD050 | Mixed strong styles `**` and `__` | Standardise to `**` |
| MD051 | Link fragment `#anchor` does not match any heading | Correct to existing heading slug |
| MD053 | Unused reference-style link definition | Remove unused definition |
| MD055 | Inconsistent table pipe style | Always include leading and trailing `\|` |
| MD056 | Table row has wrong cell count | Add/remove cells to match header |
| MD058 | Table not surrounded by blank lines | Insert blank lines before and after table |

## Special cases

**Nested code blocks** — markdownlint does not allow ` ```lang ` inside another ` ```lang `.
Tilde fences (`~~~`) are also prohibited (MD048). Solution: close the outer block, show the
inner example as a standalone fenced block in a separate paragraph.

**MD029 + code fences in lists** — a fenced code block inside a list item (indented 3+ spaces)
continues the list without resetting the counter, provided the fence is indented under the item.
An unindented fence breaks the list and resets the counter — the next item must start from `1.`
again. When auditing: scan the whole list, detect any counter gaps or resets, and renumber the
entire sequence `1. 2. 3. …` end-to-end. If a gap is caused by a misplaced unindented fence,
either indent the fence under its list item or convert the list to bullet points (`-`).

**MD040 language identifiers** — use `text` for plain text, directory trees, or any content
that has no specific language. Never leave the opening fence bare.

## When invoked via /md-lint

1. If files provided → audit those files. Otherwise resolve base ref in priority order:
   `baseRefName` from the open PR (`gh pr view --json baseRefName`), default branch
   (`gh repo view --json defaultBranchRef`), or `main` as final fallback (warn the user).
   Then run `git diff <BASE>..HEAD --name-only | grep '\.md$'`.
2. Read each file, check all rules above, collect violations.
3. Fix all violations directly with Edit. Do not ask the user.
4. If a violation cannot be safely auto-fixed (e.g. MD056 with unknown content, MD051 with
   ambiguous target), report it and explain why.
5. Report: files audited, violations found per rule, fixed vs skipped.
