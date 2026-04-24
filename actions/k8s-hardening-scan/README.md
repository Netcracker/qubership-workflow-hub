# 🚀 Kubernetes Hardening Scan

Validates container hardening compliance for Kubernetes deployments by scanning running workloads
with Kubescape (NSA, MITRE, and DevOpsBest frameworks) and optionally scanning Helm chart
configurations with Trivy. Produces a markdown report posted to the GitHub Actions step summary
and uploads raw JSON results as workflow artifacts.

---

## Features

- Scans all specified namespaces against NSA, MITRE, and DevOpsBest security frameworks
- Generates a per-Deployment markdown table with pass/fail status for each control
- Checks for critical exposed ports and containers using the `latest` image tag
- Marks configurable rules as mandatory; writes `failed_mandatory_checks.json` when any fail
- Appends the full markdown report to the GitHub Actions step summary
- Uploads Kubescape JSON results and (optionally) Trivy results as workflow artifacts
- Optionally scans Helm chart misconfiguration with Trivy
- Can gate the workflow — fails the job when mandatory checks are violated

---

## 📌 Inputs

| Name                       | Description                                                                     | Required | Default                         |
| -------------------------- | ------------------------------------------------------------------------------- | -------- | ------------------------------- |
| `namespaces`               | Comma-separated list of Kubernetes namespaces to include in the scan            | No       | -                               |
| `output-file`              | Base filename for JSON scan results (prefixed by tool name)                     | No       | `results.json`                  |
| `install-kubescape`        | Install Kubescape before scanning. Set to `false` if already installed          | No       | `true`                          |
| `execute-kubescape-scan`   | Run the Kubescape scan step                                                     | No       | `true`                          |
| `execute-trivy-scan`       | Run the Trivy Helm chart misconfiguration scan (requires repository checkout)   | No       | `false`                         |
| `fail-on-mandatory-checks` | Fail the job if any mandatory hardening checks did not pass                     | No       | `false`                         |
| `config-file`              | Path to the caller's hardening config YAML (overrides mandatory flags per rule) | No       | `.github/hardening-config.yaml` |

---

## 📌 Outputs

This action produces no step outputs. Results are communicated through:

| Output                          | Description                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| GitHub Actions step summary     | Markdown report with a per-Deployment control table, appended to `$GITHUB_STEP_SUMMARY`       |
| `kubescape-<output-file>`       | Workflow artifact containing the raw Kubescape JSON results                                    |
| `trivy-<output-file>`           | Workflow artifact containing Trivy misconfiguration results (only when Trivy scan is enabled)  |
| `failed_mandatory_checks.json`  | Written to the workspace when at least one mandatory check fails (used by gate step)           |

---

## How it works

The action scans live Kubernetes Deployments and produces a per-resource markdown report.
For each Deployment found in the scanned namespaces the report contains a control table:

```text
## Resource: `default/Deployment/my-app`

| ControlID        | Control name              | Status |
|------------------|---------------------------|--------|
| C-0013           | Non-root containers       | ✅     |
| C-0016           | Allow privilege escalation| ❌     |
| Critical-Ports   | Critical Ports            | ✅     |
| Latest-Tag       | No images using 'latest'  | ✅     |

**Total:** ✅ passed: 3, ❌ failed: 1
**Failed mandatory checks:** C-0016
```

When mandatory checks fail, the action writes `failed_mandatory_checks.json` to the workspace:

```json
{
  "default/Deployment/my-app": ["C-0016"],
  "staging/Deployment/api-server": ["C-0048", "No-Latest-Tag"]
}
```

If `fail-on-mandatory-checks` is `true` and this file exists, the action exits with code `1`,
gating the workflow. The full report is always appended to the GitHub Actions step summary
regardless of pass/fail outcome.

When `execute-trivy-scan` is `true`, the action also checks out the repository and scans it
with `trivy config` for Helm chart misconfigurations, uploading results as a separate artifact.

---

## Additional Information

### Hardening config file

The action ships a built-in `hardening-config.yaml` that defines which rules are mandatory.
The caller can provide a custom config at `config-file` (default: `.github/hardening-config.yaml`).
The custom config supports an `ignored_checks` list that marks specific rule IDs as non-mandatory:

```yaml
ignored_checks:
  - C-0048
  - Critical-Ports
```

Any rule ID listed under `ignored_checks` will have its `mandatory` flag set to `false` for the
run, suppressing failures for that check even when `fail-on-mandatory-checks` is `true`.

### Built-in mandatory rules

The following rules are mandatory by default (defined in the bundled `hardening-config.yaml`):

| Rule ID          | Name                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `C-0013`         | Non-root containers                                                              |
| `C-0016`         | Allow privilege escalation                                                       |
| `C-0017`         | Immutable container filesystem                                                   |
| `C-0055`         | Linux hardening                                                                  |
| `C-0041`         | HostNetwork access                                                               |
| `C-0045`         | Writable hostPath mount                                                          |
| `C-0048`         | HostPath mount                                                                   |
| `Critical-Ports` | Critical ports (22, 23, 25, 53, 67–69, 110, 143, 161, 162, 389, 636, 993, 995) |
| `No-Latest-Tag`  | No `latest` image tag                                                            |

### Trivy scan scope

When `execute-trivy-scan` is `true`, the action checks out the repository and scans the entire
repository root with `trivy config`. This detects misconfigurations in Helm chart templates and
Kubernetes manifests committed to the repository. It does **not** scan running cluster workloads —
that is the role of the Kubescape step.

### Namespace targeting

The `namespaces` input is passed directly to `--include-namespaces`. Supply a single namespace
or a comma-separated list (e.g. `default,kube-system`). Omitting this input causes Kubescape to
scan all accessible namespaces.

---

## Usage

```yaml
name: Kubernetes Hardening Scan

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 1'

jobs:
  hardening-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Run Kubernetes Hardening Scan
        uses: netcracker/qubership-workflow-hub/actions/k8s-hardening-scan@v2.2.0
        with:
          namespaces: default
          output-file: results.json
          install-kubescape: 'true'
          execute-kubescape-scan: 'true'
          execute-trivy-scan: 'false'
          fail-on-mandatory-checks: 'false'
          config-file: .github/hardening-config.yaml
```

---

## Notes

- The action requires a Kubernetes cluster to be reachable from the runner (kubeconfig must be
  configured before calling this action).
- Kubescape is installed at a pinned commit SHA — update the install step if a newer version
  is required.
- `fail-on-mandatory-checks: 'true'` causes the job to fail only when `failed_mandatory_checks.json`
  is present in the workspace, which is written when at least one mandatory check fails.
 - The Trivy scan checks out the repository into `temp/repocode`; ensure this path does not
  conflict with other steps.
- All boolean inputs (`install-kubescape`, `execute-kubescape-scan`, `execute-trivy-scan`,
  `fail-on-mandatory-checks`) must be passed as strings (`'true'` / `'false'`), not YAML booleans.
- Always pin to `@v2.2.0` or a specific SHA — never `@main` in production.
