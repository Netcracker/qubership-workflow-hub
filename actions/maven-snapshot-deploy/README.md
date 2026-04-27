# 🚀 Maven Snapshot Deploy

Builds and deploys a Maven project to either Maven Central or GitHub Packages. Automatically
detects whether the project version is a SNAPSHOT and deploys accordingly — if the version has
no `-SNAPSHOT` suffix, the action falls back to `mvn install` instead of deploying.

---

## Features

- Detects SNAPSHOT versions in `pom.xml` using `xmlstarlet` — supports both direct
  `<version>` and property-based `${revision}` patterns
- Configures Maven authentication and GPG signing automatically for Central or GitHub Packages
- Optionally pins a specific Maven version via `stCarolas/setup-maven`
- Caches the local Maven repository (`~/.m2/repository`) to speed up subsequent runs
- Auto-injects a `github` server entry into `~/.m2/settings.xml` when deploying to GitHub Packages
- Activates a named Maven profile (`-P<target-store>`) when it exists in `pom.xml`
- Supports non-root `pom.xml` paths and sub-directory working directories
- Optionally uploads compiled output (`**/target`) as a GitHub Actions artifact
- Surfaces key build decisions and version check results in the workflow step summary

---

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `java-version` | JDK version to use (e.g. `21`). | No | `21` |
| `maven-version` | Maven version to install. When empty, the runner's pre-installed Maven is used. | No | - |
| `target-store` | Target registry for deployment. Use `central` for Maven Central or `github` for GitHub Packages. | No | `central` |
| `maven-command` | Maven lifecycle command to execute. Defaults to `deploy` (SNAPSHOT versions) or `install` (non-SNAPSHOT). | No | `deploy` |
| `additional-mvn-args` | Extra Maven command-line arguments appended to the final `mvn` invocation (e.g. `-Dskip.tests=true`). | No | - |
| `working-directory` | Directory to run Maven commands from. Useful when the repository contains multiple independent `pom.xml` files. | No | - |
| `pom-file` | Path to the `pom.xml` file, relative to `working-directory`. | No | `pom.xml` |
| `upload-artifact` | Set to `true` to upload the `**/target` directory tree as a GitHub Actions artifact after the build. | No | `false` |
| `artifact-id` | Name for the uploaded artifact. Applies only when `upload-artifact` is `true`. | No | `maven-snapshot-deploy-artifact` |
| `maven-username` | Username for Maven registry authentication. | No | - |
| `maven-token` | Token or password for Maven registry authentication. | Yes | - |
| `gpg-private-key` | Armored GPG private key used to sign artifacts before deployment. | No | - |
| `gpg-passphrase` | Passphrase for the GPG private key. | No | - |
| `sonar-token` | SonarQube/SonarCloud token, passed as `SONAR_TOKEN` to the Maven process. | No | - |

---

## How it works

The action resolves the effective Maven command before running the build:

1. **SNAPSHOT check** — when `maven-command` is `deploy`, the action reads `pom.xml` with
   `xmlstarlet` to determine whether the project version (or `${revision}` property) ends in
   `-SNAPSHOT`. If it does not, the command is automatically downgraded to `install` so no
   artifact is published from a release-tagged build.

1. **Profile activation** — the action checks whether a Maven profile named after `target-store`
   exists in `pom.xml`. When found, it adds `-P<target-store>` to the Maven invocation, enabling
   repository-specific configuration (distribution management, plugins, etc.).

1. **JDK and credentials setup** — for `deploy` commands, `actions/setup-java` configures the
   Maven `server-id` matching `target-store` and wires in `MAVEN_USERNAME` / `MAVEN_PASSWORD`
   environment variables, plus GPG signing if keys are provided. For non-deploy commands, a plain
   JDK is set up without credential injection.

1. **GitHub Packages server** — the action automatically adds a `github` server block to
   `~/.m2/settings.xml` (using `GITHUB_ACTOR` and `GITHUB_TOKEN`) when it is not already present,
   ensuring GitHub Packages dependencies and deployments always resolve correctly.

1. **Maven execution** — the final command takes the form:

   ```text
   mvn --batch-mode <command> [<-Pprofile>] [<additional-args>] [-f <pom-file>]
   ```

1. **Artifact upload** — when `upload-artifact` is `true`, all `**/target` directories are
   uploaded under the name given by `artifact-id`.

---

## Additional Information

### `target-store` values

| Value | Registry |
| --- | --- |
| `central` | Maven Central (via Central Publishing Maven Plugin) |
| `github` | GitHub Packages (uses `GITHUB_ACTOR` / `GITHUB_TOKEN`) |

The value must match a `<profile><id>` in your `pom.xml` for profile activation to take effect.
See the [pom.xml configuration guide](https://github.com/Netcracker/.github/blob/main/docs/maven-publish-pom-preparation_doc.md)
for the required structure.

### `maven-command` and SNAPSHOT detection

When `maven-command` is `deploy`:

- The action parses `pom.xml` to find the effective version (direct `<version>` or
  `<properties><revision>` when the version contains `${revision}`).
- If the version does **not** contain `-SNAPSHOT`, the command is replaced with `install` and
  nothing is deployed. This prevents accidentally publishing a release build as a snapshot.

When `maven-command` is anything other than `deploy` (e.g. `clean verify`), the SNAPSHOT check
is skipped and the command is passed through as-is.

### GPG signing

Provide `gpg-private-key` and `gpg-passphrase` to enable artifact signing. These are forwarded
to `actions/setup-java`, which imports the key and configures Maven to use it automatically.
For Netcracker repositories both secrets are available at org level as `MAVEN_GPG_PRIVATE_KEY`
and `MAVEN_GPG_PASSPHRASE`.

### `working-directory` and `pom-file`

Use `working-directory` when your repository root is not the Maven project root. The `pom-file`
path is relative to `working-directory`. The action validates that the file exists before
proceeding and exits with an error if it is not found.

---

## Usage

```yaml
name: Deploy Snapshot

on:
  push:
    branches:
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Code quality scan on SonarQube
        uses: netcracker/qubership-workflow-hub/actions/maven-snapshot-deploy@v2.2.1
        with:
          java-version: '17'
          target-store: 'github'
          maven-command: 'clean verify'
          additional-mvn-args: >-
            org.sonarsource.scanner.maven:sonar-maven-plugin:5.0.0.4389:sonar
            -Dsonar.projectKey=Netcracker_qubership
            -Dsonar.organization=netcracker
            -Dsonar.host.url=https://sonarcloud.io
          maven-username: ${{ github.actor }}
          maven-token: ${{ github.token }}
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
          sonar-token: ${{ secrets.SONAR_TOKEN }}

      - name: Deploy Maven Snapshot
        uses: netcracker/qubership-workflow-hub/actions/maven-snapshot-deploy@v2.2.1
        with:
          java-version: '17'
          target-store: 'github'
          maven-command: 'deploy'
          additional-mvn-args: '-Dskip.tests=true'
          maven-username: ${{ github.actor }}
          maven-token: ${{ github.token }}
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
```

---

## Notes

- `packages: write` permission is required for GitHub Packages deployment; it can be omitted
  for Maven Central deployments.
- Ensure `pom.xml` contains a `<profile>` whose `<id>` matches `target-store` for profile
  activation to work. See the
  [pom.xml configuration guide](https://github.com/Netcracker/.github/blob/main/docs/maven-publish-pom-preparation_doc.md).
- Organization-level secrets for Maven Central are documented in the
  [secrets guide](https://github.com/Netcracker/.github/blob/main/docs/maven-publish-secrets_doc.md).
- The `upload-artifact` input is a `string`, not a boolean — pass `'true'` (quoted) to enable it.
- Always pin to `@v2.2.1` or a specific SHA — never `@main` in production.
