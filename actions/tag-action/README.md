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
| `ref`              | The branch to checkout before performing any tag operations.               | Yes      |                             |
| `tag-name`         | The name of the tag to create or delete.                                    | Yes      |                             |
| `check-tag`        | Check if the specified tag already exists. If enabled, the action will exit if the tag exists. | No       | `false`                     |
| `create-tag`       | Create a new tag. If set to `false`, the action will skip tag creation.     | No       | `true`                      |
| `force-create`     | Force create the tag even if it already exists. If enabled, the existing tag will be deleted before creating a new one. | No       | `false`                     |
| `delete-tag`       | Delete the specified tag. If enabled, the action will delete the tag with the name provided in the `tag-name` input from both the local and remote repositories. | No       | `false`                     |
| `dry-run`          | Run the action in dry-run mode. No changes will be pushed to the repository. Useful for testing workflows. | No       | `false`                     |
| `switch-to-tag`    | Switch to the created tag after creation.                                   | No       | `false`                     |
| `tag-message`      | Tag creation message.                                                       | No       | `Release tag`               |
| `create-release`   | Create a GitHub release for the tag.                                        | No       | `false`                     |
| `skip-checkout`    | Skip the checkout step (useful if the code is already checked out).         | No       | `false`                     |

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

### Switch to Tag

If `switch-to-tag` is set to `true`, the workflow will check out the newly created tag after it is pushed. This can be useful for running further steps against the tagged state.

### Tag Message

You can customize the tag message using the `tag-message` input. By default, it is set to "Release tag".

### Create Release

If `create-release` is set to `true`, the action will create or update a GitHub Release for the specified tag using the GitHub CLI (`gh`). The release will have a default title and body, which you can later edit as needed.

### Skip Checkout

If `skip-checkout` is set to `true`, the action will skip the repository checkout step. This is useful when the repository is already checked out in a previous step, saving time and avoiding redundant operations.

---

## Example Configuration

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Manage Git Tags

on:
  workflow_dispatch:

jobs:
  tag-management:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Create a New Tag
        uses: netcracker/qubership-workflow-hub/actions/tag-action@v2.0.8
        with:
          ref: main
          tag-name: v1.0.0
          create-tag: true
          tag-message: "Release v1.0.0"
          check-tag: true
          force-create: false
          dry-run: false
          create-release: true
          switch-to-tag: false

      - name: Delete an Existing Tag (Dry Run)
        uses: netcracker/qubership-workflow-hub/actions/tag-action@v2.0.8
        with:
          ref: main
          tag-name: v1.0.0
          delete-tag: true
          dry-run: true

      - name: Force Create Tag and Switch
        uses: netcracker/qubership-workflow-hub/actions/tag-action@v2.0.8
        with:
          ref: main
          tag-name: v1.0.1
          create-tag: true
          force-create: true
          switch-to-tag: true

      - name: Create Tag Without Checkout
        uses: netcracker/qubership-workflow-hub/actions/tag-action@v2.0.8
        with:
          skip-checkout: true
          tag-name: v1.0.2
          create-tag: true
          tag-message: "Release v1.0.2"
        id: skip-checkout-step

      - name: Output Created Tag
        run: echo "Created tag: ${{ steps.skip-checkout-step.outputs.created-tag }}"
```

---

## Notes

- Ensure that the `ref` input matches the branch you want to work on.
- Use `dry-run` mode to test the workflow without making changes.
- The `force-create` input can be used to overwrite existing tags, but use it cautiously to avoid unintended changes.
- The `skip-checkout` input can be used to skip the repository checkout step if the repository is already checked out in a previous step, saving time and avoiding redundant operations.