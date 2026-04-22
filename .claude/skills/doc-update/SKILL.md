---
name: doc-update
description: Update or create documentation for a specific action or reusable workflow based on git diff and action.yml
arguments: [target, commits]
---

# doc-updater

Update or create documentation for a specific GitHub Action or reusable workflow.

## Arguments

- `$target` — action name (e.g. `metadata-action`) or reusable workflow name (e.g. `reusable/docker-publish`). Required.
- `$commits` — number of past commits to diff against. Default: `1`. Pass `--full` to skip git diff and do a full resync of code vs docs.

## Step-by-step instructions

### 1. Parse arguments

- `TARGET` = `$target` (required)
- If `$commits` is `--full` or not provided alongside `--full` flag → `MODE` = `full-resync`, skip step 4
- Otherwise → `MODE` = `diff`, `N` = `$commits` if provided, otherwise `1`

### 2. Resolve latest release tag

Run:

```bash
git tag --list 'v*' --sort=-version:refname | head -1
```

- If a tag is found → `RELEASE_TAG` = that tag (e.g. `v2.2.0`)
- If no tags found → `RELEASE_TAG` = `v1`

Use `RELEASE_TAG` everywhere a version pin appears in the generated documentation (Usage examples, Notes).

### 3. Resolve paths

If `$target` starts with `reusable/`:

- Extract workflow name: strip `reusable/` prefix
- `YML_PATH` = `.github/workflows/re-<name>.yml`
- `DOC_PATH` = `docs/reusable/<name>.md`
- `TYPE` = `workflow`

Otherwise:

- `YML_PATH` = `actions/<target>/action.yml`
- `DOC_PATH` = `actions/<target>/README.md`
- `TYPE` = `action`

### 4. Collect git diff (diff mode only)

Skip this step if `MODE` = `full-resync`.

Run the following to get full code diff:

```bash
git diff HEAD~N..HEAD -- <scope>
```

Where `<scope>` is:

- For action: `actions/<target>/`
- For workflow: `.github/workflows/re-<name>.yml`

Also run to get list of changed files:

```bash
git diff --name-only HEAD~N..HEAD -- <scope>
```

If no changed files found — inform the user and stop.

### 5. Read source files

Read `YML_PATH` in full:

- For actions: extract `name`, `description`, `inputs`, `outputs`, `runs.using`, and all `steps`
- For workflows: extract `name`, `on.workflow_call.inputs`, `on.workflow_call.secrets`, and all `jobs`

Read `DOC_PATH` if it exists — to understand current documentation state.

In `diff` mode: also read any referenced scripts or source files that appear in the diff (e.g. `src/index.js`, `*.py`).

In `full-resync` mode: read ALL source files in the action/workflow directory — `src/index.js`, any `*.py`, any shell scripts referenced in steps.

### 6. Analyse the changes

**In `diff` mode:** using the full diff content and source files, understand:

- What new behaviour was added or changed
- What inputs/outputs were added, removed, or modified
- What steps or jobs changed and what they do
- What bug was fixed or feature was introduced

**In `full-resync` mode:** compare current code and `action.yml` against current `README.md` and identify all discrepancies:

- Inputs/outputs in yml but missing or wrong in README
- Behaviour in code not described in README
- Descriptions in README that no longer match the code
- Sections that are outdated, incomplete, or absent

This analysis is the basis for updating all documentation sections.

### 7. Decide: create or update

**If `DOC_PATH` does not exist** → CREATE mode: generate full README from scratch using the templates below.

**If `DOC_PATH` exists** → UPDATE mode: rewrite every section based on current state of the code and yml. The only section never overwritten is `## Usage` / `## Usage Example` — preserve it as-is.

### 8. Sections and update rules

| Section | CREATE | UPDATE |
|---|---|---|
| Title (`# Name`) | Generate from `action.yml: name` | Regenerate |
| Short description | Generate from `action.yml: description` | Regenerate |
| `## Features` | Derive from yml steps + inputs + logic | Regenerate from current code |
| `## 📌 Inputs` | Generate from yml inputs | Regenerate from yml |
| `## 📌 Outputs` | Generate from yml outputs | Regenerate from yml |
| `## 📌 Secrets` | Generate from yml secrets (workflows) | Regenerate from yml |
| `## How it works` | Generate from steps/jobs logic | Regenerate from current code |
| `## Additional Information` | Generate detailed explanations for non-obvious inputs | Regenerate |
| `## Notes` | Generate key usage warnings and tips | Regenerate |
| `## Troubleshooting` | Omit if no common issues known | Regenerate if exists |
| `## Usage` / `## Usage Example` | Generate once with required inputs | Never overwrite structure, but always update the version pin (`@vX.Y.Z`) to `RELEASE_TAG` |

### 9. README template for new ACTION

The `## Usage` section must include a complete workflow example that shows `permissions`, `runs-on`, checkout, and the action step. Derive the `permissions` block from what the action actually needs. Always include at least `contents: read` as a baseline. Place the `permissions` block at the job level, not the workflow level.

Generate the README with this structure (all sections separated by `---`):

- `# 🚀 <name>` — title from `action.yml: name`
- short description paragraph
- `## Features` — bullet list of key capabilities
- `## 📌 Inputs` — table with columns: Name, Description, Required, Default
- `## 📌 Outputs` — table with columns: Name, Description
- `## How it works` — numbered steps derived from action.yml steps and source code
- `## Additional Information` — subsections explaining non-obvious inputs or behaviours
- `## Usage` — complete workflow YAML example (see format below)
- `## Notes` — bullet list of key warnings and tips

The `## Usage` section must contain a fenced yaml block:

```yaml
name: Example workflow

on:
  workflow_dispatch:

jobs:
  example:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Run action
        uses: netcracker/qubership-workflow-hub/actions/<target>@RELEASE_TAG
        with:
          required-input: value
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Always end the Notes section with: `Always pin to @RELEASE_TAG or a specific SHA — never @main in production.`

### 10. README template for new REUSABLE WORKFLOW

Generate with this structure (no `---` separators for workflows):

- `# 🚀 <name>` — title
- short description paragraph
- `## Features` — bullet list of key capabilities
- `## 📌 Inputs` — table with columns: Name, Description, Required, Default
- `## 📌 Secrets` — table with columns: Name, Description, Required
- `## How it works` — numbered steps
- `## Additional Information` — subsections explaining non-obvious inputs
- `## Usage Example` — fenced yaml block calling the workflow
- `## Notes` — bullet list of key warnings

The `## Usage Example` section must contain a fenced yaml block:

```yaml
jobs:
  call-workflow:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-<name>.yml@RELEASE_TAG
    with:
      required-input: value
    secrets:
      REQUIRED_SECRET: ${{ secrets.REQUIRED_SECRET }}
```

### 11. Inputs table rules

For each input in `action.yml` / workflow yml:

- `Name` — wrap in backticks
- `Description` — from yml `description` field; enrich with context from code if yml description is too short
- `Required` — `Yes` if `required: true`, otherwise `No`
- `Default` — wrap value in backticks, or `-` if none

### 12. Sync the catalog

After updating/creating the doc, open `docs/actions-workflows-catalog.md` and:

**If new action/workflow (not present in catalog):**

- Add a new row to the correct table (Actions or Reusable Workflows → Active section)
- Format for action: `| [<target>](../actions/<target>/README.md) | <one-line description> |`
- Format for workflow: `| [<name>](reusable/<name>.md) | <one-line description> |`
- Keep rows sorted alphabetically

**If existing action/workflow:**

- Find the existing row and update the description if `name` or `description` changed in yml

**Never modify the Deprecated sections.**

### 13. Update CLAUDE.md if needed

If a new action was added, check `CLAUDE.md` for any hardcoded action count (e.g. "22 individual GitHub Actions") and update the number.

### 14. Markdown authoring rules

When writing any `.md` file in this repo, follow these markdownlint rules exactly
(config: `netcracker/.github` → `config/linters/.markdownlint.json`, `MD046: fenced`):

- **MD031** — always add a blank line before and after every fenced code block
- **MD032** — always add a blank line before and after every list (bullet or numbered)
- **MD040** — every fenced code block must have a language identifier (`bash`, `yaml`, `text`, `json`, `markdown`, etc.)
- **MD046** — use fenced code blocks only (` ``` `); never use 4-space indented code blocks
- **MD048** — use backtick fences only (` ``` `); never use tilde fences (`~~~`)
- **MD022** — always add a blank line before and after every heading
- **MD004** — use consistent list marker style within a file (prefer `-`)
- **MD007** — indent nested lists with 2 spaces
- **MD013** — keep lines under 120 characters (code blocks and tables are exempt)
- **MD024** — duplicate heading names are allowed only for non-sibling headings
- **MD029** — use `1.` for every item in an ordered list (the linter renumbers automatically); never use 2, 3, 4...
- **MD033** — only `<img>`, `<br>`, `<a>`, `<p>` HTML tags are allowed inline
- **MD038** — no spaces inside backtick code spans
- **MD041** — first line of file does not need to be a heading
- **MD056** — table rows must have the same number of cells as the header

**Nested code blocks:** when a template or example contains a fenced code block inside prose, write it as a
regular fenced block in its own paragraph — do not try to nest ` ```lang ` inside another ` ```lang ` block,
as markdownlint does not allow this. Show the inner block as a separate section or describe it in text.

### 15. Self-check before writing the file

Before calling the Write tool on any generated `.md` content, scan the content and verify every item below.
Fix any violation found before writing — do not write a file that fails this checklist.

- Every fenced code block opens with a language identifier (` ```bash `, ` ```yaml `, ` ```text `, etc.)
- Every fenced code block has a blank line immediately before the opening ` ``` ` and after the closing ` ``` `
- Every bullet or numbered list has a blank line immediately before the first item and after the last item
- No 4-space indented code blocks exist anywhere in the content
- No tilde fences (`~~~`) exist anywhere in the content
- No nested fenced blocks (` ``` ` inside ` ``` `) — rewrite as separate sections if needed
- Every heading has a blank line before and after it
- All ordered list items use `1.` as the prefix
- No spaces inside backtick code spans (e.g. `` `value ` `` is wrong, `` `value` `` is correct)
- All table rows have the same number of cells as the header row
- No line exceeds 120 characters (code blocks and table rows are exempt)

### 16. Report to user

After all changes, print a short summary:

- What was created or updated
- Which sections were changed
- Whether the catalog was updated
