# 🚀 npm Publish Workflow

This **npm Publish** GitHub Workflow automates building, testing, and publishing npm packages to a registry.

## Features

- Automates building, testing, and publishing npm packages to a registry.
- Supports both single packages and Lerna monorepos.
- Allows for automatic version management and dependency updates.
- Integrates with GitHub Packages by default.
- **Dry-run mode** for testing workflow without actual publishing.

## 📌 Inputs

| Name                  | Description                              | Required | Default                  |
| --------------------- | ---------------------------------------- | -------- | ------------------------ |
| `version`             | Version to publish                       | Yes      | -                        |
| `scope`               | npm package scope                        | No       | `@netcracker`            |
| `node-version`        | Node.js version to use                   | No       | `22.x`                   |
| `registry-url`        | npm registry URL                         | No       | `https://npm.pkg.github.com` |
| `update-nc-dependency`| Update NetCracker dependencies           | No       | `false`                  |
| `dry-run`             | Run in dry-run mode (no actual publishing)| No       | `false`                  |
| `dist-tag`            | npm distribution tag                     | No       | `next`                   |
| `branch_name`         | Branch name to commit changes to         | No       | `main`                   |

## 📌 Secrets

| Name             | Description                              | Required |
| ---------------- | ---------------------------------------- | -------- |
| `GITHUB_TOKEN`   | GitHub token for authentication          | Yes      |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Release NPM package

on:
  push:
    branches:
      - '**'
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version for NPM (e.g., 1.0.0)'
        required: false
        type: string
      scope:
        description: 'NPM scope for the package'
        required: false
        type: string
        default: '@netcracker'
      node-version:
        required: false
        type: string
        default: "22.x"
      registry-url:
        required: false
        type: string
        default: "https://npm.pkg.github.com"
      update-nc-dependency:
        required: false
        type: boolean
        default: false  
      dry-run:
        description: 'Run in dry-run mode (no actual publishing)'
        required: false
        type: boolean
        default: false
      npm-dist-tag:
        description: 'NPM distribution tag'
        required: false
        type: string
        default: 'latest'
      branch_name:
        required: false
        type: string
        default: "main"  

permissions:
  contents: write
  packages: write

jobs:
  npm-publish:
    uses: netcracker/qubership-workflow-hub/.github/workflows/re-npm-publish.yml@v2.0.10
    with:
      version: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.version || '' }}
      scope: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.scope || '@netcracker' }}
      node-version: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.node-version || '22.x' }}
      registry-url: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.registry-url || 'https://npm.pkg.github.com' }}
      update-nc-dependency: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.update-nc-dependency || false }}
      dry-run: ${{ github.event_name == 'push' || 
        (github.event_name == 'workflow_dispatch' && inputs.dry-run) }}
      dist-tag: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.npm-dist-tag || 'latest' }}
      branch_name: ${{ github.event_name == 'workflow_dispatch' && 
        inputs.branch_name || github.ref_name }}
    secrets: inherit
```

## Prerequisites

### Required Setup

1. **GitHub Repository** with the workflow file in `.github/workflows/re-npm-publish.yml`
2. **Package.json** file with proper configuration
3. **GitHub Token** (automatically provided via `GITHUB_TOKEN` secret)
4. **Write permissions** for contents and packages

### Optional Setup

- **Lerna configuration** (`lerna.json`) for monorepo projects
- **Build scripts** (`prepublishOnly` or `build`) in package.json
- **Test scripts** (`test`) in package.json

## Configuration Examples

### Single Package (package.json)

```json
{
  "name": "@netcracker/my-package",
  "version": "1.0.0",
  "scripts": {
    "build": "webpack --mode production",
    "test": "jest",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

### Lerna Monorepo (lerna.json)

```json
{
  "version": "1.0.0",
  "packages": ["packages/*"],
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `GITHUB_TOKEN` has `packages:write` permission
   - Check if the repository has access to GitHub Packages

2. **Version Conflicts**
   - Verify the version doesn't already exist in the registry
   - Check for proper semantic versioning format

3. **Build Failures**
   - Ensure all dependencies are properly installed
   - Check if build scripts exist and are executable

4. **Lerna Issues**
   - Verify `lerna.json` configuration is correct
   - Check if all packages in monorepo have valid `package.json` files

### Dry-Run Mode

The workflow includes a **dry-run mode** that allows you to test the entire publishing process without actually publishing to the registry. This is useful for:

- Testing workflow configuration
- Verifying version updates
- Checking build and test processes
- Validating Lerna configuration (for monorepos)

To use dry-run mode, set `dry-run: true` when calling the workflow. In this mode:

- All steps except actual publishing are executed
- Version updates are applied locally
- Build and test processes run normally
- A clear message indicates that publishing was skipped

## Best Practices

1. **Version Management**
   - Use semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0)
   - Use prerelease tags for beta/alpha versions (e.g., 1.0.0-beta.1)

2. **Distribution Tags**
   - Use `latest` for stable releases
   - Use `next` for prereleases
   - Use custom tags for specific channels

3. **Testing**
   - Always include test scripts in `package.json`
   - Ensure tests pass before publishing
   - **Use dry-run mode** to test workflow before actual publishing

4. **Dependencies**
   - Regularly update NetCracker dependencies
   - Use `--legacy-peer-deps` for compatibility

## Related Documentation

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Lerna Documentation](https://lerna.js.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
