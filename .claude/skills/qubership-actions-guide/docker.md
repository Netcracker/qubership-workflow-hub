# Docker — config, pipelines, and security

## How to use this guide

Follow the steps in order. Do not skip ahead. Do not generate any workflow,
config file, or code until Step 3 explicitly says to.

---

## Step 1 — determine starting point

**Does the user have an existing workflow?**

- **Yes** → go to *Migrating an existing workflow* (Step 1b). Read the file first.
- **No** → continue to Step 2.

### Step 1b — migrating an existing workflow

1. Read the workflow file (ask user for path or let them paste it).
2. Find and read any config files referenced in the workflow — component list,
   registries, and build settings may already be defined there.
3. Extract all existing information (images, Dockerfiles, registry, platforms)
   before asking the user anything — do not ask for information that can be read.
4. Replace non-Qubership patterns using the table below, then go to Step 3.

| Existing pattern | Replace with |
| --- | --- |
| `docker/build-push-action` | `docker-action` |
| Manual `docker build` + `docker push` shell steps | `docker-action` |
| `docker/metadata-action` for tags | `metadata-action` |
| Manual tag string construction in shell | `metadata-action` |
| Hardcoded component list in matrix or env vars | `docker-config-resolver` + config file, or inline JSON array |
| Non-Qubership config file format (custom YAML/JSON) | Migrate into `.qubership/docker.cfg` format |
| `docker login` steps | Built into `docker-action` via `registry` + `GITHUB_TOKEN` env |
| `actions/download-artifact` before Docker build | `download-artifact: true` input on `docker-action` |

---

## Step 2 — collect requirements (from scratch only)

Ask ALL questions below. Do not generate anything until every question is answered.
Ask them all at once, not one by one.

General workflow questions (triggers, dry-run, runner, concurrency) are collected in Step 0
of `SKILL.md` before this guide is loaded. Ask only the Docker-specific questions below.

| # | Question | What it controls |
| - | --- | --- |
| 1 | Registry: GHCR / Docker Hub / both? | `registry` input and auth method |
| 2 | Do you want a Docker config file (e.g. `.qubership/docker.cfg`)? If you already have one — what is its path? | Config file → `docker-config-resolver` + matrix. No config → inline JSON in `docker-action`. |
| 3 | How many Docker images does this workflow build? What are their names and Dockerfile paths? | Populates `components` — in config file or inline. |
| 4 | How should image tags be generated? Auto from branch/tag name (`metadata-action`), custom tags via `workflow_dispatch` input, or both? | Whether `metadata-action` is needed and how tags are assembled. |
| 5 | Is there a build step before Docker (Maven/npm/Python/Go/other)? If yes — same job or separate job? | Separate job → `upload-artifact` in build job + `download-artifact: true` in `docker-action`. |
| 6 | Is a GitHub Release needed? If yes — should release assets (binaries, archives) be uploaded? | `tag-action` (creates tag + release) and optionally `assets-action`. |
| 7 | Target platforms: `linux/amd64` only or multi-arch (`linux/amd64,linux/arm64`)? | Multi-arch requires QEMU setup and longer build time. Default: `linux/amd64`. |

When the user doesn't know same job vs separate jobs — explain: same job is simpler;
separate jobs make sense when the artifact is also needed by other parallel jobs (tests, scans).

---

## Step 3 — decide and generate

Use answers from Step 2 to pick the pipeline and generate output in this order:

1. If config file is wanted and doesn't exist → **generate the config file first** (see *Config file generation* below), write it, show it, ask user to confirm or adjust.
2. Then generate the workflow.

### Pipeline selection

| Config file? | Release? | Pipeline |
| --- | --- | --- |
| No | No | `metadata-action` → `docker-action` (inline component) |
| Yes | No | `docker-config-resolver` → `metadata-action` → `docker-action` (matrix) |
| No | Yes | `tag-action` (check) → `tag-action` (create) → `docker-action` → `github-release` |
| Yes | Yes | `tag-action` (check) → `docker-config-resolver` → `tag-action` (create) → `docker-action` (matrix) → `github-release` |

If release assets needed → append `assets-action` after `github-release` in any release pipeline.

If build step in separate job → prepend build job with `upload-artifact`, add `download-artifact: true` to `docker-action`.

### Pipeline details

**No config, no release (CI build):**
```
metadata-action  →  docker-action
produces tags        builds and pushes (inline component)
```

**With config, no release (CI build, multi-image):**
```
docker-config-resolver  →  metadata-action  →  docker-action (matrix)
reads config file           produces tags        builds each component
```

**No config, with release:**
```
tag-action (check)  →  tag-action (create)  →  docker-action  →  github-release
verify tag absent      creates vX.Y.Z tag      builds image(s)    release-drafter
```

**With config, with release:**
```
tag-action (check)  →  docker-config-resolver  →  tag-action (create)  →  docker-action (matrix)  →  github-release
verify tag absent      reads config file            creates vX.Y.Z tag      builds each component       release-drafter
```

### Key action inputs reference

**`docker-config-resolver`:**
- `file-path` — path to config file

**`metadata-action`:**
- `default-template` — tag template, e.g. `"{{ref-name}}"`
- `extra-tags` — additional tags from `workflow_dispatch` input

**`docker-action`:**
- `component` — `${{ toJson(matrix.component) }}` (with config) or inline JSON array (without config)
- `platforms` — `${{ matrix.component.platforms }}` (with config) or direct value
- `tags` — from `metadata-action` output or direct
- `registry` — e.g. `ghcr.io`
- `dry-run` — `"true"` / `"false"`
- `checkout` — set `"false"` if repo already checked out
- `download-artifact` / `download-artifact-name` / `download-artifact-path` — for separate build job

**`tag-action`** (check):
- `check-tag: true`, `create-tag: false`, `tag-name: v${{ inputs.release }}`

**`tag-action`** (create):
- `create-tag: true`, `check-tag: false`, `tag-name: v${{ inputs.release }}`

**`assets-action`:**
- `tag` — release tag
- `item-path` — files or glob patterns to upload
- Requires `permissions: contents: write`

---

## Config file generation

When config file is wanted but doesn't exist — generate it from collected answers.
Do not ask the user to fill in a template. Write the file, show it, say "adjust if anything looks wrong."

Minimal generated example (two images, GHCR, amd64):

```json
{
  "registry": "ghcr.io",
  "defaults": {
    "platforms": "linux/amd64",
    "dockerfile": "Dockerfile",
    "build_context": "."
  },
  "components": [
    {
      "name": "my-service"
    },
    {
      "name": "my-worker",
      "dockerfile": "worker/Dockerfile",
      "build_context": "worker"
    }
  ]
}
```

Default path: `.qubership/docker.cfg`. Confirm with user before writing.
Fields not set in a component are inherited from `defaults`.

---

## Config file schema

The config file is the central component registry for the repo. `docker-config-resolver`
reads it and outputs a JSON matrix used by any downstream job — build, scan, cleanup, deploy, etc.
The filename is arbitrary — path is passed via `file-path` input. Convention: `docker.cfg`.

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

| Field | Description |
| --- | --- |
| `registry` | Base registry URL, e.g. `"ghcr.io"` |
| `security` | Global security settings — inherited by all components unless overridden |
| `defaults` | Default build settings inherited by all components |
| `components` | **Required.** Array of component definitions |

### Component fields (all optional except `name`)

| Field | Description |
| --- | --- |
| `name` | **Required.** Image path becomes `{registry}/{owner}/{name}` |
| `dockerfile` | Path to Dockerfile. Default: `"Dockerfile"` |
| `build_context` | Docker build context path. Default: `"."` |
| `platforms` | Comma-separated platforms. Default: `"linux/amd64"` |
| `arguments` | Build args, comma-separated or newline-delimited |
| `security` | Component-level security overrides (merged with global) |

Note: `context` is a deprecated alias for `build_context` — always use `build_context`.

### `security` object fields

| Field | Description |
| --- | --- |
| `scan` | `true` — include this component in security scan |
| `tag` | Image tag to use when scanning |
| `only_high_critical` | Scan only HIGH + CRITICAL vulnerabilities |
| `trivy_scan` | Enable Trivy scanner |
| `grype_scan` | Enable Grype scanner |
| `only_fixed` | Ignore unfixed vulnerabilities |
| `continue_on_error` | Don't fail the job if vulnerabilities found |

### Merge and flatten rules

`docker-config-resolver` processes each component in two steps:

1. **Merge:** component-level `security` fields override global `security` fields.
2. **Flatten:** `security.scan` → `security_scan`, `security.tag` → `security_tag`, etc.

The workflow reads `matrix.component.security_scan`, `matrix.component.security_trivy_scan`, and so on.

---

## Security scan pipelines

### With config file (recommended)

```
docker-config-resolver  →  filter security.scan==true  →  re-security-scan (matrix)
reads config file           per-component scan settings    Trivy + Grype
```

The config file here is the same central file used for Docker build — filename is arbitrary,
can be shared with build config or a dedicated scan-only file.

### Without config file (discover from GHCR)

```
ghcr-discover-repo-packages  →  re-security-scan (matrix)
discovers all repo packages      scans each image
```

`ghcr-discover-repo-packages` output `packages` can also feed `container-package-cleanup`
or any other step that needs the image list.
