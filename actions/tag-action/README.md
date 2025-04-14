# 🚀 Tag Composite Action

This **Tag Composite Action** automates the process of managing Git tags in a repository. It supports creating, deleting, and checking tags, with options for dry-run mode and custom commit messages.

---

## Features

- Creates new Git tags with custom commit messages.
- Deletes existing Git tags.
- Checks if a tag already exists before creating it.
- Supports dry-run mode for testing without making changes.
- Allows forced creation of tags even if they already exist.

---

## 📌 Inputs

| Name               | Description                                                                 | Required | Default                     |
| ------------------ | --------------------------------------------------------------------------- | -------- | --------------------------- |
| `ref`              | Branch to checkout before creating the tag.                                | Yes      |                             |
| `tag-name`         | The name of the tag to create or delete.                                    | Yes      |                             |
| `check-tag`        | Check if the tag already exists.                                            | No       | `false`                     |
| `create-tag`       | Skip or Create a new tag.                                                          | No       | `true`                      |
| `force-create`     | Force create the tag even if it already exists.                            | No       | `false`                     |
| `delete-tag`       | Delete the specified tag.                                                  | No       | `false`                     |
| `dry-run`          | Run the action in dry-run mode (no changes will be pushed).                | No       | `false`                     |

---

## 📌 Outputs

| Name               | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `created-tag`      | The tag that was created.                                                  |

---

## Additional Information

### Dry-Run Mode

When `dry-run` is set to `true`, the action will simulate the tag creation or deletion process without making any actual changes. This is useful for testing and debugging workflows.

### Force Create

If `force-create` is set to `true`, the action will overwrite an existing tag with the same name. This is useful when you need to update a tag with new changes.

### Delete Tag

When `delete-tag` is set to `true`, the action will delete the specified tag from both the local repository and the remote repository. The `delete-message` input can be used to customize the commit message for the deletion.

---

## Example Configuration

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Manage Git Tags

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  tag-management:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3
        with:
          ref: main

      - name: Create a New Tag
        uses: Netcracker/qubership-workflow-hub/actions/tag-action@main
        with:
          ref: main
          tag-name: v1.0.0
          create-tag: true
          commit-message: "Release v1.0.0"

      - name: Delete an Existing Tag
        uses: ./actions/tag-action
        with:
          ref: main
          tag-name: v1.0.0
          delete-tag: true
          dry-run: true
```

---

## Notes

- Ensure that the `ref` input matches the branch you want to work on.
- Use `dry-run` mode to test the workflow without making changes.
- The `force-create` input can be used to overwrite existing tags, but use it cautiously to avoid unintended changes.