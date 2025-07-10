# 🚀 npm Publish Workflow

This **npm Publish** GitHub Workflow automates building, testing, and publishing npm packages to a registry.

## Features

- Automates building, testing, and publishing npm packages to a registry.
- Supports both single packages and Lerna monorepos.
- Allows for automatic version management and dependency updates.
- Integrates with GitHub Packages by default.

## 📌 Inputs

| Name                  | Description                              | Required | Default                  |
| --------------------- | ---------------------------------------- | -------- | ------------------------ |
| `version`             | Version to publish                       | Yes      | -                        |
| `scope`               | npm package scope                        | No       | `@netcracker`            |
| `node-version`        | Node.js version to use                   | No       | `22.x`                   |
| `registry-url`        | npm registry URL                         | No       | `https://npm.pkg.github.com` |
| `update-nc-dependency`| Update NetCracker dependencies           | No       | `false`                  |
| `dist-tag`            | npm distribution tag                     | No       | `next`                   |
| `branch_name`         | Branch name to commit changes to         | No       | `main`                   |

## 📌 Secrets

| Name             | Description                              | Required |
| ---------------- | ---------------------------------------- | -------- |
| `GITHUB_TOKEN`   | GitHub token for authentication          | Yes      |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: npm Publish Workflow

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to publish'
        required: true
        type: string

permissions:
  contents: write
  packages: write

jobs:
  call-npm-publish:
    uses: netcracker/qubership-workflow-hub/.github/workflows/npm-publish.yml@main
    with:
      version: ${{ github.event.inputs.version }}
      scope: "@netcracker"
      node-version: "22.x"
      registry-url: "https://npm.pkg.github.com"
      update-nc-dependency: false
      dist-tag: "latest"
      branch_name: "main"
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Prerequisites

### Required Setup

1. **GitHub Repository** with the workflow file in `.github/workflows/npm-publish.yml`
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

4. **Dependencies**
   - Regularly update NetCracker dependencies
   - Use `--legacy-peer-deps` for compatibility

## Related Documentation

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Lerna Documentation](https://lerna.js.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
