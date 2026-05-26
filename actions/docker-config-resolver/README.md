# 🚀 Docker Config Resolver

Reads a Docker components configuration file (`.qubership/docker.cfg`), applies global defaults
and security settings to each component, and outputs a flat JSON array ready for use in CI/CD
workflows — typically as the `component` input to `docker-action` or as a matrix strategy source.

---

## Features

- Reads a JSON configuration file describing one or more Docker components.
- Validates that every component has a non-empty `name` field — fails fast if missing.
- Auto-generates a fully-qualified `image` path: `{registry}/{owner}/{component-name}` (or
  `{owner}/{component-name}` when `registry` is omitted).
- Merges global `defaults` into each component (component fields take precedence).
- Merges global `security` settings with per-component overrides; prefixes all security fields
  with `security_` in the output for easy filtering in downstream steps.
- Outputs a compact JSON array (`config`) directly usable as a matrix or passed to `docker-action`.

---

## 📌 Inputs

| Name        | Description                                                                                   | Required | Default                 |
| ----------- | --------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| `file-path` | Path to the Docker components configuration file. Must exist — the action fails if not found. | No       | `.qubership/docker.cfg` |

---

## 📌 Outputs

| Name     | Description                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config` | Resolved Docker components configuration as a compact JSON array, with all defaults and security settings applied. Passed directly to `docker-action`'s `component` input or used as a matrix source. |

---

## How it works

The action reads the JSON file at `file-path`, then for each entry in `components` it builds a
resolved object by:

1. Deriving the `image` field from `registry`, `github.repository_owner`, and `component.name`.
2. Merging global `defaults` with the component object (component fields override defaults).
3. Merging global `security` with `component.security` (component fields override global), then
   renaming every key to `security_<key>` (e.g. `scan` → `security_scan`).
4. Dropping the raw `security` block from the output (replaced by the prefixed fields).

The resulting array is printed to the workflow log (pretty-printed) and set as the `config` output.

**Example — input config:**

```json
{
  "registry": "ghcr.io",
  "defaults": { "dockerfile": "Dockerfile", "context": "." },
  "security": { "scan": true, "trivy_scan": true },
  "components": [
    { "name": "api" },
    { "name": "worker", "dockerfile": "Dockerfile.worker", "security": { "scan": false } }
  ]
}
```

**Resolved `config` output:**

```json
[
  {
    "name": "api",
    "image": "ghcr.io/my-org/api",
    "registry": "ghcr.io",
    "dockerfile": "Dockerfile",
    "context": ".",
    "security_scan": true,
    "security_trivy_scan": true
  },
  {
    "name": "worker",
    "image": "ghcr.io/my-org/worker",
    "registry": "ghcr.io",
    "dockerfile": "Dockerfile.worker",
    "context": ".",
    "security_scan": false,
    "security_trivy_scan": true
  }
]
```

---

## Additional Information

### Configuration File Format

The configuration file must be valid **JSON**. YAML is not supported — `jq` is used to parse the
file and it requires JSON input.

**Top-level fields:**

| Field        | Required | Description                                                                                 |
| ------------ | -------- | ------------------------------------------------------------------------------------------- |
| `registry`   | No       | Base registry URL (e.g. `ghcr.io`). Omit to use `{owner}/{name}` without a registry prefix. |
| `defaults`   | No       | Default values merged into every component. Component fields take precedence.               |
| `security`   | No       | Global security settings merged into every component's security block.                      |
| `components` | Yes      | Array of component objects. Each must have a `name` field.                                  |

**Component fields:**

| Field        | Required | Description                                                              |
| ------------ | -------- | ------------------------------------------------------------------------ |
| `name`       | Yes      | Unique component name. Used to derive the `image` path. Cannot be empty. |
| `dockerfile` | No       | Path to Dockerfile. Inherited from `defaults` if not set.                |
| `context`    | No       | Docker build context path. Inherited from `defaults` if not set.         |
| `platforms`  | No       | Target platforms (e.g. `linux/amd64,linux/arm64`). From `defaults`.      |
| `security`   | No       | Per-component security overrides. Merged with global `security`.         |
| Any other    | No       | Additional fields are passed through to the output as-is.                |

**Full example:**

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
    "platforms": "linux/amd64,linux/arm64"
  },
  "components": [
    { "name": "backend-api" },
    {
      "name": "frontend-app",
      "dockerfile": "Dockerfile.frontend",
      "security": { "scan": false }
    }
  ]
}
```

### Output Object Structure

Each object in the `config` array contains:

| Field        | Source                                                          |
| ------------ | --------------------------------------------------------------- |
| `name`       | From `component.name`                                           |
| `image`      | Auto-generated: `{registry}/{owner}/{name}` or `{owner}/{name}` |
| `registry`   | From top-level `registry` (empty string if omitted)             |
| `security_*` | All security fields, prefixed with `security_`                  |
| Other fields | Merged result of `defaults` + component fields                  |

Note: the raw `security` block is removed from the output and replaced by `security_*` fields.

### Using the Output as a Matrix

The `config` output is a JSON array — use `fromJson()` to expand it into a matrix:

```yaml
jobs:
  resolve:
    runs-on: ubuntu-latest
    outputs:
      config: ${{ steps.resolver.outputs.config }}
    steps:
      - uses: actions/checkout@v4
      - id: resolver
        uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@v2.2.1

  build:
    needs: resolve
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: ${{ fromJson(needs.resolve.outputs.config) }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.component.context }}
          file: ${{ matrix.component.dockerfile }}
          tags: ${{ matrix.component.image }}:${{ github.sha }}
          platforms: ${{ matrix.component.platforms }}
```

### Using the Output with docker-action

The `config` output is directly compatible with the `component` input of `docker-action`:

```yaml
- id: resolve
  uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@v2.2.1

- uses: netcracker/qubership-workflow-hub/actions/docker-action@v2.2.1
  with:
    component: ${{ steps.resolve.outputs.config }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Conditional Security Scanning

Use the `security_*` fields in downstream steps to conditionally run security scans:

```yaml
- name: Security Scan with Trivy
  if: matrix.component.security_scan == true && matrix.component.security_trivy_scan == true
  run: trivy image ${{ matrix.component.image }}:latest
```

---

## Usage

```yaml
name: Build Docker Images

on:
  push:
    branches: [main]

jobs:
  resolve:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      config: ${{ steps.resolver.outputs.config }}
    steps:
      - uses: actions/checkout@v4

      - name: Resolve Docker Configuration
        id: resolver
        uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@v2.2.1
        with:
          file-path: .qubership/docker.cfg
```

---

## Notes

- The configuration file must be valid **JSON** — YAML is not supported.
- The action **fails immediately** if the config file does not exist at `file-path`. Ensure the
  file is present in the checked-out repository before this step runs.
- `component.name` is required and must be non-empty — the action fails with an error if any
  component is missing a name.
- The resolved configuration is printed to the workflow log in pretty-printed JSON. It does not
  contain secrets, but review your config for any sensitive values before enabling public log
  access.
- Always pin to `@v2.2.1` or a specific SHA — never `@main` in production.

---

## Troubleshooting

- **`Config file not found`:** the file at `file-path` does not exist. Check the path and ensure
  `actions/checkout` ran before this action.
- **`component.name is required`:** one or more entries in `components` are missing the `name`
  field or have it set to `null` / empty string. Add a `name` to every component.
- **`image` field has unexpected format:** if `registry` is omitted, the image path is
  `{owner}/{name}` without a registry prefix. Set `registry` explicitly if you need the full
  `ghcr.io/...` form.
- **Security fields missing in output:** check that your `security` block is at the top level of
  the config file, not nested inside a component. Per-component overrides go under
  `component.security`.
