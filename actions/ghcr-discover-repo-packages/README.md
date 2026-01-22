# 🔍 Discover GHCR Packages for Repository

This **GHCR Package Discovery** GitHub Action automatically discovers and lists all **GitHub Container Registry (GHCR)** packages associated with a specific repository. **This action only supports GHCR** and does not work with other container registries like Docker Hub. It provides structured output for automation workflows, package management, and cleanup tasks.

---

## Features

- Automatically discovers all GHCR packages for a repository.
- Supports pagination to handle large numbers of packages (100+ packages).
- Filters packages by repository full name.
- Provides structured JSON output for easy integration.
- Returns boolean flag indicating if packages exist.
- Saves debug artifacts for troubleshooting.
- Works with **organization-owned** packages.

### Action Result

The primary output of this action is a JSON array containing all GHCR packages associated with the specified repository. Each package includes metadata such as name, repository, full name, and GHCR path.

For example, if a repository has published two container images, the output might be:

```json
[
  {
    "name": "my-backend-api",
    "repository": "my-project",
    "full_name": "my-org/my-project",
    "path": "ghcr.io/my-org/my-backend-api"
  },
  {
    "name": "my-frontend",
    "repository": "my-project",
    "full_name": "my-org/my-project",
    "path": "ghcr.io/my-org/my-frontend"
  }
]
```

---

## 📌 Inputs

| Name         | Description                                                                      | Required | Default                              |
|--------------|----------------------------------------------------------------------------------|----------|--------------------------------------|
| `owner`      | The owner of the repository. Defaults to the current repository owner.          | No       | `${{ github.repository_owner }}`     |
| `repository` | The name of the repository. Defaults to the current repository name.            | No       | `${{ github.event.repository.name }}` |

**Environment Variables:**

| Name       | Description                                                                      | Required |
|------------|----------------------------------------------------------------------------------|----------|
| `GH_TOKEN` | GitHub token with `packages: read` permission. Falls back to `github.token` if not provided. | Yes |

---

## 📤 Outputs

| Name           | Description                                                                               | Example |
|----------------|-------------------------------------------------------------------------------------------|---------|
| `packages`     | A JSON array of GHCR packages for the specified repository.                             | `[{"name":"my-app","repository":"my-repo","full_name":"owner/my-repo","path":"ghcr.io/owner/my-app"}]` |
| `has-packages` | Boolean flag indicating if the repository has at least one GHCR package. | `true` |

### Package Object Structure

Each package in the `packages` output array contains:

| Field       | Description                                      | Example                    |
|-------------|--------------------------------------------------|----------------------------|
| `name`      | The name of the container package                | `my-app`                   |
| `repository`| The repository name                              | `my-repo`                  |
| `full_name` | The full repository name (owner/repository)      | `owner/my-repo`            |
| `path`      | The complete GHCR path to pull the image         | `ghcr.io/owner/my-app`     |

---

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Discover GHCR Packages

on:
  workflow_dispatch:

permissions:
  packages: read
  contents: read

jobs:
  discover:
    runs-on: ubuntu-latest
    steps:
      - name: Discover GHCR Packages
        id: discover
        uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@v2.0.8
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Display Packages
        run: |
          echo "Has packages: ${{ steps.discover.outputs.has-packages }}"
          echo "Packages:"
          echo '${{ steps.discover.outputs.packages }}' | jq '.'
```

---

## Advanced Usage Examples

### Discover Packages for Specific Repository

```yaml
- name: Discover Packages for Another Repo
  id: discover
  uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@v2.0.8
  with:
    owner: my-organization
    repository: my-other-repo
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Conditional Logic Based on Package Existence

```yaml
- name: Discover GHCR Packages
  id: discover
  uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@v2.0.8
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Process Packages
  if: steps.discover.outputs.has-packages == 'true'
  run: |
    echo "Repository has GHCR packages, processing..."
    echo '${{ steps.discover.outputs.packages }}' | jq -r '.[] | .path'
```

### Integration with Package Cleanup Workflow

```yaml
name: Cleanup Old GHCR Packages

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

permissions:
  packages: write
  contents: read

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Discover GHCR Packages
        id: discover
        uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@v2.0.8
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: List Package Paths
        if: steps.discover.outputs.has-packages == 'true'
        run: |
          echo "Found packages:"
          echo '${{ steps.discover.outputs.packages }}' | jq -r '.[] | .path'

      - name: Cleanup Logic
        if: steps.discover.outputs.has-packages == 'true'
        run: |
          # Add your cleanup logic here
          # Example: Delete old package versions
          echo "Implementing cleanup for packages..."
```

### Matrix Strategy for Multiple Packages

```yaml
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.discover.outputs.packages }}
      has-packages: ${{ steps.discover.outputs.has-packages }}
    steps:
      - name: Discover Packages
        id: discover
        uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@v2.0.8
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  process:
    needs: discover
    if: needs.discover.outputs.has-packages == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.discover.outputs.packages) }}
    steps:
      - name: Process Package
        run: |
          echo "Processing package: ${{ matrix.package.name }}"
          echo "Path: ${{ matrix.package.path }}"
```

---

## Additional Information

### Dependencies

This action uses standard shell tools (`curl`, `jq`) for API communication and JSON processing. No additional dependencies are required.

### How It Works

1. **API Query**: The action queries the GitHub API endpoint `/orgs/{owner}/packages?package_type=container` to retrieve all container packages in the organization.
2. **Pagination**: Automatically fetches all pages with 100 packages per page until all packages are retrieved.
3. **Filtering**: Filters packages by matching the `repository.full_name` field to ensure only packages belonging to the specified repository are returned.
4. **Output**: Returns filtered packages as a JSON array with structured metadata for each package.

### Pagination Support

The action automatically handles pagination for organizations with many packages:

- Fetches 100 packages per page
- Continues until all pages are retrieved
- Combines results from all pages into a single output

### Debug Artifacts

The action saves two JSON files in the workspace for debugging purposes:

- `ghcr_all_packages.json` - All packages from the API response (unfiltered)
- `ghcr_filtered_packages.json` - Packages filtered for the specific repository

These files can be downloaded from the workflow run artifacts for troubleshooting.

### Authentication

The action requires a GitHub token with package read permissions:

- Uses `GH_TOKEN` environment variable
- Falls back to `github.token` context variable if `GH_TOKEN` is not provided
- Token must have `packages: read` scope for the organization

### Repository Filtering

Packages are filtered by exact match on `repository.full_name`:

- Format: `owner/repository` (e.g., `my-org/my-project`)
- Case-sensitive matching
- Only packages belonging to the specified repository are returned in the output

### Permissions

Ensure your workflow has the required permissions:

```yaml
permissions:
  packages: read
  contents: read
```

---

## Output Examples

### Repository with Multiple Packages

**Input:**

```yaml
with:
  owner: my-org
  repository: my-project
```

**Output (`packages`):**

```json
[
  {
    "name": "my-backend-api",
    "repository": "my-project",
    "full_name": "my-org/my-project",
    "path": "ghcr.io/my-org/my-backend-api"
  },
  {
    "name": "my-frontend",
    "repository": "my-project",
    "full_name": "my-org/my-project",
    "path": "ghcr.io/my-org/my-frontend"
  }
]
```

**Output (`has-packages`):** `true`

### Repository without Packages

**Output (`packages`):**

```json
[]
```

**Output (`has-packages`):** `false`

---

## Troubleshooting

### No Packages Found

If the action returns an empty array:

1. Verify the repository has published packages to GHCR using the `docker-action` or similar workflow.
2. Check that packages are correctly associated with the repository in GitHub's package settings.
3. Ensure the `GH_TOKEN` has `packages: read` permission for the organization.
4. Verify the `owner` and `repository` input values are correct and match the package metadata.

### API Rate Limiting

If you encounter rate limiting issues:

1. Use a Personal Access Token (PAT) with appropriate scopes instead of `GITHUB_TOKEN`.
2. Implement retry logic in your workflow using workflow-level error handling.
3. Consider caching results for frequently run workflows to reduce API calls.

### Permission Errors

If you receive permission errors:

- Ensure your workflow has the required permissions block:

  ```yaml
  permissions:
    packages: read
    contents: read
  ```

- Verify the token being used has access to the organization's packages.
- For private repositories, ensure the token has access to the repository.

### Organization vs Personal Repositories

This action is designed for organization-owned packages:

- Works with the `/orgs/{owner}/packages` API endpoint
- For personal repositories (user-owned), package discovery may behave differently
- Ensure packages are published under organization ownership for best results

### Non-Array API Response

If the action encounters a non-array response from the GitHub API:

1. Check the action logs for the raw API response
2. Verify your `GH_TOKEN` is valid and not expired
3. Ensure the API endpoint is accessible (no network restrictions)
4. Check if the organization exists and the token has access to it

---

## Use Cases

- **Package Inventory**: Audit and track all GHCR packages associated with a repository for compliance and documentation purposes.
- **Automated Cleanup**: Identify packages for version cleanup workflows to remove old or unused container images.
- **Pre-deletion Validation**: Check for existing packages before repository deletion to prevent data loss.
- **Monitoring**: Track package creation and monitor GHCR usage across repositories.
- **Multi-package Workflows**: Process multiple packages in matrix strategies for parallel operations.
- **Documentation Generation**: Automatically generate package documentation and inventory reports.
- **CI/CD Integration**: Verify package existence before deployment or integration steps.

---

## Notes

- The action queries organization packages using the `/orgs/{owner}/packages` endpoint, not user packages.
- Pagination ensures all packages are discovered, regardless of total count.
- Output is stable and can be safely cached between workflow runs for performance optimization.
- Compatible with both public and private repositories, subject to token permissions.
- The action does not modify any packages; it only performs read operations.
