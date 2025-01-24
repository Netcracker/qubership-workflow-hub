# qubership-workflow-hub

The repository for reusable workflows.

Detailed description of existing workflows can be found here [Index of Workflow Documentation](./docs/README.md)

---

Below is the short description of how to implement common workflows in any Netcracker repository. All necessery secrets and variables for common workflows are already present on organization level, no additional settings or configurations are required. 

<span id="secrets_table"></span>**The organization level secrets and vars used in actions**

| Name                          | Purpose                                                                              |
|-------------------------------|--------------------------------------------------------------------------------------|
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

To add the CLA signing into your repository just create the new file `.github/workflows/cla.yaml` and paste the code below or just copy the [prepared file](./docs/examples/cla.yaml):

```yaml
---
name: CLA Assistant
on:
  issue_comment:
    types: [created]
  pull_request_target:
    types: [opened,closed,synchronize]
jobs:
  cla_assistant:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/cla.yaml@main
    secrets:
      personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

The `PERSONAL_ACCESS_TOKEN` is defined on organization level then you can use it in any Netcracker/* repository.

### Prettier

The action to check style and syntax of several document types. It creates PR if found any issue.

> More info about underlying GitHub action can be found here [prettier-fix](https://github.com/WorkOfStan/prettier-fix)

To add the prettier into your repository just create the new file `.github/workflows/prettier.yaml` and paste the code belowor just copy the [prepared file](./docs/examples/prettier.yaml):

```yaml
---
name: Prettier-fix
on: [pull_request, push, workflow_dispatch]

permissions:
  contents: write

jobs:
  call-prettier-fix:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/prettierFix.yaml@main
```

### Profanity filter

The action to check PRs/issues comments on profany words.

> More info about underlying GitHub action can be found here [profanity-filter](https://github.com/IEvangelist/profanity-filter)

To add the profanity filter into your repository just create the new file `.github/workflows/profanity-filter.yaml` and paste the code below or just copy the [prepared file](./docs/examples/profanity-filter.yaml):

```yaml
---
name: Profanity filter

on:
  issue_comment:
    types: [created, edited]
  issues:
    types: [opened, edited, reopened]
  pull_request:
    types: [opened, edited, reopened]

permissions:
  issues: write
  pull-requests: write

jobs:
  call-apply-filter:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/profanityFilter.yaml@main
```

### Automatic PR labels based on conventional commits

The workflow automatically label PR on it's open/reopen events. It checks all the commit messages for certain words and apply corresponding labels to PR. Those labels used by [Maven project release workflow](#maven-project-release-workflow) to generate release notes.

---

#### Step 1: Create workflow file

Create a new workflow in your repository. Create a file `.github/workflows/automatic-pr-labeler.yaml` and copy the code below or just copy the [prepared file](./docs/examples/automatic-pr-labeler.yaml):

```yaml
---

name: Automatic PR Labeler

on:
  pull_request:
    branches: [main]
    types:
      [opened, reopened]

jobs:
  assign-labels:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/auto-labeler.yaml@main
    name: Assign labels in pull request
    if: github.event.pull_request.merged == false
    with:
      pull_request_number: ${{ github.event.pull_request.number }}
      github_token: ${{ secrets.GITHUB_TOKEN }}
      config_file: './.github/auto-labeler-config.yaml'
```

#### Step 2: Add configuration file

Create a new configuration file `.github/auto-labeler-config.yaml`. Copy code below or just copy the [prepared file](./docs/examples/auto-labeler-config.yaml)

```yaml
conventional-commits:
  - type: 'fix'
    nouns: ['FIX', 'Fix', 'fix', 'FIXED', 'Fixed', 'fixed']
    labels: ['bug']
  - type: 'feature'
    nouns: ['FEATURE', 'Feature', 'feature', 'FEAT', 'Feat', 'feat']
    labels: ['feature']
  - type: 'breaking_change'
    nouns: ['BREAKING CHANGE', 'BREAKING', 'MAJOR']
    labels: ['breaking-change']
  - type: 'refactor'
    nouns: ['refactor','Refactor']
    labels: ['refactor']
  - type: 'documentation'
    nouns: ['doc','document','documentation']
    labels: ['documentation']
  - type: 'build'
    nouns: ['build','rebuild']
    labels: ['build']
  - type: 'config'
    nouns: ['config', 'conf', 'cofiguration', 'configure']
    labels: ['config']
```

#### Step 3: Follow the conventional commits messages strategy

The configuration file from [previous step](#step-2-add-configuration-file) defines the next rules for PR labeling based on words in **commit messages**:

| Commit message word(s) | Label |
| -- | -- |
| 'FIX', 'Fix', 'fix', 'FIXED', 'Fixed', 'fixed' | bug |
| 'FEATURE', 'Feature', 'feature', 'FEAT', 'Feat', 'feat' | feature |
| 'BREAKING CHANGE', 'BREAKING', 'MAJOR' | breaking-change |
| 'refactor','Refactor' | refactor |
| 'doc','document','documentation' | documentation |
| 'build','rebuild' | build |
| 'config', 'conf', 'cofiguration', 'configure' | config |

Labels on PRs used to generate release notes for GitHub releases. You can edit labels configuration and [release notes generation template](#step-4-add-configuration-file-for-github-release) to extend or improve the default ones.

---

## Maven project release workflow

Maven project release workflow is used to make a Github release and publish released artifacts into Maven Central.
The workflow consists of several sequential jobs:

1. [Update pom.xml file with the release version](./docs/reusable/update-pom-release_doc.md).
2. [Publish released artifacts into Maven Central](./docs/reusable/maven-publish_doc.md)
3. [Create GitHub release](./docs/reusable/create-github-release_doc.md)
---

To make it use one need to do several preparations in the project.

### Step 1: Prepare pom.xml

First of all please make sure the `pom.xml` file prepared to build source code and java doc jars alongside with main artifact. You need to sign all publishing artifacts with PGP key too. The instruction on how to do it can be found here [Prepare your project to publish into Maven Central](./docs/maven-publish-pom-preparation_doc.md)

### Step 2: Maven release workflow

Create new a file `.github/workflows/maven-release.yaml` and copy the code below or just copy the [prepared file](./docs/examples/maven-release.yaml):

```yaml
---
name: Release And Upload to Maven Central

on:
  workflow_dispatch:
    inputs:
      version:
        required: true
        default: '2025.1-1.0.0'
        type: string
        description: 'Release version (e.g., 2025.1-1.0.0)'
      java_version:
        required: false
        type: string
        default: "21"
        description: "Java version"

jobs:
  check-tag:
    runs-on: ubuntu-latest
    steps:
      - name: Input parameters
        run: |
          echo "Version: ${{ github.event.inputs.version }}" >> $GITHUB_STEP_SUMMARY
          echo "Java version: ${{ github.event.inputs.java_version }}" >> $GITHUB_STEP_SUMMARY

      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check if tag exists
        id: check_tag
        uses: netcracker/qubership-workflow-hub/actions/tag-checker@master
        with:
          tag: 'v${{ github.event.inputs.version }}'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Output result
        run: |
          echo "Tag exists: ${{ steps.check_tag.outputs.exists }}"
          echo "Tag name: ${{ steps.check_tag.outputs.tag_name }}"

      - name: Fail if tag exists
        if: steps.check_tag.outputs.exists == 'true'
        run: |
          echo "Tag already exists: ${{ steps.check_tag.outputs.tag_name }}" >> $GITHUB_STEP_SUMMARY
          echo "Tag already exists: ${{ steps.check_tag.outputs.tag_name }}"
          exit 1

  update-pom-version:
    needs: [check-tag]
    uses: Netcracker/qubership-workflow-hub/.github/workflows/update-pom-release.yml@main
    with:
      file: 'pom.xml'
      revision: ${{ github.event.inputs.version }}

  upload_to_maven_central:
    needs: [update-pom-version]
    uses: Netcracker/qubership-workflow-hub/.github/workflows/maven-publish.yml@main
    with:
      maven_command: "--batch-mode deploy"
      java_version: ${{ github.event.inputs.java_version }}
      revision: ${{ github.event.inputs.version }}
    secrets:
      maven_username: ${{ secrets.MAVEN_USER }}
      maven_password: ${{ secrets.MAVEN_PASSWORD }}
      maven_gpg_passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
      maven_gpg_private_key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}

  github-release:
    needs: [publish]
    uses: Netcracker/qubership-workflow-hub/.github/workflows/release-drafter.yml@main
    with:
      version: ${{ github.event.inputs.version }}
      publish: false
```

This workflow is designed to be run manually. It has two input parameters on manual execution:

- `Release version` -- a string represents version number of the release
- `Java version` -- a string represents Java version to use to build artifacts.

This workflow will:

- Check the provided release/tag existence and fail if it alredy exists.
- Set the release version in `pom.xml` file
- Create and publish artifacts into Maven Central.
- Create GitHub release in `draft` state.

### Step 3: Add configuration file for GitHub release

Upload [prepared configuration file](./docs/examples/release-drafter-config.yml) to your repository in `.github/` folder. You can customize it in future for your needs.

```yaml
name-template: 'v$RESOLVED_VERSION'
tag-template: 'v$RESOLVED_VERSION'


categories:
  - title: '💥 Breaking Changes'
    labels:
      - breaking-change
  - title: '🚀 New Features'
    labels:
      - feature
  - title: '🐛 Bug Fixes'
    labels:
      - bug
      - fix
      - bugfix
  - title: '🛠️ Technical Debt'
    labels:
      - refactor

change-template: '- $TITLE (#$NUMBER) by @$AUTHOR'
no-changes-template: 'No significant changes'

template: |
  ## 🚀 Release

  ### What's Changed
  $CHANGES

  **Contributors:** $CONTRIBUTORS
```

### Step 4: Prepare actions secrets

The workflow needs several secrets to be prepared to work properly. For `Netcracker` repositories all of them already prepared, configured and available for use. You can find them in table [The organization level secrets and vars used in actions](#secrets_table). Detailed instructions on how to generate a GPG key and set up secrets in a GitHub repository can be found in [this document](./docs/maven-publish-secrets_doc.md).

---

## Python Project Release Workflow

Python project release workflow is used to make a Github release and publish released artifacts into PyPi.

---

### Step 1: Python release workflow

Create new a file `.github/workflows/python-release.yaml` and copy the code below or just copy the [prepared file](./docs/examples/python-release.yaml):

```yaml
---

name: Python Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Specify version (optional)'
        required: false
        default: ''
      python-version:
        description: 'Python version to use'
        required: false
        default: '3.11'
      poetry_version_options:
        description: 'Poetry version bump (e.g., patch, minor, major)'
        required: false
        default: 'patch'
      poetry_build_params:
        description: 'Additional poetry build parameters'
        required: false
        default: ''
      pytest_run:
        description: 'Run pytest (true/false)'
        required: true
        type: boolean
        default: true
      pytest_params:
        description: 'Parameters for pytest'
        required: false
        default: '--maxfail=3 -v'

jobs:
  check-tag:
    runs-on: ubuntu-latest
    steps:
      - name: Input parameters
        run: |
          echo "Input parameters:" >> $GITHUB_STEP_SUMMARY
          echo "Version: ${{ github.event.inputs.version }}" >> $GITHUB_STEP_SUMMARY
          echo "Python version: ${{ github.event.inputs.python-version }}" >> $GITHUB_STEP_SUMMARY
          echo "Poetry version options: ${{ github.event.inputs.poetry_version_options }}" >> $GITHUB_STEP_SUMMARY
          echo "Poetry build parameters: ${{ github.event.inputs.poetry_build_params }}" >> $GITHUB_STEP_SUMMARY
          echo "Pytest run: ${{ github.event.inputs.pytest_run }}" >> $GITHUB_STEP_SUMMARY
          echo "Pytest parameters: ${{ github.event.inputs.pytest_params }}" >> $GITHUB_STEP_SUMMARY

      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check if tag exists
        id: check_tag
        uses: netcracker/qubership-workflow-hub/actions/tag-checker@master
        with:
          tag: 'v${{ github.event.inputs.version }}'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Output result
        run: |
          echo "Tag exists: ${{ steps.check_tag.outputs.exists }}"
          echo "Tag name: ${{ steps.check_tag.outputs.tag_name }}"

      - name: Fail if tag exists
        if: steps.check_tag.outputs.exists == 'true'
        run: |
          echo "Tag already exists: ${{ steps.check_tag.outputs.tag_name }}" >> $GITHUB_STEP_SUMMARY
          echo "Tag already exists: ${{ steps.check_tag.outputs.tag_name }}"
          exit 1

  publish:
    needs: [check-tag]
    uses: netcraker/qubership-workflow-hub/.github/workflows/python-publish.yml@main
    with:
      version: ${{ inputs.version }}
      poetry_version_options: ${{ inputs.poetry_version_options }}
      python-version: ${{ inputs.python-version }}
      poetry_build_params: ${{ inputs.poetry_build_params }}
      pytest_run: ${{ inputs.pytest_run }}
      pytest_params: ${{ inputs.pytest_params }}
    secrets:
      PYPI_API_TOKEN: ${{ secrets.PYPI_API_TOKEN }}

  get-current-version:
    needs: [publish]
    outputs:
      current_version: ${{ steps.get_version.outputs.CURRENT_VERSION }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Get current version
        id: get_version
        run: |
          echo CURRENT_VERSION=$(poetry version | cut -d' ' -f2) >> $GITHUB_OUTPUT

      - name: Output current version
        run: |
          echo "Released version: ${{ steps.get_version.outputs.CURRENT_VERSION }}" >> $GITHUB_STEP_SUMMARY

  github-release:
    needs: [get-current-version]
    uses: Netcracker/qubership-workflow-hub/.github/workflows/release-drafter.yml@main
    with:
      version: ${{ needs.get-current-version.outputs.current_version }}
      publish: false
```

This workflow is designed to be run manually. It has six input parameters on manual execution:
- `Specify version (optional)` -- a string represents the version number (optional). If empty the version number will be cretad automatically.
- `Python version to use` -- a string represents Python version to use to build artifacts (e.g., `3.11`)
- `Poetry version bump` -- which part of semver version to bump (e.g., `patch`, `minor`, `major`)'
- `Additional poetry build parameters` -- additional poetry build parameters
- `Run pytest` -- to run pytests or not (true/false).
- `Parameters for pytest` -- additional parameters to pass into pytests. By default value is `--maxfail=3 -v`

### Step 2: Prepare secrets

The Python Release workflow require PyPi API token. You need to get it from PyPi and add into your repositories Actions secrets. The name of the secret should be `PYPI_API_TOKEN`.

---