# Security — scans, configs, and pipelines

## Clarifying questions

Ask these before designing any security scan workflow (Path B — scratch):

| Question | Why |
| --- | --- |
| What to scan: source/deps, Docker images in GHCR, or running k8s cluster? | Determines which action to use: `cdxgen`, `re-security-scan`, or `k8s-hardening-scan` |
| Does `.qubership/docker.cfg` already exist with `security` settings? | If yes — read it. Docker image scan config lives there. |

## Source / dependency scan (`cdxgen`)

Scans project source code and dependencies. No config file needed.

```
cdxgen → SBOM artifact + CycloneDX vuln report
```

Auto-detects project type (`package.json`, `pom.xml`, etc.).
Set `project_type` input explicitly if auto-detection is wrong.

## Docker image scan

Two patterns depending on whether `docker.cfg` exists:

**With `docker.cfg`** (recommended — scan config lives alongside build config):

```
docker-config-resolver  →  filter security.scan==true  →  re-security-scan (matrix)
reads docker config file    per-component scan settings    Trivy + Grype
```

Each component with `security.scan: true` becomes a matrix entry.
Scan settings (`trivy_scan`, `only_high_critical`, etc.) come from the
component's `security` block — see `docker.md` for the full schema.

**Without `docker.cfg`** (discover from GHCR):

```
ghcr-discover-repo-packages  →  re-security-scan (matrix)
discovers all repo packages      scans each image
```

`ghcr-discover-repo-packages` output `packages` can also feed
`container-package-cleanup` or any other step that needs the image list.

## Kubernetes hardening scan (`k8s-hardening-scan`)

Scans **running workloads** in a Kubernetes cluster using Kubescape + Trivy.
Does not scan images — scans live deployments for hardening compliance.

### Clarifying questions for k8s-hardening-scan

| Question | Why |
| --- | --- |
| Which Kubernetes namespaces to scan? (comma-separated, or leave empty for all) | Maps to `namespaces` input — scanning all namespaces can be noisy |
| Should the job fail if mandatory hardening checks are violated? | Maps to `fail-on-mandatory-checks` — default is `false` (report only) |
| Enable Trivy scan for Helm chart misconfigurations? | Maps to `execute-trivy-scan` — default is `false`, Kubescape only |
| Does `.qubership/hardening-config.yaml` already exist? | If yes — read it. If no — ask if any built-in rules should be suppressed |

### `.qubership/hardening-config.yaml` schema

Optional — overrides which Kubescape rules are non-mandatory.

```yaml
ignored_checks:
  - C-0048
  - Critical-Ports
```

Pass path via `config-file: .qubership/hardening-config.yaml` input.
Rules listed here won't fail the job even when `fail-on-mandatory-checks: true`.

Built-in mandatory rules (active by default): `C-0013`, `C-0016`, `C-0017`,
`C-0055`, `C-0041`, `C-0045`, `C-0048`, `Critical-Ports`, `No-Latest-Tag`.
