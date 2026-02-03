# 🚀 Maven Publish Workflow

This **Maven Publish** GitHub Workflow automates signing and deploying Maven artifacts to a repository.

## Features

- Automates signing and deploying Maven artifacts to a repository.
- Supports caching Maven dependencies.
- Allows for uploading build artifacts.

## 📌 Inputs

| Name            | Description                              | Required | Default                  |
| --------------- | ---------------------------------------- | -------- | ------------------------ |
| `maven-command` | Maven command to run                     | No       | `--batch-mode deploy`    |
| `java-version`  | Java version to use                      | No       | `21`                     |
| `server-id`     | Server ID for Maven repository           | No       | `central`                |
| `ref`           | Branch name to create release from       | No       | `main`                   |
| `upload-artifact` | If true, uploads build artifacts        | No       | `false`                  |
| `artifact-id`   | Artifact ID to use                       | No       | `artifact`               |

## 📌 Secrets

| Name             | Description                              | Required |
| ---------------- | ---------------------------------------- | -------- |
| `maven-username` | Username for Maven repository            | No       |
| `maven-password` | Password for Maven repository            | No       |
| `maven-token`    | Token for Maven repository               | Yes      |
| `gpg-private-key`| GPG private key for signing artifacts    | No       |
| `gpg-passphrase` | Passphrase for GPG private key           | No       |
| `sonar-token`    | Token for SonarQube analysis             | No       |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Maven Publish Workflow

on:
  push:
    branches:
      - main

permissions:
  contents: read  

jobs:
  call-maven-publish:
    uses: netcracker/qubership-workflow-hub/.github/workflows/maven-publish.yml@v2.0.10
    with:
      maven-command: "--batch-mode deploy"
      java-version: "21"
      server-id: "central"
      ref: "main"
      upload-artifact: true
      artifact-id: "my-artifact"
    secrets:
      maven-username: ${{ secrets.MAVEN_USERNAME }}
      maven-password: ${{ secrets.MAVEN_PASSWORD }}
      maven-token: ${{ secrets.MAVEN_TOKEN }}
      gpg-private-key: ${{ secrets.GPG_PRIVATE_KEY }}
      gpg-passphrase: ${{ secrets.GPG_PASSPHRASE }}
      sonar-token: ${{ secrets.SONAR_TOKEN }}