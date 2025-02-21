# 🚀 Custom Event Action

This **Custom Event** GitHub Action triggers a custom `repository_dispatch` event in the repository.

## Features

- Triggers a custom `repository_dispatch` event.
- Allows sending a custom JSON payload.
- Outputs the HTTP status code of the request.

## 📌 Inputs

| Name             | Description                                   | Required | Default |
| ---------------- | --------------------------------------------- | -------- | ------- |
| `event_type`     | The type of the custom event to trigger.      | Yes      | None    |
| `client_payload` | Optional JSON payload to send with the event. | No       | `{}`    |
| `GITHUB_TOKEN`   | GitHub Token for authentication.              | Yes      | None    |

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
        uses: netcracker/qubership-workflow-hub/actions/custom-event@main
        with:
          event_type: "my-custom-event"
          client_payload: '{"key": "value"}'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}