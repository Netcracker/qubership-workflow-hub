# 🐳 Docker Configuration Resolver

This **Docker Configuration Resolver** GitHub Action loads, validates, and normalizes Docker component configurations for CI/CD workflows. It reads a configuration file, applies defaults and security settings, and outputs a flat JSON structure ready for use in matrix build strategies.

---

## Features

- Validates and merges Docker component configurations (JSON/YAML support)
- Applies global defaults and security settings to all components
- Auto-generates fully-qualified image paths: `{registry}/{owner}/{component-name}`
- Outputs structured JSON for matrix strategies
- Supports per-component overrides for security and build settings

### Action Result

The primary output of this action is a normalized JSON array containing all Docker components with resolved configurations. Each component includes the auto-generated image path, registry, merged build settings, and security flags.

For example, if your configuration file defines two components, the output might be:

```json
[
  {
    "name": "backend-api",
    "image": "ghcr.io/my-org/backend-api",
    "registry": "ghcr.io",
    "dockerfile": "Dockerfile",
    "context": ".",
    "tags": "latest",
    "platforms": "linux/amd64, linux/arm64",
    "security_scan": true,
    "security_only_high_critical": true,
    "security_trivy_scan": true,
    "security_grype_scan": true,
    "security_only_fixed": true,
    "security_continue_on_error": true,
    "security_tag": "latest"
  },
  {
    "name": "frontend-app",
    "image": "ghcr.io/my-org/frontend-app",
    "registry": "ghcr.io",
    "dockerfile": "Dockerfile",
    "context": ".",
    "tags": "1.0.0",
    "platforms": "linux/amd64, linux/arm64",
    "security_scan": false,
    "security_only_high_critical": true,
    "security_trivy_scan": true,
    "security_grype_scan": true,
    "security_only_fixed": true,
    "security_continue_on_error": true,
    "security_tag": "latest"
  }
]
```

---

## 📌 Inputs

| Name        | Description                                          | Required | Default                 |
|-------------|------------------------------------------------------|----------|-------------------------|
| `file-path` | Path to the Docker components configuration file.    | No       | `.qubership/docker.cfg` |

---

## 📤 Outputs

| Name     | Description                                                                         | Example                                                             |
|----------|-------------------------------------------------------------------------------------| --------------------------------------------------------------------|
| `config` | Resolved Docker components configuration in JSON format with all defaults applied. | `[{"name":"api","image":"ghcr.io/owner/api","registry":"ghcr.io"}]` |

### Configuration Object Structure

Each component in the `config` output array contains:

| Field        | Description                                              | Example                          |
|--------------|----------------------------------------------------------|----------------------------------|
| `name`       | Component name (user-defined, required)                  | `backend-api`                    |
| `image`      | Auto-generated image path (cannot be overridden)         | `ghcr.io/my-org/backend-api`     |
| `registry`   | Container registry URL                                   | `ghcr.io`                        |
| `dockerfile` | Path to Dockerfile (from defaults or component)          | `Dockerfile`                     |
| `context`    | Build context path (from defaults or component)          | `.`                              |
| `tags`       | Image tags (from defaults or component)                  | `latest` or `1.0.0`              |
| `platforms`  | Target platforms (from defaults or component)            | `linux/amd64, linux/arm64`       |
| `security_*` | Security settings (prefixed with `security_`)            | `security_scan: true`            |
| Other fields | Any additional custom fields from configuration          | Custom build args, etc.          |

---

## Configuration File Format

The action expects a JSON or YAML configuration file with the following structure:

```json
{
  "registry": "ghcr.io",
  "security": {
    "scan": true,
    "only_high_critical": true,
    "trivy_scan": true,
    "grype_scan": true,
    "only_fixed": true,
    "continue_on_error": true,
    "tag": "latest"
  },
  "defaults": {
    "dockerfile": "Dockerfile",
    "context": ".",
    "tags": "latest",
    "platforms": "linux/amd64, linux/arm64"
  },
  "components": [
    {
      "name": "backend-api"
    },
    {
      "name": "frontend-app",
      "tags": "1.0.0",
      "security": {
        "scan": false
      }
    }
  ]
}
```

Or in YAML format:

```yaml
registry: "ghcr.io"

security:
  scan: true
  only_high_critical: true
  trivy_scan: true
  grype_scan: true
  only_fixed: true
  continue_on_error: true
  tag: "latest"

defaults:
  dockerfile: "Dockerfile"
  context: "."
  tags: "latest"
  platforms: "linux/amd64, linux/arm64"

components:
  - name: "backend-api"
  - name: "frontend-app"
    tags: "1.0.0"
    security:
      scan: false
```

### Configuration Fields

**Top-level fields:**

- `registry` (optional): Base registry URL (e.g., `ghcr.io`). If omitted, images will use format `owner/component-name`.
- `defaults` (optional): Default values applied to all components.
- `security` (optional): Global security settings applied to all components.
- `components` (required): Array of component configurations.

**Component fields:**

- `name` (required): Unique name for the component. Used to auto-generate the `image` path.
Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Build Docker Images

on:
  push:
    branches: [main]

jobs:
  resolve:
    runs-on: ubuntu-latest
    outputs:
      config: ${{ steps.resolver.outputs.config }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Resolve Docker Configuration
        id: resolver
        uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@main

  build:
    needs: resolve
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: ${{ fromJson(needs.resolve.outputs.config) }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.component.context }}
          file: ${{ matrix.component.dockerfile }}
   Troubleshooting

### Configuration File Not Found

If the action fails with "Config file not found":

1. Verify the file exists at the specified path (default: `.qubership/docker.cfg`).
2. Ensure the repository is checked out before running this action (`actions/checkout@v4`).
3. Check the file path for typos or incorrect directory structure.
4. Use a relative path from the repository root.

### Component Name Validation Error

If you receive "component.name is required":

1. Ensure every component in the `components` array has a `name` field.
2. Verify that `name` values are not empty strings or null.
3. Check for YAML/JSON formatting errors in the configuration file.

### Invalid JSON Output

If the output cannot be parsed:

1. Check the action logs for the "Resolved configuration (pretty)" output.
2. Verify your configuration file syntax is valid JSON or YAML.
3. Ensure there are no special characters in component names that could break JSON formatting.

### Matrix Strategy Not Working

If the matrix strategy doesn't expand correctly:

1. Verify you're using `${{ fromJson(...) }}` to parse the config output.
2. Check that the config output is a valid JSON array.
3. Ensure the job dependency is correctly set with `needs:`.

---
      - name: Resolve Configuration
        id: resolver
        uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@main

  scan:
    needs: resolve
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: ${{ fromJson(needs.resolve.outputs.config) }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Security Scan with Trivy
        if: matrix.component.security_scan == true && matrix.component.security_trivy_scan == true
        run: |
          trivy image ${{ matrix.component.image }}:latest

      - name: Security Scan with Grype
        if: matrix.component.security_scan == true && matrix.component.security_grype_scan == true
        run: |
          grype ${{ matrix.component.image }}:latest
```

### Custom Configuration File Path

```yaml
- name: Resolve Docker Configuration
  id: resolver
  uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@main
  with:
    file-path: .config/docker-components.json
```

---

## Additional Information

### How It Works

1. **File Loading**: Reads the configuration file from the specified path.
2. **Validation**: Ensures all components have a `name` field (fails if missing or empty).
3. **Image Generation**: Auto-generates `image` field based on:
   - If `registry` is defined: `{registry}/{owner}/{component-name}`
   - If `registry` is empty: `{owner}/{component-name}`
4. **Defaults Merging**: Merges global `defaults` with component-specific settings.
5. **Security Merging**: Merges global `security` with component-specific security settings.
6. **Prefixing**: All security fields are prefixed with `security_` in the output.
7. **Output**: Returns a flat JSON array with all resolved configurations.

### Validation Rules

- **Required**: Every component must have a `name` field.
- **Non-empty**: Component names cannot be empty strings or null values.
- **File Existence**: The configuration file must exist at the specified path.
- **Valid JSON/YAML**: The configuration file must be valid JSON or YAML format.

---

## Notes

- The action uses `jq` for JSON processing, which is available by default on GitHub-hosted runners.
- The `image` field is always auto-generated and cannot be overridden in the configuration file.
- Component names are used to generate image paths and should follow Docker naming conventions (lowercase, alphanumeric, `-`, `_`).
- The `registry` field can be left empty to use default `owner/component-name` format (useful for Docker Hub).
- All outputs are logged in pretty-printed format for debugging purposes.
- The configuration file can be either JSON or YAML format (both are supported by `jq`).
- Security settings are always prefixed with `security_` to avoid naming conflicts with other fields.
- Any component has an empty or null `name` value.
- The configuration file contains invalid JSON/YAML syntax.

**Matrix build example:**

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Build and Push
    uses: docker/build-push-action@v5
    with:
      context: ${{ matrix.component.context }}
      file: ${{ matrix.component.dockerfile }}
      tags: ${{ matrix.component.image }}:${{ github.sha }}
      platforms: ${{ matrix.component.platforms }}
```

**Conditional security scanning:**

```yaml
- name: Security Scan
  if: matrix.component.security_scan == true
  run: |
    # Use security_trivy_scan, security_grype_scan flags
    trivy image ${{ matrix.component.image }}
```

## How It Works

1. Loads configuration file (JSON/YAML)
2. Validates `name` field for each component (required)
3. Auto-generates `image` field: `{registry}/{owner}/{name}` (or `{owner}/{name}` if no registry)
4. Merges settings (priority: component-specific > defaults)
5. Prefixes all security fields with `security_`
6. Outputs flat JSON array

**Validation:**

- Configuration file must exist
- Each component must have non-empty `name`
- File must be valid JSON/YAML

## Troubleshooting

- **File not found**: Ensure `actions/checkout@v6` runs before this action
- **`component.name is required`**: Check all components have non-empty `name` field
- **Invalid JSON**: Verify config file syntax and check action logs for "Resolved configuration (pretty)"
- **Matrix not working**: Use `${{ fromJson(needs.job-name.outputs.config) }}`

## Configuration Example

```json
{
  "registry": "ghcr.io",
  "security": {
    "scan": true,
    "only_high_critical": true,
    "trivy_scan": true,
    "grype_scan": true,
    "only_fixed": true,
    "continue_on_error": true,
    "tag": "latest"
  },
  "defaults": {
    "dockerfile": "Dockerfile",
    "context": ".",
    "tags": "latest",
    "platforms": "linux/amd64, linux/arm64"
  },
  "components": [
    {
      "name": "backend-api"
    },
    {
      "name": "frontend-app",
      "tags": "1.0.0",
      "security": {
        "scan": false
      }
    }
  ]
}
```

**Output:**

```json
[
  {
    "name": "backend-api",
    "image": "ghcr.io/my-org/backend-api",
    "registry": "ghcr.io",
    "dockerfile": "Dockerfile",
    "context": ".",
    "tags": "latest",
    "platforms": "linux/amd64, linux/arm64",
    "security_scan": true,
    "security_only_high_critical": true,
    "security_trivy_scan": true,
    "security_grype_scan": true,
    "security_only_fixed": true,
    "security_continue_on_error": true,
    "security_tag": "latest"
  },
  {
    "name": "frontend-app",
    "image": "ghcr.io/my-org/frontend-app",
    "registry": "ghcr.io",
    "dockerfile": "Dockerfile",
    "context": ".",
    "tags": "1.0.0",
    "platforms": "linux/amd64, linux/arm64",
    "security_scan": false,
    "security_only_high_critical": true,
    "security_trivy_scan": true,
    "security_grype_scan": true,
    "security_only_fixed": true,
    "security_continue_on_error": true,
    "security_tag": "latest"
  }
]
```

## Technical Details

- Uses `jq` for JSON processing (pre-installed on GitHub runners)
- `image` field is auto-generated from `name` and cannot be overridden
- Component names should follow Docker naming conventions (lowercase, alphanumeric, `-`, `_`)
- Leave `registry` empty for Docker Hub format: `owner/component-name`
- Configuration supports both JSON and YAML
- Security fields always prefixed with `security_`
