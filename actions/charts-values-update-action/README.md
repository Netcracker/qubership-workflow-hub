# Helm Charts values update Action

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
If set to `replace` the action will just replace the versions of docker images with `release-version` value.
If set to `parse` the action read provided `config-file` and substitute any environment variables provided in the version part.
For example if you have some 3-rd party image in `values.yaml` file and want to manage it's version, you can add repository level variable and use it in the config file: `some-third-party-image:${THIRD_PARTY_VERSION}`.
Also if you want the action to find the latest version of some image (supplementary service for instance), you can set it to something like `#4\.\d+\.\d+` or `#latest`.
In that case the action will find the latest tag of an image which satisfy the regular expression. The regular expression of a tag must start with `#` symbol and follow the Python `re` syntax.
**Special word `#latest` will result the latest SemVer tag of the image ('2.1.0','v4.3.2', etc.), not the one which marked with `latest` tag.**

### `working-directory`

**Optional**  
The working directory for the action. Defaults to `.`. Used in specific cases, in testing CI workflows mostly.

### `package-charts`

**Optional**  
Pckage charts using `helm package` command. Defaults to `false`.

### `publish-charts`

**Optional**  
Publish helm charts to the `ghcr.io` registry using `oci://ghcr.io/${{ github.repository }}/` command. Defaults to `false`.

## Environment

### `GITHUB_TOKEN`

**Required**  
The GitHub token to authenticate in `ghcr.io` registry.

### `GITHUB_ACTOR`

**Required**  
The GitHub login to authenticate in `ghcr.io` registry.

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

### `chart-metadata`

Charts metadata in JSON format.

```json
{
    "appVersion": "2.10.0",
    "mime-type": "application/vnd.qubership.helm.chart",
    "name": "qubership-jaeger",
    "reference": "oci://ghcr.io/netcracker/qubership-jaeger/qubership-jaeger:0.0.8",
    "type": "application",
    "version": "0.0.8"
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
        uses: netcracker/qubership-workflow-hub/actions/charts-values-update-action@main
        with:
          release-version: '1.0.0'
          chart-version: '1.0.0'
          config-file: './config/charts-config.yaml'
          create-release-branch: 'true'
          version-replace-method: 'parse'
          working-directory: './charts'
        env:
          ${{ insert }}: ${{ vars }} # This will insert all repository variables into env context
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_ACTOR: ${{ github.actor }}
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
  - `version`: Template for the image version (e.g., `my-image:${tag}`).
  - `image`: List of image keys to update in `values.yaml`.

> Example: [charts-values-update-config.yaml](./charts-values-update-config.yaml).
