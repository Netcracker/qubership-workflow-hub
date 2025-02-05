# Publish to Maven Central GitHub Action

## Purpose

Automates building, signing, and deploying artifacts to Maven Central.

## Inputs

| Name           | Type   | Required | Default               | Description              |
|---------------|--------|----------|-----------------------|--------------------------|
| maven_command | string | false    | --batch-mode deploy  | Maven command to run.   |
| java_version  | string | false    | 21                    | Java version.           |
| server_id     | string | false    | central               | Deployment server ID.   |
| version       | string | true     |                        | Version tag.            |
| branch        | string | false    | main                  | Branch/tag to build.    |

## Secrets

| Name                  | Required | Description                |
|----------------------|----------|----------------------------|
| maven_username      | true     | Maven repository username. |
| maven_password      | true     | Maven repository password. |
| maven_gpg_private_key | true     | GPG key for signing.      |
| maven_gpg_passphrase | true     | GPG key passphrase.       |

## Workflow Steps

1. **Checkout Code** – Retrieves the repository at the specified branch.
2. **Cache Dependencies** – Speeds up builds by caching Maven dependencies.
3. **Set up JDK** – Installs the specified Java version and configures Maven settings.
4. **Deploy to Maven Central** – Signs and publishes artifacts using Maven.
5. **Upload Artifact** – Stores the built artifact under the name **`built-artifact`**.

## Using the Built Artifact in Other Jobs

The workflow uploads the built artifact with the name **`built-artifact`**, making it accessible for subsequent jobs.

### Downloading the Built Artifact

To use the built artifact in another job, download it as follows:

```yaml
- name: Download artifact
  uses: actions/download-artifact@v4
  with:
    name: built-artifact
    path: target/
```

# Example Usage

Below is an example of how to use this workflow in a GitHub Actions pipeline.

```yaml
name: Publish Release

on:
  push:
    branches:
      - main

jobs:
  publish:
    uses: your-org/your-repo/.github/workflows/maven-publish.yml
    with:
      maven_command: "clean deploy"
      java_version: "17"
      server_id: "my-repo"
      version: "1.0.0"
      branch: "main"
    secrets:
      maven_username: ${{ secrets.MAVEN_USERNAME }}
      maven_password: ${{ secrets.MAVEN_PASSWORD }}
      maven_gpg_private_key: ${{ secrets.MAVEN_GPG_PRIVATE_KEY }}
      maven_gpg_passphrase: ${{ secrets.MAVEN_GPG_PASSPHRASE }}

  build-docker:
    needs: publish
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: built-artifact
          path: target/

      - name: Build Docker image
        run: |
          docker build -t my-app:latest .
          docker run --rm my-app:latest
```