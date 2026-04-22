---
name: doc-updater
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
- If `$commits` is `--full` or not provided alongside `--full` flag → `MODE` = `full-resync`, skip steps 3
- Otherwise → `MODE` = `diff`, `N` = `$commits` if provided, otherwise `1`

### 2. Resolve paths

If `$target` starts with `reusable/`:
- Extract workflow name: strip `reusable/` prefix
- `YML_PATH` = `.github/workflows/re-<name>.yml`
- `DOC_PATH` = `docs/reusable/<name>.md`
- `TYPE` = `workflow`

Otherwise:
- `YML_PATH` = `actions/<target>/action.yml`
- `DOC_PATH` = `actions/<target>/README.md`
- `TYPE` = `action`

### 3. Collect git diff (diff mode only)

Skip this step if `MODE` = `full-resync`.

Run the following to get full code diff:
```
git diff HEAD~N..HEAD -- <scope>
```

Where `<scope>` is:
- For action: `actions/<target>/`
- For workflow: `.github/workflows/re-<name>.yml`

Also run to get list of changed files:
```
git diff --name-only HEAD~N..HEAD -- <scope>
```

If no changed files found — inform the user and stop.

### 4. Read source files

Read `YML_PATH` in full:
- For actions: extract `name`, `description`, `inputs`, `outputs`, `runs.using`, and all `steps`
- For workflows: extract `name`, `on.workflow_call.inputs`, `on.workflow_call.secrets`, and all `jobs`

Read `DOC_PATH` if it exists — to understand current documentation state.

In `diff` mode: also read any referenced scripts or source files that appear in the diff (e.g. `src/index.js`, `*.py`).

In `full-resync` mode: read ALL source files in the action/workflow directory — `src/index.js`, any `*.py`, any shell scripts referenced in steps.

### 5. Analyse the changes

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

### 6. Decide: create or update

**If `DOC_PATH` does not exist** → CREATE mode: generate full README from scratch using the templates below.

**If `DOC_PATH` exists** → UPDATE mode: rewrite every section based on current state of the code and yml. The only section never overwritten is `## Usage` / `## Usage Example` — preserve it as-is.

### 7. Sections and update rules

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
| `## Usage` / `## Usage Example` | Generate once with required inputs | **Never overwrite** |

### 8. README template for new ACTION

```markdown
# 🚀 <name>

<description>

---

## Features

- <bullet per key capability, derived from steps and inputs>

---

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `input-name` | Description | Yes/No | `value` |

---

## 📌 Outputs

| Name | Description |
| ---- | ----------- |
| `output-name` | Description |

---

## How it works

<numbered steps describing what the action does internally, derived from action.yml steps and source code>

---

## Additional Information

<subsections explaining non-obvious inputs, modes, or behaviours in detail>

---

## Usage

```yaml
- name: <action name>
  uses: netcracker/qubership-workflow-hub/actions/<target>@v1
  with:
    <required inputs with placeholder values>
```

---

## Notes

- Always pin to `@v1` or a specific SHA — never `@main` in production.
- <other key warnings derived from the code>
```

### 9. Doc template for new REUSABLE WORKFLOW

```markdown
# 🚀 <name>

<description>

## Features

- <bullet per key capability>

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `input-name` | Description | Yes/No | `value` |

## 📌 Secrets

| Name | Description | Required |
| ---- | ----------- | -------- |
| `SECRET_NAME` | Description | Yes/No |

## How it works

<numbered steps describing what the workflow does>

## Additional Information

<subsections explaining non-obvious inputs or behaviours>

## Usage Example

```yaml
jobs:
  call-workflow:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-<name>.yml@v1
    with:
      <required inputs>
    secrets:
      <required secrets>
```

## Notes

- Always pin to `@v1` or a specific SHA — never `@main` in production.
```

### 10. Inputs table rules

For each input in `action.yml` / workflow yml:
- `Name` — wrap in backticks
- `Description` — from yml `description` field; enrich with context from code if yml description is too short
- `Required` — `Yes` if `required: true`, otherwise `No`
- `Default` — wrap value in backticks, or `-` if none

### 11. Sync the catalog

After updating/creating the doc, open `docs/actions-workflows-catalog.md` and:

**If new action/workflow (not present in catalog):**
- Add a new row to the correct table (Actions or Reusable Workflows → Active section)
- Format for action: `| [<target>](../actions/<target>/README.md) | <one-line description> |`
- Format for workflow: `| [<name>](reusable/<name>.md) | <one-line description> |`
- Keep rows sorted alphabetically

**If existing action/workflow:**
- Find the existing row and update the description if `name` or `description` changed in yml

**Never modify the Deprecated sections.**

### 12. Update CLAUDE.md if needed

If a new action was added, check `CLAUDE.md` for any hardcoded action count (e.g. "22 individual GitHub Actions") and update the number.

### 13. Report to user

After all changes, print a short summary:
- What was created or updated
- Which sections were changed
- Whether the catalog was updated
