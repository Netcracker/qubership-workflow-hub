---
name: qubership-templates-guide
description: Navigation-only skill for the Netcracker workflow-templates catalog at Netcracker/.github/workflow-templates. Use when the user asks for a CI/CD workflow that may already exist as a curated template (Docker build/release, Maven/npm/Python release, Helm chart release, security scan, SBOM, PR hygiene, license/lint, GHCR cleanup). Points to the canonical template files and explains how to fork. All rules (pinning, permissions, anti-hallucination, naming) live in qubership-workflow-conventions — this skill does not restate them.
---

# qubership-templates-guide

Navigator for the official Netcracker workflow-templates catalog at
[`Netcracker/.github/workflow-templates`](https://github.com/Netcracker/.github/tree/main/workflow-templates).

These templates are the canonical, production-tested workflows used
across the org. The catalog is the source of truth — this skill helps
you locate the right template and adapt it.

## How to use

1. **Read the user's task.** Identify the CI/CD operation (release,
   build, scan, lint, cleanup, etc.).

1. **Match against the catalog table below.** Pick the closest template
   by purpose, not by name resemblance.

1. **Fetch the template ONCE.** Two equivalent ways:

   ```text
   gh api repos/Netcracker/.github/contents/workflow-templates/<file> --jq '.content' | base64 -d
   ```

   ```text
   WebFetch → https://raw.githubusercontent.com/Netcracker/.github/main/workflow-templates/<file>
   ```

   Use a commit SHA or a tag for `<ref>` in production; `main` is
   acceptable for exploration.

1. **Read the paired `.properties.json`** when present (same basename,
   `.properties.json` extension). It contains the GitHub UI metadata —
   description, categories, `filePatterns` — useful for confirming the
   template's intent.

1. **Adapt the template.** See *What to adapt vs. keep* below.

1. **Apply `qubership-workflow-conventions`** (*Mandatory conventions*)
   to every adapted line. Replace template SHAs with values from the
   *Pin table* in `qubership-actions-guide`.

1. **Tell the user which template you started from**, including the
   raw URL or repo path, so they can compare and re-fetch updates.

## Catalog: task → template

The table below is a snapshot for fast lookup; verify the file exists
in the current
[`Netcracker/.github/workflow-templates`](https://github.com/Netcracker/.github/tree/main/workflow-templates)
directory before using it (templates are added, renamed, and removed):

```bash
gh api repos/Netcracker/.github/contents/workflow-templates --jq '.[].name'
```

### Docker (CI builds)

| Task | Template |
| --- | --- |
| Build and push a single Docker image | `dev-docker-build-single-image.yml` |
| Build multiple Docker images from `.qubership/docker.cfg` | `dev-docker-build-multiple-images.yml` |
| Build a selected subset of Docker images | `dev-docker-build-selective.yml` |
| Build Maven project then Docker image | `dev-mvn-docker-build.yml` |

### Releases

| Task | Template |
| --- | --- |
| Release Docker images + GitHub release | `docker-release.yaml` |
| Release Maven artifact (Central or GH Packages) | `maven-release-v2.yaml` |
| Deploy Maven SNAPSHOT | `maven-snapshot-deploy.yaml` |
| Release npm package | `npm-release.yaml` |
| Publish npm package (lightweight) | `npm-publish.yaml` |
| Release Python package via Poetry | `python-release.yaml` |
| Release Helm charts + Docker images | `helm-charts-release.yaml` |

### Security and supply chain

| Task | Template |
| --- | --- |
| Security scan of GHCR Docker images | `security-scan.yml` |
| Security scan with custom config | `security-scan-with-config.yml` |
| Security scan for APIHUB | `security-scan-apihub.yml` |
| CVE scan via Docker Scout | `scout-cves.yml` |
| Generate SBOM and attach to release | `sbom-to-release.yaml` |
| Native GitHub dependency review on PR | `dependency-review.yaml` |
| OSSF Scorecard | `ossf-scorecard.yaml` |

### Code quality and linting

| Task | Template |
| --- | --- |
| Lint and test Helm charts | `lint-test-chart.yaml` |
| Lint markdown / source via super-linter | `super-linter.yaml` |
| Check third-party licenses | `check-license.yaml` |
| Add license headers to source files | `license-header.yml` |
| Check broken links | `link-checker.yaml` |
| Lint Renovate config | `renovate-config-lint.yaml` |
| Profanity filter for issues/PRs | `profanity-filter.yaml` |

### PR hygiene

| Task | Template |
| --- | --- |
| Conventional Commits PR check | `pr-conventional-commits.yaml` |
| Lint PR title | `pr-lint-title.yaml` |
| Auto-label PRs | `automatic-pr-labeler.yaml` |
| Auto-assign reviewers | `pr-assigner.yml` |
| Auto-assign issues to project board | `auto-assign-project-to-issue.yml` |
| CLA assistant | `cla.yaml` |

### Build and maintenance

| Task | Template |
| --- | --- |
| Build Go project | `go-build.yaml` |
| Cleanup old container versions in GHCR | `cleanup-old-docker-container.yaml` |
| Bump test workflow versions | `bump-test-workflows-version.yaml` |

## What to adapt vs. keep

When forking a template into a user's repo:

**Adapt** (safe, expected):

- Workflow `name:` and `run-name:` for repo-specific labels.
- Image names, package names, registry URLs that are repo-specific.
- Secret names if the user's repo uses different conventions.
- Path filters in `paths-ignore:` to match repo layout.
- `inputs:` defaults (versions, tags) for repo-specific norms.
- Trigger filters (branches, tags) for the repo's branching model.

**Keep** (do not "improve" without a reason):

- Job-level `permissions:` blocks — the templates already follow
  least-privilege.
- Job structure and `needs:` order — typical templates implement
  dry-run → deploy → release stages for a reason.
- Config-file references (`.qubership/docker.cfg`, etc.) — these are
  the org-standard locations.

**Always tell the user about**:

- Required secrets the template uses (e.g. `GH_BUMP_VERSION_APP_ID`,
  `MAVEN_GPG_PRIVATE_KEY`, `PYPI_API_TOKEN`).
- Required config files (`.qubership/docker.cfg`,
  `.qubership/helm-charts-release-config.yaml`,
  `.github/release-drafter-config.yml`) and where to find examples.
- Required org/repo variables (`vars.GH_BUMP_VERSION_APP_ID` etc.).

## What this skill does NOT do

- It does not generate workflows from scratch — for that, follow
  `qubership-workflow-conventions`.
- It does not duplicate template content — templates are fetched on
  demand from the catalog.
- It does not cover reusable workflows (`re-*.yml`) — those are not
  part of the workflow-templates catalog.
