# 🚀 Maven Release Action

This GitHub Action automates the process of building and releasing a Maven artifact. It supports version bumping (major, minor, patch), GPG signing, and optional dependency version bumping after release.

---

## Features

- **Automatic Version Bumping:** Supports major, minor, and patch version increments for Maven artifacts.
- **Branch Selection:** Allows releasing from any branch (default is `main`).
- **GPG Signing:** Signs artifacts using provided GPG keys and passphrase.
- **Custom Maven Arguments:** Pass additional Maven arguments for flexible builds.
- **Dry Run Support:** Optionally perform a dry run without pushing changes.
- **Dependency Snapshot Bumping:** Optionally bumps dependencies to the next snapshot version after release.
- **Custom Profiles and Credentials:** Supports custom Maven profiles, usernames, and passwords for publishing.

## 📌 Inputs

| Name                        | Description                                                                                       | Required | Default                                                    |
|-----------------------------|---------------------------------------------------------------------------------------------------|----------|------------------------------------------------------------|
| `version-type`              | Type of version bump for the release. Can be one of: `major`, `minor`, `patch`.                  | Yes      | `patch`                                                    |
| `module`                    | The module (repository name) to build.                                                            | Yes      |                                                            |
| `ref`                       | Branch name to create the release from.                                                           | No       | `main`                                                     |
| `maven-args`                | Additional Maven arguments to pass.                                                               | No       | `-DskipTests=true -Dmaven.javadoc.skip=true -B`            |
| `server-id`                 | Maven server ID.                                                                                  | No       | `github`                                                   |
| `java-version`              | Java version to use.                                                                              | No       | `21`                                                       |
| `maven-version`             | Maven version to use.                                                                             | No       |                                                            |
| `dry-run`                   | If set to `true`, performs a dry run without pushing changes.                                     | No       | `true`                                                     |
| `token`                     | GitHub token for authentication.                                                                  | Yes      |                                                            |
| `gpg-private-key`           | GPG private key for signing artifacts.                                                            | Yes      |                                                            |
| `gpg-passphrase`            | Passphrase for the GPG private key.                                                               | Yes      |                                                            |
| `profile`                   | Maven profile to use.                                                                             | No       |                                                            |
| `maven-user`                | Username to login to Maven central or GitHub packages.                                            | No       |                                                            |
| `maven-password`            | Password to login to Maven central or GitHub packages.                                            | No       |                                                            |
| `bump-dependencies-after-release` | If set to `true`, bumps dependencies versions to the next snapshot after release.         | No       | `false`                                                    |

## 📌 Outputs

### `release-version`

The version that was released.

## Example Usage

```yaml
name: Maven Release

on:
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Release Maven Artifact
        uses: netcracker/qubership-workflow-hub/actions/maven-release@v2.0.9
        with:
          version-type: 'minor'
          module: 'my-module'
          ref: 'main'
          token: ${{ secrets.GITHUB_TOKEN }}
          gpg-private-key: ${{ secrets.GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.GPG_PASSPHRASE }}
          maven-user: ${{ secrets.MAVEN_USER }}
          maven-password: ${{ secrets.MAVEN_PASSWORD }}
          bump-dependencies-after-release: 'true'
```

## How It Works

1. **Input Validation**: Checks required inputs and validates version type and module.
2. **Setup**: Configures Java and Maven environments.
3. **Checkout**: Clones the specified module and branch.
4. **Release**: Bumps the version, builds, and releases the artifact. Optionally bumps dependencies to the next snapshot version.
5. **Cleanup**: Cleans up workspace if dependency bumping is enabled.

## Notes

- Ensure project pom.xml file configured according [pom preparation instruction](https://github.com/Netcracker/.github/blob/main/docs/maven-publish-pom-preparation_doc.md)
- Ensure all required secrets are available in your repository.
- The action supports both dry-run and actual release modes.
