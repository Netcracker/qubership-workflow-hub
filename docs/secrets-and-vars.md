# 🔐 Organization Secrets & Variables

Organization-level secrets and variables referenced across actions and reusable workflows.

| Name | Purpose |
|------|---------|
| `secrets.GITHUB_TOKEN` | Ephemeral GitHub-provided token (scoped to repo). Used for checkout, pushing commits/tags, creating releases. |
| `secrets.CLA_ACCESS_TOKEN` | Token for CLA workflow to read/write contributor license agreement storage. |
| `secrets.MAVEN_USER` | Username for authenticating to Maven Central when publishing release artifacts. |
| `secrets.MAVEN_PASSWORD` | Password / token paired with `MAVEN_USER` for Maven Central publishing. |
| `secrets.MAVEN_GPG_PRIVATE_KEY` | ASCII‑armored GPG private key used to sign Maven artifacts (JAR, POM, etc.). |
| `secrets.MAVEN_GPG_PASSPHRASE` | Passphrase unlocking the GPG private key. |
| `secrets.PYPI_API_TOKEN` | API token for publishing Python packages to PyPI. |
| `secrets.GH_ACCESS_TOKEN` | PAT for a technical (service) user with extended repo / package permissions beyond `GITHUB_TOKEN`. |
| `secrets.WORKFLOWS_TOKEN` | Classic PAT including `workflow` scope (needed to trigger/modify workflows or dispatch across repos). |
| `secrets.SONAR_TOKEN` | Token to authenticate with SonarQube / SonarCloud for code quality analysis. |
| `secrets.GH_RWD_PACKAGE_TOKEN` | PAT with read / write / delete permissions for GitHub Packages (publishing & cleanup). |

## Usage Guidelines
- Prefer `GITHUB_TOKEN` when sufficient; use PATs only if extra scopes (workflow dispatch, cross-repo access, delete package) are required.
- Do not echo secret values; avoid `set -x` around sensitive commands.
- Rotate external registry tokens, PATs, and GPG keys periodically (recommended quarterly).
- Keep CI GPG key separate from personal keys.
- Validate new or rotated credentials with a dry-run capable workflow before full release tasks.

## Rotation Checklist
1. Generate / rotate credential.
2. Update at organization (or repository) Secrets.
3. Invalidate/ revoke old credential where applicable.
4. Run a dry-run workflow (if supported) to confirm.
5. Remove any temporary debugging output.

## Related Docs
- Standards & Change Policy: [standards-and-change-policy.md](standards-and-change-policy.md)
- Actions & Workflows Catalog: [actions-workflows-catalog.md](actions-workflows-catalog.md)
- Reusable Workflows: [reusable/](reusable/)