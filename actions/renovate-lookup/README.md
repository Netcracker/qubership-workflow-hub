# Renovate lookup action

Runs a local Renovate dependency lookup, classifies errors, and retries soft lookup failures once
with a fresh cache.

This action is one part of the Renovate health workflow. Use it with `renovate-validate` and
`renovate-monitor`; the caller owns checkout, containers, permissions, scheduling, and job
orchestration.

## Requirements

- Run from the checked-out repository root.
- Provide Bash, Renovate CLI, `jq`, OpenSSL, `mktemp`, `cp`, and `tail`.
- Set `GITHUB_COM_TOKEN` for GitHub API and package lookups.

## Outputs

| Output | Description |
| --- | --- |
| `reason` | Diagnostic reason for a recognized lookup failure; empty on success |

The action writes lookup counts, retry status, warnings, and errors to the job summary. Consumers
must also inspect the complete job result.

## Usage

```yaml
permissions:
  contents: read

steps:
  - name: Checkout sources
    uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    with:
      persist-credentials: false

  - name: Look up dependencies
    id: lookup
    uses: netcracker/qubership-workflow-hub/actions/renovate-lookup@<resolved-sha> # <resolved-tag>
    env:
      GITHUB_COM_TOKEN: ${{ github.token }}
```
