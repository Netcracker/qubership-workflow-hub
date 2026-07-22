# 🚀 Verify JSON Action

This **Verify JSON** GitHub Action validates a JSON file against a JSON Schema using Python's `jsonschema` library, reporting pass/fail results to the GitHub Step Summary.

---

## Features

- Validates a JSON file against a JSON Schema file using the `jsonschema` Python library
- Reports validation success or failure to the GitHub Actions Step Summary
- Fails the workflow step on validation errors, halting the pipeline on invalid JSON
- Provides detailed error messages for schema violations
- Automatically checks for file existence before validation
- Handles JSON parse errors gracefully

### Action Result

The primary output of this action is the `is-valid` output indicating the validation exit code:
- `0` means the JSON file is valid against the schema
- `1` indicates a validation failure or error

The step exits with code `1` on failure, which will halt the workflow unless `continue-on-error: true` is set.

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `json-file` | Path to the JSON file to validate. | Yes | - |
| `schema-file` | Path to the JSON Schema file to validate against. | Yes | - |

---

## 📌 Outputs

| Name | Description | Example |
| ---- | ----------- | ------- |
| `is-valid` | Indicates whether the JSON file passed schema validation (`0` = valid, `1` = invalid). | `0` |

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

- **`FileNotFoundError: JSON file not found`** — Verify that the `json-file` path is correct and relative to the repository root (or that the file is checked out).
- **`FileNotFoundError: Schema file not found`** — Verify that the `schema-file` path is correct.
- **`JSON validation failed`** — The JSON file does not conform to the schema. The action prints detailed validation errors in both the step log and GitHub Step Summary to help diagnose the issue.
- **`JSON decode error`** — The JSON file contains invalid JSON syntax. Check for syntax errors like missing commas, trailing commas, or unescaped quotes.
