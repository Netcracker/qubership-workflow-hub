# Verify JSON File Action

This GitHub Action verifies a JSON file against a specified schema file using `jsonschema`.

## Inputs

- `json-file`: Path to the JSON file (required).
- `schema-file`: Path to the schema file (required).

## Outputs

- `is-valid`: Indicates whether the JSON file is valid or not.

## Example Usage

```yaml
name: Verify JSON

on: [push]

jobs:
  verify-json:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Verify JSON file
        uses: ./actions/verify-json
        with:
          json-file: 'path/to/your.json'
          schema-file: 'path/to/your-schema.json'
```

## Details

This action performs the following steps:
1. Checks out the repository code.
2. Installs the necessary tools (`python3-jsonschema`).
3. Validates the JSON file against the schema file and sets the output `is-valid`.

If the JSON validation fails, the action will exit with an error and provide details in the step summary.
