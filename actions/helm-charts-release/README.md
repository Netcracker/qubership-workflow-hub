# Helm Charts Release Action

This GitHub Action automates the process of updating docker images versions in `values.yaml` files. It ensures that the chart and image versions are updated consistently and commits the changes to a release branch.

## Inputs

### `release-version`

**Required**  
The release version to set for the Helm chart and for related docker images.

### `chart-version`

**Optional**  
The chart version to set. If not provided, the chart version will default to the release version.

### `config-file`

**Required**  
The path to the configuration file that specifies the `Chart.yaml` and its corresponding `values.yaml` files to update.

### `create-release-branch`

**Optional**  
Whether to create a release branch. Defaults to `true`. If set to `false`, then action will not create a branch and will not commit changes.

### `version-replace-method`

**Optional**  
The method to replace the version in `values.yaml`.
Can be `replace` or `parse`. Defaults to `parse`.
If set to `replace` the action will just replace the versions of docker images with `release-version` value. If set to `parse` the action read provided `config-file` and substitute any environment variables provided in the version part. For example if you have some 3-rd party image in `values.yaml` file and want to manage it's version, you can add repository level variable and use it in the config file: `some-thirg-party-image:${THIRD_PARTY_VERSION}`.

### `working-directory`

**Optional**  
The working directory for the action. Defaults to `.`. Used in specific cases, in testing CI workflows mostly.

## Outputs

### `images-versions`

The updated image versions in JSON format.

```json
{
"qubership-zookeeper-operator": "1.1.8",
"qubership-docker-zookeeper": "1.1.8",
"qubership-zookeeper-monitoring": "1.1.8",
"qubership-zookeeper-backup-daemon": "1.1.8",
"qubership-zookeeper-integration-tests": "1.1.8-3.8.4"
}
```

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
          release-version: '1.0.0'
          chart-version: '1.0.0'
          config-file: './config/charts-config.yaml'
          create-release-branch: 'true'
          version-replace-method: 'parse'
          working-directory: './charts'
```

## How It Works

1. **Validate Release Version**: Ensures the provided release version is a valid Docker image tag.
2. **Create Release Branch**: A new release branch is created if `create-release-branch` is set to `true`.
3. **Update Chart Versions**: The action updates the `version` field in `Chart.yaml` and the image versions in `values.yaml` files based on the configuration file.
4. **Commit Changes**: The updated files are committed to the release branch if it was created.
5. **Generate Summary**: Outputs the release version and updated image versions.

## Notes

- The `config-file` should be a YAML file that specifies the charts to update. Each chart entry should include:
  - `chart_file`: Path to the `Chart.yaml` file.
  - `values_file`: Path to the `values.yaml` file.
  - `name`: Name of the chart.
  - `version`: Template for the image version (e.g., `my-image:${release}`).
  - `image`: List of image keys to update in `values.yaml`.

> Example: [helm-charts-release-config.yaml](./helm-charts-release-config.yaml).
Ensure that the Python environment is set up to run the `yaml` module for processing the configuration file.
