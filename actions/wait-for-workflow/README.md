# 🚀 Wait for Workflow GitHub Action

This **Wait for Workflow** GitHub Action waits for a specific GitHub Actions workflow to start and complete successfully. It supports waiting by workflow file name or run ID, with configurable timeouts and polling intervals.

## Features

- Waits for workflow runs triggered by PRs or commits.
- Supports specifying workflow by file name (e.g., build.yml) or run ID.
- Configurable timeouts for workflow start and completion.
- Polls workflow status at specified intervals.
- Outputs workflow conclusion and run ID.

## 📌 Inputs

| Name            | Description                                                                 | Required | Default                                           |
| --------------- | --------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `workflow`      | Workflow file name (e.g., build.yml) or workflow run ID.                   | Yes      |                                                   |
| `token`         | GitHub token for API authentication (usually secrets.GITHUB_TOKEN).        | Yes      |                                                   |
| `sha`           | Commit SHA to match the workflow run (if PR number is not provided).       | No       | `${{ github.sha }}`                               |
| `pr-number`     | Pull request number if the workflow was triggered by a PR.                 | No       | `${{ github.event.pull_request.number }}`  |
| `timeout`       | Maximum time to wait for workflow completion (in minutes).                 | No       | `30`                                              |
| `max-wait`      | Maximum time (in minutes) to wait for the workflow run to start.           | No       | `10`                                              |
| `poll-interval` | Interval (in seconds) between status checks.                              | No       | `10`                                              |

## Usage Example

```yaml

# Example 1 — Wait for a workflow by file name on PR
name: Wait for Build Workflow
on:
  pull_request:
    types: [opened, reopened]

permissions:
  contents: read
  actions: read

jobs:
  wait:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for build.yml to complete
        uses: netcracker/qubership-workflow-hub/actions/wait-for-workflow@main
        with:
          workflow: build.yml
          token: ${{ secrets.GITHUB_TOKEN }}
          pr-number: ${{ github.event.pull_request.number }}
```

```yaml

# Example 2 — Wait for a workflow by run ID with custom timeout
name: Wait for Specific Run
on:
  workflow_dispatch:
    inputs:
      run-id:
        description: "Workflow run ID"
        required: true

permissions:
  contents: read
  actions: read

jobs:
  wait:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for workflow run
        uses: netcracker/qubership-workflow-hub/actions/wait-for-workflow@main
        with:
          workflow: ${{ inputs.run-id }}
          token: ${{ secrets.GITHUB_TOKEN }}
          timeout: 60
          poll-interval: 15
```

## Behavior and Precedence

- Workflow specification:
  1) If `workflow` is a numeric value — treated as workflow run ID.
  2) If `workflow` ends with `.yml` or `.yaml` — treated as workflow file name.
- Workflow run detection:
  - When `pr-number` is provided — looks for workflow runs triggered by that PR.
  - Otherwise uses `sha` to match workflow runs for specific commit.
- Timeouts:
  - `max-wait` controls how long to wait for the workflow to start.
  - `timeout` controls how long to wait for workflow completion after it starts.
- Polling happens every `poll-interval` seconds until completion or timeout.

## Permissions

Minimum recommended permissions for the job:
```yaml
permissions:
  contents: read   # to access repository information
  actions: read    # required to query workflow runs
```

## Outputs

| Name         | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `conclusion` | The conclusion of the workflow run (success, failure, cancelled, etc.). |
| `run-id`     | The ID of the workflow run that was waited on.                          |

## Additional Information

- If a workflow file name is provided but not found in the repository, the action will fail with an error.
- When waiting for a workflow by file name, the action will look for the most recent run matching the specified criteria (PR number or commit SHA).
- The action will exit with status code 1 if the workflow fails, is cancelled, or times out.
- For PR-triggered workflows, ensure the `pr-number` input is provided for accurate workflow matching.
- When using commit SHA matching, make sure the SHA corresponds to the exact commit that triggered the workflow.
