# 🚀 Maven Monorepo Release Action

Automates releasing individual Maven components from a monorepo with **independent versioning per component**. Handles version bumping (major/minor/patch or explicit version), GPG signing, publishing to Maven Central or GitHub Packages, and automatic dependency updates within the monorepo.

**Key difference from `maven-release`**: This action does NOT use Maven Release Plugin (which is incompatible with monorepos). Instead, it implements custom version management that handles:
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
- **Dual targets**: Publish to Maven Central, GitHub Packages, or both
- **GPG signing**: Optional GPG signing for Maven Central compliance
- **GitHub releases**: Creates annotated git tags in format `<component>-<version>`

### Dependency Management
- **Inter-module updates**: Automatically updates component versions in dependent modules within monorepo
- **Parent versioning**: Option to update parent POM references in child modules
- **BOM management**: Full support for BOM (Bill of Materials) modules

### Safety & Validation
- **Dry-run mode**: Build and validate without creating tags, commits, or pushing
- **Structure validation**: Ensures monorepo structure is correct before release
- **Build verification**: Validates component builds successfully before releasing

---

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `component` | Component to release: `parent`, `bom`, or folder name (e.g., `my-component`) | Yes | - |
| `version-type` | Bump type: `major`, `minor`, `patch`, or explicit version like `1.2.3` | Yes | `patch` |
| `ref` | Branch to release from | No | `main` |
| `publish-target` | Where to publish: `maven-central`, `github`, or `both` | No | `github` |
| `java-version` | Java version (LTS: 21, 17, 11) | No | `21` |
| `maven-version` | Maven version to use. Empty = use runner's pre-installed Maven | No | - |
| `maven-args` | Additional Maven arguments for all invocations | No | `-DskipTests=true -Dmaven.javadoc.skip=true -B` |
| `dry-run` | Set to `'false'` to perform actual release. `'true'` = validation only | No | `'true'` |
| `token` | GitHub token for checkout and git operations | Yes | - |
| `gpg-private-key` | Armored GPG private key (required for Maven Central) | No | - |
| `gpg-passphrase` | GPG passphrase | No | - |
| `maven-username` | Sonatype username for Maven Central or GitHub username for GitHub packages | No | - |
| `maven-password` | Sonatype password or token for Maven Central or GitHub token for GitHub packages | No | - |
| `maven-profile` | Maven profile to activate (e.g., `github`) | No | - |
| `update-parent-version` | Set to `'true'` to update parent version in child modules after parent release | No | `'false'` |

---

## 📌 Outputs

| Name | Description |
| --- | --- |
| `release-version` | Released version (e.g., `2.1.0`) |
| `component-released` | Name of component released |
| `artifacts` | Published artifact coordinates (groupId:artifactId:version) |

---

## Monorepo Structure

This action expects a Maven monorepo structured like:

```
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

### Key requirements:

1. **Root directory**: Each component lives in its own top-level folder (e.g., `parent`, `bom`, `my-component`)
2. **Parent POM**: All non-parent components should inherit from `parent/pom.xml` via `<parent>` element
3. **Independent versions**: Each component's `pom.xml` declares its own `<version>` (not inherited from parent)
4. **Inter-dependencies**: Components can depend on other components within the monorepo

---

## Release Workflow

### Dry-run mode (default, `dry-run: 'true'`)

1. Validates monorepo structure
2. Builds component (runs `mvn clean package`)
3. **Does NOT**: bump version, commit, tag, or push
4. Useful for validation before committing to a release

### Release mode (`dry-run: 'false'`)

1. **Get current version** from component's `pom.xml`
2. **Bump version** based on `version-type` (major/minor/patch)
3. **Update pom.xml** with release version
4. **Build component** (`mvn clean package`)
5. **Deploy** to Maven Central and/or GitHub Packages
6. **Commit** release version change and push
7. **Create git tag** in format `<component>-<version>` (e.g., `my-component-2.1.0`)
8. **Update to next SNAPSHOT** version (e.g., `2.1.1-SNAPSHOT`)
9. **Update dependencies** in other monorepo components (if configured)
10. **Update parent version** in child modules (if component is parent and flag enabled)

---

## Usage Examples

### Example 1: Release a component to GitHub Packages (dry-run)

```yaml
name: Release Component (Dry-Run)

on:
  workflow_dispatch:
    inputs:
      component:
        description: 'Component to release'
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
      - name: Release (Dry-Run)
        uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@v1.0.0
        with:
          component: ${{ inputs.component }}
          version-type: ${{ inputs.version-type }}
          dry-run: 'true'
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Example 2: Actual release to Maven Central

```yaml
name: Release to Maven Central

on:
  workflow_dispatch:
    inputs:
      component:
        description: 'Component to release'
        required: true
      version:
        description: 'Version (major, minor, patch, or explicit like 1.2.3)'
        required: true

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - name: Release to Maven Central
        uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@v1.0.0
        with:
          component: ${{ inputs.component }}
          version-type: ${{ inputs.version }}
          publish-target: central
          dry-run: 'false'
          token: ${{ secrets.GITHUB_TOKEN }}
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
          maven-username: ${{ secrets.MAVEN_CENTRAL_USERNAME }}
          maven-password: ${{ secrets.MAVEN_CENTRAL_PASSWORD }}
```

### Example 3: Release with dependency updates

```yaml
- name: Release Parent and Update Children
  uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@v1.0.0
  with:
    component: parent
    version-type: minor
    publish-target: centarl
    dry-run: 'false'
    update-parent-version: 'true'
    token: ${{ secrets.GITHUB_TOKEN }}
    gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
    gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
    maven-username: ${{ secrets.MAVEN_CENTRAL_USERNAME }}
    maven-password: ${{ secrets.MAVEN_CENTRAL_PASSWORD }}
```

---

## Version Bumping Logic

Given current version `2.1.3-SNAPSHOT`:

| `version-type` | Result |
| --- | --- |
| `patch` | `2.1.4` |
| `minor` | `2.2.0` |
| `major` | `3.0.0` |
| `1.2.3` (explicit) | `1.2.3` |

After release, automatically bumped to next SNAPSHOT (e.g., `2.1.4-SNAPSHOT`).

---

## Dependency Management

### Inter-module dependency updates

When releasing a component that is a dependency for other components in the monorepo:

1. Action scans all other `pom.xml` files for references to released component
2. Automatically updates versions in dependent modules
3. Commits changes with message: `chore(dependent-module): update component-name to X.Y.Z`

**Example**: Releasing `my-lib:2.1.0` automatically updates `my-app` if it depends on `my-lib`.

### Parent version updates

When releasing parent with `update-parent-version: 'true'`:

1. Action finds all modules with `<parent>` reference to released parent
2. Updates their parent version to the released version
3. Commits changes in each child module

---

## Git Tags and Releases

Tags are created in format: `<component-name>-<version>`

Examples:
- `my-lib-1.0.0`
- `my-app-2.1.3`
- `parent-1.5.0`
- `bom-3.0.0`

Each tag points to the commit that updated the pom.xml to the release version.

---

## Configuration Requirements

### pom.xml Structure

Each component must have:

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>my-component</artifactId>
  <version>1.0.0</version>  <!-- Must be present and independently versioned -->

  <!-- For non-parent components, inherit from parent -->
  <parent>
    <groupId>com.example</groupId>
    <artifactId>parent</artifactId>
    <version>1.0.0</version>
  </parent>

  <!-- Dependencies are OK and will be auto-updated -->
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
      <id>maven-central</id>
      <username>${env.MAVEN_CENTRAL_USERNAME}</username>
      <password>${env.MAVEN_CENTRAL_PASSWORD}</password>
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

Add to parent `pom.xml`:

```xml
<distributionManagement>
  <repository>
    <id>github</id>
    <name>GitHub Packages</name>
    <url>https://maven.pkg.github.com/YOUR-ORG/YOUR-REPO</url>
  </repository>
</distributionManagement>
```

---

## Secrets Required

### For Maven Central

- `MAVEN_GPG_PRIVATE_KEY`: Armored GPG private key
- `MAVEN_GPG_PASSPHRASE`: GPG key passphrase
- `MAVEN_CENTRAL_USERNAME`: Sonatype JIRA username
- `MAVEN_CENTRAL_PASSWORD`: Sonatype password or token

### For GitHub Packages

- `GITHUB_TOKEN`: Already provided by Actions (needs `packages: write` permission)

---

## Troubleshooting

### "Component directory not found"
Ensure the component folder exists at the monorepo root and matches the input exactly.

### "Component does not have pom.xml"
Verify `<component>/pom.xml` exists and is valid.

### "Failed to determine current version"
Check that `pom.xml` has valid `<version>` element and Maven can parse it.

### Build fails
Run locally to check: `cd <component> && mvn clean package`

### Publishing fails
- **Maven Central**: Verify GPG key is imported, passphrase is correct, credentials are valid
- **GitHub Packages**: Verify `token` has `packages:write` permission and repository URL is correct

### Git tag already exists
Delete remote tag: `git push origin :refs/tags/<tag-name>` and retry

---

## Notes

- **No maven-release-plugin**: This action implements custom version management. Don't use Maven Release Plugin profiles.
- **Atomic commits**: Version bumps and updates are committed separately, allowing rollback if needed.
- **Always use `@v1.0.0` or SHA**: Never use `@main` in production workflows.
- **Dry-run by default**: `dry-run: 'true'` is the default for safety — explicitly set `'false'` to perform real release.
- **Idempotent**: Safe to re-run; if version is already released, action will fail at build step (artifact already deployed).
