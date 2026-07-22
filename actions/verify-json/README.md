# 🚀 Verify JSON Action

This **Verify JSON** GitHub Action validates a JSON file against a JSON Schema using Python's `jsonschema` tool, reporting pass/fail results to the GitHub Step Summary.

---

## Features

- Validates a JSON file against a JSON Schema file using `python3-jsonschema`
- Reports validation success or failure to the GitHub Actions Step Summary
- Fails the workflow step on validation errors, halting the pipeline on invalid JSON

### Action Result

The primary output of this action is the `is-valid` output indicating the validation exit code.
For example, `0` means the JSON file is valid against the schema, and any non-zero value signals a failure.
The step also exits with code `1` on failure, which will halt the workflow unless `continue-on-error: true` is set.

The action passes input paths via environment variables and quotes them in the validation command, so paths containing spaces are handled correctly.

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `json-file` | Path to the JSON file to validate. | Yes | - |
| `schema-file` | Path to the JSON Schema file to validate against. | Yes | - |

---

## 📌 Outputs

| Name | Description | Example |
| ---- | ----------- | ------- |
| `is-valid` | Indicates whether the JSON file passed schema validation (`0` = valid). | `0` |

---

## Permissions

Minimum required permissions:

```yaml
permissions:
  contents: read
```

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Validate JSON Configuration

on:
  pull_request:

permissions:
  contents: read

jobs:
  validate-json:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Verify JSON file
        uses: netcracker/qubership-workflow-hub/actions/verify-json@v2.2.0
        with:
          json-file: 'config/settings.json'
          schema-file: 'config/settings.schema.json'
```

## Troubleshooting

- **`sudo: apt: command not found`:** This action installs `python3-jsonschema` via `apt` and requires an Ubuntu-based runner (`ubuntu-latest`). It will not work on Windows or macOS runners.
- **Validation failed with schema errors:** The action prints full `jsonschema` diagnostics in both the step log and the GitHub Step Summary.
