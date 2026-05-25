---
name: doc-update
description: Update or create documentation for a specific action or reusable workflow based on git diff and action.yml
arguments: [target]
---

# doc-update

Update or create documentation for a GitHub Action or reusable workflow.

## Arguments

- `$target` — action name (e.g. `metadata-action`) or workflow name (e.g. `reusable/docker-publish`).
  Required unless `--all` is used.
- `--all` — find all changed actions/workflows from the current branch diff and update each.

## Steps

### 1. Parse arguments

- `--all` → step 1a
- Otherwise → `TARGET` = `$target` (required)

### 1a. All mode

Resolve changed files from the current branch relative to the base ref (see step 2 for
base ref resolution). Keep only:

- `actions/*/action.yml`, `actions/*/action.yaml` → action name
- `actions/*/src/**`, `actions/*/*.py` → action name
- `.github/workflows/re-*.yml`, `.github/workflows/re-*.yaml` → `reusable/<name>`

Extract unique targets. Run steps 2–12 for each. If none found — stop.

### 2. Resolve base ref and release tag

**Base ref:** resolve in priority order:

1. `baseRefName` from the open PR for the current branch, if one exists
1. Default branch of the repository
1. `main` as final fallback — warn the user if this fallback is used

Collect the diff of the target scope relative to this base ref.

**Release tag:** find the most recent semver tag in the repository
(e.g. the latest `v*` tag by version order). If no tag exists, use `v1` as fallback
and note it in the output.

Use `RELEASE_TAG` in all usage examples. Never use `@main` or short SHAs.

### 3. Resolve paths

| `$target` starts with | `YML_PATH` | `DOC_PATH` | `TYPE` |
| --- | --- | --- | --- |
| `reusable/` | `.github/workflows/re-<name>.yml` or `.yaml` — check which exists | `docs/reusable/<name>.md` | `workflow` |
| anything else | `actions/<target>/action.yml` | `actions/<target>/README.md` | `action` |

For both actions and reusable workflows, check `.yml` first, then `.yaml`. Use whichever exists.

### 4. Collect diff

Collect the diff of `<scope>` relative to the base ref resolved in step 2:

- Actions: scope = `actions/<target>/`
- Workflows: scope = `YML_PATH` resolved in step 3 (`.yml` or `.yaml`)

→ `CHANGED_FILES`, `FULL_DIFF`

**If no diff found:**

- If `DOC_PATH` exists and `YML_PATH` exists → ask the user: "No diff found.
  Resync documentation with the current `action.yml`?" Wait for confirmation before
  continuing.
- If neither condition holds → inform the user and stop.

### 5. Read source files

- Read `YML_PATH` in full.
- Read `DOC_PATH` if it exists.
- Read any scripts referenced in the diff (`src/index.js`, `*.py`, `*.sh`).

### 6. Analyse — diff-first, section-scoped

**Primary:** extract concrete changes from `FULL_DIFF`:

- Inputs added, removed, renamed, or modified (description, required, default)
- Outputs added, removed, or modified
- Behaviour added, changed, or fixed (steps, conditions, logic)
- Usage-affecting changes (new required inputs, changed secrets, renamed workflow)

Map each change to the doc section it affects:

| Change area | Affected sections |
| --- | --- |
| Input added/removed/modified | `## 📌 Inputs`, `## Additional Information` |
| Output added/removed/modified | `## 📌 Outputs` |
| New required input or secret | `## Usage` / `## Usage Example`, `## 📌 Secrets` |
| Behaviour / logic change | `## How it works`, `## Features`, `## Notes` |
| Breaking change | `## Notes`, `## Troubleshooting` |

**Secondary (only if diff gives no clear section mapping):** expand analysis to adjacent
sections that may be affected by the change type. Do not expand to unrelated sections.

**Composite action checklist** — apply only to sections in scope:

- `if:` conditions → document when the step is skipped
- Values from `env:` not `inputs:` → document how the caller passes them
- Input ignored when another input is set → note in input Description
- Precedence/override logic → make explicit in input description and Additional Information
- Value normalisation (lowercasing, trimming) → document in input/output description
- Outputs set only under certain conditions → note in Outputs table
- Deprecated inputs → mark `**Deprecated.**` and name the replacement

### 7. Decide: create or update

- `DOC_PATH` does not exist → **CREATE**: generate full README from scratch (steps 8–9).
- `DOC_PATH` exists → **UPDATE**: patch only the sections identified in step 6.
  Sections not in scope must not be modified. Never do a full rewrite of an existing file.

### 8. Section rules

| Section | Rule |
| --- | --- |
| Title `# 🚀 Name` | From `action.yml: name` |
| Short description | From `action.yml: description` |
| `## Features` | Bullet list derived from steps + inputs + logic |
| `## 📌 Inputs` | Table: Name, Description, Required, Default — see *Table rules* below |
| `## 📌 Outputs` | Table: Name, Description — see *Table rules* below |
| `## 📌 Secrets` | Workflows only. Table: Name, Description, Required |
| `## How it works` | What the action/workflow produces and what side-effects it has, from the caller's perspective. Include concrete examples (payload shape, output format). Do NOT narrate yml steps line by line. |
| `## Additional Information` | Subsections for non-obvious inputs. For structured inputs (JSON, config objects) always include a concrete example. |
| `## Usage` / `## Usage Example` | See *Usage template* below |
| `## Notes` | Key warnings and tips. Always end with the SHA pin warning. |
| `## Troubleshooting` | Omit if no known issues |

**Table rules — Inputs:**

- `Name` — backticks
- `Description` — from yml; enrich from code. State conditional behaviour ("Ignored when
  `checkout` is `false`"). Lead with `**Deprecated.**` for deprecated inputs.
- `Required` — `Yes` / `No`. No footnote markers — put conditional logic in Description.
- `Default` — literal value from yml in backticks, or `-`. Code fallbacks go in Description.

**Table rules — Outputs:**

- `Name` — backticks
- `Description` — from yml; enrich from code. State when output is conditionally empty.
  Note naming inconsistencies (underscore vs dash).

### 9. Usage template

**Action** (`## Usage`):

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
      - uses: actions/checkout@<sha>  # vX.Y.Z

      - name: Run action
        uses: netcracker/qubership-workflow-hub/actions/<target>@<SHA>  # RELEASE_TAG
        with:
          required-input: value
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Reusable workflow** (`## Usage Example`):

```yaml
jobs:
  call-workflow:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-<name>.yml@RELEASE_TAG
    with:
      required-input: value
    secrets:
      REQUIRED_SECRET: ${{ secrets.REQUIRED_SECRET }}
```

Resolve the SHA for the pin by looking up the tag in the repository's remote refs.
Render the actual SHA into the example; tag as a trailing comment.

If the lookup fails (no network, no remote, tag not found in origin):

- Use the placeholder `<SHA>` literally in the example.
- Add a comment in the generated doc: `<!-- TODO: replace <SHA> with the full commit SHA for RELEASE_TAG -->`.
- Continue — do not stop or skip the usage section.

**Notes pin warning** (always last in `## Notes`):

> Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
> `@<SHA> # RELEASE_TAG`. The SHA is the immutable pin; the comment shows which release it
> points to. Tags alone are mutable. Never use `@main` or short SHAs.

### 10. Side effects

These are separate mutations with different risk. Execute only when the condition is met.

**Catalog sync** (`docs/actions-workflows-catalog.md`):

- Condition: `DOC_PATH` was created (new action/workflow) OR `name`/`description` changed
  in `YML_PATH`.
- New entry → add a row to the Active section, sorted alphabetically:
  - Action: `| [<target>](../actions/<target>/README.md) | <one-line description> |`
  - Workflow: `| [<name>](reusable/<name>.md) | <one-line description> |`
- Existing entry → update description only if it changed.
- Never modify Deprecated sections.

**CLAUDE.md count update:**

- Condition: a new action was added (new directory under `actions/`).
- Update the hardcoded action count in `CLAUDE.md`.

### 11. Markdown compliance

Before writing any `.md` file, apply the full ruleset from
`.claude/skills/markdown-rules/SKILL.md` (all 50 rules) in-memory.
Fix all violations before calling Write or Edit.

### 12. Report

- What was created or updated
- Which sections changed and why (mapped from diff)
- Whether catalog or CLAUDE.md was updated
- Any fallbacks used (base ref, release tag)
