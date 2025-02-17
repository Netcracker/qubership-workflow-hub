# Custom Event Action

This Action triggers a custom `repository_dispatch` event in the repository.

## Inputs

| Name             | Description                                   | Required | Default |
| ---------------- | --------------------------------------------- | -------- | ------- |
| `event_type`     | The type of the custom event to trigger.      | Yes      | None    |
| `client_payload` | Optional JSON payload to send with the event. | No       | `{}`    |
| `GITHUB_TOKEN`   | GitHub Token for authentication.              | Yes      | None    |

## Outputs

| Name     | Description                      |
| -------- | -------------------------------- |
| `status` | HTTP status code of the request. |

## Usage

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
          event_name: "my-custom-event"
          client_payload: '{"key": "value"}'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN}}
```

### `client_payload` Explanation

The `client_payload` input allows you to pass custom data as a JSON string. Below are examples with specific values:

```yaml
with:
  event_name: "my-custom-event"
  client_payload: '{"environment": "production", "version": "1.2.3"}'
```

#### Example: Accessing Parameters from `client_payload`

When triggering a `repository_dispatch` event, the `client_payload` parameters can be accessed directly in the target workflow. Here's how to retrieve the specific parameters defined earlier (`environment`, `version`, `branch`, `build_id`, etc.):

```yaml
name: Payload Variables

on:
  repository_dispatch:
    types:
      - my-custom-event

jobs:
  print-payload:
    runs-on: ubuntu-latest
    steps:
      - name: Access to variables
        run: |
          echo "Environment: ${{ github.event.client_payload.environment }}"
          echo "Version: ${{ github.event.client_payload.version }}"
```
