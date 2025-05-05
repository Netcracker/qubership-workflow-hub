# 🚀 Container Package Cleanup Action

This **Container Package Cleanup** GitHub Action automates the cleanup of old Docker images (or other container packages) in a GitHub repository or organization based on specified criteria.

---

## Features

- Deletes old container package versions based on a threshold date.
- Supports filtering by included and excluded tags.
- Allows configuration through inputs or a configuration file.
- Provides debug mode for detailed logging.
- Supports dry-run mode to preview deletions without making changes.
- **Supports wildcard-based tag matching** for flexible filtering.

---

## 📌 Inputs

| Name               | Description                                                                 | Required | Default                     |
| ------------------ | --------------------------------------------------------------------------- | -------- | --------------------------- |
| `threshold-days`   | The number of days to keep container package versions. Older versions will be deleted. | No       | `7`                         |
| `included-tags`    | A comma-separated list of tags to include for deletion. Wildcards (`*`) are supported. | No       | `""` (all tags included)     |
| `excluded-tags`    | A comma-separated list of tags to exclude from deletion. Wildcards (`*`) are supported.| No       | `""` (no tags excluded)      |
| `dry-run`          | Enable dry-run mode to preview deletions without making changes.            | No       | `false`                     |
| `debug`            | Enable debug mode for detailed logging.                                     | No       | `false`                     |

---

## 📌 Outputs

This action does not produce any outputs. It performs cleanup operations directly on the container packages.

---

## 📌 Environment Variables

| Name            | Description                                      | Required |
| --------------- | ------------------------------------------------ | -------- |
| `PACKAGE_TOKEN` | GitHub token with permissions to manage packages | Yes      |

> **Note:** The `PACKAGE_TOKEN` must have the following permissions:
> - **`read:packages`**: To list and retrieve package information.
> - **`delete:packages`**: To delete package versions.

---

## 📌 Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Cleanup Old Docker Images

on:
  schedule:
    - cron: "0 0 * * 0" # Runs weekly on Sunday at midnight
  workflow_dispatch:
    inputs:
      threshold-days:
        description: "Number of days to keep container versions"
        required: false
        default: "7"
      included-tags:
        description: "Tags to include for deletion"
        required: false
        default: ""
      excluded-tags:
        description: "Tags to exclude from deletion"
        required: false
        default: "release*"
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

      - name: Run Container Package Cleanup Action
        uses: netcracker/qubership-workflow-hub/actions/container-package-cleanup@main
        with:
          threshold-days: ${{ github.event.inputs.threshold-days }}
          included-tags: ${{ github.event.inputs.included-tags }}
          excluded-tags: ${{ github.event.inputs.excluded-tags }}
          debug: ${{ github.event.inputs.debug }}
          dry-run: ${{ github.event.inputs.dry-run }}
        env:
          PACKAGE_TOKEN: ${{ secrets.PACKAGE_TOKEN }}
```

---

## Additional Information

### Debug Mode

When `debug` is set to `true`, the action logs detailed information, including:

- The calculated threshold date.
- The list of excluded and included tags.
- The list of packages and their versions retrieved from the repository or organization.
- The versions that are selected for deletion after applying the filtering criteria.

This mode is useful for troubleshooting and understanding how the action processes packages and versions.

---

### Dry-Run Mode

When `dry-run` is set to `true`, the action will simulate the cleanup process without actually deleting any package versions. It will log the versions that would be deleted if the action were run without `dry-run`.

This mode is useful for previewing the cleanup results and ensuring the filtering criteria are correct before making changes.

---

### Priority of Tag Filtering

1. **Excluded Tags**:
   - Versions with tags matching `excluded-tags` are **always skipped**, even if they match `included-tags`.
2. **Included Tags**:
   - If specified, only versions with tags matching `included-tags` are considered for deletion.
3. **Default Behavior**:
   - If `included-tags` is empty, all versions (except those excluded) are considered for deletion.

---

### Tag Matching Behavior

The action supports flexible tag matching using exact matches and wildcard patterns. This allows you to define which tags should be included or excluded during the cleanup process.

#### Supported Patterns

1. **Exact Match**: Matches tags exactly as specified (e.g., `release` matches only `release`).
2. **Prefix Match**: Patterns ending with `*` match tags starting with the prefix (e.g., `release*` matches `release-v1`).
3. **Suffix Match**: Patterns starting with `*` match tags ending with the suffix (e.g., `*release` matches `v1-release`).
4. **Substring Match**: Patterns with `*` at both ends match tags containing the substring (e.g., `*release*` matches `v1-release-candidate`).
5. **Wildcard in the Middle**: Patterns with `*` in the middle match tags with any characters in place of `*` (e.g., `release*v1` matches `release-v1`).

#### Examples

| Pattern       | Matches                          | Does Not Match       |
|---------------|----------------------------------|----------------------|
| `release*`    | `release`, `release-v1`          | `v1-release`         |
| `*release`    | `v1-release`, `candidate-release`| `release-v1`         |
| `*release*`   | `v1-release-candidate`, `release-v1` | `v1-candidate`    |
| `release*v1`  | `release-v1`, `release-candidate-v1` | `release-v2`     |

This compact explanation provides a clear overview of the supported patterns, helping users configure their tag filtering effectively.