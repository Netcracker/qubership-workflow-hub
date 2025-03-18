# 🚀 PR Assigner GitHub Action

This **PR Assigner** GitHub Action automatically assigns a pull request to users based on the configuration provided in a configuration file or the `CODEOWNERS` file.

## Features

- Assigns pull requests to users specified in a configuration file or `CODEOWNERS` file.
- Supports shuffling of assignees to distribute assignments evenly.

## 📌 Inputs

| Name                  | Description                                      | Required | Default                          |
| --------------------- | ------------------------------------------------ | -------- | -------------------------------- |
| `configuration-path`  | Path to the configuration file.                  | No       | `.github/pr-assigner-config.yml` |
| `assignees-count`     | Number of assignees to assign.                   | No       | `1`                              |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
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
        uses: netcracker/qubership-workflow-hub/actions/pr-assigner@main
        with:
          configuration-path: ".github/pr-assigner-config.yml"
          assignees-count: 2
```

## Configuration File

The configuration file (pr-assigner-config.yml) can be define, by defaul location file `.github/pr-assigner-config.yml`. Here is an example configuration:

```yaml
assignees:
  - borislavr
  - nookyo
  - rparf
count: 2
```

- assignees: List of GitHub usernames to assign to the pull request.
- count: Number of assignees to assign. If not specified, the default value is 1. (need for suffle)

## Additional Information

- If the configuration file is not found, the action will attempt to use the CODEOWNERS file to determine the assignees.
- If the CODEOWNERS file is not found or cannot be processed, the action will fail.
- The action will look for a line starting with * in the CODEOWNERS file and use the users listed there as assignees.
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