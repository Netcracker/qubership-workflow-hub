# Renovate validate action

Validates `renovate.json` and resolves inherited presets with the Renovate installation provided by
the caller.

This action is one part of the Renovate health workflow. Use it with `renovate-lookup` and
`renovate-monitor`; the caller owns checkout, containers, permissions, scheduling, and job
orchestration.

## Requirements

- Run from the checked-out repository root.
- Provide Bash, Renovate CLI, `renovate-config-validator`, `jq`, `mktemp`, and `tee`.
- Set `GITHUB_COM_TOKEN` when inherited presets require GitHub access.

## Outputs

| Output | Description |
| --- | --- |
| `reason` | Diagnostic reason for a recognized validation failure; empty on success |

Consumers must also inspect the complete job result. An unexpected command failure may stop the
action before it writes `reason`.

## Usage

```yaml
permissions:
  contents: read

steps:
  - name: Checkout sources
    uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    with:
      persist-credentials: false

  - name: Validate configuration and resolve shared presets
    id: validate
    uses: netcracker/qubership-workflow-hub/actions/renovate-validate@<resolved-sha> # <resolved-tag>
    env:
      GITHUB_COM_TOKEN: ${{ github.token }}
```
