# PR Add Messages Action

This action collects commit messages from a pull request and adds them to the pull request description.

**File:** `actions/pr-add-messages/action.yaml`

---

## Example Usage

```yaml
---
name: "Add commit messages to PR body"

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  update-pr-body:
    runs-on: ubuntu-latest
    steps:
      - name: "Update PR body"
        uses: netcracker/qubership-workflow-hub/actions/pr-add-messages@main
```

## Action Details

This action performs the following steps:

1. **Checkout Code:** Checks out the code from the repository.
2. **Collect Commit Messages:** Collects all commit messages from the pull request.
3. **Update PR Description:** Updates the pull request description with the collected commit messages.
