# 🌿 Create Branch Action

This **Create Branch Action** automates the process of creating new Git branches from tags or other branches. It supports checking for existing branches, force creation, and dry-run mode for testing.

---

## Features

- Creates new Git branches from tags or existing branches.
- **Auto-generates branch names** if not provided, with multiple naming strategies.
- Supports custom branch name prefixes for auto-generated names.
- Checks if a branch already exists before creating it.
- Supports force creation (deletes and recreates the branch if it exists).
- Allows local-only branch creation (without pushing to remote).
- Supports dry-run mode for testing without making changes.
- Flexible source reference (can use tags, branches, or commit SHAs).

---

## 📌 Inputs

| Name                  | Description                                                                 | Required | Default                     |
| --------------------- | --------------------------------------------------------------------------- | -------- | --------------------------- |
| `branch-name`         | Name of the branch to create. If not provided, will be auto-generated based on `auto-name-strategy`. | No       |                             |
| `source-ref`          | Source reference (tag or branch) to create the branch from. Examples: 'v1.0.0', 'main', 'develop'. | Yes      |                             |
| `auto-name-strategy`  | Strategy for auto-generating branch name if `branch-name` is not provided. Options: `release` (release/X.X.X from tags), `timestamp` (branch-from-\<source\>-\<timestamp\>), `short-sha` (branch-from-\<source\>-\<short-sha\>), `source-only` (\<source\>-branch). | No       | `release`                   |
| `branch-prefix`       | Custom prefix for auto-generated branch names (overrides auto-name-strategy prefix). Example: 'hotfix/', 'feature/'. | No       | (empty)                     |
| `check-branch`        | Check if the branch already exists. If enabled, the action will exit if the branch exists. | No       | `false`                     |
| `force-create`        | Force create the branch even if it exists. If enabled, the existing branch will be deleted before creating a new one. | No       | `false`                     |
| `push-branch`         | Push the newly created branch to remote.                                    | No       | `true`                      |
| `dry-run`             | Run the action in dry-run mode. No changes will be pushed to the repository. Useful for testing workflows. | No       | `false`                     |
| `skip-checkout`       | Skip the checkout step (useful if the code is already checked out).         | No       | `false`                     |

---

## 📌 Outputs

| Name               | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `created-branch`   | The branch that was created.                                               |

---

## Additional Information

### Auto-Naming Strategies

When `branch-name` is **not provided**, the action will automatically generate a branch name based on the selected strategy:

#### 1. **`release`** (Default)
Extracts version from tags and creates release branches:
- Source: `v1.0.0` → Branch: `release/1.0.0`
- Source: `v2.3.4-beta` → Branch: `release/2.3.4-beta`
- Source: `1.0.0` → Branch: `release/1.0.0`
- For non-version tags: `my-tag` → Branch: `branch-from-my-tag`

#### 2. **`timestamp`**
Adds current timestamp for unique branch names:
- Source: `main` → Branch: `branch-from-main-20240126-143022`
- Source: `v1.0.0` → Branch: `branch-from-v1.0.0-20240126-143022`

#### 3. **`short-sha`**
Includes short commit SHA for traceability:
- Source: `main` → Branch: `branch-from-main-a1b2c3d`
- Source: `develop` → Branch: `branch-from-develop-f4e5d6c`

#### 4. **`source-only`**
Simple name based on source reference:
- Source: `main` → Branch: `main-branch`
- Source: `v1.0.0` → Branch: `v1.0.0-branch`

### Custom Branch Prefix

Use `branch-prefix` to override the default prefix for any strategy:
- Strategy: `release`, Prefix: `hotfix/`, Source: `v1.0.0` → Branch: `hotfix/1.0.0`
- Strategy: `timestamp`, Prefix: `feature/`, Source: `main` → Branch: `feature/main-20240126-143022`
- Strategy: `source-only`, Prefix: `bugfix/`, Source: `develop` → Branch: `bugfix/develop`

### Source Reference

The `source-ref` input can be:
- **Tag name**: `v1.0.0`, `release-2024`
- **Branch name**: `main`, `develop`, `feature/awesome-feature`
- **Commit SHA**: `a1b2c3d4e5f6...`

The action will automatically detect if the source reference exists and create the new branch from that point.

### Check Branch

When `check-branch` is set to `true`, the action will verify if a branch with the specified name already exists both locally and remotely. If it exists, the action will fail with an error message. This is useful to prevent accidental branch overwrites.

### Force Create

If `force-create` is set to `true`, the action will delete any existing branch with the same name (both locally and remotely) before creating a new one. Use this option carefully as it will overwrite existing branches.

### Push Branch

By default, the action pushes the newly created branch to the remote repository. If you want to create the branch only locally, set `push-branch` to `false`.

### Dry-Run Mode

When `dry-run` is set to `true`, the action will simulate the branch creation process without making any actual changes to the remote repository. The branch will be created locally, but no push operations will be performed. This is useful for testing and debugging workflows.

### Skip Checkout

If `skip-checkout` is set to `true`, the action will skip the repository checkout step. This is useful when the repository is already checked out in a previous step, saving time and avoiding redundant operations.

---

## Example Configuration

Below are examples of how to use this action in a GitHub Actions workflow:

### Example 1: Create a Release Branch from a Tag

```yaml
name: Create Release Branch

on:
  workflow_dispatch:
    inputs:
      tag-name:
        description: 'Tag to create branch from'
        required: true
        default: 'v1.0.0'
      branch-name:
        description: 'Name of the branch to create'
        required: true
        default: 'release/1.0.0'

jobs:
  create-branch:
    runs-on: ubuntu-latest

    steps:
      - name: Create Branch from Tag
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          branch-name: ${{ inputs.branch-name }}
          source-ref: ${{ inputs.tag-name }}
          check-branch: true
          push-branch: true
```

### Example 2: Create a Hotfix Branch with Force Create

```yaml
name: Create Hotfix Branch

on:
  workflow_dispatch:

jobs:
  create-hotfix:
    runs-on: ubuntu-latest

    steps:
      - name: Create or Recreate Hotfix Branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          branch-name: hotfix/critical-fix
          source-ref: main
          force-create: true
          push-branch: true
```

### Example 3: Create Local Branch Only (No Push)

```yaml
name: Create Local Branch

on:
  push:
    branches:
      - main

jobs:
  create-local-branch:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Create Local Branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          branch-name: feature/new-experiment
          source-ref: develop
          push-branch: false
          skip-checkout: true
        id: create-branch-step

      - name: Output Created Branch
        run: echo "Created branch: ${{ steps.create-branch-step.outputs.created-branch }}"
```

### Example 4: Dry-Run Mode for Testing

```yaml
name: Test Branch Creation

on:
  pull_request:

jobs:
  test-branch-creation:
    runs-on: ubuntu-latest

    steps:
      - name: Test Branch Creation (Dry Run)
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          branch-name: test/my-branch
          source-ref: v2.0.0
          dry-run: true
```

### Example 5: Create Multiple Branches from Different Sources

```yaml
name: Create Multiple Branches

on:
  workflow_dispatch:

jobs:
  create-branches:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create Feature Branch from Main
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          branch-name: feature/new-feature
          source-ref: main
          skip-checkout: true

      - name: Create Release Branch from Tag
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          branch-name: release/2.0.0
          source-ref: v2.0.0
          skip-checkout: true
          check-branch: true
```

### Example 6: Auto-Generate Branch Name from Tag (Release Strategy)

```yaml
name: Auto-Create Release Branch

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release-branch:
    runs-on: ubuntu-latest

    steps:
      - name: Auto-Generate Release Branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: ${{ github.ref_name }}
          # branch-name is not provided, will auto-generate as "release/X.X.X"
          auto-name-strategy: release
        id: create-release

      - name: Output Created Branch
        run: echo "Auto-generated branch: ${{ steps.create-release.outputs.created-branch }}"
```

### Example 7: Auto-Generate with Timestamp Strategy

```yaml
name: Create Timestamped Branch

on:
  workflow_dispatch:
    inputs:
      source-branch:
        description: 'Source branch'
        required: true
        default: 'main'

jobs:
  create-timestamped-branch:
    runs-on: ubuntu-latest

    steps:
      - name: Create Timestamped Branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: ${{ inputs.source-branch }}
          auto-name-strategy: timestamp
          # Will create: branch-from-main-20240126-143022
```

### Example 8: Auto-Generate with Custom Prefix

```yaml
name: Create Hotfix with Auto-Name

on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to create hotfix from'
        required: true
        default: 'v1.0.0'

jobs:
  create-hotfix:
    runs-on: ubuntu-latest

    steps:
      - name: Create Hotfix Branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: ${{ inputs.tag }}
          auto-name-strategy: release
          branch-prefix: 'hotfix/'
          # For v1.0.0, will create: hotfix/1.0.0
```

### Example 9: Auto-Generate Multiple Branches with Different Strategies

```yaml
name: Create Multiple Auto-Named Branches

on:
  workflow_dispatch:

jobs:
  create-auto-branches:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create Release Branch (auto-named)
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: v1.5.0
          auto-name-strategy: release
          skip-checkout: true
          # Creates: release/1.5.0

      - name: Create Feature Branch with SHA (auto-named)
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: develop
          auto-name-strategy: short-sha
          branch-prefix: 'feature/'
          skip-checkout: true
          # Creates: feature/develop-a1b2c3d

      - name: Create Backup Branch (auto-named)
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: main
          auto-name-strategy: timestamp
          branch-prefix: 'backup/'
          skip-checkout: true
          # Creates: backup/main-20240126-143022
```

---

## Notes

- If `branch-name` is not provided, the action will auto-generate a name based on `auto-name-strategy`.
- The `release` strategy works best with semantic version tags (e.g., v1.0.0, v2.3.4-beta).
- For unique branch names in concurrent workflows, use `timestamp` or `short-sha` strategies.
- Use `branch-prefix` to customize the prefix for auto-generated branch names.
- Ensure that the `source-ref` input points to a valid tag, branch, or commit SHA.
- Use `check-branch` to prevent accidental overwrites of existing branches.
- The `force-create` option should be used carefully as it will delete existing branches.
- Use `dry-run` mode to test the workflow without making changes to the remote repository.
- The `skip-checkout` input can be used to skip the repository checkout step if the repository is already checked out in a previous step.
- Make sure your workflow has appropriate permissions to push branches to the repository.
