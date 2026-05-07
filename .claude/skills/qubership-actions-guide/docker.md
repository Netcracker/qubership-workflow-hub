# Docker — config, pipelines, and security

## Clarifying questions

Ask these before designing any Docker workflow (Path B — scratch):

| Question                                                                                    | Why                                                                                                              |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Registry: GHCR / Docker Hub / both?                                                         | Determines auth method and `registry` input                                                                      |
| Does `.qubership/docker.cfg` already exist?                                                 | If yes — read it. If no — ask if they want one (see *Config file* below for when it's useful).                   |
| How to generate image tags? Auto from branch/tag (`metadata-action`) or manually via input? | Determines whether `metadata-action` is needed                                                                   |
| Is there a build step before Docker (Maven/npm/Python/Go/other)?                            | If yes → ask: same job or separate job? (same = simpler; separate = if artifact is needed elsewhere in parallel) |
| Is a GitHub Release needed?                                                                 | Determines whether `assets-action` and `tag-action` are needed                                                   |
| Target platforms: `linux/amd64` only or multi-arch (`linux/amd64,linux/arm64`)?             | Multi-arch requires QEMU setup and longer build time. Default: `linux/amd64` only                                |

When the user doesn't know the difference between same job vs separate jobs —
explain simply: same job is easier and faster; separate jobs make sense when
the built artifact is also needed by other jobs (tests, scans) running in
parallel.

## Migrating an existing Docker workflow

When the user has an existing workflow that builds/pushes Docker images:

1. **Read the workflow file** (open in IDE or pasted by user).
2. **Find config files** referenced in the workflow — read them too.
3. **Analyse each step** against the table below and replace with Qubership actions:

| Existing pattern | Replace with |
| --- | --- |
| `docker/build-push-action` | `docker-action` |
| Manual `docker build` + `docker push` shell steps | `docker-action` |
| `docker/metadata-action` for tags | `metadata-action` |
| Manual tag string construction in shell | `metadata-action` |
| Hardcoded component list in matrix | `docker-config-resolver` + `.qubership/docker.cfg` |
| `docker login` steps | Built into `docker-action` via `registry` + `GITHUB_TOKEN` env |
| `actions/download-artifact` before Docker build | `download-artifact: true` input on `docker-action` |

4. **Check what's missing** — if no `.qubership/docker.cfg` exists but there
   are multiple images or complex build settings, propose creating one.
5. **Apply conventions** — pinning, job-level permissions, concurrency,
   timeouts — per `qubership-workflow-conventions`.
6. **Show a diff** — keep what works, replace only what has a Qubership
   equivalent. Do not rewrite the whole workflow unless necessary.

## `.qubership/docker.cfg` schema

Single config file for both build and security scan settings.
The filename can be anything — the path is passed via `file-path` input to
`docker-config-resolver`. Convention: `docker.cfg` for CI builds.

```json
{
  "registry": "ghcr.io",
  "security": {
    "scan": true,
    "tag": "latest",
    "only_high_critical": true,
    "trivy_scan": true,
    "grype_scan": true,
    "only_fixed": true,
    "continue_on_error": true
  },
  "defaults": {
    "platforms": "linux/amd64,linux/arm64",
    "dockerfile": "Dockerfile",
    "build_context": "."
  },
  "components": [
    {
      "name": "my-service",
      "dockerfile": "Dockerfile",
      "build_context": ".",
      "platforms": "linux/amd64",
      "arguments": "NODE_ENV=production",
      "security": {
        "scan": true,
        "tag": "latest",
        "only_high_critical": false
      }
    }
  ]
}
```

### Top-level fields

| Field        | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `registry`   | Base registry URL, e.g. `"ghcr.io"`                                      |
| `security`   | Global security settings — inherited by all components unless overridden |
| `defaults`   | Default build settings inherited by all components                       |
| `components` | **Required.** Array of component definitions                             |

### Component fields (all optional except `name`)

| Field           | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `name`          | **Required.** Image path becomes `{registry}/{owner}/{name}` |
| `dockerfile`    | Path to Dockerfile. Default: `"Dockerfile"`                  |
| `build_context` | Docker build context path. Default: `"."`                    |
| `platforms`     | Comma-separated platforms. Default: `"linux/amd64"`          |
| `arguments`     | Build args, comma-separated or newline-delimited             |
| `security`      | Component-level security overrides (merged with global)      |

Note: `context` is a deprecated alias for `build_context` — always use `build_context`.

### `security` object fields (global and component level)

| Field                | Description                                      |
| -------------------- | ------------------------------------------------ |
| `scan`               | `true` — include this component in security scan |
| `tag`                | Image tag to use when scanning                   |
| `only_high_critical` | Scan only HIGH + CRITICAL vulnerabilities        |
| `trivy_scan`         | Enable Trivy scanner                             |
| `grype_scan`         | Enable Grype scanner                             |
| `only_fixed`         | Ignore unfixed vulnerabilities                   |
| `continue_on_error`  | Don't fail the job if vulnerabilities found      |

### Merge and flatten rules

`docker-config-resolver` processes each component in two steps:

1. **Merge:** component-level `security` fields override global `security`
   fields. If a field is absent at component level — the global value is used.
2. **Flatten:** the merged `security` object is expanded into prefixed fields
   in the output JSON: `security.scan` → `security_scan`, `security.tag` →
   `security_tag`, etc.

The workflow reads `matrix.component.security_scan`,
`matrix.component.security_trivy_scan`, and so on.

## Build pipelines

### Single-image Docker build

```
metadata-action  →  docker-action
produces tags        builds and pushes
```

`metadata-action.outputs.result` → `docker-action` input `tags`.
No config file needed. If the workflow supports extra user-supplied tags via
`workflow_dispatch`, combine them with `metadata-action` output in a shell
step — otherwise pass `result` directly to `tags`.

### Multi-image Docker build (CI)

```
docker-config-resolver       metadata-action  →  docker-action (matrix)
reads docker config file     produces tags        builds each component
        ↓
  matrix.component
```

`docker-config-resolver` outputs JSON array → `matrix.component`.
`metadata-action` runs per matrix cell → tags passed to `docker-action`.
Pass `component: ${{ toJson(matrix.component) }}` and
`platforms: ${{ matrix.component.platforms }}` to `docker-action`.

### Multi-image Docker release

```
docker-config-resolver  →  tag-action  →  docker-action (matrix)
reads docker config file    creates tag    builds each component
```

Release uses `tag-action` instead of `metadata-action` to create the release
tag first. Config file path is passed via `file-path` input to
`docker-config-resolver`.

### Build + Docker (any language)

When a build step (Maven, npm, Python, Go, etc.) precedes Docker,
whether `download-artifact` is needed depends on job structure:

| Structure                     | How artifact reaches Docker                   | What to use                                                                           |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Single job (sequential steps) | Stays in workspace (`target/`, `dist/`, etc.) | Nothing — Docker build context picks it up                                            |
| Separate jobs                 | Workspace not shared between jobs             | `actions/upload-artifact` in build job → `download-artifact: true` in `docker-action` |

For separate jobs:

```yaml
- uses: netcracker/qubership-workflow-hub/actions/docker-action@<sha>  # vX.Y.Z
  with:
    download-artifact: true
    download-artifact-name: build-output
    download-artifact-path: ./dist
    checkout: "false"
```

## Security scan pipelines

### With `docker.cfg` (recommended)

```
docker-config-resolver  →  filter security.scan==true  →  re-security-scan (matrix)
reads docker config file    per-component scan settings    Trivy + Grype
```

Each component with `security.scan: true` becomes a matrix entry. Scan
settings come from the component's `security` fields (after merge + flatten).

### Without `docker.cfg` (discover from GHCR)

```
ghcr-discover-repo-packages  →  re-security-scan (matrix)
discovers all repo packages      scans each image
```

`ghcr-discover-repo-packages` output `packages` can also feed
`container-package-cleanup` or any other step that needs the image list.
