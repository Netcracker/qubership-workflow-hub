# Qubership Workflow Hub

A comprehensive collection of reusable GitHub Actions and Workflows, designed to streamline your CI/CD pipelines and development processes.

## 🔍 Overview

Centralises common CI/CD tasks (tagging, version / metadata generation, artifact & package publishing, Helm chart release, cleanup, custom events) to avoid per‑repo scripts and drift.

Key pieces:
- Actions (single focused step) – `actions/<name>/`
- Reusable workflows (multi‑job orchestration) – `reusable/*.md`
- Standards & Change Policy (naming, version pinning, permissions, deprecation rules) – `standards-and-change-policy.md`

Core principles: deterministic (pin @v1 or SHA), least privilege (start with `contents: read`), composable (small actions), backwards compatible majors, observable outputs, explicit deprecation with replacement.

Use an Action for one operation (tag, compute metadata, cleanup). Use a Reusable Workflow for multi‑job pipelines (build + test + publish). Combine both freely.

Version & security: pin versions, avoid `@main`, run dry‑run first where supported, elevate permissions only where needed. For credential handling & tokens see [Secrets & Variables](docs/secrets-and-vars.md).

---

## 🔑 Key Documents

Priority order (read top → bottom when starting / contributing):

| # | Read When | Purpose | Document |
|---|-----------|---------|----------|
| 1 | BEFORE opening any Issue/Feature | Defines bug / feature / task templates | [Issue Guidelines](docs/issue-guidelines.md) |
| 2 | BEFORE opening a PR | Required PR fields, title rules, labels | [PR Conduct](docs/code-of-conduct-prs.md) |
| 3 | BEFORE forking / starting code changes | Fork & sync workflow (keeping your fork current) | [Fork Sequence Guide](docs/fork-sequence.md) |
| 4 | BEFORE changing actions/workflows | Naming, version pinning, permissions, deprecation | [Standards & Change Policy](docs/standards-and-change-policy.md) |
| 5 | First use of the repo | How to consume actions & workflows | [Getting Started](docs/getting-started.md) |
| 6 | Browsing catalog | Full list of actions & reusable workflows | [Catalog: Actions & Workflows](docs/actions-workflows-catalog.md) |
| 7 | Adding secrets / vars | Secure handling & scoping guidance | [Secrets & Variables](docs/secrets-and-vars.md) |
| 8 | Legal prerequisite | Contributor License Agreement | [CLA](CLA/cla.md) |

Shortcut: contributing code? Read 1 → 2 → 3 → 4, otherwise for usage start at 5.

---

## 🚀 Getting Started
Full extended guide: see [Detailed Getting Started](docs/getting-started.md) for structure, composition patterns, permissions, versioning and checklist.

1. **Clone the repository**

   ```bash
   git clone https://github.com/netcracker/qubership-workflow-hub.git
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
           uses: netcracker/qubership-workflow-hub/actions/tag-action@main
           with:
             tag-prefix: "v"
             tag-message: "Release {{version}}"
   ```

4. **Use a Reusable Workflow**
   Include a reusable workflow by path:

   ```yaml
   jobs:
     release:
       uses: netcracker/qubership-workflow-hub/docs/reusable/release-drafter.md@main
       with:
         config-file: ".github/release-drafter.yml"
   ```
   > **Note:** Consult the individual workflow docs for specific input parameters and examples.

Need to contribute? Read the fork workflow: [Fork Sequence Guide](docs/fork-sequence.md).

---

## 🔄 Catalog: Actions & Reusable Workflows

Full, always up-to-date list (active + deprecated) with short descriptions moved to a dedicated page: [Actions & Workflows Catalog](docs/actions-workflows-catalog.md).

Quick starts:
* Need a specific capability? Open the catalog and search in-page.
* Unsure if something is deprecated? The catalog groups deprecated items separately with replacements.

---

## 📘 Standards & Change Policy
Stable interface & evolution rules (naming, inputs/outputs, version pinning, minimal permissions, security and deprecation) are documented in [docs/standards-and-change-policy.md](docs/standards-and-change-policy.md).

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

This project is licensed under the [Apache License 2.0](LICENSE)