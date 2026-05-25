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
- Appends the full markdown report (with collapsible summary) to the GitHub Actions step summary
- Uploads Kubescape JSON results and (optionally) Trivy results as workflow artifacts
- Supports per-image ignore rules to skip specific checks for specific container images
- Optionally scans Helm chart misconfiguration with Trivy
- Can gate the workflow — fails the job when mandatory checks are violated

---

## 📌 Inputs

| Name                       | Description                                                                     | Required | Default                            |
| -------------------------- | ------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `namespaces`               | Comma-separated list of Kubernetes namespaces to include in the scan            | No       | -                                  |
| `output-file`              | Base filename for JSON scan results (prefixed by tool name)                     | No       | `results.json`                     |
| `install-kubescape`        | Install Kubescape before scanning. Set to `false` if already installed          | No       | `true`                             |
| `execute-kubescape-scan`   | Run the Kubescape scan step                                                     | No       | `true`                             |
| `execute-trivy-scan`       | Run the Trivy Helm chart misconfiguration scan (requires repository checkout)   | No       | `false`                            |
| `fail-on-mandatory-checks` | Fail the job if any mandatory hardening checks did not pass                     | No       | `false`                            |
| `config-file`              | Path to the caller's hardening config YAML (overrides mandatory flags per rule) | No       | `.qubership/hardening-config.yaml` |
| `report-title`             | Title shown at the top of the generated markdown report                         | No       | `Hardening Scan Report`            |

---

## 📌 Outputs

This action produces no step outputs. Results are communicated through:

| Output                         | Description                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| GitHub Actions step summary    | Markdown report with a per-Deployment control table, appended to `$GITHUB_STEP_SUMMARY`      |
| `kubescape-<output-file>`      | Workflow artifact containing the raw Kubescape JSON results                                   |
| `trivy-<output-file>`          | Workflow artifact containing Trivy misconfiguration results (only when Trivy scan is enabled) |
| `failed_mandatory_checks.json` | Written to the workspace when at least one mandatory check fails (used by gate step)          |

---

## How it works

The action scans live Kubernetes Deployments and produces a collapsible per-resource markdown report.
For each Deployment found in the scanned namespaces the report contains a control table under a
`<details>` summary block:

```text
### Hardening Scan Report
<details>
<summary>Summary</summary>

## Summary by resources

- `default/Deployment/my-app`: ✅ 5 / ❌ 1
  - registry.example.com/my-app:1.0.0

---

## Resource: `default/Deployment/my-app`

### Resource Images:

- registry.example.com/my-app:1.0.0

| ControlID      | Control name                          | Status |
|----------------|---------------------------------------|--------|
| C-0013         | Non-root containers (Mandatory)       | ✅     |
| C-0016         | Allow privilege escalation (Mandatory)| ❌     |
| Critical-Ports | Critical Ports                        | ✅     |
| Latest-Tag     | No images using 'latest' tag          | ✅     |

**Total:** ✅ passed: 5, ❌ failed: 1

**Failed mandatory checks:** C-0016

</details>
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
with `trivy k8s` for cluster misconfigurations, uploading results as a separate zipped artifact.

---

## Additional Information

### Hardening config file

The action ships a built-in `hardening-config.yaml` that defines which rules are mandatory.
The caller can provide a custom config at `config-file` (default: `.qubership/hardening-config.yaml`).

The custom config supports two sections:

**`global_ignored_checks`** — marks specific rule IDs as non-mandatory for all resources:

```yaml
global_ignored_checks:
  - C-0048
  - Critical-Ports
```

**`image_ignored_checks`** — skips specific checks only for resources running a named image:

```yaml
image_ignored_checks:
  registry.example.com/my-app:
    - C-0016
  legacy-app:
    - C-0017
    - C-0055
```

Any rule ID listed under `global_ignored_checks` has its `mandatory` flag set to `false` for
the entire run. Rules listed under `image_ignored_checks` are suppressed only for resources
whose image list matches the given image name.

### Built-in mandatory rules

The following rules are mandatory by default (defined in the bundled `hardening-config.yaml`):

| Rule ID          | Name                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| `C-0013`         | Non-root containers                                                               |
| `C-0016`         | Allow privilege escalation                                                        |
| `C-0017`         | Immutable container filesystem                                                    |
| `C-0055`         | Linux hardening                                                                   |
| `C-0041`         | HostNetwork access                                                                |
| `C-0045`         | Writable hostPath mount                                                           |
| `C-0048`         | HostPath mount                                                                    |
| `Critical-Ports` | Critical ports (22, 23, 25, 53, 67–69, 110, 143, 161, 162, 389, 636, 993, 995)  |
| `No-Latest-Tag`  | No `latest` image tag                                                             |

### Trivy scan scope

When `execute-trivy-scan` is `true`, the action checks out the repository into `temp/repocode`
and runs `trivy k8s` against the cluster with `--include-namespaces`. This detects
misconfigurations in live cluster workloads from Trivy's perspective. Results are uploaded as
a zipped artifact named `trivy-<output-file>`.

### Namespace targeting

The `namespaces` input is passed directly to `--include-namespaces`. Supply a single namespace
or a comma-separated list (e.g. `default,kube-system`). Omitting this input causes Kubescape to
scan all accessible namespaces.

### Resources without images

Resources that have no container images detected are skipped silently in the report. Only
resources with at least one identifiable image appear in the per-resource control tables.

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
        uses: netcracker/qubership-workflow-hub/actions/k8s-hardening-scan@v2.2.2
        with:
          namespaces: default
          output-file: results.json
          install-kubescape: 'true'
          execute-kubescape-scan: 'true'
          execute-trivy-scan: 'false'
          fail-on-mandatory-checks: 'false'
          config-file: .qubership/hardening-config.yaml
          report-title: Hardening Scan Report
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
- Always pin to `@v2.2.2` or a specific SHA — never `@main` in production.
