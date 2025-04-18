# Helm Charts Release Action

This GitHub Action automates the process of updating Helm chart versions in `values.yaml` files. It ensures that the chart and image versions are updated consistently and commits the changes to a release branch.

## Inputs

### `release`

**Required**  
The release version to set for the Helm charts.

### `config-file`

**Required**  
The path to the configuration file that specifies the charts and their corresponding `values.yaml` files to update.

## Outputs

### `image-version`
The updated image version after processing the charts.

## Example Usage

```yaml
name: Release Helm Charts

on:
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Release Helm Charts
        uses: netcracker/qubership-workflow-hub/actions/helm-charts-release@main
        with:
          release: '1.0.0'
          config-file: './config/charts-config.yaml'
```

## How It Works

1. **Checkout Code**: The action checks out the repository code.
2. **Create Release Branch**: A new release branch is created based on the provided release version.
3. **Update Chart Versions**: The action updates the `version` field in `Chart.yaml` and the image versions in `values.yaml` files based on the configuration file.
4. **Commit Changes**: The updated files are committed to the release branch.

## Notes

- The `config-file` should be a YAML file that specifies the charts to update. Each chart entry should include:
  - `chart_file`: Path to the `Chart.yaml` file.
  - `values_file`: Path to the `values.yaml` file.
  - `name`: Name of the chart.
  - `version`: Template for the image version (e.g., `my-image:${release}`).
  - `image`: List of image keys to update in `values.yaml`.

> Example: [helm-charts-release-config.yaml](./helm-charts-release-config.yaml)
- Ensure that the Python environment is set up to run the `yaml` module for processing the configuration file.
