---
name: qubership-actions-guide
description: Navigation-only skill for individual actions in netcracker/qubership-workflow-hub. Use when a workflow needs to consume a specific Qubership action (Docker build/push, version/tag rendering, Maven/npm/Python publishing, package cleanup, Helm charts, security scans, etc.) and you need to find the right action and read its authoritative README. All rules (pinning, permissions, anti-hallucination, naming) live in qubership-workflow-conventions — this skill does not restate them.
---

# qubership-actions-guide

## Step 1 — identify the operation and load the right guide

Before picking any action, identify what the workflow needs to do and load
the relevant supporting document:

| Operation | Load |
| --- | --- |
| Docker build, push, image migration | `docker.md` |
| Security scan (images, source/deps, k8s cluster) | `security.md` |
| Helm chart release, values update | `helm.md` |
| Git tag, GitHub Release, release assets | `release.md` |
| Maven, npm, Python publish | catalog below — no guide file needed |
| Cleanup, utilities, PR automation | catalog below — no guide file needed |

Each guide contains: clarifying questions for the user, config file schemas,
and pipeline patterns for that domain. Read it before picking actions or
asking questions.

Reusable workflows (`re-*.yml` in `netcracker/qubership-workflow-hub`) are out of scope — consume them as documented, do not redesign them here.

## Step 2 — pick actions from the catalog

Use the catalog to match each step in the workflow to a Qubership action.
For full input/output details fetch the action README on demand (see *Step 3*).

### Docker

| Action | Purpose |
| --- | --- |
| `docker-config-resolver` | Read docker config file, validate, output JSON array for matrix builds |
| `docker-action` | Build & push multi-platform Docker images |

### Versioning & tagging

| Action | Purpose |
| --- | --- |
| `metadata-action` | Extract GitHub context and produce a version string / tags |
| `tag-action` | Create / delete / check Git tags; optional GitHub release creation |
| `branch-action` | Create a new branch from a tag or another branch |

### Publishing

Ask only what is missing after inferring from context:
- Maven: target store (Central / GitHub Packages); Java version (default: 21)
- npm: registry (npmjs / GitHub Packages)
- Python: target (PyPI / GitHub Packages)

| Action | Purpose |
| --- | --- |
| `maven-release` | Maven artifact release with version bumping and GPG signing |
| `maven-snapshot-deploy` | Build and deploy Maven SNAPSHOT to Central or GitHub Packages |
| `poetry-publisher` | Build, test & publish Python package via Poetry to PyPI |

### Helm charts

| Action | Purpose |
| --- | --- |
| `chart-version` | Update `version` / `appVersion` in Helm Chart.yaml |
| `charts-values-update-action` | Update image versions in Helm values files; optionally create release branch |

### Security & compliance

| Action | Purpose |
| --- | --- |
| `cdxgen` | Generate SBOM + CycloneDX vulnerability report from source/deps |
| `k8s-hardening-scan` | Validate Kubernetes container hardening compliance (Kubescape + Trivy) |

### Cleanup

Ask only what is missing: package type (container images or Maven artifacts).

| Action | Purpose |
| --- | --- |
| `container-package-cleanup` | Remove stale container or Maven package versions from registry |

### PR & collaboration

| Action | Purpose |
| --- | --- |
| `cla-assistant` | CLA / DCO signing via PR comments |
| `pr-assigner` | Auto-assign reviewers based on config / CODEOWNERS |
| `pr-add-messages` | Append commit messages to PR description |

### Utilities

| Action | Purpose |
| --- | --- |
| `ghcr-discover-repo-packages` | Discover all GHCR packages for a repo — feeds security scan, cleanup, or any step needing the image list |
| `custom-event` | Emit `repository_dispatch` event with JSON payload |
| `smart-download` | Download workflow artifacts by name, IDs, or glob pattern |
| `store-input-params` | Persist `workflow_dispatch` inputs as artifact |
| `wait-for-workflow` | Wait for a specific GitHub Actions workflow run to complete |
| `verify-json` | Validate a JSON file against a JSON Schema |
| `assets-action` | Upload files/dirs to a GitHub release, auto-archives directories |

Deprecated (do not use): `commit-and-push`, `pom-updater`, `tag-checker`, `archive-and-upload-assets`.

## Step 3 — fetch action README on demand

For SHA pinning rules see `qubership-workflow-conventions` → *Pinning*.

Fetch action README only when the catalog purpose line is not enough to write the `with:` block:

```text
WebFetch → https://raw.githubusercontent.com/netcracker/qubership-workflow-hub/<sha>/actions/<name>/README.md
```

Use the SHA from the *Pin table* below.

## Pin table

Use these exact refs when writing `uses:` lines. Update this table when a new release is published.

| Repo | Latest tag | SHA (use this in `uses:`) |
| --- | --- | --- |
| `netcracker/qubership-workflow-hub` | `v2.2.1` | `e64a1ee2fc2f68ab44a4ef416c27d83ce36ba8e1` |
| `netcracker/release-drafter` | `v1.0.0` | `86f4276a3894b5af70480e826c32fe3648ac6a70` |
| `actions/checkout` | `v6.0.2` | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |

Example usage:
```yaml
uses: netcracker/qubership-workflow-hub/actions/docker-action@e64a1ee2fc2f68ab44a4ef416c27d83ce36ba8e1  # v2.2.1
```

Update this table manually when intentionally upgrading to a new release.

