# Store Input Params Action

This GitHub Action stores passed JSON with workflow run input parameters to a file and attaches it as an artifact to the current run.

## Inputs

- `input`: JSON of input params to save
- `stored_file_name`: Filename where parameters will be stored (optional)
- `artifact_name`: Resulting workflow artifact name (optional)

## Example Usage

Intended use-case is to add this step at the beginning of a workflow with `workflow_dispatch` trigger and configurable input parameters.

You need to explicitly pass parameters into this action (and sensitive data should not be passed via `workflow_dispatch` event parameters!):

```yaml
name: Store Input Parameters

on:
  workflow_dispatch:
    inputs:
      PIPELINE_DATA:
        default: ''
        required: true
        type: string
      PIPELINE_VARS:
        default: ''
        required: false
        type: string

jobs:
  store-params:
    runs-on: ubuntu-latest
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/store-input-params@v2.0.9
        with:
          input: ${{ toJSON(inputs) }}
```
