# 🚀 Change Helm Chart.yaml GitHub Action

This Action automatically updates the `Chart.yaml` file of a Helm chart.

## Features

- Automatically updates the version in the `Chart.yaml` file.
- Supports specifying the application version.
- Allows customization of the path to the `Chart.yaml` file.

## 📌 Inputs

| Name              | Description                            | Required | Default |
| ----------------- | -------------------------------------- | -------- | ------- |
| `chart-version`   | The version of the Helm chart.         | Yes      | N/A     |
| `chart-yaml-path` | The path to the `Chart.yaml` file.     | Yes      | N/A     |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Update Helm Chart Version

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  update-chart:
    runs-on: ubuntu-latest

    steps:
      - name: Change Helm Chart.yaml
        uses: netcracker/qubership-workflow-hub/actions/chart-version@v2.0.9
        with:
          chart-version: "1.2.3"
          chart-yaml-path: "./path/to/Chart.yaml"
