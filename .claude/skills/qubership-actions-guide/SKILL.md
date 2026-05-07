---
name: qubership-actions-guide
description: Navigation-only skill for individual actions in netcracker/qubership-workflow-hub. Use when a workflow needs to consume a specific Qubership action (Docker build/push, version/tag rendering, Maven/npm/Python publishing, package cleanup, Helm charts, security scans, etc.) and you need to find the right action and read its authoritative README. All rules (pinning, permissions, anti-hallucination, naming) live in qubership-workflow-conventions — this skill does not restate them.
---

# qubership-actions-guide

Navigator for actions in `netcracker/qubership-workflow-hub`. The catalog
below is embedded (v2.2.1) — use it to pick the right action without
fetching the catalog. Fetch a per-action README only when you need full
input/output details for an action you are actually using.

## Supporting documents

Read these files when relevant:

- `docker.md` — Docker config file schema, pipelines, clarifying questions.
  Read when the task involves Docker build, push, or release.
- `security.md` — Security scan pipelines, configs, clarifying questions.
  Read when the task involves image scanning, dependency scanning, or k8s hardening.
- `helm.md` — Helm config file schema, release pipeline, clarifying questions.
  Read when the task involves Helm chart release or values updates.

## Actions catalog (v2.2.1)

### Docker

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `docker-config-resolver` | Read docker config file, validate, output JSON array for matrix | `file-path` (default: `.qubership/docker.cfg`) | `config` (JSON array of components) |
| `docker-action` | Build & push multi-platform Docker images | `custom-image-name`, `platforms`, `tags`, `registry`, `docker-io-login`, `docker-io-token`, `sbom`, `build-args`, `download-artifact` | `image-name`, `final-tags`, `final-labels`, `final-build-args`, `final-platforms` |

### Versioning & tagging

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `metadata-action` | Extract GitHub context and produce a version string | `ref`, `configuration-path`, `short-sha`, `default-template`, `default-tag`, `extra-tags`, `merge-tags`, `dry-run` | `result`, `ref-name`, `date`, `dist-tag`, `major`, `minor`, `patch`, `short-sha`, `commit`, `ref-type` |
| `tag-action` | Create / delete / check Git tags; optional release creation | `tag-name`, `check-tag`, `create-tag`, `force-create`, `delete-tag`, `dry-run`, `create-release` | `created-tag` |
| `branch-action` | Create a new branch from a tag or another branch | `branch-name`, `source-ref`, `auto-name-strategy`, `force-create`, `dry-run` | `created-branch` |

### Publishing

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `maven-release` | Maven artifact release with version bumping and GPG signing | `version-type`, `module`, `ref`, `token`, `gpg-private-key`, `gpg-passphrase` | `release-version` |
| `maven-snapshot-deploy` | Build and deploy Maven SNAPSHOT to Central or GitHub Packages | `java-version`, `target-store`, `maven-command`, `pom-file`, `maven-username`, `maven-token`, `gpg-private-key` | deployed artifacts |
| `poetry-publisher` | Build, test & publish Python package via Poetry | `package_version`, `poetry_version_bump`, `run_pytest`, `pytest_options` | published to PyPI (`PYPI_TOKEN` env) |

### Helm charts

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `chart-version` | Update `version` / `appVersion` in Helm Chart.yaml | `new-chart-version`, `chart-app-version`, `chart-yaml-path` | none |
| `charts-values-update-action` | Update image versions in Helm values files; optionally create release branch | `release-version`, `config-file`, `chart-version`, `create-release-branch`, `publish-charts` | `images-versions`, `chart-metadata` |

### Security & compliance

| Action | Purpose | What it scans | Key inputs | Key outputs |
| --- | --- | --- | --- | --- |
| `cdxgen` | Generate SBOM + CycloneDX vulnerability report | Project source & dependencies | `project_type` | SBOM + vuln report artifacts |
| `k8s-hardening-scan` | Validate Kubernetes container hardening (Kubescape + Trivy) | Running cluster workloads | `namespaces`, `config-file`, `execute-kubescape-scan`, `execute-trivy-scan`, `fail-on-mandatory-checks` | scan report artifacts, `failed_mandatory_checks.json` |

### Cleanup

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `container-package-cleanup` | Remove stale container or Maven package versions | `threshold-days`, `threshold-versions`, `package-type`, `included-patterns`, `excluded-tags`, `dry-run` | deletion report |

### PR & collaboration

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `cla-assistant` | CLA / DCO signing via PR comments | `path-to-document`, `path-to-signatures`, `branch`, `allowlist` | signature JSON, PR status check |
| `pr-assigner` | Auto-assign reviewers based on config / CODEOWNERS | `shuffle`, `configuration-path` | none |
| `pr-add-messages` | Append commit messages to PR description | none required | none |

### Utilities

| Action | Purpose | Key inputs | Key outputs |
| --- | --- | --- | --- |
| `ghcr-discover-repo-packages` | Discover and list all GHCR packages for a repo — use as input for security scan, cleanup, or any workflow that needs the image list | `owner`, `repository` | `packages`, `has-packages` |
| `custom-event` | Emit `repository_dispatch` event with JSON payload | `event-type`, `client-payload`, `owner`, `repo` | `status` |
| `smart-download` | Download artifacts by name, IDs, or glob pattern | `name`, `artifact-ids`, `pattern`, `path` | none |
| `store-input-params` | Persist `workflow_dispatch` inputs as artifact | `input`, `stored_file_name`, `artifact_name` | artifact file |
| `wait-for-workflow` | Wait for a specific workflow run to complete | `workflow`, `token`, `sha`, `pr-number`, `timeout`, `poll-interval` | `conclusion`, `run-id` |
| `verify-json` | Validate a JSON file against a JSON Schema | `json-file`, `schema-file` | `is-valid` |
| `assets-action` | Upload files/dirs to a GitHub release, auto-archives directories | `tag`, `item-path`, `archive-type`, `retries` | none |

Deprecated (do not use): `commit-and-push`, `pom-updater`, `tag-checker`, `archive-and-upload-assets`.

## How to use

1. **Pick the action** from the catalog above whose purpose matches the step
   you need.

2. **Read the relevant supporting document** (`docker.md`, `helm.md`) for
   config schemas and pipeline patterns before assembling the workflow.

3. **Fetch the action README** only when you need full input/output details:

   ```text
   WebFetch → https://raw.githubusercontent.com/netcracker/qubership-workflow-hub/<ref>/actions/<name>/README.md
   ```

   Use the latest stable tag as `<ref>` (see *Resolving the latest tag* below).

4. **Skip the README fetch** for actions you are not actually using.

5. **Hand off to `qubership-workflow-conventions`** for all rules when
   assembling the workflow.

## Resolving the latest tag and its SHA

Latest stable tag:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub 'refs/tags/v*' \
  | awk -F/ '{print $NF}' | sort -V | tail -1
```

SHA for a specific tag:

```bash
git ls-remote https://github.com/netcracker/qubership-workflow-hub refs/tags/<tag>
```

## What this skill does NOT do

- It does not generate full workflows — for that, follow
  `qubership-workflow-conventions`.
- It does not cover reusable workflows (`re-*.yml`) — only individual actions.
