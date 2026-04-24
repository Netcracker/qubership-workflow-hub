# 🚀 Custom Event Action

Triggers a custom `repository_dispatch` event on a GitHub repository with an optional JSON payload.

---

## Features

- Triggers a `repository_dispatch` event on any repository accessible with the provided token
- Accepts an optional JSON client payload passed to the receiving workflow
- Supports cross-repository event dispatch via `owner` and `repo` inputs
- Validates and parses the client payload — fails fast on invalid JSON
- Outputs the HTTP status code returned by the GitHub API

---

## 📌 Inputs

| Name             | Description                                                                                                                              | Required | Default |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `event-type`     | The type of the custom event to trigger. Used as the `event_type` field in the dispatch request.                                         | Yes      | -       |
| `client-payload` | JSON payload to send with the event. Must be a valid JSON string. Received as `github.event.client_payload` in the target workflow.      | No       | `{}`    |
| `github-token`   | GitHub token for authentication. Requires `repo` scope to dispatch events. Falls back to `GITHUB_TOKEN` environment variable if not set. | Yes      | -       |
| `owner`          | Owner (user or organisation) of the target repository. Defaults to the current repository owner.                                         | No       | -       |
| `repo`           | Name of the target repository. Defaults to the current repository name.                                                                  | No       | -       |

---

## 📌 Outputs

| Name     | Description                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| `status` | HTTP status code returned by the GitHub API dispatch request (`204` on success). |

---

## How it works

The action calls the GitHub REST API to dispatch a `repository_dispatch` event on the target repository.
The event lands in any workflow that declares `on: repository_dispatch` with a matching `types` filter.

The receiving workflow reads the payload via `github.event.client_payload`:

```yaml
on:
  repository_dispatch:
    types: [deploy-staging]

jobs:
  handle:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Version is ${{ github.event.client_payload.version }}"
```

On success the action outputs `status: 204`. If the JSON payload is malformed or the token is
missing, the action fails immediately before making any API call.

---

## Additional Information

### Cross-repository dispatch

By default the action dispatches to the repository where the workflow is running. To dispatch to a
different repository, provide both `owner` and `repo` inputs. The `github-token` must have `repo`
scope on the target repository.

```yaml
- name: Trigger event in another repo
  uses: netcracker/qubership-workflow-hub/actions/custom-event@v2.2.0
  with:
    event-type: deploy-staging
    client-payload: '{"version": "1.2.3"}'
    github-token: ${{ secrets.PAT_TOKEN }}
    owner: my-org
    repo: my-other-repo
```

### Client payload

The `client-payload` must be a valid JSON string. Example payload:

```json
{
  "version": "1.2.3",
  "environment": "staging",
  "triggered-by": "release-workflow"
}
```

In the receiving workflow the payload is available as `github.event.client_payload`:

```yaml
on:
  repository_dispatch:
    types: [my-custom-event]

jobs:
  handle:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Version is ${{ github.event.client_payload.version }}"
```

Keep the payload small — GitHub enforces a 10 KB limit on `client_payload`.

### Token requirements

The default `GITHUB_TOKEN` in GitHub Actions has `repo` scope within the same repository.
For cross-repository dispatch, use a Personal Access Token (PAT) or a GitHub App token with
`repo` scope on the target.

---

## Usage Example

```yaml
name: Trigger Custom Event

on:
  workflow_dispatch:

jobs:
  trigger-event:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Trigger custom event
        uses: netcracker/qubership-workflow-hub/actions/custom-event@v2.2.0
        with:
          event-type: deploy-staging
          client-payload: '{"version": "1.2.3", "environment": "staging"}'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

To dispatch to a different repository:

```yaml
      - name: Trigger event in another repo
        uses: netcracker/qubership-workflow-hub/actions/custom-event@v2.2.0
        with:
          event-type: deploy-staging
          client-payload: '{"version": "1.2.3"}'
          github-token: ${{ secrets.PAT_TOKEN }}
          owner: my-org
          repo: my-other-repo
```

---

## Notes

- `client-payload` must be a valid JSON string — invalid JSON causes the action to fail immediately.
- For cross-repository dispatch, ensure the token has `repo` scope on the target repository.
- The default `GITHUB_TOKEN` is sufficient for same-repository dispatch.
- Always pin to `@v2.2.0` or a specific SHA — never `@main` in production.
