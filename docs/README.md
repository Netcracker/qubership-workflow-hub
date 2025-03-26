# Workflow and Action Documentation

This index provides a quick overview of the available workflow and action documentation in this repository. Each workflow and action serves a distinct purpose and is reusable via `workflow_call`. Use the table below to navigate to the specific documentation.

---

## Reusable Flows

| Name                                             | Description                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| [github-release](../docs/reusable/github-release.md) | Automates creating and tagging releases on GitHub.               |
| [docker-publish](../docs/reusable/docker-publish.md)              | Automates building and publishing Docker images.     |
| [github-release](../docs/reusable/github-release.md)              | Creates a GitHub release based on the specified version.     |
| [maven-publish](../docs/reusable/maven-publish.md)              | Automates signing and deploying Maven artifacts to a repository.     |
| [python-publish](../docs/reusable/python-publish.md)              | Automates building, testing, and publishing Python packages.     |
| [release-drafter](../docs/reusable/release-drafter.md)              | Drafts a new release based on merged pull requests.     |
| [tag-creator](../docs/reusable//tag-creator.md)              | Creates a new tag in the repository.     |


## Template Flows

| Name                                            | Description                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| [automatic-pr-labeler](../.github/workflows/automatic-pr-labeler.yaml) | Automatically labels pull requests when they are opened or reopened. |
| [auto-labeler](../.github/workflows/auto-labeler.yaml)          | Automatically labels pull requests based on conventional commits. |
| [cla](../.github/workflows/cla.yaml)              | Manages Contributor License Agreements (CLA) for pull requests.     |
| [go-check-license](../.github/workflows/go-check-license.yaml)              | Checks licenses for Go modules.     |
| [pr-collect-commit-messages](../.github/workflows/pr-collect-commit-messages.yaml)              | Collects commit messages from a pull request and adds them to the description.     |
| [pr-conventional-commits](../.github/workflows/pr-conventional-commits.yaml)              | Checks if pull request commits follow the Conventional Commits specification.     |
| [pr-lint-title](../.github/workflows/pr-lint-title.yaml)              | Lints the pull request title to ensure it follows the Conventional Commits specification.     |
| [prettier](../.github/workflows/prettier.yaml)              | Runs Prettier to format code.     |
| [prettierFix](../.github/workflows/prettierFix.yaml)              | Fixes code formatting issues using Prettier.     |
| [profanity-filter](../.github/workflows/profanity-filter.yaml)              | Filters profanity in issues, comments, and pull requests.     |
| [profanityFilter](../.github/workflows/profanityFilter.yaml)              | Filters profanity in issues, comments, and pull requests.     |
| [super-linter](../.github/workflows/super-linter.yaml)              | Runs multiple linters to validate code.     |

## System Flows

| Name                                            | Description                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| [broadcast-files](../.github/workflows/broadcast-files.yml)| Allows to propagate common workflows, common configs etc. across the organization or specific repo. |

## Actions

| Action Name                                            | Description                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| [archive-and-upload-assets](../actions/archive-and-upload-assets/README.md) | Archives and uploads assets to a specified location. |
| [cdxgen](../actions/cdxgen/README.md)                   | Generates SBOM file and CycloneDX vulnerability report.          |
| [chart-version](../actions/chart-version/README.md)     | Manages and updates chart versions.                             |
| [commit-and-push](../actions/commit-and-push/README.md) | Automates committing and pushing changes to a remote repository. |
| [custom-event](../actions/custom-event/README.md)       | Triggers a custom `repository_dispatch` event in the repository. |
| [metadata-action](../actions/metadata-action/README.md) | Automates the management of repository metadata, including meta info, dist-tag, github context, and semver information based on branch or tag references. |
| [poetry-publisher](../actions/poetry-publisher/README.md) | Automates building, testing, and publishing Python packages using Poetry. |
| [pom-updater](../actions/pom-updater/README.md)         | Automatically updates the `pom.xml` file in Maven projects.      |
| [pr-add-messages](../actions/pr-add-messages/README.md) | Adds commit messages to the pull request description.            |
| [pr-assigner](../actions/pr-assigner/README.md)         | Automatically assigns reviewers to pull requests based on configuration or CODEOWNERS file. |
| [tag-checker](../actions/tag-checker/README.md)         | Verifies the presence of specific tags in the repository.        |
| [verify-json](../actions/verify-json/README.md)         | Verifies the structure and content of JSON files.                |

---

## Usage

Refer to the respective documentation for detailed instructions on inputs, secrets, and example usage. For any questions or issues, feel free to contact the repository maintainers.
