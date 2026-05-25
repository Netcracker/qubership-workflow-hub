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
- `--all` — find all changed actions/workflows from `git diff main..HEAD` and update each.

## Steps

### 1. Parse arguments

- `--all` → step 1a
- Otherwise → `TARGET` = `$target` (required)

### 1a. All mode

```bash
git diff --name-only main..HEAD
```

Keep only:

- `actions/*/action.yml`, `actions/*/action.yaml` → action name
- `actions/*/src/**`, `actions/*/*.py` → action name
- `.github/workflows/re-*.yml`, `.github/workflows/re-*.yaml` → `reusable/<name>`

Extract unique targets. Run steps 2–13 for each. If none found — stop.

### 2. Resolve latest release tag

```bash
git tag --list 'v*' --sort=-version:refname | head -1
```

`RELEASE_TAG` = result, or `v1` if no tags. Use in Usage examples.

For the Notes pin warning: recommend a full 40-char SHA as the immutable pin, tag as
a readable comment. Never `@main` or short SHAs.

### 3. Resolve paths

| `$target` starts with | `YML_PATH` | `DOC_PATH` | `TYPE` |
| --- | --- | --- | --- |
| `reusable/` | `.github/workflows/re-<name>.yml` | `docs/reusable/<name>.md` | `workflow` |
| anything else | `actions/<target>/action.yml` | `actions/<target>/README.md` | `action` |

For actions, also check `action.yaml` if `action.yml` does not exist.

### 4. Collect diff

```bash
git diff main..HEAD -- <scope>
git diff --name-only main..HEAD -- <scope>
```

`<scope>`: `actions/<target>/` for actions, `.github/workflows/re-<name>.yml` for workflows.

If no changed files — inform the user and stop.

### 5. Read source files

- Read `YML_PATH` in full.
- Read `DOC_PATH` if it exists.
- Read any scripts referenced in the diff (`src/index.js`, `*.py`, `*.sh`).

### 6. Analyse

From the diff, yml, and source files determine:

- Inputs/outputs added, removed, or modified
- Behaviour added, changed, or fixed
- README sections that are missing, outdated, or wrong

**Composite action checklist** — for each step in `action.yml`:

- `if:` conditions → document when the step is skipped and what effect that has
- Values read from `env:` not `inputs:` → document how the caller must pass them
- Input ignored when another input is set → note in the input's Description
- Precedence/override logic → make explicit in both input description and Additional Information
- Value normalisation (lowercasing, trimming, character replacement) → document in input/output description
- Outputs only set under certain conditions → say so in Outputs table and Notes
- Deprecated inputs → mark `**Deprecated.**` and name the replacement

### 7. Decide: create or update

- `DOC_PATH` does not exist → **CREATE**: generate full README from scratch (steps 8–9)
- `DOC_PATH` exists → **UPDATE**: rewrite every section from current code; never overwrite
  `## Usage` / `## Usage Example` structure, but always update the version pin to `RELEASE_TAG`

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
- `Description` — from yml; enrich from code. State conditional behaviour ("Ignored when `checkout`
  is `false`"). Lead with `**Deprecated.**` for deprecated inputs.
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

Resolve the SHA for the pin with:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/RELEASE_TAG
```

Render the actual SHA into the example; tag as a trailing comment.

**Notes pin warning** (always last in `## Notes`):

> Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
> `@<SHA> # RELEASE_TAG`. The SHA is the immutable pin; the comment shows which release it
> points to. Tags alone are mutable. Never use `@main` or short SHAs.

### 10. Sync the catalog

Open `docs/actions-workflows-catalog.md`:

- **New entry** — add a row to the Active section (Actions or Reusable Workflows), sorted alphabetically:
  - Action: `| [<target>](../actions/<target>/README.md) | <one-line description> |`
  - Workflow: `| [<name>](reusable/<name>.md) | <one-line description> |`
- **Existing entry** — update description if `name` or `description` changed in yml.
- Never modify Deprecated sections.

### 11. Update CLAUDE.md if needed

If a new action was added, update any hardcoded action count in `CLAUDE.md`.

### 12. Markdown compliance

Before writing any `.md` file, apply the full ruleset from
`.claude/skills/markdown-rules/SKILL.md` (step 3 — all 50 rules) in-memory.
Fix all violations before calling Write or Edit.

### 13. Report

- What was created or updated
- Which sections changed
- Whether the catalog was updated
