# 🚀 Maven Monorepo Release Action

Release Maven components from a monorepo with independent versioning per component.
Supports releasing individual components, parent, and BOM independently. Handles version
bumping (major/minor/patch), GPG signing, and publishing to Maven Central or GitHub Packages.
Dry-run mode available for validation.

**Key difference from `maven-release`**: This action does NOT use Maven Release Plugin
(which is incompatible with monorepos). Instead, it implements custom version management that handles:

- Independent component versioning
- Automatic dependency updates between monorepo components
- GitHub releases with component-scoped tags (`component-name-version`)
- Parent POM version synchronization
- Dry-run validation

---

## Features

### Version Management

- **Independent versioning**: Each component maintains its own version independent of others
- **Flexible bumping**: Support for `major`, `minor`, `patch`, or explicit semantic versions (e.g., `1.2.3`)
- **SNAPSHOT handling**: Automatically manages `-SNAPSHOT` versions between releases

### Publishing

- **Dual targets**: Publish to Maven Central (`central`), GitHub Packages (`github`), or both (`both`)
- **GPG signing**: Optional GPG signing for Maven Central compliance
- **Component-scoped tags**: Creates annotated git tags in format `<component>-<version>`

### Dependency Management

- **Inter-module updates**: Automatically updates component versions in dependent modules within the monorepo
- **Parent versioning**: Option to update parent POM references in child modules after parent release
- **BOM management**: Full support for BOM (Bill of Materials) modules

### Safety & Validation

- **Dry-run mode**: Builds and deploys SNAPSHOT to target registry without version bump, tagging, or release commits
- **Structure validation**: Ensures monorepo structure is correct before release
- **Build verification**: Validates component builds successfully before releasing

---

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `component` | Component to release. Use `parent`, `bom`, or the component folder name (e.g., `my-component`) | Yes | - |
| `version-type` | Version bump type: `major`, `minor`, `patch`, or an explicit semver like `1.2.3` | Yes | `patch` |
| `version-property` | Optional Maven property name to update alongside the version (e.g., `my.component.version`). When set, also runs `mvn versions:set-property` on dependent POM files. | No | - |
| `ref` | Branch to create release from | No | `main` |
| `publish-target` | Where to publish: `central` (requires GPG credentials), `github` (uses GITHUB\_TOKEN), or `both` | No | `github` |
| `java-version` | Java version to set up (LTS recommended: `21`, `17`, `11`) | No | `21` |
| `maven-version` | Maven version to install. When empty, the runner's pre-installed Maven is used | No | - |
| `maven-args` | Additional Maven arguments appended to all invocations | No | `-DskipTests=true -Dmaven.javadoc.skip=true -B` |
| `dry-run` | Set to `'false'` to perform the actual release. Default `'true'` builds and deploys a SNAPSHOT to the target registry without bumping versions, committing, or pushing tags | No | `'true'` |
| `token` | GitHub token for repository checkout and git operations | Yes | - |
| `gpg-private-key` | Armored GPG private key for artifact signing (required when `publish-target` is `central` or `both`) | No | - |
| `gpg-passphrase` | Passphrase for the GPG private key | No | - |
| `maven-username` | Maven Central (Sonatype) username for authentication | No | - |
| `maven-password` | Maven Central (Sonatype) password or authentication token. Required when `publish-target` is `central` or `both` | No | - |
| `maven-profile` | Maven profile to activate (e.g., `release`). Leave empty to skip | No | - |
| `update-parent-version` | Set to `'true'` to automatically update the parent version reference in child modules after releasing the `parent` component. Ignored when `component` is not `parent` | No | `'false'` |
| `skip-parent-check` | Set to `'true'` to skip validation that non-parent components inherit from the parent POM | No | `'false'` |

---

## 📌 Outputs

| Name | Description |
| --- | --- |
| `release-version` | The released version (e.g., `2.1.0`). Set in both dry-run and release modes |
| `component-released` | Name of the component that was released |
| `artifacts` | Published artifact coordinates in `groupId:artifactId:version` format |

---

## Monorepo Structure

This action expects a Maven monorepo structured like:

```text
monorepo-root/
├── pom.xml                    # Root aggregator POM (optional, lists modules)
├── parent/
│   └── pom.xml               # Parent POM
├── bom/
│   └── pom.xml               # BOM (Bill of Materials) provides dependencyManagement
├── my-component-1/
│   ├── pom.xml               # References <parent>
│   ├── src/
│   └── ...
├── my-component-2/
│   ├── pom.xml               # References <parent>, may depend on my-component-1
│   ├── src/
│   └── ...
└── ...
```

### Key requirements

1. **Root directory**: Each component lives in its own top-level folder (e.g., `parent`, `bom`, `my-component`)
1. **Parent POM**: All non-parent components should inherit from `parent/pom.xml` via `<parent>` element
1. **Independent versions**: Each component's `pom.xml` declares its own `<version>` (not inherited from parent)
1. **Inter-dependencies**: Components can depend on other components within the monorepo

---

## How it works

### Dry-run mode (default, `dry-run: 'true'`)

1. Validates monorepo structure and component existence
1. Builds component (`mvn clean package`)
1. Deploys SNAPSHOT artifact to the target registry
1. **Does NOT**: bump version, commit, create tag, or push any changes
1. Sets `release-version`, `component-released`, and `artifacts` outputs

### Release mode (`dry-run: 'false'`)

1. **Validates** monorepo structure
1. **Gets current version** from component's `pom.xml` via `mvn help:evaluate`
1. **Bumps version** based on `version-type` (major/minor/patch or explicit)
1. **Updates pom.xml** with release version via `mvn versions:set`
1. **Builds and deploys** to Maven Central and/or GitHub Packages
1. **Commits** release version change: `chore(<component>): release version <X.Y.Z>`
1. **Creates git tag** in format `<component>-<version>` (e.g., `my-component-2.1.0`)
1. **Updates to next SNAPSHOT**: bumps patch version and appends `-SNAPSHOT`
1. **Commits** SNAPSHOT bump: `chore(<component>): bump to next snapshot version <X.Y.Z-SNAPSHOT>`
1. **Updates dependencies** in other monorepo components that reference this component
1. **Updates parent version** in child modules (only when `component=parent` and `update-parent-version='true'`)

### Version bumping logic

Given current version `2.1.3-SNAPSHOT`:

| `version-type` | Released version |
| --- | --- |
| `patch` | `2.1.4` |
| `minor` | `2.2.0` |
| `major` | `3.0.0` |
| `1.2.3` (explicit) | `1.2.3` |

After release, version is automatically bumped to next patch SNAPSHOT (e.g., `2.1.4-SNAPSHOT`).

---

## Additional Information

### `version-property` input

When set, `update_dependency_version` also runs `mvn versions:set-property` on dependent POM
files to update a named Maven property alongside the direct dependency version:

```xml
<!-- Example: if version-property is set to "my-lib.version" -->
<properties>
  <my-lib.version>2.1.0</my-lib.version>
</properties>
```

This is useful for monorepos that manage dependency versions through properties rather than
inline `<version>` elements.

### `publish-target` values

| Value | Behaviour |
| --- | --- |
| `github` | Deploys via `mvn deploy -Drepo.id=github`. Requires `packages: write` permission and a valid `token` |
| `central` | Deploys via `mvn deploy`. Requires `maven-username`, `maven-password`, and `gpg-private-key` |
| `both` | Runs both `github` and `central` deployments in sequence |

### pom.xml structure

Each component must declare its own `<version>`:

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>my-component</artifactId>
  <version>1.0.0</version>

  <!-- For non-parent components, inherit from parent -->
  <parent>
    <groupId>com.example</groupId>
    <artifactId>parent</artifactId>
    <version>1.0.0</version>
  </parent>

  <dependencies>
    <dependency>
      <groupId>com.example</groupId>
      <artifactId>my-lib</artifactId>
      <version>1.0.0</version>
    </dependency>
  </dependencies>
</project>
```

### settings.xml for Maven Central

For Maven Central publishing, configure `~/.m2/settings.xml`:

```xml
<settings>
  <servers>
    <server>
      <id>central</id>
      <username>${env.MAVEN_USERNAME}</username>
      <password>${env.MAVEN_PASSWORD}</password>
    </server>
    <server>
      <id>github</id>
      <username>oauth2</username>
      <password>${env.GITHUB_TOKEN}</password>
    </server>
  </servers>

  <profiles>
    <profile>
      <id>release</id>
      <activation>
        <activeByDefault>false</activeByDefault>
      </activation>
      <properties>
        <gpg.executable>gpg</gpg.executable>
        <gpg.passphrase>${env.MAVEN_GPG_PASSPHRASE}</gpg.passphrase>
      </properties>
    </profile>
  </profiles>
</settings>
```

### GitHub Packages publishing

Add a `distributionManagement` section to your POM:

```xml
<distributionManagement>
  <repository>
    <id>github</id>
    <name>GitHub Packages</name>
    <url>https://maven.pkg.github.com/YOUR-ORG/YOUR-REPO</url>
  </repository>
</distributionManagement>
```

### Dependency update commit messages

When this action updates dependent modules within the monorepo, it uses the following commit
message format:

```text
chore(<component>): update dependencies on <groupId>:<artifactId> to <X.Y.Z>
```

---

## Usage

```yaml
name: Release Maven Component

on:
  workflow_dispatch:
    inputs:
      component:
        description: 'Component to release (parent, bom, or folder name)'
        required: true
      version-type:
        description: 'Version bump type'
        required: true
        type: choice
        options: [major, minor, patch]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - name: Release component
        uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
        with:
          component: ${{ inputs.component }}
          version-type: ${{ inputs.version-type }}
          dry-run: 'false'
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Release to Maven Central

```yaml
- name: Release to Maven Central
  uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
  with:
    component: ${{ inputs.component }}
    version-type: ${{ inputs.version-type }}
    publish-target: central
    dry-run: 'false'
    token: ${{ secrets.GITHUB_TOKEN }}
    gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
    gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
    maven-username: ${{ secrets.MAVEN_CENTRAL_USERNAME }}
    maven-password: ${{ secrets.MAVEN_CENTRAL_PASSWORD }}
```

### Release parent and update children

```yaml
- name: Release parent and update child modules
  uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
  with:
    component: parent
    version-type: minor
    publish-target: central
    dry-run: 'false'
    update-parent-version: 'true'
    token: ${{ secrets.GITHUB_TOKEN }}
    gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
    gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
    maven-username: ${{ secrets.MAVEN_CENTRAL_USERNAME }}
    maven-password: ${{ secrets.MAVEN_CENTRAL_PASSWORD }}
```

---

## Secrets required

### For Maven Central

- `MAVEN_GPG_PRIVATE_KEY`: Armored GPG private key
- `MAVEN_GPG_PASSPHRASE`: GPG key passphrase
- `MAVEN_CENTRAL_USERNAME`: Sonatype username
- `MAVEN_CENTRAL_PASSWORD`: Sonatype password or token

### For GitHub Packages

- `GITHUB_TOKEN`: Provided automatically by Actions — requires `packages: write` permission

---

## Troubleshooting

### "Component directory not found"

Ensure the component folder exists at the monorepo root and matches the `component` input exactly.

### "Component does not have pom.xml"

Verify `<component>/pom.xml` exists and is valid XML.

### "Failed to determine current version"

Check that `pom.xml` has a valid `<version>` element that Maven can parse.

### Build fails

Run locally: `cd <component> && mvn clean package`

### Publishing fails

- **Maven Central**: Verify GPG key is imported, passphrase is correct, and `maven-username`/`maven-password` are set
- **GitHub Packages**: Verify `token` has `packages: write` permission and the repository URL in `distributionManagement` is correct

### Git tag already exists

Delete the remote tag and retry: `git push origin :refs/tags/<tag-name>`

---

## Notes

- **No maven-release-plugin**: This action implements custom version management. Do not use
  Maven Release Plugin profiles alongside it.
- **Dry-run by default**: `dry-run: 'true'` is the default for safety — explicitly set `'false'`
  to perform a real release.
- **Atomic commits**: Version bumps, dependency updates, and SNAPSHOT bumps are each committed
  separately, allowing targeted rollback.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@cabbb90e9471163cfac84bd50ff0296b2803b44c # v2.3.0`. The SHA is the immutable pin; the
  comment shows which release it points to. Tags alone are mutable. Never use `@main` or short SHAs.
