# 🚀 Metadata Action

Extracts metadata from the GitHub Actions context and renders a version string (and additional tags) from a
configurable template, selected by branch or tag pattern. Designed to be used before publish/build steps that
need a computed version, image tag, or release name.

---

## Features

- Extracts ref name, semver parts (major/minor/patch), commit SHA, run number, date/time/timestamp, and
  selected GitHub context fields.
- Selects a template per branch or tag pattern from a configuration file, with a fallback `default-template`.
- Renders multi-tag templates (comma-separated) and merges optional `extra-tags`.
- Supports per-placeholder length modifiers (`{{key:N}}`) to keep parts of long refs from consuming the full
  tag budget.
- Truncates each rendered tag independently to a Docker-compatible maximum length (default `128`) and strips
  trailing non-alphanumerics.
- Customisable `/` replacement symbol for branch names (e.g. `feature/x` → `feature-x`).
- Optional Job Summary report and `dry-run` mode for testing without publishing the result downstream.

---

## 📌 Inputs

| Name                 | Description                                                                                                                    | Required | Default |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- | ------- |
| `ref`                | Git ref (branch or tag). Falls back to `github.context.payload.pull_request.head.ref` for `pull_request` events, then `github.context.ref`. | No       | `""`    |
| `configuration-path` | Path to the configuration file. Falls back to `./.github/metadata-action-config.yml` when not set.                             | No       | `-`     |
| `short-sha`          | Length of the short SHA (1–40). Invalid values fall back to `7`.                                                               | No       | `"7"`   |
| `default-template`   | Default template used when no `branches-template` entry matches the ref. Falls back to `{{ref-name}}-{{timestamp}}-{{runNumber}}` when both this input and the config value are empty. | No       | `""`    |
| `default-tag`        | Default distribution tag used when no `distribution-tag` entry matches. Falls back to `latest` when both this input and the config value are empty. | No       | `""`    |
| `extra-tags`         | Comma-separated list of additional tags to append to the result.                                                               | No       | `""`    |
| `merge-tags`         | Whether to merge `extra-tags` into the rendered result.                                                                        | No       | `"true"`  |
| `debug`              | Enable verbose debug logging.                                                                                                  | No       | `"false"` |
| `show-report`        | Whether to write a Job Summary report.                                                                                         | No       | `"true"`  |
| `dry-run`            | When `true`, the report is annotated as Dry Run; outputs are still set.                                                        | No       | `"false"` |
| `replace-symbol`     | Symbol used to replace `/` in branch or tag names.                                                                             | No       | `"-"`   |
| `tag-max-length`     | Maximum length for each generated tag. Tags are truncated to this length and trailing non-alphanumeric characters are stripped. Invalid values fall back to `128`. | No       | `"128"` |

---

## 📌 Outputs

| Name        | Description                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `result`    | Rendered version string (or comma-separated list of tags), produced from the selected template and merged extra tags.    |
| `ref`       | Normalized branch or tag name. **Deprecated** — use `ref-name` instead.                                                  |
| `ref-name`  | Normalized branch or tag name (with `/` replaced by `replace-symbol`).                                                   |
| `date`      | Current UTC date in `YYYYMMDD` format.                                                                                   |
| `time`      | Current UTC time in `HHMMSS` format.                                                                                     |
| `timestamp` | Combined UTC date and time in `YYYYMMDDHHMMSS` format.                                                                   |
| `dist-tag`  | Distribution tag selected for the ref (e.g. `latest`, `next`, `beta`).                                                   |
| `major`     | Major version number parsed from a semver-shaped ref (`vMAJOR.MINOR.PATCH`). Empty when the ref is not semver.           |
| `minor`     | Minor version number parsed from a semver-shaped ref. Empty when the ref is not semver.                                  |
| `patch`     | Patch version number parsed from a semver-shaped ref. Empty when the ref is not semver.                                  |
| `short-sha` | Short SHA of the current commit, length controlled by `short-sha` input.                                                 |
| `commit`    | Full SHA of the current commit.                                                                                          |
| `runNumber` | The run number of the current workflow run.                                                                              |
| `ref-type`  | Type of the resolved reference: `branch`, `tag`, or `unknown`.                                                           |

---

## How it works

The action resolves a ref (from the `ref` input, the PR head ref for `pull_request` events, or
`github.context.ref`), normalizes it (replacing `/` with `replace-symbol`), and classifies it as `branch` or
`tag`. It then selects a template and a distribution tag from the configuration file by matching the
normalized ref against `branches-template` patterns (or the literal key `tag` for tag refs) and
`distribution-tag` patterns. If no match is found, the action falls back to the `default-template` /
`default-tag` inputs (and ultimately to built-in defaults).

The selected template is rendered with placeholder values built from ref data, semver parts, commit SHA, run
number, snapshot date/time, the chosen distribution tag, and selected `github.*` context fields. Templates
can produce a single tag or a comma-separated list of tags. Each rendered tag is truncated independently to
`tag-max-length` and trailing non-alphanumerics are stripped to satisfy the Docker tag format.

The final string is published as `result`; individual fields (`ref-name`, `major`, `minor`, `patch`,
`short-sha`, `commit`, `date`, `time`, `timestamp`, `dist-tag`, `runNumber`, `ref-type`) are also published
as separate outputs so downstream steps can mix them freely.

**Example — semver tag input:**

- Ref: `refs/tags/v1.2.3`
- Template (matched on the literal `tag` key): `v{{major}}.{{minor}}.{{patch}}-{{date}}`
- `result`: `v1.2.3-20260429`
- `major` / `minor` / `patch`: `1` / `2` / `3`

**Example — feature branch input:**

- Ref: `refs/heads/feature/login`
- `replace-symbol`: `-`
- Template (matched on `feature/*`): `feature-{{ref-name}}-{{timestamp}}.{{dist-tag}}`
- `ref-name`: `feature-login`
- `result`: `feature-feature-login-20260429120000.beta`

---

## Additional Information

### Configuration File

The configuration file (default `./.github/metadata-action-config.yml`) defines the templates and
distribution tags used by the action.

```yaml
branches-template:
  - main: "v{{major}}.{{minor}}.{{patch}}-{{date}}"
  - "feature/*": "feature-{{ref-name}}-{{timestamp}}.{{dist-tag}}"
  - "release/*": "release-{{ref-name}}-{{timestamp}}.{{dist-tag}}"
  - tag: "v{{major}}.{{minor}}.{{patch}}"

distribution-tag:
  - main: "latest"
  - "release/*": "next"
  - "feature/*": "beta"
  - tag: "stable"

default-template: "{{ref-name}}-{{timestamp}}-{{runNumber}}"
default-tag: "latest"
```

In this example:

- **`main` branch:** `v{{major}}.{{minor}}.{{patch}}-{{date}}` → e.g. `v1.2.3-20260429`.
- **`feature/*` branch:** `feature-{{ref-name}}-{{timestamp}}.{{dist-tag}}` →
  e.g. `feature-feature-login-20260429120000.beta`.
- **`release/*` branch:** `release-{{ref-name}}-{{timestamp}}.{{dist-tag}}` →
  e.g. `release-release-1.2-20260429120000.next`.
- **Tag refs** (matched by the literal key `tag`): `v{{major}}.{{minor}}.{{patch}}` → e.g. `v1.2.3`.

### Configuration File Schema

The configuration file must adhere to
[the schema defined here](https://github.com/netcracker/qubership-workflow-hub/blob/main/actions/metadata-action/config.schema.json):

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Metadata configuration file schema",
    "type": "object",
    "properties": {
        "branches-template": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "minProperties": 1,
                "maxProperties": 1,
                "patternProperties": {
                    "^[-a-zA-Z0-9_*/]+$": { "type": "string" }
                },
                "additionalProperties": false
            }
        },
        "distribution-tag": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "minProperties": 1,
                "maxProperties": 1,
                "patternProperties": {
                    "^[-a-zA-Z0-9_*/]+$": { "type": "string" }
                },
                "additionalProperties": false
            }
        },
        "default-tag": { "type": "string" },
        "default-template": { "type": "string" }
    },
    "additionalProperties": false
}
```

### Template Placeholders

Supported placeholders include (not exhaustive):

`ref-name`, `short-sha`, `sha`, `major`, `minor`, `patch`, `date`, `time`, `timestamp`, `dist-tag`,
`runNumber`, `github.repository`, `github.ref`, `github.sha`, `github.actor`, `github.workflow`,
`github.run_id`, `github.run_number`, `github.event_name`.

Aliases for template compatibility:

- `ref-name` → `ref_name`, `refName`
- `short-sha` → `short_sha`, `shortSha`
- `dist-tag` → `dist_tag`, `distTag`
- `runNumber` → `run_number`

Unknown placeholders are kept as-is and a warning is logged.

### Length Modifiers

Any placeholder supports an optional length modifier using the syntax `{{key:N}}`, where `N` is the maximum
number of characters to keep from the start of the value.

| Template                                      | `ref-name` value                | Result                                          |
| --------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| `{{ref-name:10}}-{{timestamp}}`               | `feature-very-long-branch-name` | `feature-ve-20260429120000`                     |
| `{{short-sha:4}}`                             | `abc12345`                      | `abc1`                                          |
| `{{ref-name:80}}-{{timestamp}}-{{runNumber}}` | `dependabot-very-long-branch`   | `dependabot-very-long-branch-20260429120000-42` |

This is especially useful to prevent long branch names from consuming the full tag length budget. See
[Tag Length Limiting](#tag-length-limiting) for more context.

### Tag Length Limiting

Docker image tags have a maximum length of **128 characters** and must end with an alphanumeric character
(`[a-zA-Z0-9]`). The action automatically:

- Truncates **each individual tag** to `tag-max-length` characters (default: `128`).
- Strips trailing non-alphanumeric characters after truncation.

When a template produces multiple comma-separated tags
(e.g. `"{{ref-name}}-{{timestamp}}, {{ref-name}}-{{short-sha}}, {{ref-name}}, {{short-sha}}"`), each tag is
evaluated and truncated **independently**. This ensures shorter tags (such as `{{short-sha}}`) are always
present in the output even when earlier tags in the list are long.

When truncation occurs, a warning is logged per affected tag:

```text
⚠ Tag was truncated from 145 to 128 characters: "very-long-branch-..." -> "very-long-branch"
```

**Important:** truncation cuts from the end of each individual tag. For a single-tag template like
`{{ref-name}}-{{timestamp}}-{{runNumber}}`, if `ref-name` is very long, the `timestamp` and `runNumber` parts
may be cut off entirely.

To avoid this, use the length modifier `{{key:N}}` to limit specific placeholders:

```yaml
# Limits ref-name to 80 chars, ensuring timestamp and runNumber are always present
branches-template:
  - "dependabot/*": "{{ref-name:80}}-{{timestamp}}-{{runNumber}}"
```

| Scenario      | Template                        | Result (`ref-name` = 120 chars)                  |
| ------------- | ------------------------------- | ------------------------------------------------ |
| No limit      | `{{ref-name}}-{{timestamp}}`    | `<first 113 chars of ref-name>` (timestamp lost) |
| With modifier | `{{ref-name:80}}-{{timestamp}}` | `<80 chars of ref-name>-20260429120000`          |

For multi-tag templates, truncation is applied per tag, so all tags are guaranteed to appear in the output
(each within the length limit):

```text
Template:  "{{ref-name}}-{{timestamp}}, {{ref-name}}-{{short-sha}}, {{ref-name}}, {{short-sha}}"
ref-name:  fix-increase-integration-tests-memory  (38 chars)

Result:    "fix-increase-integration-tests-memory-20260429120000, fix-increase-integration-tests-memory-313feeac7a1, fix-increase-integration-tests-memory, 313feeac7a1"
           ↑ each tag is within 128 chars, including the short-sha tag at the end
```

### Semantic Version Parsing Contract

The variables `major`, `minor`, and `patch` are parsed from refs matching `vMAJOR.MINOR.PATCH` and also
accept prerelease/build suffixes (e.g. `v1.2.3-rc.1`, `v1.2.3+meta`). For non-semver refs the three outputs
are empty strings.

### Report Output

When `show-report: true`, the action writes a Job Summary including a compact `github` object with selected
fields only (`repository`, `ref`, `sha`, `actor`, `workflow`, `run_id`, `run_number`, `event_name`) rather
than the full `github.context`.

### Dependencies

Internally the action uses the [`@qubership/action-logger`](../../packages/action-logger/) package for
consistent log formatting and debug functionality.

---

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Extract Metadata

on:
  push:
    branches:
      - main

jobs:
  extract-metadata:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Metadata
        uses: netcracker/qubership-workflow-hub/actions/metadata-action@v2.2.1
        with:
          configuration-path: './.github/metadata-action-config.yml'
          default-template: '{{ref-name}}-{{timestamp}}-{{runNumber}}'
          default-tag: 'latest'
          short-sha: '7'
          extra-tags: 'tag1,tag2'
          merge-tags: 'true'
          debug: 'true'
          show-report: 'true'
          replace-symbol: '_'  # Example: Replaces '/' in branch names like 'feature/my-branch' with 'feature_my-branch'
```

---

## Notes

- The action is read-only with respect to repository contents and does not require elevated permissions; the
  baseline `permissions: { contents: read }` is sufficient.
- Use `dry-run: true` when prototyping templates in a PR — the report is annotated as Dry Run while outputs
  are still produced for downstream steps.
- For non-semver refs (anything not matching `vMAJOR.MINOR.PATCH`), `major`, `minor`, and `patch` outputs are
  empty strings — guard downstream steps accordingly.
- Always pin to `@v2.2.1` or a specific SHA — never `@main` in production.

---

## Troubleshooting

- **Template not rendering correctly:** ensure your configuration file matches the schema and that variables
  like `{{major}}` are used only on semver refs (e.g. `v1.2.3` or `v1.2.3-rc.1`).
- **Missing outputs:** check that the action ran successfully; use `debug: true` to enable verbose logs.
- **Configuration errors:** validate your YAML against
  [config.schema.json](https://github.com/netcracker/qubership-workflow-hub/blob/main/actions/metadata-action/config.schema.json).
- **Branch / tag name issues:** use `replace-symbol` to customize how `/` is replaced in names (default `-`).
- **Tag too long:** use `tag-max-length` to limit each generated tag. With multi-tag templates each tag is
  truncated independently, so all tags appear in the output. For single-tag templates where important parts
  like `timestamp` get cut off, use length modifiers (e.g. `{{ref-name:80}}-{{timestamp}}`). See
  [Tag Length Limiting](#tag-length-limiting).
