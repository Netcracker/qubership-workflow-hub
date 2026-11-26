# 🚀 Package Cleanup Action

This **Package Cleanup** GitHub Action automates the cleanup of old package versions in a GitHub repository or organization.
It supports both Docker/container images and Maven JAR files.

---

## Inputs

| Name                 | Description                                                                                  | Required | Default                                   |
| -------------------- | -------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| `threshold-days`     | Keep versions newer than this many days.                                                     | No       | `7`                                       |
| `threshold-versions` | Keep this many newest versions (Maven only).                                                 | No       | `1`                                       |
| `included-tags`      | Comma-separated tags/versions eligible for deletion (`*` wildcards supported). Merged with `included-patterns`. | No       | `""` (all; Maven: `*SNAPSHOT*`)           |
| `excluded-tags`      | Comma-separated tags/versions never deleted (`*` wildcards supported). Merged with `excluded-patterns`. | No       | `""`                                      |
| `included-patterns`  | Comma-separated patterns to include (`*` wildcards supported). Merged with `included-tags`. | No       | `""`                                      |
| `excluded-patterns`  | Comma-separated patterns to exclude (`*` wildcards supported). Merged with `excluded-tags`; exclusions always win over inclusions. | No       | `""`                                      |
| `package-type`       | Package kind to clean: `container` or `maven` (any letter case). Any other value fails the action. | No       | `container`                               |
| `dry-run`            | If `true`, only prints what would be deleted. Accepts `true` or `false` in any letter case; an empty value means `false`; any other value fails the action. | No       | `false`                                   |
| `debug`              | If `true`, prints extra debug logs. Accepts `true` or `false` in any letter case; an empty value means `false`; any other value fails the action. | No       | `true`                                    |
| `batch-size`         | Number of versions deleted in parallel per package. Positive integer; empty or `0` uses the default. Invalid values fail the action. | No       | `15`                                      |
| `max-errors`         | Stop after this many errors. Positive integer; empty or `0` uses the default. Invalid values fail the action. | No       | `5`                                       |

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

Below are examples of how to use this action in a GitHub Actions workflow for both Docker images and Maven JAR files.

> **Version:** replace `vX.Y.Z` with the release that contains the described behavior. Releases up to and including `v2.8.3`
> ignore `included-patterns` and `excluded-patterns` for Maven and read the tag inputs for container packages only.

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
        default: "release*,semver"
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
        uses: netcracker/qubership-workflow-hub/actions/container-package-cleanup@vX.Y.Z
        with:
          threshold-days: ${{ github.event.inputs.threshold-days || 7 }}
          included-tags: ${{ github.event.inputs.included-tags || '' }}
          excluded-tags: ${{ github.event.inputs.excluded-tags || 'release*,semver' }}
          debug: ${{ github.event.inputs.debug || 'false' }}
          dry-run: ${{ github.event.inputs.dry-run || 'false' }}
          package-type: container
        env:
          PACKAGE_TOKEN: ${{ secrets.PACKAGE_TOKEN }}
```

Tags and patterns can be mixed: `included-tags` and `included-patterns` are merged, as are `excluded-tags` and `excluded-patterns`.
The layers of the images that are kept are protected automatically.

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
        default: "latest,release*"
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
        uses: netcracker/qubership-workflow-hub/actions/container-package-cleanup@vX.Y.Z
        with:
          threshold-days: ${{ github.event.inputs.threshold-days || 14 }}
          threshold-versions: ${{ github.event.inputs.threshold-versions || 1 }}
          included-patterns: ${{ github.event.inputs.included-patterns || '*SNAPSHOT*' }}
          excluded-patterns: ${{ github.event.inputs.excluded-patterns || 'latest,release*' }}
          debug: ${{ github.event.inputs.debug || 'false' }}
          dry-run: ${{ github.event.inputs.dry-run || 'false' }}
          package-type: maven
        env:
          PACKAGE_TOKEN: ${{ secrets.PACKAGE_TOKEN }}
```

Do not add `*.*` to the Maven exclusions: it also matches SNAPSHOT versions such as `1.0.0-SNAPSHOT`, and nothing would be deleted.
See [Examples](#examples) and the migration note below.

---

## Usage for Container Images

- Set `package-type: container` (default).
- Filtering by `included-tags` / `included-patterns` and `excluded-tags` / `excluded-patterns` works on image tags (the two inputs of each pair are merged).
- Wildcards (`*`) are supported for flexible tag matching.
- All container image versions older than `threshold-days` and matching the tag filters will be deleted (unless `dry-run` is enabled).
- A version whose creation date is missing or invalid is never deleted: its age cannot be judged, so it is kept and listed in a warning.

---

## Usage for Maven Packages

- Set `package-type: maven`.
- Filtering by `included-patterns` / `included-tags` and `excluded-patterns` / `excluded-tags` works on Maven version names (the two inputs of each pair are merged).
- **If you do not specify any include filter, the action uses `*SNAPSHOT*`.**
  This means that by default, only SNAPSHOT versions will be deleted for Maven.
- **If you specify include filters, only those are used and `*SNAPSHOT*` is not added.**
  A broad include such as `*` also selects release versions, so keep `*SNAPSHOT*` in the include list unless you really want to delete other versions.
- Wildcards (`*`and `?`) are supported for flexible version matching.
- All Maven versions older than `threshold-days` and matching the filters will be deleted (unless `dry-run` is enabled).

---

## Tag/Version Filtering Logic

The action filters tags/versions in the following order of priority:

1. **Excluded Tags/Patterns**:
   - Versions matching `excluded-tags` or `excluded-patterns` are **always skipped**, even if they also match `included-tags` or `included-patterns`.
   - Items of a list are separated by commas; whitespace around an item is trimmed and empty items are skipped.

2. **Included Tags/Patterns**:
   - If `included-tags` or `included-patterns` is specified, only versions matching these are considered for deletion.

3. **Default Behavior**:
   - If neither `included-tags` nor `included-patterns` is specified, all versions are considered for deletion, except those explicitly excluded by `excluded-tags` or `excluded-patterns`.
   - **For Maven:** If neither `included-tags` nor `included-patterns` is specified, only `*SNAPSHOT*` versions are considered for deletion by default.

### Filtering Process

1. Exclude versions matching `excluded-tags` or `excluded-patterns`.
2. From the remaining versions, include only those matching `included-tags` or `included-patterns` (if specified).
3. If neither `included-tags` nor `included-patterns` is specified, all remaining versions are considered for deletion (for Maven, only `*SNAPSHOT*` by default).

---

## Examples

### Maven: before and after removing `*.*` from the exclusions

Configuration used by several Maven cleanup workflows, with `*.*` in the exclusions:

```yaml
with:
  package-type: maven
  threshold-days: 14
  included-patterns: '*SNAPSHOT*'
  excluded-patterns: 'latest,release*,*.*'
```

`*.*` also matches `1.0.0-SNAPSHOT`, and exclusions win over inclusions. Every SNAPSHOT version is protected, nothing is
deleted, and the action writes a warning and the job summary section *Versions protected by excluded patterns*.

The same configuration without `*.*`:

```yaml
with:
  package-type: maven
  threshold-days: 14
  included-patterns: '*SNAPSHOT*'
  excluded-patterns: 'latest,release*'
```

SNAPSHOT versions older than 14 days are deleted, except the newest of them (`threshold-versions` defaults to `1`).
Release versions such as `1.2.3` are kept because they do not match the inclusion `*SNAPSHOT*`.

### Containers: tags and patterns together

Tag and pattern inputs are merged, so both of these configurations select the same tags:

```yaml
with:
  package-type: container
  threshold-days: 7
  included-tags: 'dev-*'
  included-patterns: 'test-*'
  excluded-tags: 'release*,latest'
  excluded-patterns: 'semver'
```

Tags starting with `dev-` or `test-` that are older than 7 days are deleted. Tags starting with `release`, `latest` and
version tags such as `1.2.3` or `v1.2.3` are kept. The layers of every kept image are protected automatically.

---

## Safety Behavior

### Input validation

`threshold-days` must be a non-negative integer (`0`, `7`, `30`, ...). For `package-type: maven`,
`threshold-versions` must be a non-negative integer as well. Empty, negative, fractional and partially
numeric values (for example `-1`, `1.5`, `7abc`) fail the action **before** any package is listed or deleted.

### Excluded patterns that protect every candidate

For Maven packages, if every version that matches the include filters and is older than `threshold-days` is protected by an
exclusion, nothing is deleted for that package. The action then writes a warning and lists the package and the responsible
patterns in the job summary under *Versions protected by excluded patterns*. A typical cause is a pattern such as `*.*`,
which also matches SNAPSHOT versions like `1.0.0-SNAPSHOT`.

### Migration note: exclusions are applied for Maven

Before this change the Maven path ignored `included-patterns`, `excluded-patterns`, `included-tags` and `excluded-tags`
and always used `*SNAPSHOT*`. These inputs are now applied. A workflow that passes `excluded-patterns: latest,release*,*.*`
relied on the old behavior: `*.*` also matches SNAPSHOT versions, so after updating the pinned version of the action nothing
would be deleted any more. Remove `*.*` from the exclusions **before** updating the version. The inclusion `*SNAPSHOT*`
alone keeps release versions such as `1.2.3`, because they do not match it.

### Layers of retained container images

A multi-platform image consists of a tagged version plus untagged versions (platform and attestation
manifests) that it references. Every tagged version that is not selected for deletion is *retained*:
fresh versions, `latest`, versions matching `excluded-tags`, and versions not matching `included-tags`.
The untagged versions referenced by retained images are never deleted, even if they are older than `threshold-days`
or are also referenced by an image that is being deleted.

### Manifest inspection failure

If the manifest of a retained image cannot be inspected (for example a registry or authentication error),
the action cannot know which untagged versions that image needs. In this case it does **not** delete any
untagged version of that package in the current run. Tagged versions selected for deletion are still deleted.
The affected packages and tags are listed in the warning log and in the job summary under *Incomplete cleanup*;
the skipped untagged versions are picked up by a later run once inspection works again.

Manifests are inspected only for packages that have untagged versions, because only those can be affected.
A package without untagged versions is not inspected, so a registry error does not appear under *Incomplete cleanup* for it.
Once the manifest of a retained image cannot be read, the manifests of the versions selected for deletion are not inspected
either, because no untagged version is deleted in that run.

To limit load, up to 8 `docker manifest inspect` calls run in parallel, and the `docker login` to `ghcr.io` runs once.

### Package listing failures

For an organization the action lists public, internal and private packages separately. If none of them can be listed
(for example a token without `read:packages`, a rate limit or an API outage), the action **fails** with the reasons
instead of finishing as an empty run. If only some visibilities fail, the action continues with the packages it found
and lists the failed visibilities in the warning log and in the job summary under *Incomplete package listing*,
because the cleanup may be incomplete.

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

`semver` is a simplified match, not a strict SemVer check: it also matches `1.0.0-SNAPSHOT`. Do not use it in Maven
exclusions, because it would protect SNAPSHOT versions the same way as `*.*`.

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

## Tests

The [test workflow](../../.github/workflows/test-container-package-cleanup.yml) runs unit tests,
rebuilds and verifies the committed bundle, then invokes this action through `action.yml` on Node.js 24.
Integration scenarios cover retained and shared platform manifests, manifest failures, single-platform
images, dry-run, empty results, Maven retention, zero thresholds and invalid inputs.

The integration fixtures use a local HTTP server and replace Docker subprocess calls. Only a fixture
token is used; network connections outside the local API fixture are blocked. No images, releases or
real package versions are created or deleted. Temporary files and the server are removed after each run.
These tests verify the action and its API request handling; they do not verify live GHCR availability
or the behavior of an installed Docker client.

Run the same bundle scenarios locally after installing dependencies and building:

```bash
npm ci
npm test
npm run build
npm run test:action
```

## Feedback

If you have suggestions or find a bug, please create an issue or pull request in this repository.
