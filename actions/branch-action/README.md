# 🚀 Create Branch Action

This **Create Branch Action** creates a new branch from a tag or another branch. It supports auto-generated branch names, force recreation, and dry-run mode.

---

## Features

- Create a new branch from a tag or another branch.
- Auto-generate a branch name based on configurable strategies.
- Fail fast if the target branch already exists (optional).
- Force recreate a branch (delete and re-create).
- Dry-run mode for safe testing.

### Action Result

The primary output of this action is the created branch name.
For example, if `source-ref` is `v1.2.3` and strategy is `release`, the output can be `release/1.2.3`.

---

## 📌 Inputs

| Name                 | Description                                                                                                                                | Required | Default |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------- |
| `branch-name`        | Name of the branch to create. If empty, the name is auto-generated.                                                                        | No       | `""`    |
| `source-ref`         | Source tag or branch to create from. If empty, uses current `GITHUB_REF_NAME`.                                                             | No       | `""`    |
| `auto-name-strategy` | Strategy for auto-generating branch name when `branch-name` is empty. Options: `auto`, `release`, `timestamp`, `short-sha`, `source-only`. | No       | `auto`  |
| `branch-prefix`      | Custom prefix for auto-generated branch names (overrides strategy prefix).                                                                 | No       | `""`    |
| `branch-separator`   | Separator between prefix and name (used with `branch-prefix` and `auto`).                                                                  | No       | `/`     |
| `check-branch`       | Check if the branch exists and fail if it does.                                                                                            | No       | `true`  |
| `force-create`       | Force create even if branch exists (delete and recreate).                                                                                  | No       | `false` |
| `push-branch`        | Push the newly created branch to remote.                                                                                                   | No       | `true`  |
| `dry-run`            | Run in dry-run mode (no remote changes).                                                                                                   | No       | `false` |

---

## 📌 Outputs

| Name             | Description                  |
| ---------------- | ---------------------------- |
| `created-branch` | The branch that was created. |

---

## Additional Information

### Source Ref Resolution

If `source-ref` is empty, the action uses `GITHUB_REF_NAME` from the workflow context. That means the branch or tag that triggered the workflow will be used as the source.

### Auto Name Strategy

- `auto`: Detects tag vs branch. Uses `release/<source>` for tags, `feature/<source>` for branches.
- `release`: Creates `release/<version>` when source matches a version-like tag (e.g., `v1.2.3`), otherwise falls back to `branch-from-<source>`.
- `timestamp`: Creates `branch-from-<source>-YYYYMMDD-HHMMSS`.
- `short-sha`: Creates `branch-from-<source>-<short-sha>`.
- `source-only`: Creates `<source>-branch`.

If `branch-prefix` is provided, it overrides the default prefix for the strategy.

#### What You Get (Examples)

Assume `source-ref` is `v1.2.3` (tag) or `main` (branch).

| Strategy | Source | Example result |
| -------- | ------ | -------------- |
| `auto` | `v1.2.3` (tag) | `release/v1.2.3` |
| `auto` | `main` (branch) | `feature/main` |
| `release` | `v1.2.3` | `release/1.2.3` |
| `release` | `release-2024-01` | `branch-from-release-2024-01` |
| `timestamp` | `main` | `branch-from-main-20240126-143022` |
| `short-sha` | `main` | `branch-from-main-a1b2c3d` |
| `source-only` | `develop` | `develop-branch` |

If `branch-prefix=hotfix` and `branch-separator=-`, then `auto` + `main` becomes `hotfix-main`.

### Force Create

When `force-create` is `true`, the action deletes any existing local and remote branch with the same name, then recreates it from `source-ref`.

### Dry Run

When `dry-run` is `true`, the action does not push or delete anything on the remote. It still validates and prints the operations it would perform.

---

## Example Configuration

Create a branch from a tag with an explicit name:

```yaml
name: Create branch from tag
on:
  workflow_dispatch:
    inputs:
      tag:
        description: Tag name
        required: true
      branch:
        description: New branch name
        required: true

jobs:
  create-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: ${{ inputs.tag }}
          branch-name: ${{ inputs.branch }}
```

Create a branch with a custom prefix:

```yaml
name: Create branch with prefix
on:
  workflow_dispatch:
    inputs:
      source:
        description: Source ref
        required: true

jobs:
  create-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create branch
        uses: netcracker/qubership-workflow-hub/actions/create-branch@main
        with:
          source-ref: ${{ inputs.source }}
          auto-name-strategy: auto
          branch-prefix: hotfix
          branch-separator: "-"
```

What will happen:
- If `source-ref` is a tag like `v1.2.3`, the branch name will be `hotfix-v1.2.3`.
- If `source-ref` is a branch like `main`, the branch name will be `hotfix-main`.

---

## Permissions

Minimum recommended permissions for the job:
```yaml
permissions:
  contents: write
```

---

## Notes

- This action expects the repository to already be available in the workspace. Use `actions/checkout@v4` in your workflow.
- For tag-based sources, set `source-ref` to the tag name.
- If `check-branch` is `true`, the action fails if the branch exists on the remote.
