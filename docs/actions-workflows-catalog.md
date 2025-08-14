# Actions & Reusable Workflows Catalog

Central directory of available GitHub Actions and Reusable Workflows in this repository.

Purpose:
* Single place to browse everything (active + deprecated) with short descriptions.
* Shows deprecation status so you avoid adopting legacy components.
* Fast jumping-off point to each Action / Workflow detail README.

Deprecation & evolution rules are defined in [Standards & Change Policy](standards-and-change-policy.md). Always check that document before modifying or depending on a deprecated component.

---

## 🔄 Actions
| Action | Description |
|--------|-------------|
| [assets-action](../actions/assets-action/README.md) | Alternative asset archiving / upload path (legacy alias) |
| [cdxgen](../actions/cdxgen/README.md) | Generate SBOM and CycloneDX vulnerability report |
| [charts-values-update-action](../actions/charts-values-update-action/README.md) | Updates images versions in values files |
| [chart-version](../actions/chart-version/README.md) | Bump/patch Helm Chart.yaml version fields |
| [container-package-cleanup](../actions/container-package-cleanup/README.md) | Remove stale container or Maven package versions |
| [custom-event](../actions/custom-event/README.md) | Emit repository_dispatch custom event with payload |
| [docker-action](../actions/docker-action/README.md) | Build & push (multi-platform) Docker images |
| [helm-charts-release](../actions/helm-charts-release/README.md) | Update image refs & publish Helm charts |
| [maven-release](../actions/maven-release/README.md) | Run Maven release scripting (docs WIP) |
| [maven-snapshot-deploy](../actions/maven-snapshot-deploy/README.md) | Deploy Maven SNAPSHOT artifacts |
| [metadata-action](../actions/metadata-action/README.md) | Produce version / tag metadata outputs |
| [poetry-publisher](../actions/poetry-publisher/README.md) | Build, test & publish Poetry-based Python package |
| [pr-add-messages](../actions/pr-add-messages/README.md) | Append commit messages to PR description |
| [pr-assigner](../actions/pr-assigner/README.md) | Auto assign reviewers based on config / CODEOWNERS |
| [store-input-params](../actions/store-input-params/README.md) | Persist workflow_dispatch inputs as artifact |
| [tag-action](../actions/tag-action/README.md) | Create / delete / check tags; optional release creation |
| [verify-json](../actions/verify-json/README.md) | Validate JSON files against a schema |

### Deprecated Actions
| Action | Replacement / Note |
|--------|--------------------|
| [commit-and-push](../actions/commit-and-push/README.md) | Use native git steps |
| [pom-updater](../actions/pom-updater/README.md) | Prefer metadata-action + build tooling |
| [tag-checker](../actions/tag-checker/README.md) | Functionality superseded by tag-action |
| [archive-and-upload-assets](../actions/archive-and-upload-assets/README.md) | Superseded by assets-action (consolidated implementation) |


---

## 🔄 Reusable Workflows

### Active
| Workflow | Description |
|----------|-------------|
| [broadcast-files](reusable/broadcast-files.md) | Distribute specified files to multiple target repos |
| [github-release](reusable/github-release.md) | Create or update a GitHub Release with assets |
| [maven-publish](reusable/maven-publish.md) | Build & publish Maven artifacts (release flow) |
| [python-publish](reusable/python-publish.md) | Build, test & publish Python package (Poetry) |
| [release-drafter](reusable/release-drafter.md) | Generate or refresh draft release notes |

### Deprecated Workflows
| Workflow | Replacement / Note |
|----------|--------------------|
| [docker-publish](reusable/docker-publish.md) | Use docker-action (action) + custom workflow |
| [pom-updater](reusable/pom-updater.md) | Superseded by metadata-action + build tooling |
| [maven-central-snapshot-deploy](reusable/maven-central-snapshot-deploy-reusable.md) | Consolidated into maven-publish & maven-snapshot-deploy actions/workflows |
| [maven-publish.yml](reusable/maven-publish.md) | Replaced by standardized maven-publish reusable workflow (current above) |
| prettier.yaml & prettierFix.yaml | Removed; rely on local prettier + CI lint job template (no standalone workflow) |
| re-maven-snapshot-deploy.yaml | Legacy name; use maven-snapshot-deploy action/workflow |
