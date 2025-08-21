# Maven Snapshot Deploy Action

This GitHub Action builds and deploys a Maven project to either Maven Central or GitHub Packages. It checks if the version is a `SNAPSHOT` version and deploys accordingly. If the version is not a `SNAPSHOT`, it runs the `mvn install` command instead.

## Inputs

### `java-version`

**Optional**  
The JDK version to use. Defaults to `21`.

### `target-store`

**Optional**  
The target store for the artifact. Can be `central` or `github`. Defaults to `central`.

### `additional-mvn-args`

**Optional**  
Additional Maven command-line parameters (e.g., `-Dskip.tests=true`). Defaults to an empty string.

### `working-directory`

**Optional**  
Working directory for the action. It is usefull when there are several independant pom.xml files in the repository.
Default is `.`.

### `pom-file`

**Optional**  
Path and name of pom.xml file. Path to file must be relative to `working-directory`.
Default is `pom.xml`

### `maven-username`

**Optional**  
The username for Maven authentication.

### `maven-token`

**Required**  
The token for Maven authentication.

### `gpg-private-key`

**Optional**  
The GPG private key for signing artifacts.

### `gpg-passphrase`

**Optional**  
The passphrase for the GPG private key.

## Example Usage

```yaml
name: Deploy Snapshot

on:
  push:
    branches:
      - develop
permissions:
  packages: write # Required for GitHub packages deployment. For maven central deployment it can be omitted
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy Maven Snapshot
        uses: netcracker/qubership-workflow-hub/actions/maven-snapshot-deploy@main
        with:
          java-version: '17'
          target-store: 'github'
          additional-mvn-args: '-Dskip.tests=true'
          maven-username: ${{ github.actor }} # For maven central repository it would be ${{ secrets.MAVEN_USER }}. Already set for Netcracker.
          maven-token: ${{ github.token }} # For maven central repository it would be ${{ secrets.MAVEN_PASSWORD}}. Already set for Netcracker.
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }} # Organization level secret. Already set for Netcracker.
          gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }} # Organization level secret. Already set for Netcracker.
```

## How It Works

1. **Check Version**: The action checks if the version in `pom.xml` contains `-SNAPSHOT`. If it does, the artifact is deployed. Otherwise, the `mvn install` command is executed.
2. **Setup JDK**: The specified JDK version is set up using `actions/setup-java`.
3. **Deploy Artifacts**: The action deploys the artifact to the specified target store (`central` or `github`).
4. **GPG Signing**: If a GPG private key and passphrase are provided, the artifacts are signed before deployment.

## Notes

- Ensure that the `pom.xml` file is correctly configured for deployment. [How to configure pom.xml](../../docs/maven-publish-pom-preparation_doc.md)
- Secrets to use to publish to Maven Central can be found there [Organization level secrets](../../docs/maven-publish-secrets_doc.md)
- For deploying to GitHub Packages, additional setup is performed to disable the `central-publishing-maven-plugin` and set an alternative deployment repository.
