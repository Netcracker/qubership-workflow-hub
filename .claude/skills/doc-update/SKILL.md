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

Use `RELEASE_TAG` in the **Usage example** (readable, follows minor updates).

For the **Notes** section pin warning, recommend a full 40-character commit SHA as the most
reliable option — tags are mutable refs and can be moved or overwritten, only a full SHA
guarantees an immutable pin. The tag remains acceptable when callers want automatic minor-version
updates. `@main` and short SHAs are never acceptable.

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

#### Composite action deep-read checklist

When `runs.using: composite`, go through every step in `action.yml` and check each of the
following — these are the most commonly missed documentation gaps:

- **Conditional steps (`if:`)** — for every step with an `if:` condition, document when it is
  skipped and what effect that has on outputs or behaviour. Example: metadata upload skipped when
  `dry-run: true` → outputs are empty.
- **Inputs read from `env:` not from `inputs:`** — if a step reads a value from the environment
  (e.g. `env.GITHUB_TOKEN`) rather than from `inputs.*`, document how the caller must pass it
  (via the `env:` block on the step, not via `with:`).
- **Input ignored when another input is set** — e.g. `ref` is ignored when `checkout: false`.
  Document the dependency in the input's Description column.
- **Precedence / override logic** — e.g. `component.arguments` overrides `build-args` entirely.
  Make the override explicit in both the input description and the Additional Information section.
- **Value normalisation** — e.g. tags lowercased, `/` replaced with `-`, strings trimmed. Document
  the normalisation in the input or output description so callers aren't surprised.
- **Outputs that are conditionally empty** — if an output is only set under certain conditions
  (e.g. only when `dry-run: false`), say so in the Outputs table row and in Notes.
- **Files printed to log** — if a step prints file contents (e.g. `cat Dockerfile`), note it in
  Notes as a potential secret-exposure risk.
- **Deprecated inputs** — mark them **Deprecated** in the Description column and point to the
  replacement input.

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
| `## How it works` | Describe what the action/workflow does from the caller's perspective — what it produces, what side-effects it has, what the outputs/payload look like. Do NOT narrate action.yml steps line by line. | Regenerate from current code |
| `## Additional Information` | Generate detailed explanations for non-obvious inputs. For inputs that accept structured data (JSON payloads, config objects) — always include a concrete example of the data structure and how it is consumed on the receiving end. | Regenerate |
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
- `## How it works` — high-level description of what the action does from the caller's perspective:
  what it produces (outputs, artifacts, events), what side-effects it has, what the output shape
  looks like. Include a concrete example where helpful (e.g. payload structure, output value format).
  Do NOT narrate action.yml steps line by line.
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
        uses: netcracker/qubership-workflow-hub/actions/<target>@<SHA> # RELEASE_TAG
        with:
          required-input: value
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Where `<SHA>` is the full 40-character commit SHA of `RELEASE_TAG`. Resolve it with:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/RELEASE_TAG
```

Render the actual SHA into the example, with the tag as a trailing comment for readability —
the SHA is the immutable pin, the comment shows which release it corresponds to.

Always end the Notes section with a pin warning shaped like:

> Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
> `@<SHA> # RELEASE_TAG`. The SHA is the immutable pin; the comment shows which release it
> points to. Tags alone are mutable and can be moved — acceptable only when callers explicitly
> want auto-updates within a minor version. Never use `@main` or short SHAs.

Resolve the SHA for a tag with:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/RELEASE_TAG
```

### 10. README template for new REUSABLE WORKFLOW

Generate with this structure (no `---` separators for workflows):

- `# 🚀 <name>` — title
- short description paragraph
- `## Features` — bullet list of key capabilities
- `## 📌 Inputs` — table with columns: Name, Description, Required, Default
- `## 📌 Secrets` — table with columns: Name, Description, Required
- `## How it works` — high-level description of what the workflow does from the caller's perspective:
  what it produces, what jobs run, what outputs or side-effects result. Include a concrete example
  where helpful. Do NOT narrate yml jobs/steps line by line.
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
- `Description` — from yml `description` field; enrich with context from code if yml description
  is too short. If the input is ignored when another input has a specific value, state it here
  (e.g. "Ignored when `checkout` is `false`"). If the input is deprecated, lead with
  `**Deprecated.**` and name the replacement.
- `Required` — `Yes` if `required: true`, otherwise `No`. Never use footnote markers (`*`) —
  put conditional-required logic in the Description instead.
- `Default` — the **literal value from `action.yml`**, wrapped in backticks, or `-` if absent.
  If the code applies a fallback that differs from the yml default, document the fallback in
  Description, not in the Default column.

### 11a. Outputs table rules

For each output in `action.yml`:

- `Name` — wrap in backticks
- `Description` — from yml `description` field; enrich from code. If the output is only populated
  under certain conditions (e.g. only when `dry-run` is `false`, or only on a specific event),
  state it explicitly: "Only set when `dry-run` is `false`." If the output name uses an
  inconsistent style (underscore vs dash), note it: "Note: uses underscore (legacy naming)."

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

### 14. Markdown compliance

Before writing any generated or updated `.md` file, apply the full audit logic from
`.claude/skills/md-lint/SKILL.md` (step 3 — all 50 rules) to the generated content in-memory.
Fix every violation found before calling the Write tool.

The markdown skill's step 5 ("Self-check before writing") describes exactly this flow —
follow it for every file this skill produces.

### 15. Report to user

After all changes, print a short summary:

- What was created or updated
- Which sections were changed
- Whether the catalog was updated
