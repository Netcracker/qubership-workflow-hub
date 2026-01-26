# 🚀 Custom Event Action

This **Custom Event** GitHub Action triggers a custom `repository_dispatch` event in the repository.

## Features

- Triggers a custom `repository_dispatch` event.
- Allows sending a custom JSON payload.
- Outputs the HTTP status code of the request.

## 📌 Inputs

| Name             | Description                                   | Required | Default                  |
| ---------------- | --------------------------------------------- | -------- | ------------------------ |
| `event-type`     | The type of the custom event to trigger.      | Yes      | None                     |
| `client-payload` | Optional JSON payload to send with the event. | No       | `{}`                     |
| `github-token`   | GitHub Token for authentication.              | Yes      | None                     |
| `owner`          | Owner of the repository to sent event to.     | No       | Current repository owner |
| `repo`           | Name of the repository to sent event to.      | No       | Current repository name  |

## Outputs

| Name     | Description                      |
| -------- | -------------------------------- |
| `status` | HTTP status code of the request. |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Trigger Custom Event Action Workflow

on:
  workflow_dispatch:

jobs:
  trigger-event:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger custom event
        uses: netcracker/qubership-workflow-hub/actions/custom-event@v2.0.9
        with:
          event-type: "my-custom-event"
          client-payload: '{"key": "value"}'
          github-token: ${{ secrets.GITHUB_TOKEN }}
