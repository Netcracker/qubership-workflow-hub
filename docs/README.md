# Workflow and Action

This index provides a quick overview of the available workflow and action documentation in this repository. Each workflow and action serves a distinct purpose and is reusable via `workflow_call`. Use the table below to navigate to the specific documentation.

---

## Flows

| Workflow Name                  | Description                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| [Maven Publish](./reusable/maven-publish.md)         | Automates signing and deploying Maven artifacts to a repository.            |
| [GitHub Release](./reusable/create-github-release_doc.md)        | Automates creating and tagging releases on GitHub.                          |
| [Python Build](./reusable/python-publish.md)          | Automates building, testing, and publishing Python packages.                |


## Actions

| Action Name      | Description                                                         |
|------------------|---------------------------------------------------------------------|
| [commit-and-push](./actions/commit-and-push/readme.md)  | Automates committing and pushing changes to a remote repository.    |
| [pom-updater](./actions/pom-updater/readme.md)      | Automatically updates the `pom.xml` file in Maven projects.         |
| [tag-checker](./actions/tag-checker/readme.md)      | Verifies the presence of specific tags in the repository.           |
| [custom-event](./actions/custom-event/readme.md)     | Generate and process custom events in the workflow.                 |


---

## Usage

Refer to the respective documentation for detailed instructions on inputs, secrets, and example usage. For any questions or issues, feel free to contact the repository maintainers.