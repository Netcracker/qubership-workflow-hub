# Security — scans, configs, and pipelines

## Clarifying questions

Extract answers from the user's message first. Ask only what is missing and required to generate the workflow.
Trigger and runner are inferred per `workflow-patterns.md` → *Trigger rules* — do not ask.

| Question | Why |
| --- | --- |
| What to scan: source/deps, Docker images in GHCR, or running k8s cluster? | Determines which action to use: `cdxgen`, `re-security-scan`, or `k8s-hardening-scan` |
| *(Docker image scan only)* Do you have a Docker config file with `security` settings? If yes — what is its path? | If yes — read it. If no — `.qubership/docker.cfg` is the conventional default; path passed via `file-path` to `docker-config-resolver`. |

## Source / dependency scan (`cdxgen`)

Scans project source code and dependencies. No config file needed.

```text
cdxgen → SBOM artifact + CycloneDX vuln report
```

Auto-detects project type (`package.json`, `pom.xml`, etc.).
Set `project_type` input explicitly if auto-detection is wrong.

## Docker image scan

Two patterns depending on whether a Docker config file exists:

**With Docker config file** (recommended — filename is arbitrary, conventional default is `.qubership/docker.cfg`; this is the same central component config used across build, scan, cleanup, and other jobs):

```text
docker-config-resolver  →  filter security.scan==true  →  re-security-scan (matrix)
reads docker config file    per-component scan settings    Trivy + Grype
```

`re-security-scan` is a reusable workflow from `netcracker/qubership-workflow-hub`:

```yaml
uses: netcracker/qubership-workflow-hub/.github/workflows/re-security-scan.yml@<sha>  # vX.Y.Z
```

Each component with `security.scan: true` becomes a matrix entry.
Scan settings (`trivy_scan`, `only_high_critical`, etc.) come from the
component's `security` block — load `docker.md` as well for the full config file schema.
The config file path is passed via `file-path` input to `docker-config-resolver`.

**Without Docker config file** (discover from GHCR):

```text
ghcr-discover-repo-packages  →  re-security-scan (matrix)
discovers all repo packages      scans each image
```

`ghcr-discover-repo-packages` output `packages` can also feed
`container-package-cleanup` or any other step that needs the image list.

### SARIF categories

Docker image scans use a separate category for each tag, for example `collector:latest`
and `collector:main`. An image without a tag uses `latest`; source scans use `source`,
and digest categories retain their previous behavior. Grype and Trivy remain separate tools.
The image name is the final path component; registry and namespace are not part of the category.
Images with an identical final name and tag still share that category across registries/namespaces.
Do not merge reports from different tags or rewrite SARIF to compensate for the old category.
Read `docs/reusable/re-security-scan.md` at the pinned revision for upgrade behavior.
The same scan workflow automatically checks its previous image-only category after successful
Docker scans and uploads. It confirms processing of the new analyses, then uploads empty reports
only if the old category still has results. History is retained and new categories are untouched.
Do not generate a separate migration workflow, migration input, or generic cleanup of empty or
unrelated categories. Source scans and unchanged digest categories do not require migration.
The cleanup job coordinates scanners within one invocation, not other tags in the caller's matrix;
ensure required tags receive new analyses when rolling out the change. Already empty legacy
categories are checked but receive no additional empty uploads.
No custom token secret is required: the reusable uses the automatically provided `GITHUB_TOKEN`.
For Docker scans on a custom `runner`, ensure Bash, Docker, `jq`, and `gh` are available. Pin a revision containing
the category fix and cleanup; older releases do not acquire the changes automatically.

## Kubernetes hardening scan (`k8s-hardening-scan`)

Scans **running workloads** in a Kubernetes cluster using Kubescape + Trivy.
Does not scan images — scans live deployments for hardening compliance.

### Clarifying questions for k8s-hardening-scan

| Question | Why |
| --- | --- |
| Which Kubernetes namespaces to scan? (comma-separated, or leave empty for all) | Maps to `namespaces` input — scanning all namespaces can be noisy |
| Should the job fail if mandatory hardening checks are violated? | Maps to `fail-on-mandatory-checks` — default is `false` (report only) |
| Do you have a hardening config file? If yes — what is its path? | If yes — read it. If no — ask if any built-in rules should be suppressed, and confirm `.qubership/hardening-config.yaml` as the default path (passed via `config-file` input). |

Default — do not ask: Trivy scan for Helm chart misconfigurations is `false` (Kubescape only) unless user requests it.

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
