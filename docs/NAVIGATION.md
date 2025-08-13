# Documentation Navigation

This file provides a MkDocs-like navigation structure using only Markdown links.

## Home
- [Overview](../README.md)
- [Workflow & Action Index](README.md)

## Actions
See the [Actions Index](actions/README.md) for the full list with status and categories.

Key actions:
- [archive-and-upload-assets](../actions/archive-and-upload-assets/README.md)
- [cdxgen](../actions/cdxgen/README.md)
- [chart-version](../actions/chart-version/README.md)
- [container-package-cleanup](../actions/container-package-cleanup/README.md)
- [docker-action](../actions/docker-action/README.md)
- [metadata-action](../actions/metadata-action/README.md)
- [tag-action](../actions/tag-action/README.md)

### Deprecated Actions
- [docker-publish workflow](reusable/docker-publish.md) → use docker-action
- [tag-creator workflow](reusable/tag-creator.md) → use tag-action
- [tag-checker](../actions/tag-checker/README.md) → use tag-action
- [commit-and-push](../actions/commit-and-push/README.md) (simple git commands recommended)
- [pom-updater](../actions/pom-updater/README.md) (consider metadata-action + build tooling)

## Reusable Workflows
- [broadcast-files](reusable/broadcast-files.md)
- [docker-publish (deprecated)](reusable/docker-publish.md)
- [github-release](reusable/github-release.md)
- [maven-publish](reusable/maven-publish.md)
- [pom-updater](reusable/pom-updater.md)
- [python-publish](reusable/python-publish.md)
- [release-drafter](reusable/release-drafter.md)
- [tag-creator (deprecated)](reusable/tag-creator.md)

## Guides
- [Fork sequence](fork-sequence.md)
- [Maven POM preparation](maven-publish-pom-preparation_doc.md)
- [Maven publish secrets](maven-publish-secrets_doc.md)

## Conventions
- [Action & Workflow Conventions](conventions.md)

## Contribution / Process
- [Contribution & PR Conduct](code-of-conduct-prs.md)
- [Issue Guidelines (Bug / Task / Feature)](issue-guidelines.md)

## Examples
- [Release Drafter example config](examples/release-drafter-config.yml)

## Legal / Meta
- [CLA](../CLA/cla.md)
- [License](../LICENSE)
- [CODEOWNERS](../CODEOWNERS)

---
Tip: Use your editor's Markdown preview sidebar to emulate MkDocs navigation while browsing these linked sections.
