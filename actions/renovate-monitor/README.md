# Renovate monitor action

Combines complete validation and lookup job results with the Renovate Dependency Dashboard. It
writes a health summary and manages one labeled health issue.

This action is the final part of the Renovate health workflow. Use it after `renovate-validate` and
`renovate-lookup`; do not treat it as an independent repository monitor.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `validation-result` | Yes | - | Result of the complete validation job |
| `lookup-result` | Yes | - | Result of the complete lookup job |
| `validation-reason` | No | `""` | Validation diagnostic, when available |
| `lookup-reason` | No | `""` | Lookup diagnostic, when available |

Pass `needs.<job>.result` rather than an individual action outcome. This preserves failures from
repository-specific tests that run in the same job.

## Behavior

- The first failure creates an issue with the `renovate-health` label.
- Repeated failures update the same issue.
- A successful scheduled or manual check comments on and closes the issue.
- Known timestamp and package lookup warnings remain visible in the summary.
- When Issues are disabled, Dashboard and issue operations are skipped, but job failures still fail
  monitoring.
- Cancellation never counts as recovery.

Set the repository variable `RENOVATE_HEALTH_CHECK=false` in the caller to skip lookup and monitor.
Validation should remain active.

## Requirements and permissions

Provide Bash, GitHub CLI, `jq`, `grep`, AWK, and `mktemp`. Set `GH_REPO` and `GH_TOKEN` in the
caller job.

```yaml
permissions:
  contents: read
  issues: write
```

## Usage

```yaml
monitor-renovate:
  if: ${{ !cancelled() }}
  needs:
    - validate-renovate-config
    - lookup-renovate-dependencies
  runs-on: ubuntu-latest
  permissions:
    contents: read
    issues: write
  env:
    GH_REPO: ${{ github.repository }}
    GH_TOKEN: ${{ github.token }}
  steps:
    - name: Inspect Dependency Dashboard and report health
      uses: netcracker/qubership-workflow-hub/actions/renovate-monitor@<resolved-sha> # <resolved-tag>
      with:
        validation-result: ${{ needs.validate-renovate-config.result }}
        lookup-result: ${{ needs.lookup-renovate-dependencies.result }}
        validation-reason: ${{ needs.validate-renovate-config.outputs.reason }}
        lookup-reason: ${{ needs.lookup-renovate-dependencies.outputs.reason }}
```
