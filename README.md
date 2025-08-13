# Qubership Workflow Hub

A comprehensive collection of reusable GitHub Actions and Workflows, designed to streamline your CI/CD pipelines and development processes.

## 🔗 Quick Navigation
- Overview (below)
- Getting Started: [docs/getting-started.md](docs/getting-started.md)
- Issue Guidelines: [docs/issue-guidelines.md](docs/issue-guidelines.md)
- PR Conduct: [docs/code-of-conduct-prs.md](docs/code-of-conduct-prs.md)
- Conventions: [docs/conventions.md](docs/conventions.md)
- Secrets & Variables: [docs/secrets-and-vars.md](docs/secrets-and-vars.md)
- Fork Sequence: [docs/fork-sequence.md](docs/fork-sequence.md)

---

## 🔍 Overview
Centralises common CI/CD tasks (tagging, version / metadata generation, artifact & package publishing, Helm chart release, cleanup, custom events) to avoid per‑repo scripts and drift.

Key pieces:
- Actions (single focused step) – `actions/<name>/`
- Reusable workflows (multi‑job orchestration) – `reusable/*.md`
- Conventions (rules: naming, version pinning, permissions) – `conventions.md`

Core principles: deterministic (pin @v1 or SHA), least privilege (start with `contents: read`), composable (small actions), backwards compatible majors, observable outputs, explicit deprecation with replacement.

Use an Action for one operation (tag, compute metadata, cleanup). Use a Reusable Workflow for multi‑job pipelines (build + test + publish). Combine both freely.

Version & security: pin versions, avoid `@main`, run dry‑run first where supported, elevate permissions only where needed.

To extend: add action folder + README, update index, tag `v1`, adjust conventions if introducing a new pattern.

---

## 📄 Report a Bug, Task or Request a Feature

- **Need to report a bug, request a feature, or file a maintenance task?** Use the <u>[Issue Guidelines](docs/issue-guidelines.md)</u> (bug / feature / task templates).
- **Opening a Pull Request?** Follow the <u>[Contribution & PR Conduct](docs/code-of-conduct-prs.md)</u> (title format, required fields, labels, review flow).

---

## 🚀 Getting Started
Full extended guide: see [Detailed Getting Started](docs/getting-started.md) for structure, composition patterns, permissions, versioning and checklist.

1. **Clone the repository**
   ```bash
   git clone https://github.com/nookyo/qubership-workflow-hub.git
   cd qubership-workflow-hub
   ```

2. **Explore Actions and Workflows**
   - Browse the [`actions/`](actions/) folder for individual action packages.
   - Browse the [`docs/reusable/`](docs/reusable/) folder for workflow templates.

3. **Use an Action**
   Reference an action in your own workflow YAML:
   ```yaml
   jobs:
     tag:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Create a Git Tag
           uses: nookyo/qubership-workflow-hub/actions/tag-action@main
           with:
             tag-prefix: "v"
             tag-message: "Release {{version}}"
   ```

4. **Use a Reusable Workflow**
   Include a reusable workflow by path:
   ```yaml
   jobs:
     release:
       uses: nookyo/qubership-workflow-hub/docs/reusable/release-drafter.md@main
       with:
         config-file: ".github/release-drafter.yml"
   ```
   > **Note:** Consult the individual workflow docs for specific input parameters and examples.

  Need to contribute? Read the fork workflow: [Fork Sequence Guide](docs/fork-sequence.md).

  ---
  ## 📘 Conventions
  Shared patterns (naming, inputs, version pinning, permissions, security hardening) are documented in [docs/conventions.md](docs/conventions.md).

---

### Available Actions
| Action | Description |
|--------|-------------|
| [archive-and-upload-assets](actions/archive-and-upload-assets/README.md) | Archive build output and optionally upload as release assets |
| [assets-action](actions/assets-action/README.md) | Alternative asset archiving / upload path (legacy alias) |
| [cdxgen](actions/cdxgen/README.md) | Generate SBOM and CycloneDX vulnerability report |
| [chart-release](actions/chart-release/README.md) | Publish/update Helm chart (docs WIP) |
| [chart-release-action](actions/chart-release-action/README.md) | TS-based Helm chart release logic (docs WIP) |
| [chart-version](actions/chart-version/README.md) | Bump/patch Helm Chart.yaml version fields |
| [container-package-cleanup](actions/container-package-cleanup/README.md) | Remove stale container or Maven package versions |
| [custom-event](actions/custom-event/README.md) | Emit repository_dispatch custom event with payload |
| [docker-action](actions/docker-action/README.md) | Build & push (multi-platform) Docker images |
| [helm-charts-release](actions/helm-charts-release/README.md) | Update image refs & publish Helm charts |
| [maven-release](actions/maven-release/README.md) | Run Maven release scripting (docs WIP) |
| [maven-snapshot-deploy](actions/maven-snapshot-deploy/README.md) | Deploy Maven SNAPSHOT artifacts |
| [metadata-action](actions/metadata-action/README.md) | Produce version / tag metadata outputs |
| [poetry-publisher](actions/poetry-publisher/README.md) | Build, test & publish Poetry-based Python package |
| [pr-add-messages](actions/pr-add-messages/README.md) | Append commit messages to PR description |
| [pr-assigner](actions/pr-assigner/README.md) | Auto assign reviewers based on config / CODEOWNERS |
| [store-input-params](actions/store-input-params/README.md) | Persist workflow_dispatch inputs as artifact |
| [tag-action](actions/tag-action/README.md) | Create / delete / check tags; optional release creation |
| [verify-json](actions/verify-json/README.md) | Validate JSON files against a schema |

### Deprecated
| Action | Replacement / Note |
|--------|--------------------|
| [commit-and-push](actions/commit-and-push/README.md) | Use native git steps |
| [pom-updater](actions/pom-updater/README.md) | Prefer metadata-action + build tooling |
| [tag-checker](actions/tag-checker/README.md) | Functionality superseded by tag-action |

---

## 🔄 Available Reusable Workflows

### Active
| Workflow | Description |
|----------|-------------|
| [broadcast-files](docs/reusable/broadcast-files.md) | Distribute specified files to multiple target repos |
| [github-release](docs/reusable/github-release.md) | Create or update a GitHub Release with assets |
| [maven-publish](docs/reusable/maven-publish.md) | Build & publish Maven artifacts (release flow) |
| [python-publish](docs/reusable/python-publish.md) | Build, test & publish Python package (Poetry) |
| [release-drafter](docs/reusable/release-drafter.md) | Generate or refresh draft release notes |

### Deprecated
| Workflow | Replacement / Note |
|----------|--------------------|
| [docker-publish](docs/reusable/docker-publish.md) | Use docker-action (action) + custom workflow |
| [pom-updater](docs/reusable/pom-updater.md) | Superseded by metadata-action + build tooling |
| [tag-creator](docs/reusable/tag-creator.md) | Use tag-action directly |

---

## 🤝 Contributing

We welcome contributions from the community! To contribute:

1. Review and sign the [CLA](CLA/cla.md).
2. Check the [CODEOWNERS](CODEOWNERS) file for areas of responsibility.
3. Open an issue to discuss your changes.
  - For bug / feature / task use the <u>[Issue Guidelines](docs/issue-guidelines.md)</u> (required fields, templates, labels).
4. Submit a pull request with tests and documentation updates.

> IMPORTANT: Before opening an issue or pull request you MUST read the <u>[Contribution & PR Conduct](docs/code-of-conduct-prs.md)</u> and the <u>[Issue Guidelines](docs/issue-guidelines.md)</u>. They define required issue / PR fields, labels, and formatting.

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).
