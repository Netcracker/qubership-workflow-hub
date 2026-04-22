# 🚀 Change Helm Chart.yaml

Automatically updates the `version` (and optionally `appVersion`) fields in a Helm `Chart.yaml` file using `yq`.

---

## Features

- Updates the `version` field in `Chart.yaml` to the specified chart version.
- Optionally updates the `appVersion` field when `chart-app-version` is provided.
- Uses `yq` v4 for in-place YAML editing — preserves all other fields and comments.
- Accepts any path to `Chart.yaml`, enabling monorepo setups with multiple charts.

---

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `new-chart-version` | The new value to set for the `version` field in `Chart.yaml`. | Yes | — |
| `chart-app-version` | The new value to set for the `appVersion` field in `Chart.yaml`. When omitted, `appVersion` is not changed. | No | — |
| `chart-yaml-path` | Path to the `Chart.yaml` file to update (relative to the workspace root). | Yes | — |

---

## 📌 Outputs

This action does not produce any step outputs.

---

## How it works

1. Checks out the repository using `actions/checkout` with `persist-credentials: false`.
2. Downloads and installs `yq` v4.34.1 (`yq_linux_amd64`) into `/usr/local/bin`.
3. Reads the current `version` field from `Chart.yaml` and emits a warning annotation showing the old → new version.
4. Updates `.version` in-place using `yq eval '.version = "..."' -i`.
5. If `chart-app-version` is provided, updates `.appVersion` in-place the same way.
6. Emits a notice annotation confirming the update succeeded.

---

## Additional Information

### Why `persist-credentials: false`

The action checks out the repo internally with `persist-credentials: false` to avoid leaking credentials into subsequent steps. If you need to commit and push the updated `Chart.yaml` afterwards, configure your own `git` credentials in the calling workflow.

### `yq` version

The action pins `yq` to **v4.34.1**. This version uses the expression syntax `.field = "value"` for in-place edits. Do not pass `yq` v3-style expressions — they are incompatible.

### Monorepo usage

Point `chart-yaml-path` at any `Chart.yaml` within the repo. For a monorepo with multiple charts, call the action once per chart with different `chart-yaml-path` values.

---

## Usage Example

```yaml
name: Update Helm Chart Version

on:
  workflow_dispatch:
    inputs:
      chart-version:
        required: true

jobs:
  update-chart:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Change Helm Chart.yaml
        uses: netcracker/qubership-workflow-hub/actions/chart-version@v2.2.0
        with:
          new-chart-version: ${{ inputs.chart-version }}
          chart-yaml-path: "./charts/my-app/Chart.yaml"
```

### With appVersion

```yaml
      - name: Change Helm Chart.yaml
        uses: netcracker/qubership-workflow-hub/actions/chart-version@v2.2.0
        with:
          new-chart-version: "1.2.3"
          chart-app-version: "1.2.3"
          chart-yaml-path: "./charts/my-app/Chart.yaml"
```

---

## Notes

- Always pin to `@v2.2.0` or a specific SHA — never `@main` in production.
- The job needs `permissions: contents: write` if you push the updated `Chart.yaml` in subsequent steps.
- The action itself only modifies the file on the runner; committing and pushing must be done separately (e.g. via `git commit && git push`).
- `chart-app-version` is optional — omit it if you only need to bump the chart version.
