# 🐳 Docker Configuration Resolver

This **Docker Configuration Resolver** GitHub Action loads, validates, and normalizes Docker component configurations for CI/CD workflows. It reads a configuration file, applies defaults and security settings, and outputs a flat JSON structure ready for use in matrix build strategies.

---

## Features

- Validates and merges Docker component configurations (JSON/YAML support)
- Applies global defaults and security settings to all components
- Auto-generates fully-qualified image paths: `{registry}/{owner}/{component-name}`
- Outputs structured JSON for matrix strategies
- Supports per-component overrides for security and build settings

---

## 📌 Inputs

| Name        | Description                                       | Required | Default                 |
| ----------- | ------------------------------------------------- | -------- | ----------------------- |
| `file-path` | Path to the Docker components configuration file. | No       | `.qubership/docker.cfg` |

---

## 📤 Outputs

| Name     | Description                                                                        | Example                                                             |
| -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `config` | Resolved Docker components configuration in JSON format with all defaults applied. | `[{"name":"api","image":"ghcr.io/owner/api","registry":"ghcr.io"}]` |

---

## Configuration Object Structure

Each component in the `config` output array contains:

| Field        | Description                                      | Example                      |
| ------------ | ------------------------------------------------ | ---------------------------- |
| `name`       | Component name (user-defined, required)          | `backend-api`                |
| `image`      | Auto-generated image path (cannot be overridden) | `ghcr.io/my-org/backend-api` |
| `registry`   | Container registry URL                           | `ghcr.io`                    |
| `dockerfile` | Path to Dockerfile (from defaults or component)  | `Dockerfile`                 |
| `context`    | Build context path (from defaults or component)  | `.`                          |
| `tags`       | Image tags (from defaults or component)          | `latest` or `1.0.0`          |
| `platforms`  | Target platforms (from defaults or component)    | `linux/amd64, linux/arm64`   |
| `security_*` | Security settings (prefixed with `security_`)    | `security_scan: true`        |
| Other fields | Any additional custom fields from configuration  | Custom build args, etc.      |

---

## Configuration File Format

The action expects a JSON or YAML configuration file with the following structure:

### JSON example

~~~json
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
    { "name": "backend-api" },
    {
      "name": "frontend-app",
      "tags": "1.0.0",
      "security": { "scan": false }
    }
  ]
}
~~~

### YAML example

~~~yaml
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
~~~

### Configuration fields

**Top-level:**

- `registry` (optional): Base registry URL (e.g., `ghcr.io`). If omitted, images will use format `owner/component-name`.
- `defaults` (optional): Default values applied to all components.
- `security` (optional): Global security settings applied to all components.
- `components` (required): Array of component configurations.

**Component:**

- `name` (required): Unique name for the component. Used to auto-generate the `image` path.

---

## Usage in a workflow

~~~yaml
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
        uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@v2.0.10

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
          tags: ${{ matrix.component.image }}:${{ github.sha }}
          platforms: ${{ matrix.component.platforms }}
~~~

### Conditional security scanning (example)

~~~yaml
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
~~~

### Custom configuration file path

~~~yaml
- name: Resolve Docker Configuration
  id: resolver
  uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@v2.0.10
  with:
    file-path: .config/docker-components.json
~~~

---

## How It Works

1. **File Loading**: Reads the configuration file from the specified path.
2. **Validation**: Ensures all components have a `name` field (fails if missing or empty).
3. **Image Generation**: Auto-generates `image` field based on:
   - If `registry` is defined: `{registry}/{owner}/{component-name}`
   - If `registry` is empty: `{owner}/{component-name}`
4. **Defaults Merging**: Merges global `defaults` with component-specific settings (priority: component-specific > defaults).
5. **Security Merging**: Merges global `security` with component-specific security settings.
6. **Prefixing**: All security fields are prefixed with `security_` in the output.
7. **Output**: Returns a flat JSON array with all resolved configurations.

---

## Validation Rules

- **Required**: Every component must have a `name` field.
- **Non-empty**: Component names cannot be empty strings or null values.
- **Valid JSON/YAML**: The configuration file must be valid JSON or YAML format.
