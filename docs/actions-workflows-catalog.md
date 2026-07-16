# Actions & Reusable Workflows Catalog

Central directory of available GitHub Actions and Reusable Workflows in this repository.

Purpose:

- Single place to browse everything (active + deprecated) with short descriptions.
- Shows deprecation status so you avoid adopting legacy components.
- Fast jumping-off point to each Action / Workflow detail readme.

Deprecation & evolution rules are defined in [Standards & Change Policy](standards-and-change-policy.md).
Always check that document before modifying or depending on a deprecated component.

---

## 🔄 Actions

| Action                                                                          | Description                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [apm-packages-update](../actions/apm-packages-update/README.md)                 | Update APM-managed packages in the current repository and open a pull request          |
| [assets-action](../actions/assets-action/README.md)                             | Archive a folder and upload it to a GitHub Release as a release asset                  |
| [branch-action](../actions/branch-action/README.md)                             | Create a new branch from a tag/branch with auto-named conventions and optional push    |
| [cdxgen](../actions/cdxgen/README.md)                                           | Generate a CycloneDX SBOM and optional vulnerability report for the project            |
| [chart-version](../actions/chart-version/README.md)                             | Update version/appVersion fields in a Helm Chart.yaml                                  |
| [charts-values-update-action](../actions/charts-values-update-action/README.md) | Bump image versions in Helm values.yaml and prepare a chart release                    |
| [cla-assistant](../actions/cla-assistant/README.md)                             | Enforce CLA/DCO signing on pull requests via comment-based signatures                  |
| [config-resolver](../actions/config-resolver/README.md)                         | Schema-aware config resolver emitting flat JSON — docker/v1 by default, generic flattening for any other schema |
| [container-package-cleanup](../actions/container-package-cleanup/README.md)     | Delete stale GHCR container images or Maven package versions by age and tag rules      |
| [custom-event](../actions/custom-event/README.md)                               | Trigger a repository_dispatch event in the same or another repo with a custom payload  |
| [docker-action](../actions/docker-action/README.md)                             | Build and push multi-platform Docker images, with optional Trivy/Grype scans           |
| [docker-config-resolver](../actions/docker-config-resolver/README.md)           | Resolve `.qubership/docker.cfg` into a flat JSON config for the docker-action matrix   |
| [email-action](../actions/email-action/README.md)                               | Send email notifications via SMTP with fallback to repository variables for connection settings |
| [ghcr-discover-repo-packages](../actions/ghcr-discover-repo-packages/README.md) | Discover GHCR container packages owned by a repository and return them as JSON         |
| [k8s-hardening-scan](../actions/k8s-hardening-scan/README.md)                   | Validate Kubernetes hardening compliance with Kubescape (and optionally Trivy)         |
| [maven-monorepo-release](../actions/maven-monorepo-release/README.md)           | Release Maven components from a monorepo with independent versioning per component      |
| [maven-release](../actions/maven-release/README.md)                             | Release a Maven artifact (version bump, GPG sign, deploy) — dry-run by default         |
| [maven-snapshot-deploy](../actions/maven-snapshot-deploy/README.md)             | Deploy Maven SNAPSHOT artifacts to Maven Central or GitHub Packages                    |
| [metadata-action](../actions/metadata-action/README.md)                         | Render version strings and tags from per-branch/per-tag templates using GitHub context |
| [poetry-publisher](../actions/poetry-publisher/README.md)                       | Build, test, and publish a Poetry Python package to Test PyPI                          |
| [pr-add-messages](../actions/pr-add-messages/README.md)                         | Append commit messages from a PR into the PR description                               |
| [pr-assigner](../actions/pr-assigner/README.md)                                 | Auto-assign PR reviewers from config or CODEOWNERS with random shuffle                 |
| [smart-download](../actions/smart-download/README.md)                           | Download workflow artifacts by name, IDs, or glob pattern                              |
| [store-input-params](../actions/store-input-params/README.md)                   | Persist workflow_dispatch inputs as a JSON artifact for downstream jobs                |
| [tag-action](../actions/tag-action/README.md)                                   | Create / delete / check Git tags with optional GitHub Release creation                 |
| [verify-json](../actions/verify-json/README.md)                                 | Validate a JSON file against a JSON Schema                                             |
| [wait-for-workflow](../actions/wait-for-workflow/README.md)                     | Poll GitHub until a target workflow run completes successfully                         |

### Deprecated Actions

| Action                      | Replacement / Note                                                  |
| --------------------------- | ------------------------------------------------------------------- |
| [commit-and-push]           | (DELETED) Use native Git steps                                      |
| [pom-updater]               | (DELETED) Prefer metadata-action + build tooling                    |
| [tag-checker]               | (DELETED) Functionality superseded by tag-action                    |
| [archive-and-upload-assets] | (DELETED) Superseded by assets-action (consolidated implementation) |

> **⚠️ Warning:** If you have issues with **deleted actions**, please use **v1.0.6** version.

---

## 🔄 Reusable Workflows

### Active

| Workflow                                         | Description                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [broadcast-files](reusable/broadcast-files.md)   | Distribute specified files to multiple target repos                                        |
| [github-release](reusable/github-release.md)     | Create or update a GitHub Release with assets                                              |
| [maven-publish](reusable/maven-publish.md)       | Build & publish Maven artifacts (release flow)                                             |
| [python-publish](reusable/python-publish.md)     | Build, test & publish Python package (Poetry)                                              |
| [release-drafter](reusable/release-drafter.md)   | Generate or refresh draft release notes                                                    |
| [npm-publish](reusable/npm-publish.md)           | Build, test, and publish npm packages to a registry (supports monorepo and single package) |
| [re-security-scan](reusable/re-security-scan.md) | On-demand security scan (Grype + Trivy)                                                    |
| [tag-creator](reusable/tag-creator.md)           | Create a new tag in the repository                                                         |

### Deprecated Workflows

| Workflow                                       | Replacement / Note                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| [docker-publish](reusable/docker-publish.md)   | Use docker-action (action) + custom workflow                                    |
| [pom-updater](reusable/pom-updater.md)         | Superseded by metadata-action + build tooling                                   |
| [maven-publish.yml](reusable/maven-publish.md) | Replaced by standardized maven-publish reusable workflow (current above)        |
| maven-central-snapshot-deploy                  | Consolidated into maven-publish & maven-snapshot-deploy actions/workflows       |
| prettier.yaml & prettierFix.yaml               | Removed; rely on local prettier + CI lint job template (no standalone workflow) |
| re-maven-snapshot-deploy.yaml                  | Legacy name; use maven-snapshot-deploy action/workflow                          |
