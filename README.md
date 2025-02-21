# qubership-workflow-hub

The repository for reusable workflows.

Detailed description of existing workflows can be found here [Index of Workflow Documentation](./docs/README.md)

---

- [qubership-workflow-hub](#qubership-workflow-hub)
  - [Common workflows](#common-workflows)
    - [CLA](#cla)
    - [Prettier](#prettier)
    - [Profanity filter](#profanity-filter)
    - [Automatic PR labels based on conventional commits](#automatic-pr-labels-based-on-conventional-commits)
      - [Step 1: Create workflow file](#step-1-create-workflow-file)
      - [Step 2: Add configuration file](#step-2-add-configuration-file)
      - [Step 3: Follow the conventional commits messages strategy](#step-3-follow-the-conventional-commits-messages-strategy)
    - [Add commit messages to PR body](#add-commit-messages-to-pr-body)
    - [Conventional Commits PR Check](#conventional-commits-pr-check)
    - [Lint PR Title](#lint-pr-title)
  - [Maven project release workflow](#maven-project-release-workflow)
    - [Step 1: Prepare pom.xml](#step-1-prepare-pomxml)
    - [Step 2: Maven release workflow](#step-2-maven-release-workflow)
    - [Step 3: Add configuration file for GitHub release](#step-3-add-configuration-file-for-github-release)
    - [Step 4: Prepare actions secrets](#step-4-prepare-actions-secrets)
  - [Python Project Release Workflow](#python-project-release-workflow)
    - [Step 1: Python release workflow](#step-1-python-release-workflow)
    - [Step 2: Prepare secrets](#step-2-prepare-secrets)
    - [Step 3: Add configuration file for GitHub release](#step-3-add-configuration-file-for-github-release-1)
  - [GO Project Check Modules License](#go-project-check-modules-license)
    - [Step 1: Create GO Project Check Modules License workflow](#step-1-create-go-project-check-modules-license-workflow)
    - [Step 2: Create Configuration File](#step-2-create-configuration-file)

---

Below is the short description of how to implement common workflows in any Netcracker repository. All necessery secrets and variables for common workflows are already present on organization level, no additional settings or configurations are required.

<span id="secrets_table"></span>**The organization level secrets and vars used in actions**

| Name                          | Purpose                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| secrets.PERSONAL_ACCESS_TOKEN | Used by actions to access repositories data                                          |
| secrets.MAVEN_USER            | User name to authenticate in Maven Central repository to publish released artifacts  |
| secrets.MAVEN_PASSWORD        | User token to authenticate in Maven Central repository to publish released artifacts |
| secrets.MAVEN_GPG_PRIVATE_KEY | GPG private key to sign artefacts (jar, pom etc) to publish them into Maven Central  |
| secrets.MAVEN_GPG_PASSPHRASE  | GPG private key passphrase                                                           |

## Common workflows

There are several reusable workflows which should be added into every Netcracker repository, see the description below.

### CLA

The action for [CLA](./CLA/cla.md) "signing" for contributors.

> More info about underlying GitHub action can be found here [contributor-assistant](https://github.com/contributor-assistant/github-action)

To add the CLA signing into your repository just copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/cla.yaml) into `.github/workflow` directory of your repository.

The `PERSONAL_ACCESS_TOKEN` used in the workflow is defined on organization level then you can use it in any Netcracker/\* repository.

### Prettier

The action to check style and syntax of several document types. It creates PR if found any issue.

> More info about underlying GitHub action can be found here [prettier-fix](https://github.com/WorkOfStan/prettier-fix)

To add the prettier into your repository just copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/prettier.yaml) into `.github/workflow` directory of your repository.

### Profanity filter

The action to check PRs/issues comments on profany words.

> More info about underlying GitHub action can be found here [profanity-filter](https://github.com/IEvangelist/profanity-filter)

To add the profanity filter into your repository just copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/profanity-filter.yaml) into `.github/workflow` directory of your repository.

### Automatic PR labels based on conventional commits

The workflow automatically label PR on it's open/reopen events. It checks all the commit messages for certain words and apply corresponding labels to PR. Those labels used by [Maven project release workflow](#maven-project-release-workflow) to generate release notes.

---

#### Step 1: Create workflow file

Create a new workflow in your repository. Copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/automatic-pr-labeler.yaml) into `.github/workflow` directory of your repository.

#### Step 2: Add configuration file

Create a new configuration file `.github/auto-labeler-config.yaml`. Copy [prepared file](./docs/auto-labeler-config.yaml)  into `.github` directory of your repository.

#### Step 3: Follow the conventional commits messages strategy

The configuration file from [previous step](#step-2-add-configuration-file) defines the next rules for PR labeling based on words in **commit messages**:

| Commit message word(s)                                  | Label           |
| ------------------------------------------------------- | --------------- |
| 'FIX', 'Fix', 'fix', 'FIXED', 'Fixed', 'fixed'          | bug             |
| 'FEATURE', 'Feature', 'feature', 'FEAT', 'Feat', 'feat' | enhancement     |
| 'BREAKING CHANGE', 'BREAKING', 'MAJOR'                  | breaking-change |
| 'refactor','Refactor'                                   | refactor        |
| 'doc','document','documentation'                        | documentation   |
| 'build','rebuild'                                       | build           |
| 'config', 'conf', 'cofiguration', 'configure'           | config          |

Labels on PRs used to generate release notes for GitHub releases. You can edit labels configuration and [release notes generation template](#step-3-add-configuration-file-for-github-release) to extend or improve the default ones.

### Add commit messages to PR body

The workflow will collect commit messages from pull request and add them in pull request description.

---

To add commit messages in pull request description into your repository copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/pr-collect-commit-messages.yaml) into `.github/workflow` directory of your repository.

### Conventional Commits PR Check

The workflow will check commits in pull request if they follow [Conventional Commits](conventionalcommits.org) strategy.

More info on underlying Github action can be found here [Conventional Commits GitHub Action](https://github.com/webiny/action-conventional-commits)

---

To add the workflow into your repository copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/pr-conventional-commits.yaml) into `.github/workflow` directory of your repository.

### Lint PR Title

The workflow will check pull request title if it follows [Conventional Commits](conventionalcommits.org) strategy.

More info on underlying Github action can be found here [Semantic Pull Request](https://github.com/amannn/action-semantic-pull-request).

---

To add the workflow into your repository copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/pr-lint-title.yaml) into `.github/workflow` directory of your repository.

---

## Maven project release workflow

Maven project release workflow is used to make a Github release and publish released artifacts into Maven Central.
The workflow consists of several sequential jobs:

1. Checks if the tag already exists.
2. [Updates the version in the pom.xml file](./docs/reusable/update-pom-release_doc.md)
3. Commits the changes to the repository.
4. Builds the project using Maven.
5. Runs tests.
6. Tags the commit with the release version.
7. [Deploys the artifact to the Maven repository](./docs/reusable/maven-publish_doc.md)
8. Builds and publishes a Docker image.
9. [Create GitHub release](./docs/reusable/create-github-release_doc.md)

---

To make it use one need to do several preparations in the project.

### Step 1: Prepare pom.xml

First of all please make sure the `pom.xml` file prepared to build source code and java doc jars alongside with main artifact. You need to sign all publishing artifacts with PGP key too. The instruction on how to do it can be found here [Prepare your project to publish into Maven Central](./docs/maven-publish-pom-preparation_doc.md)

### Step 2: Maven release workflow

Copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/maven-release.yaml) into `.github/workflow` directory of your repository.

This workflow is designed to be run manually. It has four input parameters on manual execution:

- `Release version` -- a string represents version number of the release
- `Java version` -- a string represents Java version to use to build artifacts.
- `Release docker image if there is Docker file` -- build and publish docker image to GitHub packages if Dockerfile exists
- `Dry run` -- if selected the workflow will go through all the steps, but will not publish anything.

This workflow will:

- Check the provided release/tag existence and fail if it alredy exists.
- Set the release version in `pom.xml` file
- Build maven artifact package from `main` codebase
- Run tests
- Create a new tag
- Build and publish artifacts into Maven Central
- Build and publish docker image into GitHub packages
- Create GitHub release in `draft` state.

### Step 3: Add configuration file for GitHub release

Upload [prepared configuration file](./docs/examples/release-drafter-config.yml) to your repository in `.github` folder. You can customize it in future for your needs.

### Step 4: Prepare actions secrets

The workflow needs several secrets to be prepared to work properly. For `Netcracker` repositories all of them already prepared, configured and available for use. You can find them in table [The organization level secrets and vars used in actions](#secrets_table). Detailed instructions on how to generate a GPG key and set up secrets in a GitHub repository can be found in [this document](./docs/maven-publish-secrets_doc.md).

---

## Python Project Release Workflow

Python project release workflow is used to make a Github release and publish released artifacts into PyPi.

---

### Step 1: Python release workflow

Copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/python-release.yaml) into `.github/workflow` directory of your repository.

This workflow is designed to be run manually. It has six input parameters on manual execution:

- `Specify version (optional)` -- a string represents the version number (optional). If empty the version number will be cretad automatically.
- `Python version to use` -- a string represents Python version to use to build artifacts (e.g., `3.11`)
- `Poetry version bump` -- which part of semver version to bump (e.g., `patch`, `minor`, `major`)'
- `Additional poetry build parameters` -- additional poetry build parameters
- `Run pytest` -- to run pytests or not (true/false).
- `Parameters for pytest` -- additional parameters to pass into pytests. By default value is `--maxfail=3 -v`

### Step 2: Prepare secrets

The Python Release workflow require PyPi API token. You need to get it from PyPi and add into your repositories Actions secrets. The name of the secret should be `PYPI_API_TOKEN`.

### Step 3: Add configuration file for GitHub release

The step exactly the same as [Step 3: Add configuration file for GitHub release](#step-3-add-configuration-file-for-github-release) for maven release workflow.

---

## GO Project Check Modules License

The workflow will check licenses of all dependencies if they are in scope of allowlist.

> More info about used tool can be found here [wwhrd](https://github.com/frapposelli/wwhrd)

---

### Step 1: Create GO Project Check Modules License workflow

Copy the [prepared file](https://github.com/Netcracker/.github/blob/main/workflow-templates/check-license.yaml) into `.github/workflow` directory of your repository.

### Step 2: Create Configuration File

Copy the [prepared file](./docs/examples/.wwhrd.yml) into root directory of your repository.
