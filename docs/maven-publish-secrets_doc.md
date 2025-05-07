# Preparing Java project for Maven Central

## Preparing GPG Key to Sign Java Artifacts

To publish Java artifacts to Maven Central, you need to sign them with a GPG key. Follow these steps to prepare your GPG key:

### Step 1: Install GPG

Ensure you have GPG installed on your system. You can download and install it from [GnuPG's official site](https://gnupg.org/download/).

### Step 2: Generate a New GPG Key

Open your terminal and run the following command to generate a new GPG key:

```sh
gpg --full-generate-key
```

Follow the prompts to configure your key. Choose the following options:

- Key type: RSA and RSA
- Key size: 4096 bits
- Expiration: Choose an appropriate expiration date
- Real name: Your name
- Email address: Your email address
- Comment: Optional

### Step 3: List Your GPG Keys

To list your GPG keys and find the key ID, run:

```sh
gpg --list-keys
```

Note the key ID (a 16-character hexadecimal string).

### Step 4: Publish Your GPG Key

To publish your GPG key to a key server, run:

```sh
gpg --keyserver keyserver.ubuntu.com --send-keys <your-key-id>
```

Replace `<your-key-id>` with your actual key ID.

### Step 5: Verify Your Key on the Keyserver

To verify that your key has been uploaded successfully, you can search for it on the keyserver:

```bash
gpg --keyserver keyserver.ubuntu.com --search-keys <your-email>
```

### Step 6: Configure Maven to Use Your GPG Key

Add the following configuration to your `pom.xml` file to sign your artifacts:

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-gpg-plugin</artifactId>
      <version>1.6</version>
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
  </plugins>
</build>
```

### Step 7: Provide GPG Passphrase

When running Maven commands, you will be prompted to enter your GPG passphrase. You can also configure Maven to use the passphrase automatically by adding it to your `settings.xml` file (not recommended for security reasons). In case of using GitHub workflow the `settings.xml` will be created automatically and store the secrets secure way.

With these steps, your Java artifacts will be signed with your GPG key.

## Configure a GitHub repository to publish artifacts to Maven Central

To configure a GitHub repository to publish artifacts to Maven Central, you need to set up GitHub Actions workflows and add specific secrets to your repository. Here are the steps:

### Step 1: Set Up GitHub Actions Workflow

Create a GitHub Actions workflow file in your repository. For example, create a file named .github/workflows/release.yml with the following content:

```yaml
---
name: Release

on:
  workflow_dispatch:
    inputs:
      revision:
        required: false
        type: string
      release_info:
        required: false
        type: string
      java_version:
        required: false
        type: string
        default: "21"

jobs:
  pom:
    uses: netcracker/qubership-workflow-hub/.github/workflows/update-pom-release.yml@v1.0.1
    with:
      file: pom.xml
      revision: ${{ github.event.inputs.revision }}

  git_release:
    uses: netcracker/qubership-workflow-hub/.github/workflows/create-github-release.yml@v1.0.1
    needs: pom
    with:
      revision: ${{ github.event.inputs.revision }}
      release_info: ${{ github.event.inputs.release_info }}
      draft: false
      prerelease: false

  maven:
    uses: netcracker/qubership-workflow-hub/.github/workflows/maven-publish.yml@v1.0.1
    needs: git_release
    with:
      maven_command: "--batch-mode deploy"
      java_version: "21"
      revision: ${{ github.event.inputs.revision }}
    secrets:
      maven_username: ${{ secrets.MAVEN_USER }}
      maven_password: ${{ secrets.MAVEN_PASSWORD }}
      maven_gpg_passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE  }}
      maven_gpg_private_key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY  }}
```

### Step 2: Add Secrets to Your GitHub Repository

Go to your repository settings and add the following secrets:

`MAVEN_GPG_PRIVATE_KEY`: Your GPG private key, exported as an ASCII-armored string.  
`MAVEN_GPG_PASSPHRASE`: The passphrase for your GPG key.  
`MAVEN_USER`: Your Maven Central username.  
`MAVEN_PASSWORD`: Your Maven Central token.

Exporting GPG Private Key
To export your GPG private key, run the following command and copy the output:

```bash
gpg --armor --export-secret-keys <your-key-id>
```

Add the exported key as the value of the `MAVEN_GPG_PRIVATE_KEY` secret.

With these steps, your GitHub Actions workflow will build your project and deploy the artifacts to Maven Central.
