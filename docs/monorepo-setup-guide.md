# Maven Monorepo Setup Guide

Complete guide for setting up and managing a Maven monorepo with independent component versioning,
suitable for use with the `maven-monorepo-release` GitHub Action.

---

## Table of Contents

1. [Monorepo Structure](#monorepo-structure)
2. [POM Configuration](#pom-configuration)
3. [Parent POM Setup](#parent-pom-setup)
4. [BOM (Bill of Materials)](#bom-bill-of-materials)
5. [Component Modules](#component-modules)
6. [Build and Publishing](#build-and-publishing)
7. [Release Workflow](#release-workflow)
8. [Maven Configuration](#maven-configuration)
9. [GitHub Actions Integration](#github-actions-integration)
10. [Best Practices](#best-practices)

---

## Monorepo Structure

Recommended directory layout:

```text
my-monorepo/
├── .github/
│   └── workflows/
│       └── release.yml              # Release workflow
├── parent/
│   ├── pom.xml
│   └── README.md
├── bom/
│   ├── pom.xml
│   └── README.md
├── my-lib-1/
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   └── README.md
├── my-lib-2/
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   └── README.md
├── my-app/
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   └── README.md
├── pom.xml                         # Root aggregator (optional)
└── README.md
```

**Key principles:**
- Each component is a **separate top-level directory** (not nested)
- Each component has its **own `pom.xml`**
- **Independent versioning**: Each component maintains its own version
- Components can depend on other components in the monorepo

---

## POM Configuration

### Basic POM Requirements

All `pom.xml` files must follow these principles:

#### 1. Always declare explicit version

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>my-component</artifactId>
  <version>1.0.0</version>  <!-- ← REQUIRED: explicit version for all components -->
</project>
```

❌ **Wrong** - don't inherit version:

```xml
<!-- This will cause issues with independent versioning -->
<parent>
  <version>${project.parent.version}</version>
</parent>
```

#### 2. Explicitly list packaging

```xml
<packaging>jar</packaging>  <!-- or: pom, war, ear, etc. -->
```

#### 3. Include coordinates in manifest

```xml
<properties>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  <maven.compiler.source>11</maven.compiler.source>
  <maven.compiler.target>11</maven.compiler.target>
</properties>

<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-jar-plugin</artifactId>
      <version>3.3.0</version>
      <configuration>
        <archive>
          <manifest>
            <addBuildProperties>true</addBuildProperties>
            <addClassPath>true</addClassPath>
          </manifest>
          <manifestEntries>
            <Implementation-Title>${project.artifactId}</Implementation-Title>
            <Implementation-Version>${project.version}</Implementation-Version>
          </manifestEntries>
        </archive>
      </configuration>
    </plugin>
  </plugins>
</build>
```

---

## Parent POM Setup

The parent POM (`parent/pom.xml`) defines common settings for all modules.

### Minimal Parent POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>parent</artifactId>
  <version>1.0.0</version>
  <packaging>pom</packaging>

  <name>My Monorepo Parent</name>
  <description>Parent POM for all components</description>
  <url>https://github.com/example/my-monorepo</url>

  <licenses>
    <license>
      <name>Apache License 2.0</name>
      <url>https://www.apache.org/licenses/LICENSE-2.0.txt</url>
    </license>
  </licenses>

  <developers>
    <developer>
      <id>team</id>
      <name>Development Team</name>
      <email>dev@example.com</email>
    </developer>
  </developers>

  <scm>
    <connection>scm:git:https://github.com/example/my-monorepo.git</connection>
    <url>https://github.com/example/my-monorepo</url>
  </scm>

  <!-- Define common properties for all modules -->
  <properties>
    <maven.compiler.source>11</maven.compiler.source>
    <maven.compiler.target>11</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

    <!-- Dependency versions -->
    <junit.version>4.13.2</junit.version>
    <slf4j.version>1.7.36</slf4j.version>
  </properties>

  <!-- Define common dependency versions (not as dependencies, but for reference) -->
  <dependencyManagement>
    <dependencies>
      <!-- Internal components -->
      <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-lib-1</artifactId>
        <version>1.0.0</version>
      </dependency>
      <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-lib-2</artifactId>
        <version>1.0.0</version>
      </dependency>

      <!-- External dependencies -->
      <dependency>
        <groupId>junit</groupId>
        <artifactId>junit</artifactId>
        <version>${junit.version}</version>
        <scope>test</scope>
      </dependency>
      <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-api</artifactId>
        <version>${slf4j.version}</version>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <!-- Common build plugins -->
  <build>
    <pluginManagement>
      <plugins>
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-compiler-plugin</artifactId>
          <version>3.11.0</version>
          <configuration>
            <source>${maven.compiler.source}</source>
            <target>${maven.compiler.target}</target>
          </configuration>
        </plugin>
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-surefire-plugin</artifactId>
          <version>3.0.0</version>
        </plugin>
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-jar-plugin</artifactId>
          <version>3.3.0</version>
        </plugin>
      </plugins>
    </pluginManagement>
  </build>

  <!-- Distribution management (for publishing) -->
  <distributionManagement>
    <repository>
      <id>central</id>
      <url>https://oss.sonatype.org/service/local/staging/deploy/maven2/</url>
    </repository>
    <snapshotRepository>
      <id>central</id>
      <url>https://oss.sonatype.org/content/repositories/snapshots</url>
    </snapshotRepository>
    <repository>
      <id>github</id>
      <name>GitHub Packages</name>
      <url>https://maven.pkg.github.com/example/my-monorepo</url>
    </repository>
  </distributionManagement>
</project>
```

### Key Parent POM Points

✅ **Do this:**
- Define `<dependencyManagement>` with versions
- Define `<pluginManagement>` with plugin configurations
- Use `<properties>` for versions
- Set compiler and encoding in `<properties>`
- Define distribution management URLs

❌ **Don't do this:**
- Add actual `<dependencies>` (only use in `<dependencyManagement>`)
- Don't define `<modules>` (not needed for independent versioning)
- Don't include component code in parent (parent is POM-only)

---

## BOM (Bill of Materials)

A BOM component defines a set of dependency versions for downstream projects.

### BOM POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>bom</artifactId>
  <version>1.0.0</version>
  <packaging>pom</packaging>

  <name>My Monorepo BOM</name>
  <description>Bill of Materials for all components</description>

  <parent>
    <groupId>com.example</groupId>
    <artifactId>parent</artifactId>
    <version>1.0.0</version>
  </parent>

  <dependencyManagement>
    <dependencies>
      <!-- Internal components -->
      <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-lib-1</artifactId>
        <version>1.0.0</version>
      </dependency>
      <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-lib-2</artifactId>
        <version>1.0.0</version>
      </dependency>
      <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-app</artifactId>
        <version>1.0.0</version>
      </dependency>
    </dependencies>
  </dependencyManagement>
</project>
```

### Using the BOM

Downstream projects import the BOM:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.example</groupId>
      <artifactId>bom</artifactId>
      <version>1.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencyManagement>

<dependencies>
  <!-- No version needed, inherited from BOM -->
  <dependency>
    <groupId>com.example</groupId>
    <artifactId>my-lib-1</artifactId>
  </dependency>
</dependencies>
```

---

## Component Modules

Each component is a Maven module with its own `pom.xml`.

### Library Component (my-lib-1)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <!-- Explicit coordinates (not inherited) -->
  <groupId>com.example</groupId>
  <artifactId>my-lib-1</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <name>My Library 1</name>
  <description>A library component</description>

  <!-- Inherit configuration from parent -->
  <parent>
    <groupId>com.example</groupId>
    <artifactId>parent</artifactId>
    <version>1.0.0</version>
  </parent>

  <dependencies>
    <!-- Use version from parent's dependencyManagement -->
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

### Application Component (my-app)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <name>My Application</name>

  <parent>
    <groupId>com.example</groupId>
    <artifactId>parent</artifactId>
    <version>1.0.0</version>
  </parent>

  <!-- Depend on other monorepo components -->
  <dependencies>
    <dependency>
      <groupId>com.example</groupId>
      <artifactId>my-lib-1</artifactId>
      <version>1.0.0</version>  <!-- Must be explicit -->
    </dependency>
    <dependency>
      <groupId>com.example</groupId>
      <artifactId>my-lib-2</artifactId>
      <version>1.0.0</version>
    </dependency>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-assembly-plugin</artifactId>
        <version>3.4.2</version>
        <configuration>
          <archive>
            <manifest>
              <mainClass>com.example.app.Main</mainClass>
            </manifest>
          </archive>
          <descriptorRefs>
            <descriptorRef>jar-with-dependencies</descriptorRef>
          </descriptorRefs>
          <finalName>my-app</finalName>
          <appendAssemblyId>false</appendAssemblyId>
        </configuration>
        <executions>
          <execution>
            <phase>package</phase>
            <goals>
              <goal>single</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

---

## Build and Publishing

### Local Build

Build entire monorepo:

```bash
# Build all components (from each component directory)
cd my-lib-1 && mvn clean package
cd my-lib-2 && mvn clean package
cd my-app && mvn clean package
```

Or build specific component:

```bash
cd my-app && mvn clean package -Pdevelopment
```

### Publishing to Maven Central

Requires:
1. Sonatype JIRA account
2. GPG key (sign artifacts)
3. Proper configuration in `pom.xml` and `settings.xml`

#### Release Profile

Add to parent `pom.xml`:

```xml
<profiles>
  <profile>
    <id>release</id>
    <build>
      <plugins>
        <!-- Sign artifacts -->
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-gpg-plugin</artifactId>
          <version>3.0.1</version>
          <executions>
            <execution>
              <id>sign-artifacts</id>
              <phase>verify</phase>
              <goals>
                <goal>sign</goal>
              </goals>
            </execution>
          </executions>
          <configuration>
            <gpgArguments>
              <arg>--pinentry-mode</arg>
              <arg>loopback</arg>
            </gpgArguments>
          </configuration>
        </plugin>

        <!-- Generate Javadoc -->
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-javadoc-plugin</artifactId>
          <version>3.4.1</version>
          <executions>
            <execution>
              <id>attach-javadocs</id>
              <goals>
                <goal>jar</goal>
              </goals>
            </execution>
          </executions>
        </plugin>

        <!-- Generate sources JAR -->
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-source-plugin</artifactId>
          <version>3.2.1</version>
          <executions>
            <execution>
              <id>attach-sources</id>
              <goals>
                <goal>jar-no-fork</goal>
              </goals>
            </execution>
          </executions>
        </plugin>
      </plugins>
    </build>
  </profile>
</profiles>
```

#### Publish

```bash
cd my-lib-1
mvn clean deploy -Prelease
```

### Publishing to GitHub Packages

Add to parent `pom.xml`:

```xml
<distributionManagement>
  <repository>
    <id>github</id>
    <name>GitHub Packages</name>
    <url>https://maven.pkg.github.com/YOUR-ORG/YOUR-REPO</url>
  </repository>
  <snapshotRepository>
    <id>github</id>
    <name>GitHub Packages</name>
    <url>https://maven.pkg.github.com/YOUR-ORG/YOUR-REPO</url>
  </snapshotRepository>
</distributionManagement>
```

Configure `~/.m2/settings.xml`:

```xml
<settings>
  <servers>
    <server>
      <id>github</id>
      <username>oauth2</username>
      <password>YOUR_GITHUB_TOKEN</password>
    </server>
  </servers>
</settings>
```

Publish:

```bash
cd my-lib-1
mvn clean deploy
```

---

## Release Workflow

### Manual Release Steps (what the GitHub Action automates)

1. **Determine new version**
   ```bash
   # Current: 1.0.0-SNAPSHOT
   # Release: 1.0.1 (patch), 1.1.0 (minor), or 2.0.0 (major)
   ```

2. **Update version in pom.xml**
   ```bash
   cd my-lib-1
   mvn versions:set -DnewVersion=1.0.1 -DgenerateBackupPoms=false
   ```

3. **Build and test**
   ```bash
   mvn clean package
   ```

4. **Deploy**
   ```bash
   mvn deploy -Prelease
   ```

5. **Commit and tag**
   ```bash
   git add my-lib-1/pom.xml
   git commit -m "chore(my-lib-1): release version 1.0.1"
   git tag my-lib-1-1.0.1
   git push origin main
   git push origin my-lib-1-1.0.1
   ```

6. **Update to next SNAPSHOT**
   ```bash
   mvn versions:set -DnewVersion=1.0.2-SNAPSHOT -DgenerateBackupPoms=false
   git add my-lib-1/pom.xml
   git commit -m "chore(my-lib-1): bump to next snapshot version 1.0.2-SNAPSHOT"
   git push origin main
   ```

7. **Update dependencies in other components** (if needed)
   ```bash
   cd my-app
   mvn versions:use-dep-version -Dincludes="com.example:my-lib-1" \
       -DdepVersion="1.0.1" -DgenerateBackupPoms=false
   git add my-app/pom.xml
   git commit -m "chore(my-app): update my-lib-1 to 1.0.1"
   git push origin main
   ```

### Automated Release with GitHub Action

Create `.github/workflows/release.yml`:

```yaml
name: Release Component

on:
  workflow_dispatch:
    inputs:
      component:
        description: 'Component to release'
        required: true
        type: string
      version:
        description: 'Version (major, minor, patch, or explicit like 1.2.3)'
        required: true
        type: string
      publish-target:
        description: 'Publish target'
        required: true
        type: choice
        default: github
        options:
          - github
          - central
          - both

permissions:
  contents: write
  packages: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Release Component
        uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
        with:
          component: ${{ inputs.component }}
          version-type: ${{ inputs.version }}
          publish-target: ${{ inputs.publish-target }}
          dry-run: 'false'
          token: ${{ secrets.GITHUB_TOKEN }}
          gpg-private-key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}
          maven-username: ${{ secrets.MAVEN_CENTRAL_USERNAME }}
          maven-password: ${{ secrets.MAVEN_CENTRAL_PASSWORD }}
          java-version: '21'
          maven-profile: release
```

---

## Maven Configuration

### ~/.m2/settings.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              http://maven.apache.org/xsd/settings-1.0.0.xsd">

  <servers>
    <!-- Maven Central (Sonatype) -->
    <server>
      <id>central</id>
      <username>${env.MAVEN_USERNAME}</username>
      <password>${env.MAVEN_PASSWORD}</password>
    </server>

    <!-- GitHub Packages -->
    <server>
      <id>github</id>
      <username>oauth2</username>
      <password>${env.GITHUB_TOKEN}</password>
    </server>
  </servers>

  <profiles>
    <!-- Release profile for signing and documentation -->
    <profile>
      <id>release</id>
      <activation>
        <activeByDefault>false</activeByDefault>
      </activation>
      <properties>
        <gpg.executable>gpg</gpg.executable>
        <gpg.passphrase>${env.MAVEN_GPG_PASSPHRASE}</gpg.passphrase>
        <gpg.homedir>${env.GPG_HOMEDIR}</gpg.homedir>
      </properties>
    </profile>

    <!-- Development profile (skip tests, javadoc, signing) -->
    <profile>
      <id>development</id>
      <activation>
        <activeByDefault>false</activeByDefault>
      </activation>
      <properties>
        <maven.test.skip>true</maven.test.skip>
        <maven.javadoc.skip>true</maven.javadoc.skip>
      </properties>
    </profile>
  </profiles>

  <activeProfiles>
    <!-- Normally no profiles active -->
  </activeProfiles>
</settings>
```

---

## GitHub Actions Integration

### Required Secrets

Create these secrets in GitHub (Settings → Secrets and variables → Actions):

1. **MAVEN_GPG_PRIVATE_KEY**: Your GPG private key (armored)
   ```bash
   gpg --export-secret-keys --armor YOUR_KEY_ID | xclip -selection clipboard
   ```

2. **MAVEN_GPG_PASSPHRASE**: GPG key passphrase

3. **MAVEN_CENTRAL_USERNAME**: Sonatype JIRA username

4. **MAVEN_CENTRAL_PASSWORD**: Sonatype password/token

### Required Permissions

Workflow needs these permissions:

```yaml
permissions:
  contents: write      # To create tags, commits
  packages: write      # To publish to GitHub Packages
  pull-requests: read  # Optional, for PR comments
```

---

## Best Practices

### Version Management

✅ **Do:**
- Use semantic versioning: MAJOR.MINOR.PATCH (e.g., 1.2.3)
- Keep -SNAPSHOT between releases
- Version each component independently
- Update BOM when releasing parent
- Document version changes

❌ **Don't:**
- Inherit version from parent
- Use custom version formats
- Share versions between independent components
- Use @main for releases (use tags)
- Commit without testing

### Dependency Management

✅ **Do:**
- Use `<dependencyManagement>` in parent for version centralization
- Use explicit versions in `<dependency>` of child modules
- Use parent's BOM for downstream users
- Update dependencies systematically when releasing

❌ **Don't:**
- Use wildcard versions
- Use version ranges (e.g., `[1.0,2.0)`)
- Add circular dependencies
- Create tight coupling between components
- Use LATEST or RELEASE versions

### Git Workflow

✅ **Do:**
- Create semantic tags: `component-name-version` (e.g., `my-lib-1.0.1`)
- Commit changes per component
- Use conventional commits: `chore(component): message`
- Include clear commit messages
- Keep history clean

❌ **Don't:**
- Mix releases from multiple components in one commit
- Create ambiguous tags
- Rebase after release
- Force-push to main

### Documentation

✅ **Do:**
- Keep README.md in each component
- Document dependencies and relationships
- Include build instructions
- Maintain CHANGELOG
- Document API changes

❌ **Don't:**
- Leave code uncommented
- Ignore breaking changes
- Publish without docs
- Use cryptic version numbers

### Testing & Quality

✅ **Do:**
- Run full test suite before release
- Use CI/CD to validate builds
- Test releases in staging first
- Verify dependencies resolve correctly
- Run integration tests

❌ **Don't:**
- Skip tests for releases
- Release untested code
- Ignore deprecation warnings
- Publish directly to Maven Central from CI without validation

---

## Troubleshooting

### Build issues

**Problem**: `Cannot find parent: com.example:parent:1.0.0`
- **Solution**: Ensure parent/pom.xml exists and version matches

**Problem**: `Dependency cycle detected`
- **Solution**: Check for circular dependencies, refactor components

### Publishing issues

**Problem**: `Authentication failed for Maven Central`
- **Solution**: Verify MAVEN_CENTRAL_USERNAME and _PASSWORD are correct

**Problem**: `GPG signature verification failed`
- **Solution**: Check GPG key is imported, passphrase is correct

### Version management issues

**Problem**: `Versions plugin cannot update version`
- **Solution**: Ensure pom.xml has valid `<version>` element

**Problem**: SNAPSHOT version not updating
- **Solution**: Check versions:set plugin is working correctly, verify file permissions
