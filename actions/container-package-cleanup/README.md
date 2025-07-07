# 🚀 Package Cleanup Action

This **Package Cleanup** GitHub Action automates the cleanup of old package versions in a GitHub repository or organization.  
It supports both Docker/container images and Maven JAR files.

---

## Inputs

| Name               | Description                                                                 | Required | Default                     |
| ------------------ | --------------------------------------------------------------------------- | -------- | --------------------------- |
| `threshold-days`   | The number of days to keep package versions. Older versions will be deleted. | No       | `7`                         |
| `included-tags`    | A comma-separated list of tags/versions to include for deletion. Wildcards (`*`) are supported. | No       | `""` (all tags included, or `*SNAPSHOT*` for Maven) |
| `excluded-tags`    | A comma-separated list of tags/versions to exclude from deletion. Wildcards (`*`) are supported.| No       | `""` (no tags excluded)      |
| `included-patterns`| A comma-separated list of patterns to include for deletion. Wildcards (`*`) are supported. | No       | `""`                       |
| `excluded-patterns`| A comma-separated list of patterns to exclude from deletion. Wildcards (`*`) are supported. | No       | `""`                       |
| `package-type`     | Type of package to clean up: `container` or `maven`.                        | No       | `container`                  |
| `dry-run`          | Enable dry-run mode to preview deletions without making changes.            | No       | `false`                     |
| `debug`            | Enable debug mode for detailed logging.                                     | No       | `false`                     |

---

## Environment Variables

| Name            | Description                                      | Required |
| --------------- | ------------------------------------------------ | -------- |
| `PACKAGE_TOKEN` | GitHub token with permissions to manage packages | Yes      |

> **Note:** The `PACKAGE_TOKEN` must have the following permissions:
> - **`read:packages`**: To list and retrieve package information.
> - **`delete:packages`**: To delete package versions.

---

## How to Use

Below are examples of how to use this action in a GitHub Actions workflow for both Docker images and Maven JAR files:

### Example for Docker Images

```yaml
name: Cleanup Old Docker Images

on:
  workflow_dispatch:
    inputs:
      threshold-days:
        description: "Number of days to keep Docker image versions"
        required: false
        default: "7"
      included-tags:
        description: "Tags to include for deletion"
        required: false
        default: ""
      excluded-tags:
        description: "Tags to exclude from deletion"
        required: false
        default: ""
      debug:
        description: "Enable debug mode"
        required: false
        default: "false"
      dry-run:
        description: "Enable dry-run mode"
        required: false
        default: "false"

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Docker Cleanup Action
        uses: netcracker/qubership-workflow-hub/actions/container-package-cleanup@main
        with:
          threshold-days: ${{ github.event.inputs.threshold-days || 7 }}
          included-tags: ${{ github.event.inputs.included-tags || '' }}
          excluded-tags: ${{ github.event.inputs.excluded-tags || '' }}
          debug: ${{ github.event.inputs.debug || 'false' }}
          dry-run: ${{ github.event.inputs.dry-run || 'false' }}
          package-type: container
        env:
          PACKAGE_TOKEN: ${{ secrets.PACKAGE_TOKEN }}
```

### Example for Maven JAR Files

```yaml
name: Cleanup Old Maven JAR Files

on:
  workflow_dispatch:
    inputs:
      threshold-days:
        description: "Number of days to keep Maven JAR versions"
        required: false
        default: "14"
      included-patterns:
        description: "Patterns to include for deletion"
        required: false
        default: "*SNAPSHOT*"
      excluded-patterns:
        description: "Patterns to exclude from deletion"
        required: false
        default: "release*"
      debug:
        description: "Enable debug mode"
        required: false
        default: "false"
      dry-run:
        description: "Enable dry-run mode"
        required: false
        default: "false"

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Maven Cleanup Action
        uses: netcracker/qubership-workflow-hub/actions/container-package-cleanup@main
        with:
          threshold-days: ${{ github.event.inputs.threshold-days || 14 }}
          included-patterns: ${{ github.event.inputs.included-patterns || '*SNAPSHOT*' }}
          excluded-patterns: ${{ github.event.inputs.excluded-patterns || 'release*' }}
          debug: ${{ github.event.inputs.debug || 'false' }}
          dry-run: ${{ github.event.inputs.dry-run || 'false' }}
          package-type: maven
        env:
          PACKAGE_TOKEN: ${{ secrets.PACKAGE_TOKEN }}
```

---

## Usage for Container Images

- Set `package-type: container` (default).
- Filtering by `included-tags` and `excluded-tags` works on image tags.
- Wildcards (`*`) are supported for flexible tag matching.
- All container image versions older than `threshold-days` and matching the tag filters will be deleted (unless `dry-run` is enabled).

---

## Usage for Maven Packages

- Set `package-type: maven`.
- Filtering by `included-patterns` and `excluded-patterns` works on Maven version names.
- **If you do not specify `included-patterns`, the action will automatically add `*SNAPSHOT*` to the list of included patterns for Maven packages.**
  This means that by default, only SNAPSHOT versions will be deleted for Maven, unless you specify other include patterns.
- Wildcards (`*`) are supported for flexible version matching.
- All Maven versions older than `threshold-days` and matching the filters will be deleted (unless `dry-run` is enabled).

---

## Tag/Version Filtering Logic

The action filters tags/versions in the following order of priority:

1. **Excluded Tags/Patterns**:
   - Versions matching `excluded-tags` or `excluded-patterns` are **always skipped**, even if they also match `included-tags` or `included-patterns`.

2. **Included Tags/Patterns**:
   - If `included-tags` or `included-patterns` is specified, only versions matching these are considered for deletion.

3. **Default Behavior**:
   - If neither `included-tags` nor `included-patterns` is specified, all versions are considered for deletion, except those explicitly excluded by `excluded-tags` or `excluded-patterns`.
   - **For Maven:** If neither `included-tags` or `included-patterns` is specified, only `*SNAPSHOT*` versions are considered for deletion by default.

#### Filtering Process

1. Exclude versions matching `excluded-tags` or `excluded-patterns`.
2. From the remaining versions, include only those matching `included-tags` or `included-patterns` (if specified).
3. If neither `included-tags` nor `included-patterns` is specified, all remaining versions are considered for deletion (for Maven, only `*SNAPSHOT*` by default).

---

## Wildcard Matching

Supported patterns for tags/versions:

| Pattern       | Matches                          | Does Not Match       |
|---------------|----------------------------------|----------------------|
| `release*`    | `release`, `release-v1`          | `v1-release`         |
| `*release`    | `v1-release`, `candidate-release`| `release-v1`         |
| `*release*`   | `v1-release-candidate`, `release-v1` | `v1-candidate`    |
| `release*v1`  | `release-v1`, `release-candidate-v1` | `release-v2`     |

---

## Debug & Dry-Run Modes

- **Debug Mode:** Set `debug: true` to log detailed information about the filtering and deletion process.
- **Dry-Run Mode:** Set `dry-run: true` to simulate deletions without actually removing any versions.

---

## Feedback

If you have suggestions or find a bug, please create an issue or pull request in this repository.