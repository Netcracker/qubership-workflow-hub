# 🚀 Maven Release Action

Automates building and releasing a Maven artifact for a repository within the same GitHub
organization. Handles version bumping (major, minor, or patch), GPG signing, Maven release
preparation and perform, and optional post-release dependency snapshot bumping.

---

## Features

- Validates `version-type` (`major`, `minor`, `patch`) and required inputs before proceeding
- Validates Maven `groupId` across all `pom.xml` files against a forbidden-groupId policy
  (`org.qubership`, `com.netcracker` exact matches are blocked)
- Bumps the project version automatically based on `version-type` and runs `mvn release:prepare`
  + `mvn release:perform`
- Supports **dry-run** mode: builds and deploys the current SNAPSHOT version without tagging or
  pushing any changes
- Signs artifacts via GPG using `actions/setup-java` key import
- Caches the local Maven repository (`~/.m2/repository`) across runs
- Optionally pins a specific Maven version via `stCarolas/setup-maven`
- Optionally bumps dependencies to the next `-SNAPSHOT` version after release
  (`bump-dependencies-after-release`)
- Exposes the released version as the `release-version` output
- Reports build and release progress to the workflow step summary

---

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `version-type` | Version bump type for the release: `major`, `minor`, or `patch`. | Yes | `patch` |
| `module` | Repository name to release. The action checks out `<org>/<module>` using the provided token. | Yes | - |
| `ref` | Branch to create the release from. | No | `main` |
| `maven-args` | Additional Maven arguments appended to every Maven invocation. | No | `-DskipTests=true -Dmaven.javadoc.skip=true -B` |
| `server-id` | Maven server ID configured in `~/.m2/settings.xml` by `actions/setup-java`. | No | `github` |
| `java-version` | JDK version to use. | No | `21` |
| `maven-version` | Maven version to install. When empty, the runner's pre-installed Maven is used. | No | - |
| `dry-run` | Set to `'false'` to perform an actual release. Any other value (including the default `'true'`) runs in dry-run mode. | No | `true` |
| `token` | GitHub token used for repository checkout and git push during release. | Yes | - |
| `gpg-private-key` | Armored GPG private key for signing artifacts. | Yes | - |
| `gpg-passphrase` | Passphrase for the GPG private key. | Yes | - |
| `profile` | Maven profile to activate (passed as `-P<profile>`). Leave empty to skip profile activation. | No | - |
| `maven-user` | Username for Maven registry authentication (`MAVEN_USERNAME`). | No | - |
| `maven-password` | Password for Maven registry authentication (`MAVEN_PASSWORD`). | No | - |
| `bump-dependencies-after-release` | Set to `'true'` to bump `org.qubership.cloud*` and `org.qubership.core*` dependencies to their next `-SNAPSHOT` versions and commit the updated `pom.xml` after a successful release. Ignored in dry-run mode. | No | `false` |

---

## 📌 Outputs

| Name | Description |
| --- | --- |
| `release-version` | The version that was built or released (e.g. `2.1.0`). Set in both dry-run and actual release modes. |

---

## How it works

The action targets a repository within the same GitHub organization. It checks out
`<org>/<module>` (not the calling repository) using the provided `token`, then runs the full
Maven Release Plugin flow:

**In dry-run mode** (default, `dry-run != 'false'`): the action builds and deploys the current
SNAPSHOT version as-is with `mvn deploy`. No version is bumped, no tag is created, and no git
commits are pushed. The `release-version` output is set to the current project version. This is
useful for validating that the build and deployment pipeline is healthy before committing to a
release.

**In actual release mode** (`dry-run: 'false'`):

1. `mvn versions:use-releases` — replaces any SNAPSHOT dependency references with their release
   equivalents.
1. `mvn release:prepare` — computes the new release version (based on `version-type`), creates a
   git tag in the format `v<version>`, commits the bumped `pom.xml`, and pushes both the commit
   and tag to the remote.
1. `mvn release:perform` — checks out the tag and deploys the signed artifact to the configured
   Maven registry.
1. (Optional) If `bump-dependencies-after-release` is `'true'`: checks out `main` of the same
   module, runs `mvn versions:use-next-snapshots` to update `org.qubership.cloud*` and
   `org.qubership.core*` dependencies to their next `-SNAPSHOT` versions, and commits the result
   with `[skip ci]`.

The `release-version` output holds the released version in both modes (e.g. `2.1.0`).

---

## Additional Information

### Version bumping logic

Given a current version such as `2.1.3-SNAPSHOT`:

| `version-type` | Resulting release version |
| --- | --- |
| `patch` | `2.1.3` (Maven Release Plugin default — no explicit `-DreleaseVersion`) |
| `minor` | `2.2.0` |
| `major` | `3.0.0` |

The patch bump relies entirely on the Maven Release Plugin's default behaviour. Major and minor
bumps pass an explicit `-DreleaseVersion` flag.

### `module` and cross-repository checkout

The `module` input must match the repository name exactly (not the full slug). The action
constructs the checkout URL as:

```text
github.repository_owner/<module>
```

This means the action can release a **different repository** from the one running the workflow,
as long as the `token` has write access to that repository. This is the intended use case when
this action is called from a central release orchestration workflow.

### `dry-run` default

The default value of `dry-run` is `'true'` (a string). The action only enters actual release
mode when `dry-run` is the exact string `'false'`. Any other value — including `true`, `'true'`,
or an empty string — triggers dry-run mode.

### Maven groupId policy

Before the release step, the action scans every `pom.xml` (excluding `target/`) and fails if
any module declares a `groupId` of exactly `org.qubership` or `com.netcracker`. Sub-packages
(e.g. `org.qubership.cloud`) are permitted. Failures are reported as GitHub Actions errors
with the offending file path.

### GPG signing

`gpg-private-key` and `gpg-passphrase` are required inputs (even for dry-run builds, since the
action deploys a SNAPSHOT artifact). They are imported by `actions/setup-java` and consumed
automatically by the Maven GPG plugin during deployment.

### `bump-dependencies-after-release`

This step only runs when **both** `dry-run == 'false'` and `bump-dependencies-after-release == 'true'`.
It is silently skipped in dry-run mode. The dependency filter is hardcoded to
`org.qubership.cloud*:*,org.qubership.core*:*` — only those groups are bumped to their next
SNAPSHOT.

---

## Usage

```yaml
name: Maven Release

on:
  workflow_dispatch:
    inputs:
      version-type:
        description: 'Version bump type'
        required: true
        default: 'patch'
        type: choice
        options: [major, minor, patch]
      dry-run:
        description: 'Dry run (no tag or push)'
        required: false
        default: 'true'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Release Maven Artifact
        uses: netcracker/qubership-workflow-hub/actions/maven-release@v2.2.1
        with:
          version-type: ${{ inputs.version-type }}
          module: 'my-module'
          ref: 'main'
          dry-run: ${{ inputs.dry-run }}
          token: ${{ secrets.GITHUB_TOKEN }}
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
          maven-user: ${{ secrets.MAVEN_USER }}
          maven-password: ${{ secrets.MAVEN_PASSWORD }}
          bump-dependencies-after-release: 'true'
```

---

## Notes

- `dry-run` defaults to `'true'` — you must explicitly pass `dry-run: 'false'` to perform an
  actual release. Any typo or omission will silently result in a dry run.
- The `token` must have write access to `<org>/<module>` to push tags and commits during release.
  `secrets.GITHUB_TOKEN` only has write access to the calling repository; use a PAT for
  cross-repository releases.
- `gpg-private-key` and `gpg-passphrase` are required even for dry-run builds because the action
  deploys a SNAPSHOT artifact.
- Ensure `pom.xml` is configured according to the
  [pom preparation guide](https://github.com/Netcracker/.github/blob/main/docs/maven-publish-pom-preparation_doc.md).
- Organization-level secrets for Maven are documented in the
  [secrets guide](https://github.com/Netcracker/.github/blob/main/docs/maven-publish-secrets_doc.md).
- All `dry-run`, `bump-dependencies-after-release`, and `upload-artifact` inputs are strings,
  not booleans — pass `'true'` or `'false'` (quoted).
- Always pin to `@v2.2.1` or a specific SHA — never `@main` in production.
