# 🚀 Custom Event Action

Triggers a custom `repository_dispatch` event on a GitHub repository with an optional JSON payload.

---

## Features

- Triggers a `repository_dispatch` event on any repository accessible with the provided token.
- Accepts an optional JSON client payload passed to the receiving workflow.
- Supports cross-repository event dispatch via `owner` and `repo` inputs.
- Validates and parses the client payload — fails fast on invalid JSON.
- Outputs the HTTP status code returned by the GitHub API.

---

## 📌 Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `event-type` | The type of the custom event to trigger. Used as the `event_type` field in the dispatch request. | Yes | - |
| `client-payload` | JSON payload to send with the event. Must be a valid JSON string. Received as `github.event.client_payload` in the target workflow. | No | `{}` |
| `github-token` | GitHub token for authentication. Requires `repo` scope to dispatch events. Falls back to `GITHUB_TOKEN` environment variable if not set. | Yes | - |
| `owner` | Owner (user or organisation) of the target repository. Defaults to the current repository owner. | No | Current repository owner |
| `repo` | Name of the target repository. Defaults to the current repository name. | No | Current repository name |

---

## 📌 Outputs

| Name | Description |
| ---- | ----------- |
| `status` | HTTP status code returned by the GitHub API dispatch request (e.g. `204` on success). |

---

## How it works

1. Reads `event-type` and `github-token` inputs (both required).
2. Reads `client-payload` and parses it as JSON. If the string is not valid JSON, the action fails immediately.
3. Resolves `owner` and `repo` — uses provided values or falls back to the current repository from `github.context.repo`.
4. Calls the GitHub REST API (`repos.createDispatchEvent`) with the resolved owner, repo, event type, and client payload.
5. Sets the `status` output to the HTTP status code returned by the API (`204` indicates success).

---

## Additional Information

### Cross-repository dispatch

By default the action dispatches to the repository where the workflow is running. To dispatch to a different repository, provide both `owner` and `repo` inputs. The `github-token` must have `repo` scope on the target repository.

### Client payload

The `client-payload` must be a valid JSON string. In the receiving workflow it is available as `github.event.client_payload`:

```yaml
on:
  repository_dispatch:
    types: [my-custom-event]

jobs:
  handle:
    runs-on: ubuntu-latest
    steps:
      - run: echo "${{ github.event.client_payload.key }}"
```

### Token requirements

The `github-token` input requires `repo` scope to create dispatch events. The default `GITHUB_TOKEN` in GitHub Actions has this scope within the same repository. For cross-repository dispatch, use a Personal Access Token (PAT) or a GitHub App token with appropriate permissions.

---

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
        uses: netcracker/qubership-workflow-hub/actions/custom-event@v1
        with:
          event-type: "my-custom-event"
          client-payload: '{"key": "value"}'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Notes

- Always pin to `@v2.2.0` or a specific SHA — never `@main` in production.
- `client-payload` must be a valid JSON string — invalid JSON causes the action to fail immediately.
- For cross-repository dispatch, ensure the token has `repo` scope on the target repository.
