# 🚀 Package Cleanup Action

This **Package Cleanup** GitHub Action automates the cleanup of old package versions in a GitHub repository or organization.
It supports both Docker/container images and Maven JAR files.

---

## Inputs

| Name                 | Description                                                                                  | Required | Default                                   |
| -------------------- | -------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| `threshold-days`     | Keep versions newer than this many days.                                                     | No       | `7`                                       |
| `threshold-versions` | Keep this many newest versions (Maven only).                                                 | No       | `1`                                       |
| `included-tags`      | Comma-separated tags/versions eligible for deletion (`*` wildcards supported).               | No       | `""` (all; Maven: `*SNAPSHOT*`)           |
| `excluded-tags`      | Comma-separated tags/versions never deleted (`*` wildcards supported).                       | No       | `""`                                      |
| `included-patterns`  | Comma-separated patterns to include (`*` wildcards supported).                               | No       | `""`                                      |
| `excluded-patterns`  | Comma-separated patterns to exclude (`*` wildcards supported).                               | No       | `""`                                      |
| `package-type`       | Package kind to clean: `container` or `maven`.                                               | No       | `container`                               |
| `dry-run`            | If `true`, only prints what would be deleted.                                                | No       | `false`                                   |
| `debug`              | If `true`, prints extra debug logs.                                                          | No       | `false`                                   |
| `batch-size`         | Number of versions deleted in parallel per package.                                          | No       | `15`                                      |
| `max-errors`         | Stop after this many errors.                                                                 | No       | `5`                                       |

---

## Environment Variables

| Name            | Description                                      | Required |
| --------------- | ------------------------------------------------ | -------- |
| `PACKAGE_TOKEN` | GitHub token with permissions to manage packages | Yes      |

> **Note:** The `PACKAGE_TOKEN` must have the following permissions:
>
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
      threshold-versions:
        description: "The number of latest SNAPSHOT versions to keep."
        required: false
        default: "1"
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
          threshold-versions: ${{ github.event.inputs.threshold-versions || 1 }}
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
- Wildcards (`*`and `?`) are supported for flexible version matching.
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

### Filtering Process

1. Exclude versions matching `excluded-tags` or `excluded-patterns`.
2. From the remaining versions, include only those matching `included-tags` or `included-patterns` (if specified).
3. If neither `included-tags` nor `included-patterns` is specified, all remaining versions are considered for deletion (for Maven, only `*SNAPSHOT*` by default).

---

## Wildcard Matching

Supported patterns for tags/versions:

| Pattern               | Matches                                      | Does Not Match                     |
| --------------------- | -------------------------------------------- | ---------------------------------- |
| `release*`            | `release`, `release-v1`                      | `v1-release`                       |
| `*release`            | `v1-release`, `candidate-release`            | `release-v1`                       |
| `*release*`           | `v1-release-candidate`, `release-v1`         | `v1-candidate`                     |
| `release*v1`          | `release-v1`, `release-candidate-v1`         | `release-v2`                       |
| `release*v?`          | `release-v1`, `release_v1`, `releasev1`      | `release-v21`                      |
| `?*`                  | `SHA2430957`, `SHANGRILLA2`                  | `1.2.3`, `SHANGRILLA-2`            |
| `semver`              | `1.2.3`, `v1.2.3`, `1.2.3-beta`              | `alpha-1.2.3`, `dependabot-1.2.3`  |

---

## Debug & Dry-Run Modes

- **Debug Mode:** Set `debug: true` to log detailed information about the filtering and deletion process.
- **Dry-Run Mode:** Set `dry-run: true` to simulate deletions without actually removing any versions.

---

## Logging and Error Handling (v2025-12)

- The action now features improved, more informative logging for each step of the deletion process, including package and version details, error types, and dry-run simulation output.
- Error handling distinguishes between critical errors (rate limits, permission issues) and skippable errors (not found, too many downloads), stopping or skipping as appropriate.
- All logs are output to GitHub Actions via `stdout`/`stderr` (e.g., `console.log`), so messages from asynchronous operations are also visible in the workflow log in real time.
- The log will show both the number of unique packages and the total number of versions to be processed, clarifying the difference between these counts.

### Example Log Output

```text
Total packages to process: 7
Total versions to delete: 14
Preparing to delete 2 versions of org/example (container)
✓ Deleted org/example (container) - version 123
Skipped example v:456 - not found
```

---

## Feedback

If you have suggestions or find a bug, please create an issue or pull request in this repository.
