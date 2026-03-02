# 🚀 GitHub Metadata Action

This **GitHub Metadata** GitHub Action extracts metadata from the current GitHub context and generates a version string based on templates and tags.

## Features

- Extracts metadata from the current GitHub context.
- Generates a version string based on templates and tags.
- Supports custom templates and configuration files.
- Provides detailed logging for debugging.
- Dynamically adapts to branches, tags, and pull requests.
- Supports additional tags and merging options.
- Includes dry-run mode for testing without making changes.
- Enforces configurable maximum tag length (default 128 characters, Docker-compatible).

### Action Result

The primary output of this action is a generated version string. This string is determined by the branch or tag on which the action was executed, and it is created by applying the corresponding template defined in the configuration file.

For example, if the action is triggered on the `v1.2.3` tag, the output might follow the `v{{major}}.{{minor}}.{{patch}}-{{date}}` template, resulting in a string such as `v1.2.3-20250312`.

Or triggered on the `release/1.2.3` branch, resulting in `release-1.2.3-20250313235959`, `feature/some-feature` resulting in `feature-some-feature-20250313235959`.

## 📌 Inputs

| Name                 | Description                                                                                                                | Required | Default                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| `ref`                | Branch or tag ref.                                                                                                         | No       | `github.context.ref`                       |
| `configuration-path` | Path to the configuration file.                                                                                            | No       | `./.github/metadata-action-config.yml`     |
| `short-sha`          | Depth of the short SHA.                                                                                                    | No       | `7`                                        |
| `default-template`   | Default template for version generation.                                                                                   | No       | `{{ref-name}}-{{timestamp}}-{{runNumber}}` |
| `default-tag`        | Default distribution tag.                                                                                                  | No       | `latest`                                   |
| `extra-tags`         | Additional tags to append to the result.                                                                                   | No       | `""`                                       |
| `merge-tags`         | Whether to merge `extra-tags` with the result.                                                                             | No       | `true`                                     |
| `debug`              | Enable debug mode for detailed logging.                                                                                    | No       | `false`                                    |
| `show-report`        | Whether to display a summary report.                                                                                       | No       | `true`                                     |
| `dry-run`            | Enable dry-run mode to simulate the action.                                                                                | No       | `false`                                    |
| `replace-symbol`     | Symbol to replace '/' in branch or tag names.                                                                              | No       | `-`                                        |
| `tag-max-length`     | Maximum length for generated tags. Tags are truncated to this length and trailing non-alphanumeric characters are removed. | No       | `128`                                      |

---

## 📌 Outputs

| Name        | Description                                                                                                                         | Example         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `result`    | Rendered template with metadata based on template rules (e.g. using `v{{major}}.{{minor}}.{{patch}}-{{date}}` for the main branch). | v1.2.3-20250313 |
| `ref`       | Normalized branch or tag name. Deprecated — use `ref-name` instead.                                                                 | main            |
| `ref-name`  | The name of the current branch or tag.                                                                                              | main            |
| `date`      | Current date in `YYYYMMDD` format.                                                                                                  | 20250313        |
| `time`      | Current time in `HHMMSS` format.                                                                                                    | 235959          |
| `timestamp` | Combined date and time in `YYYYMMDDHHMMSS` format.                                                                                  | 20250313235959  |
| `dist-tag`  | Distribution tag based on the branch or tag (e.g. `latest` for main, `beta` for feature branches).                                  | latest          |
| `major`     | Major version number extracted from semantic versioning.                                                                            | 1               |
| `minor`     | Minor version number extracted from semantic versioning.                                                                            | 2               |
| `patch`     | Patch version number extracted from semantic versioning.                                                                            | 3               |
| `short-sha` | Shortened SHA of the current commit.                                                                                                | abc1234         |
| `runNumber` | The unique number for each run of a particular workflow in a repository.                                                            | 123             |
| `commit`    | The full SHA of the current commit.                                                                                                 | abc123456789    |
| `ref-type`  | The type of the reference (e.g., branch or tag).                                                                                    | branch          |

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
        uses: netcracker/qubership-workflow-hub/actions/metadata-action@main
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

## Configuration File

The configuration file (metadata-action-config.yml) should define the templates and distribution tags used by the action. Here is an example configuration:

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

- **Main branch template:** generates a version string in the format `vMAJOR.MINOR.PATCH-DATE` (e.g. `v1.2.3-20250313`).
- **Feature/* branch template:** generates a version string in the format `feature-BRANCH_NAME-TIMESTAMP.DIST-TAG` (e.g. `feature-my-feature.20250313235959.beta`).
- **Release/* branch template:** generates a version string in the format `release-BRANCH_NAME-TIMESTAMP.DIST-TAG` (e.g. `release-v1.2.3-20250313235959.next`).
- **Tag template:** generates a version string in the format `vMAJOR.MINOR.PATCH` (e.g. `v1.2.3`).

## Additional Information

### Dependencies

This action uses the `@netcracker/action-logger` package for enhanced logging capabilities, providing consistent log formatting and debug functionality across different action executions.

### GitHub Context Availability

The GitHub context is available, allowing you to access properties such as the current branch, tag, and other metadata. This context can be used within the action to dynamically generate version strings and tailor behavior based on the repository state.
[More information](https://docs.github.com/ru/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs).

### Template Placeholders

Supported placeholders include (not exhaustive):
`ref-name`, `short-sha`, `sha`, `major`, `minor`, `patch`, `date`, `time`, `timestamp`, `dist-tag`, `github.repository`, `github.ref`, `github.sha`, `github.actor`, `github.workflow`, `github.run_id`, `github.run_number`, `github.event_name`, `runNumber`.

Aliases for template compatibility:

- `ref_name`, `refName`
- `short_sha`, `shortSha`
- `dist_tag`, `distTag`
- `run_number`

#### Length Modifiers

Any placeholder supports an optional length modifier using the syntax `{{key:N}}`, where `N` is the maximum number of characters to keep from the start of the value.

Syntax: `{{key:N}}`

Examples:

| Template                                      | ref-name value                  | Result                                          |
| --------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| `{{ref-name:10}}-{{timestamp}}`               | `feature-very-long-branch-name` | `feature-br-20250313235959`                     |
| `{{short-sha:4}}`                             | `abc12345`                      | `abc1`                                          |
| `{{ref-name:80}}-{{timestamp}}-{{runNumber}}` | `dependabot-very-long-branch`   | `dependabot-very-long-branch-20250313235959-42` |

This is especially useful to prevent long branch names from consuming the full tag length budget. See [Tag Length Limiting](#tag-length-limiting) for more context.

Unknown placeholders are kept as-is and a warning is logged.

### Tag Length Limiting

Docker image tags have a maximum length of **128 characters** and must end with an alphanumeric character (`[a-zA-Z0-9]`).

This action automatically:

- Truncates the generated tag to `tag-max-length` characters (default: `128`)
- Strips trailing non-alphanumeric characters after truncation

When truncation occurs, a warning is logged:

```text
⚠ Tag was truncated from 145 to 128 characters: "very-long-branch-..." -> "very-long-branch"
```

**Important:** truncation always cuts from the end of the rendered string. For a template like `{{ref-name}}-{{timestamp}}-{{runNumber}}`, if `ref-name` is very long, the `timestamp` and `runNumber` parts may be cut off entirely.

To avoid this, use the length modifier `{{key:N}}` to limit specific placeholders:

```yaml
# Limits ref-name to 80 chars, ensuring timestamp and runNumber are always present
branches-template:
  - "dependabot/*": "{{ref-name:80}}-{{timestamp}}-{{runNumber}}"
```

| Scenario      | Template                        | Result (ref-name = 120 chars)                    |
| ------------- | ------------------------------- | ------------------------------------------------ |
| No limit      | `{{ref-name}}-{{timestamp}}`    | `<first 113 chars of ref-name>` (timestamp lost) |
| With modifier | `{{ref-name:80}}-{{timestamp}}` | `<80 chars of ref-name>-20250313235959`          |

### Semantic Version Parsing Contract

The variables `major`, `minor`, and `patch` are parsed from refs matching `vMAJOR.MINOR.PATCH` and also accept prerelease/build suffixes (e.g. `v1.2.3-rc.1`, `v1.2.3+meta`).

### Report Output

When `show-report: true`, the report includes a compact `github` object with selected fields only (repository, ref, sha, actor, workflow, run_id, run_number, event_name) rather than the full `github.context`.

### Configuration File Schema

The configuration file for this action must adhere to [the schema defined](https://github.com/netcracker/qubership-workflow-hub/blob/main/actions/metadata-action/config.schema.json). This ensures that all templates, distribution tags, and other configuration options follow the required structure for correct parsing and execution.

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
                    "^[-a-zA-Z0-9_*]+$": {
                        "type": "string"
                    }
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
                    "^[-a-zA-Z0-9_*]+$": {
                        "type": "string"
                    }
                },
                "additionalProperties": false
            }
        },
        "default-template": {
            "type": "string"
        },
        "default-tag": {
            "type": "string"
        }
    },
    "additionalProperties": false
}
```

## Troubleshooting

- **Template not rendering correctly:** Ensure your configuration file matches the schema and that variables like `{{major}}` are used only on semantic version refs (e.g., `v1.2.3` or `v1.2.3-rc.1`).
- **Missing outputs:** Check if the action ran successfully; use `debug: true` for logs.
- **Configuration errors:** Validate your YAML against the schema at [config.schema.json](https://github.com/netcracker/qubership-workflow-hub/blob/main/actions/metadata-action/config.schema.json).
- **Branch/tag name issues:** Use `replace-symbol` to customize how '/' is replaced in names (default is `-`).
- **Tag too long:** Use `tag-max-length` to limit the generated tag length. If important parts like `timestamp` get cut off, use length modifiers in the template (e.g. `{{ref-name:80}}-{{timestamp}}`). See [Tag Length Limiting](#tag-length-limiting) for details.
