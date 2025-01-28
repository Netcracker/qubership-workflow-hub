# Reusable Workflow

This index provides a quick overview of the available workflow documentation in this repository. Each workflow serves a distinct purpose and is reusable via `workflow_call`. Use the table below to navigate to the specific documentation.

---

## Table of Contents
- [Reusable Workflows](#flows)
- [Actions](#actions)
- [Usage](#usage)

---

## Flows

| Workflow Name                  | Description                                                                 | Documentation Link                                   |
|--------------------------------|-----------------------------------------------------------------------------|-----------------------------------------------------|
| Maven Publish         | Automates signing and deploying Maven artifacts to a repository.            | [Maven Publish](./reusable/maven-publish_doc.md)   |
| GitHub Release        | Automates creating and tagging releases on GitHub.                          | [GitHub Release](./reusable/create-github-release_doc.md) |
| Python Build          | Automates building, testing, and publishing Python packages.                | [Python Build](./reusable/python-publish.md)        |


## Actions

| Action Name      | Description                                                         | Documentation Link                                   |
|------------------|---------------------------------------------------------------------|-----------------------------------------------------|
| commit-and-push  | Automates committing and pushing changes to a remote repository.    | [commit-and-push](./actions/commit-and-push/readme.md) |
| pom-updater      | Automatically updates the `pom.xml` file in Maven projects.         | [pom-updater](./actions/pom-updater/readme.md) |
| tag-checker      | Verifies the presence of specific tags in the repository.           | [tag-checker](./actions/tag-checker/readme.md) |
| custom-event     | Generate anf Process custom events in the workflow.                 | [custom-event](./actions/custom-event/readme.md) |


---

## Usage

Refer to the respective documentation for detailed instructions on inputs, secrets, and example usage. For any questions or issues, feel free to contact the repository maintainers.
