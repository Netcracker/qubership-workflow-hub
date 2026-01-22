# 🚀 PR Assigner GitHub Action

This **PR Assigner** GitHub Action automatically assigns a pull request to users based on the configuration provided in a configuration file or the `CODEOWNERS` file.

## Features

- Assigns pull requests to users specified in a configuration file or `CODEOWNERS` file.
- Supports shuffling of assignees to distribute assignments evenly with using the Fisher-Yates algorithm.

## 📌 Inputs

| Name                  | Description                                      | Required | Default                          |
| --------------------- | ------------------------------------------------ | -------- | -------------------------------- |
| `shuffle`             | Number of assignees to assign (overrides config `count`). | No       | `1`                              |
| `configuration-path`  | Path to the configuration file.                  | No       | `.github/pr-assigner-config.yml` |
| `env.GITHUB_TOKEN`   | GitHub token used to call API and assign PRs; must be provided via step env. | Yes      | `${{ secrets.GITHUB_TOKEN }}`    |

## Usage Example


```yaml
# Example 1 — No config file, fallback to CODEOWNERS and use input for count
name: Assign PR (CODEOWNERS only)
on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: PR Auto-Assignment (from CODEOWNERS)
        uses: netcracker/qubership-workflow-hub/actions/pr-assigner@v2.0.8
        with:
          shuffle: 2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

```yaml
# Example 2 — Use config file and (optionally) override count via input
name: Assign PR
on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: PR Auto-Assignment
        uses: netcracker/qubership-workflow-hub/actions/pr-assigner@v2.0.8
        with:
          configuration-path: ".github/pr-assigner-config.yml"
          shuffle: 2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration File

The configuration file (`pr-assigner-config.yml`) can be defined; by default the action looks for `.github/pr-assigner-config.yml`. Here is an example configuration:

```yaml
assignees:
  - borislavr
  - nookyo
count: 2
```

- `assignees`: List of GitHub usernames to assign to the pull request.
- `count`: Number of assignees to assign. If not specified, the default value is 1. Used when no `shuffle` input override is provided.

## Behavior and Precedence

- Source of assignees:
  1) If `configuration-path` file exists and is valid — use its `assignees`.
  2) Else — fallback to owners from `.github/CODEOWNERS` (pattern `*` line).
- How many assignees:
  - `shuffle` input takes precedence when provided.
  - Otherwise use `count` from config file.
  - If neither provided, defaults to `1`.
- Selection is randomized using the Fisher–Yates shuffle for fair distribution.

## Permissions

Minimum recommended permissions for the job:
```yaml
permissions:
  pull-requests: write   # required to assign users
  contents: read         # to read config/CODEOWNERS
```

## Outputs

- This action does not expose outputs.

## Additional Information

- If the configuration file is not found, the action will attempt to use the CODEOWNERS file to determine the assignees.
- If the CODEOWNERS file is not found or cannot be processed, the action will fail.
- The action will look for a line starting with `*` in the CODEOWNERS file and use the users listed there as assignees.
- The assignees array is shuffled using the Fisher-Yates algorithm to ensure even distribution of assignments.

### Configuration File Schema

The configuration file for this action must adhere to the schema defined [here](https://github.com/netcracker/qubership-workflow-hub/blob/main/actions/pr-assigner/config.schema.json). This ensures that all templates, distribution tags, and other configuration options follow the required structure for correct parsing and execution.

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "assignees": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "minItems": 1,
            "uniqueItems": true
        },
        "count": {
            "type": "integer",
            "minimum": 1
        }
    },
    "required": [
        "assignees",
        "count"
    ],
    "additionalProperties": false
}
```