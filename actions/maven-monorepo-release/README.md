# Maven Monorepo Release Action

Releases a single Maven component that lives inside a monorepo.
Each component has its own independent semver version and produces its own
Git tag and GitHub Release in the form `<component>-<version>`
(e.g. `payment-service-1.4.0`).

If the component directory contains a `Dockerfile`, the action also builds
and pushes a Docker image to GitHub Container Registry (ghcr.io) tagged with
the same release version.

---

## Features

- Independent per-component semver versioning (`patch` / `minor` / `major`)
- Git tag and GitHub Release named `<component>-<version>`
- Automatic `release:prepare` + `release:perform` via Maven Release Plugin
- Optional Docker image build and push to ghcr.io (auto-detected via Dockerfile)
- Optional post-release dependency bump to next `-SNAPSHOT`
- Dry-run mode: builds current SNAPSHOT without tagging, pushing or releasing

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `component` | yes | — | Component name == subdirectory name under the repo root. Used as the Git tag prefix. |
| `version-type` | no | `patch` | Version bump: `patch`, `minor`, or `major`. |
| `ref` | no | `main` | Branch to create the release from. |
| `token` | yes | — | GitHub token. Needs `contents: write` and `packages: write`. |
| `maven-args` | no | `-DskipTests=true -Dmaven.javadoc.skip=true -B` | Extra Maven arguments appended to every `mvn` call. |
| `server-id` | no | `github` | Maven `settings.xml` server ID for the deploy repository. |
| `java-version` | no | `21` | Java version for `actions/setup-java`. |
| `maven-version` | no | _(runner default)_ | Maven version to install. |
| `profile` | no | — | Maven profile to activate. |
| `maven-user` | no | — | Username for the Maven deploy server. |
| `maven-password` | no | — | Password / token for the Maven deploy server. |
| `gpg-private-key` | no | — | Armoured GPG private key for artifact signing. |
| `gpg-passphrase` | no | — | GPG passphrase. |
| `dockerfile` | no | `Dockerfile` | Path to Dockerfile relative to the component directory. Skipped when the file does not exist. |
| `build-context` | no | `.` | Docker build context relative to the component directory. |
| `docker-platforms` | no | `linux/amd64` | Comma-separated Docker target platforms. |
| `bump-dependencies-after-release` | no | `false` | Re-deploy the new SNAPSHOT and bump `org.qubership` dependency versions. |
| `dry-run` | no | `true` | Build without tagging, releasing or pushing anything. |

---

## Outputs

| Output | Description |
|---|---|
| `release-version` | Maven version released, e.g. `1.4.0`. |
| `release-tag` | Git tag created, e.g. `payment-service-1.4.0`. |
| `docker-image` | Full Docker image reference pushed, e.g. `ghcr.io/myorg/payment-service:1.4.0`. Empty when no Dockerfile or dry-run. |

---

## Permissions

```yaml
permissions:
  contents: write   # create tags and GitHub Releases
  packages: write   # push to ghcr.io
```

---

## How it works

1. Checks out the component subdirectory via `actions/checkout` with `path: <component>`.
2. Reads the current version from `pom.xml` and computes the release and next-dev versions.
3. Runs `mvn release:prepare` with tag format `<component>-@{project.version}`.
4. Runs `mvn release:perform` to deploy the release artifacts.
5. Creates a GitHub Release named `<component>-<version>`.
6. If `<component>/Dockerfile` exists, builds and pushes `ghcr.io/<org>/<component>:<version>` and `:<latest>`.
7. Optionally re-checks out the component and bumps `org.qubership.*` dependencies to next `-SNAPSHOT`.

### Version bumping

| `version-type` | Current pom | Release version | Next dev version |
|---|---|---|---|
| `patch` | `1.4.0-SNAPSHOT` | `1.4.0` | `1.4.1-SNAPSHOT` |
| `minor` | `1.4.0-SNAPSHOT` | `1.5.0` | `1.5.1-SNAPSHOT` |
| `major` | `1.4.0-SNAPSHOT` | `2.0.0` | `2.0.1-SNAPSHOT` |

### Tag and Release naming

The Git tag and GitHub Release both follow the pattern:

```
<component>-<release-version>
```

Examples: `auth-service-2.0.0`, `billing-api-1.3.5`.

---

## Usage

### Minimal — release `payment-service` with a patch bump

```yaml
name: Release payment-service

on:
  workflow_dispatch:
    inputs:
      version-type:
        description: "Version bump"
        required: true
        default: "patch"
        type: choice
        options: [patch, minor, major]

permissions:
  contents: write
  packages: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@v2.2.2
        with:
          component: payment-service
          version-type: ${{ inputs.version-type }}
          token: ${{ secrets.GITHUB_TOKEN }}
          maven-user: ${{ github.actor }}
          maven-password: ${{ secrets.GITHUB_TOKEN }}
          dry-run: "false"
```

### Full — with GPG signing, Docker image, and dependency bump

```yaml
name: Release order-service

on:
  workflow_dispatch:
    inputs:
      version-type:
        required: true
        default: "patch"
        type: choice
        options: [patch, minor, major]

permissions:
  contents: write
  packages: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@v2.2.2
        with:
          component: order-service
          version-type: ${{ inputs.version-type }}
          ref: main
          token: ${{ secrets.GITHUB_TOKEN }}
          maven-user: ${{ github.actor }}
          maven-password: ${{ secrets.GITHUB_TOKEN }}
          gpg-private-key: ${{ secrets.GPG_PRIVATE_KEY }}
          gpg-passphrase: ${{ secrets.GPG_PASSPHRASE }}
          dockerfile: Dockerfile
          build-context: .
          bump-dependencies-after-release: "true"
          dry-run: "false"
```

### Matrix — release multiple components in parallel

```yaml
name: Monorepo release

on:
  workflow_dispatch:
    inputs:
      version-type:
        required: true
        default: "patch"
        type: choice
        options: [patch, minor, major]
      components:
        description: "Comma-separated list of components to release"
        required: true
        default: "auth-service,payment-service,order-service"

permissions:
  contents: write
  packages: write

jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set.outputs.matrix }}
    steps:
      - id: set
        run: |
          components="${{ inputs.components }}"
          json=$(echo "$components" | jq -Rc 'split(",")')
          echo "matrix={\"component\":$json}" >> "$GITHUB_OUTPUT"

  release:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.prepare.outputs.matrix) }}
      fail-fast: false
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/maven-monorepo-release@v2.2.2
        with:
          component: ${{ matrix.component }}
          version-type: ${{ inputs.version-type }}
          token: ${{ secrets.GITHUB_TOKEN }}
          maven-user: ${{ github.actor }}
          maven-password: ${{ secrets.GITHUB_TOKEN }}
          dry-run: "false"
```

---

## Docker image behaviour

The Docker step is **skipped automatically** when `<component>/Dockerfile` does
not exist — no extra configuration is needed for pure-library components.

When a Dockerfile is present the action:

1. Logs in to `ghcr.io` using the provided `token`.
2. Runs `docker build` from `<component>/<build-context>` using `<component>/<dockerfile>`.
3. Pushes two tags: `<version>` and `latest`.

Image name: `ghcr.io/<owner-lowercase>/<component-lowercase>`

---

## Monorepo layout assumptions

```
repo-root/
├── auth-service/
│   ├── pom.xml
│   └── Dockerfile        ← image built + pushed automatically
├── payment-service/
│   ├── pom.xml
│   └── Dockerfile
├── shared-lib/
│   └── pom.xml           ← no Dockerfile → Maven-only release
└── ...
```

Each component must have its own `pom.xml` at its directory root.
Sub-module structures are supported — `mvn release:prepare` is run with
`-DautoVersionSubmodules=true`.

---

## Important notes

- **Dry-run is the default** (`dry-run: "true"`). Set `dry-run: "false"` to
  perform an actual release.
- The action uses `actions/checkout` with `path: <component>`, so the workspace
  contains only that component's files under `$GITHUB_WORKSPACE/<component>`.
- Git operations are performed as `qubership-actions[bot]`.
- The `token` must have `contents: write` permission to create tags and
  releases, and `packages: write` to push to ghcr.io.
