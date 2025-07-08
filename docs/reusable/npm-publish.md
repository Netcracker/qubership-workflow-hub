# NPM Publish Workflow

## Overview

The **Reusable NPM Publish** workflow is a GitHub Actions workflow designed to automate the process of building, testing, and publishing NPM packages. It supports both single packages and Lerna monorepos, with automatic version management and dependency updates.

## Features

- ✅ **Automatic version management** for both NPM and Lerna projects
- ✅ **Dependency updates** for NetCracker packages
- ✅ **Build automation** with support for `prepublishOnly` and `build` scripts
- ✅ **Testing integration** with automatic test execution
- ✅ **GitHub Packages integration** with configurable registry
- ✅ **Lerna monorepo support** with automatic detection
- ✅ **Customizable NPM scope** and distribution tags
- ✅ **Automatic commit and push** of version changes

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

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `version` | string | ✅ Yes | - | The version to publish (e.g., "1.0.0", "2.1.0-beta.1") |
| `scope` | string | ❌ No | "@netcracker" | NPM package scope for organization |
| `node-version` | string | ❌ No | "22.x" | Node.js version to use |
| `registry-url` | string | ❌ No | "https://npm.pkg.github.com" | NPM registry URL |
| `update-nc-dependency` | boolean | ❌ No | false | Update NetCracker dependencies |
| `dist-tag` | string | ❌ No | "next" | NPM distribution tag |
| `branch_name` | string | ❌ No | "main" | Target branch for commits |

## Usage

### Manual Trigger

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select **Reusable NPM Publish** workflow
4. Click **Run workflow**
5. Fill in the required parameters:
   - **Version**: Enter the version you want to publish
   - **Scope**: Leave as "@netcracker" or change as needed
   - **Node version**: Use default "22.x" or specify another version
   - **Registry URL**: Use default for GitHub Packages or specify custom registry
   - **Update NC dependency**: Check if you want to update NetCracker dependencies
   - **Dist tag**: Use "next" for pre-releases or "latest" for stable releases
   - **Branch name**: Specify target branch (default: "main")

### Example Usage

#### Publishing a Stable Release
```
Version: 1.2.0
Scope: @netcracker
Dist tag: latest
Update NC dependency: false
```

#### Publishing a Beta Release
```
Version: 1.2.0-beta.1
Scope: @netcracker
Dist tag: next
Update NC dependency: true
```

## Workflow Steps

### 1. Repository Checkout
- Checks out the specified branch
- Displays the current branch name

### 2. Node.js Setup
- Installs the specified Node.js version
- Configures NPM registry and scope
- Sets up authentication using `GITHUB_TOKEN`

### 3. Dependency Installation
- Installs project dependencies using `npm ci --legacy-peer-deps`
- Ensures consistent dependency resolution

### 4. Lerna Detection
- Automatically detects if the project is a Lerna monorepo
- Sets environment variable `IS_LERNA` accordingly

### 5. Dependency Updates (Optional)
- Updates NetCracker dependencies if `update-nc-dependency` is true
- Uses `jq` to parse and update `@netcracker` scoped packages

### 6. Version Management
- **For Lerna projects**: Updates version in `lerna.json` and all `package.json` files
- **For NPM projects**: Updates version in root `package.json`
- Creates a `changes.txt` file with version differences

### 7. Build Process
- Runs `prepublishOnly` script if available
- Falls back to `build` script if `prepublishOnly` doesn't exist
- Skips build step if neither script is found

### 8. Testing
- Runs `npm test` if the script exists in `package.json`
- Continues workflow regardless of test results

### 9. Commit and Push
- Uses the custom `commit-and-push` action
- Commits version changes to the specified branch
- Pushes changes to the repository

### 10. Package Publishing
- **For Lerna projects**: Uses `lerna publish from-package`
- **For NPM projects**: Uses `npm publish`
- Publishes with the specified distribution tag

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

### Debug Information

The workflow provides detailed logging for each step:
- Version changes are saved to `changes.txt`
- Registry configuration is displayed before publishing
- Branch information is shown at the start

## Security Considerations

- Uses `GITHUB_TOKEN` for authentication (automatically provided)
- Requires explicit `packages:write` permission
- Supports custom registries with proper authentication
- Validates package versions before publishing

## Best Practices

1. **Version Management**
   - Use semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0)
   - Use pre-release tags for beta/alpha versions (e.g., 1.0.0-beta.1)

2. **Distribution Tags**
   - Use `latest` for stable releases
   - Use `next` for pre-releases
   - Use custom tags for specific channels

3. **Testing**
   - Always include test scripts in `package.json`
   - Ensure tests pass before publishing

4. **Dependencies**
   - Regularly update NetCracker dependencies
   - Use `--legacy-peer-deps` for compatibility

## Related Documentation

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Lerna Documentation](https://lerna.js.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions) 