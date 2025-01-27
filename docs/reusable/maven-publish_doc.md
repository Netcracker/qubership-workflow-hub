# Documentation: Maven Publish GitHub Action

This documentation provides an overview of the `Maven Publish` GitHub Action, including its purpose, usage, and setup.

---

## Purpose

The `Maven Publish` action automates the process of signing and deploying artifacts to a Maven repository (e.g., Maven Central) using a specified `pom.xml` file. It supports configurable Maven commands and secure GPG signing.

---

## Workflow Configuration

### Trigger

This workflow is designed to be triggered via a `workflow_call` event, allowing it to be reused in other workflows with the required and optional inputs.

### Inputs

The workflow accepts the following inputs:

| Input Name      | Type   | Required | Default                | Description                                            |
|-----------------|--------|----------|------------------------|--------------------------------------------------------|
| `maven_command` | string | false    | `--batch-mode deploy`  | Maven command to execute for the build and deployment. |
| `java_version`  | string | false    | `21`                  | Version of Java to set up for the Maven build.         |
| `server_id`     | string | false    | `central`             | Server ID for Maven deployment.                       |
| `version`      | string | true     |                        | The version tag for the code to publish.             |

### Secrets

The following secrets are required for secure Maven publishing:

| Secret Name               | Required | Description                                  |
|---------------------------|----------|----------------------------------------------|
| `maven_username`          | true     | Username for the Maven repository.           |
| `maven_password`          | true     | Password for the Maven repository.           |
| `maven_gpg_private_key`   | true     | GPG private key for signing artifacts.       |
| `maven_gpg_passphrase`    | true     | Passphrase for the GPG private key.          |

---

## Workflow Jobs

### 1. **Job: `publish`**

Runs on `ubuntu-latest` and consists of the following steps:

#### a. **Checkout Code**
   - Checks out the repository code at the specified version.
   ```yaml
   uses: actions/checkout@v4
   with:
     ref: v${{ inputs.version }}
     fetch-depth: 0
   ```

#### b. **Cache Maven Dependencies**
   - Caches the `.m2` directory to speed up Maven builds.
   ```yaml
   uses: actions/cache@v3
   with:
     path: ~/.m2
     key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
     restore-keys: |
       ${{ runner.os }}-maven-
   ```

#### c. **Set up JDK**
   - Sets up the Java environment and configures Maven settings for deployment.
   ```yaml
   uses: actions/setup-java@v4
   with:
     java-version: ${{ inputs.java_version }}
     distribution: 'temurin'
     server-id: ${{ inputs.server_id }}
     server-username: MAVEN_USERNAME
     server-password: MAVEN_PASSWORD
     gpg-private-key: ${{ secrets.maven_gpg_private_key }}
     gpg-passphrase: MAVEN_GPG_PASSPHRASE
   ```

#### d. **Display Maven Settings**
   - Displays the `settings.xml` to confirm proper configuration.
   ```yaml
   run: cat ~/.m2/settings.xml
   ```

#### e. **Sign and Deploy to Maven Central**
   - Executes the Maven command to sign and deploy artifacts.
   ```yaml
   run: mvn ${{ inputs.maven_command }}
   env:
     MAVEN_USERNAME: ${{ secrets.maven_username }}
     MAVEN_PASSWORD: ${{ secrets.maven_password }}
     MAVEN_GPG_PASSPHRASE: ${{ secrets.maven_gpg_passphrase }}
   ```

---

## Example Usage

Below is an example of how to call this workflow from another workflow:

```yaml
name: Call Maven Publish

on:
  push:
    branches:
      - main

jobs:
  call-maven-publish:
    uses: Netcracker/qubership-workflow-hub/.github/workflows/maven-publish.yml
    with:
      maven_command: "clean deploy"
      java_version: "17"
      server_id: "my-repo"
      version: "1.0.0"
    secrets:
      maven_username: ${{ secrets.MAVEN_USERNAME }}
      maven_password: ${{ secrets.MAVEN_PASSWORD }}
      maven_gpg_private_key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
      maven_gpg_passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
```

---

## Notes

- Ensure the GPG private key is properly configured and matches the artifacts being signed.
- If using a different Maven repository (e.g., a private Nexus), update `server_id` and credentials accordingly.
- Modify `fetch-depth` to suit your versioning and build requirements.

---

## Troubleshooting

- **GPG Signing Issues**: Verify that the GPG private key and passphrase match and are correctly configured.
- **Maven Deployment Failures**: Check `settings.xml` for correct credentials and server configuration.
- **Cache Not Restored**: Ensure the `pom.xml` file paths are correctly specified in the cache key.
