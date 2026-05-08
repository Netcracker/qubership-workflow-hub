---
name: qubership-actions-guide
description: Navigation-only skill for individual actions in netcracker/qubership-workflow-hub. Use when a workflow needs to consume a specific Qubership action (Docker build/push, version/tag rendering, Maven/npm/Python publishing, package cleanup, Helm charts, security scans, etc.) and you need to find the right action and read its authoritative README. All rules (pinning, permissions, anti-hallucination, naming) live in qubership-workflow-conventions — this skill does not restate them.
---

# qubership-actions-guide

## Step 0 — collect general workflow requirements

**Before identifying which domain guide to load, establish the following.**
Do not generate anything until all answers are collected.

If the user has provided or mentioned an existing workflow file — read it first and extract what's already defined. Do not ask for information that can be read from the file.

| # | Question | What it controls |
| - | --- | --- |
| 1 | What triggers this workflow? (push to branch, pull_request, tag push, `workflow_dispatch`, schedule?) | `on:` block |

Defaults — do not ask, apply automatically:
- Runner: `ubuntu-latest`
- Concurrency: release/deploy workflows → `cancel-in-progress: false`; CI/PR workflows → `cancel-in-progress: true`
- Dry-run: asked per domain where relevant (Docker, Helm) — not here

After collecting these answers, continue to Step 1 to identify the domain and load the relevant guide.

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

Fetch only for actions you are actually using, only when the catalog purpose
line is not enough to write the `with:` block:

```text
WebFetch → https://raw.githubusercontent.com/netcracker/qubership-workflow-hub/<ref>/actions/<name>/README.md
```

Use the latest stable tag as `<ref>` (see *Resolving the latest tag* below).
Skip the fetch for actions you are not using.

## Step 4 — assemble the workflow

Hand off to `qubership-workflow-conventions` for all rules: pinning, permissions,
concurrency, timeouts, dry-run gating, secrets.

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

- It does not generate full workflows — for that, follow `qubership-workflow-conventions`.
- It does not cover reusable workflows (`re-*.yml`) — only individual actions.
