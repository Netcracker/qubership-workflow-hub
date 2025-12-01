# 🔍 Discover GHCR Packages for Repository

This **GHCR Package Discovery** GitHub Action automatically discovers and lists all GitHub Container Registry (GHCR) packages associated with a specific repository. It provides structured output for automation workflows, package management, and cleanup tasks.

---

## Features

- Automatically discovers all GHCR packages for a repository
- Supports pagination to handle large numbers of packages (100+ packages)
- Filters packages by repository full name
- Provides structured JSON output for easy integration
- Returns boolean flag indicating if packages exist
- Saves debug artifacts for troubleshooting
- Works with organization-owned packages

---

## 📌 Inputs

| Name         | Description                                                                      | Required | Default                              |
|--------------|----------------------------------------------------------------------------------|----------|--------------------------------------|
| `owner`      | The owner of the repository. Defaults to the current repository owner.          | No       | `${{ github.repository_owner }}`     |
| `repository` | The name of the repository. Defaults to the current repository name.            | No       | `${{ github.event.repository.name }}` |

---

## 📤 Outputs

| Name           | Description                                                                               |
|----------------|-------------------------------------------------------------------------------------------|
| `packages`     | A JSON array of GHCR packages for the specified repository.                             |
| `has-packages` | Boolean flag indicating if the repository has at least one GHCR package (`true`/`false`) |

### Package Object Structure

Each package in the `packages` output array contains:

```json
{
  "name": "my-app",
  "repository": "my-repo",
  "full_name": "owner/my-repo",
  "path": "ghcr.io/owner/my-app"
}
```

---

## Permissions

- **Required permissions**:
  - `packages: read` - To read package information
  - `contents: read` - For repository access

---

## Usage Examples

### Basic Usage - Discover Packages for Current Repository

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
        uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@main
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Display Packages
        run: |
          echo "Has packages: ${{ steps.discover.outputs.has-packages }}"
          echo "Packages:"
          echo '${{ steps.discover.outputs.packages }}' | jq '.'
```

### Discover Packages for Specific Repository

```yaml
- name: Discover Packages for Another Repo
  id: discover
  uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@main
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
  uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@main
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
        uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@main
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
        uses: netcracker/qubership-workflow-hub/actions/ghcr-discover-repo-packages@main
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

### How It Works

1. **API Query**: The action queries the GitHub API for all container packages in the organization
2. **Pagination**: Automatically fetches all pages (100 packages per page)
3. **Filtering**: Filters packages by matching the repository's full name
4. **Output**: Returns filtered packages as JSON array with structured data

### Pagination Support

The action automatically handles pagination for organizations with many packages:
- Fetches 100 packages per page
- Continues until all pages are retrieved
- Combines results from all pages

### Debug Artifacts

The action saves two JSON files for debugging:
- `ghcr_all_packages.json` - All packages from the API (unfiltered)
- `ghcr_filtered_packages.json` - Packages filtered for the specific repository

### Authentication

The action requires a GitHub token with package read permissions:
- Uses `GH_TOKEN` environment variable
- Falls back to `github.token` if not provided
- Token must have `packages: read` scope

### Repository Filtering

Packages are filtered by exact match on `repository.full_name`:
- Format: `owner/repository`
- Case-sensitive matching
- Only packages belonging to the specified repository are returned

---

## Output Examples

### Repository with Packages

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

**has-packages**: `true`

### Repository without Packages

```json
[]
```

**has-packages**: `false`

---

## Troubleshooting

### No Packages Found

If the action returns an empty array:
1. Verify the repository has published packages to GHCR
2. Check that packages are associated with the correct repository
3. Ensure the token has `packages: read` permission
4. Verify the owner and repository names are correct

### API Rate Limiting

If you encounter rate limiting issues:
1. Use a personal access token (PAT) with appropriate scopes
2. Implement retry logic in your workflow
3. Consider caching results for frequently run workflows

### Permission Errors

Ensure your workflow has the required permissions:

```yaml
permissions:
  packages: read
  contents: read
```

### Organization vs Personal Repositories

This action is designed for organization-owned packages:
- Works with `/orgs/{owner}/packages` API endpoint
- For personal repositories, the package ownership may differ

---

## Use Cases

- **Package Inventory**: Audit and track all GHCR packages for a repository
- **Automated Cleanup**: Identify packages for version cleanup workflows
- **Pre-deletion Validation**: Check for packages before repository deletion
- **Monitoring**: Track package creation and monitor GHCR usage
- **Multi-package Workflows**: Process multiple packages in matrix strategies
- **Documentation**: Generate package documentation automatically

---

## Related Actions

- **docker-action** - Build and publish Docker images to GHCR
- **action-logger** - Logging utilities used by this action

---

## Notes

- The action queries organization packages, not user packages
- Pagination ensures all packages are discovered, regardless of count
- Output is stable and can be safely cached between workflow runs
- Compatible with both public and private repositories
