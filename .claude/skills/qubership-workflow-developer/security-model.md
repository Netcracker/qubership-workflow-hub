# Security model

Use least privilege and job-level permissions.

## Default permission baseline

For validation/build jobs:

```yaml
permissions:
  contents: read
```

For package/image publishing, elevate only as required by the selected action README.

Common examples:

```yaml
permissions:
  contents: read
  packages: write
```

For tag or release creation:

```yaml
permissions:
  contents: write
```

For OIDC/cloud auth:

```yaml
permissions:
  contents: read
  id-token: write
```

For PR comments/labels:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## Qubership action permissions

For Qubership actions, the action README is authoritative.

Before writing a job `permissions:` block:

1. Read the selected action README through `qubership-actions-guide`.
2. Copy the required permissions.
3. Do not add broader permissions unless necessary.

## Pull request safety

Treat pull requests from forks as untrusted.

Do not expose secrets, deployment credentials, package publish tokens, registry tokens, or release tokens to untrusted PR code.

Avoid `pull_request_target` unless the workflow is intentionally designed for it and does not check out or execute untrusted code unsafely.

## Pinning

Always resolve every action pin to the **latest stable release SHA** at
write time. Do not copy SHAs from this skill, from another skill, from
memory, or unchanged from a forked template — those can be outdated.

For Qubership actions, use `qubership-actions-guide` to look up the
current latest tag, then resolve the SHA via `git ls-remote`. For
third-party actions, use `git ls-remote` or `gh api repos/<org>/<repo>/releases/latest`.

Use full 40-character commit SHA pins with a trailing `# vX.Y.Z` comment
showing the release.

Do not use:

```yaml
@main
```

Do not use short SHAs.

A bare major tag (e.g. `actions/checkout@v4`) is acceptable **only**
when the user explicitly asks for automatic minor-version updates.

## Checkout credentials

`actions/checkout` persists `GITHUB_TOKEN` in the local git config by
default (`persist-credentials: true`). Any later step in the same job
can use that token to push, even if the job's intent is read-only.
This is a frequent source of accidental writes from compromised
build-tool plugins or malicious dependencies.

For read-only jobs (validate, build, test, scan), set
`persist-credentials: false`:

```yaml
- uses: actions/checkout@<sha>  # vX.Y.Z
  with:
    persist-credentials: false
```

Keep the default (`persist-credentials: true`) only when a later step
in the same job genuinely needs the token to perform git operations
(push tags, push commits, create branches). Even then, prefer using a
short-lived GitHub App token (see *GitHub App tokens* above) over the
persisted `GITHUB_TOKEN` for write operations.

This pattern is followed by every Netcracker workflow template's
checkout step — preserve it when forking.

## Secrets

Never put secret values in YAML.

Use:

```yaml
${{ secrets.SECRET_NAME }}
```

Explain to the user where to create required secrets:

```text
GitHub → Repository → Settings → Secrets and variables → Actions
```

For production deployment workflows, prefer **environment-scoped
secrets** over repository-wide secrets. Environment scoping limits
exposure to jobs that opt into the environment and lets you require
manual approval before the secret is materialised:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # secrets only available here
    steps:
      - run: deploy.sh
        env:
          REGISTRY_TOKEN: ${{ secrets.PROD_REGISTRY_TOKEN }}
```

Configure environment-scoped secrets at:

```text
GitHub → Repository → Settings → Environments → <name> → Secrets
```

## GitHub App tokens for protected branches

`GITHUB_TOKEN` cannot push to a branch protected with required reviews
or required status checks. When a release workflow needs to commit
version bumps or tags to a protected default branch (Maven release,
Python release, etc.), authenticate via a GitHub App token instead.

```yaml
- name: Prepare app token
  id: app-token
  uses: actions/create-github-app-token@<sha>  # vX.Y.Z
  with:
    app-id: ${{ vars.GH_BUMP_VERSION_APP_ID }}
    private-key: ${{ secrets.GH_BUMP_VERSION_APP_KEY }}

- name: Checkout
  uses: actions/checkout@<sha>  # vX.Y.Z
  with:
    token: ${{ steps.app-token.outputs.token }}
```

Rules:

- The App must have `Contents: write` and any other permissions the
  release step requires (e.g. `Pull requests: write` for auto-PR).
- Add the App to the branch protection bypass list — otherwise the
  token gets the same restrictions as `GITHUB_TOKEN`.
- Store `app-id` as an org/repo variable (`vars.GH_BUMP_VERSION_APP_ID`)
  and the private key as a secret (`secrets.GH_BUMP_VERSION_APP_KEY`).
- Fall back to `secrets.GITHUB_TOKEN` if the App vars are unset, so
  unprotected repos still work:

  ```yaml
  token: ${{ steps.app-token.outputs.token || secrets.GITHUB_TOKEN }}
  ```

This pattern is used in `maven-release-v2.yaml` and `python-release.yaml`
templates.

## Environments

For production release/deploy operations, prefer GitHub Environments:

```yaml
environment: production
```

Explain required environment approvals if relevant.
