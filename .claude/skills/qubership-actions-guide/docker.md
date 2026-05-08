# Docker — config, pipelines, and security

## How to use this guide

Follow the steps in order. Do not skip ahead. Do not generate any workflow,
config file, or code until Step 2 explicitly says to.

If the user has an existing workflow → go to *Migrating an existing workflow* below first.
If from scratch → go directly to *Collect requirements*.

---

## Migrating an existing workflow

1. Read the workflow file (ask user for path or let them paste it).
2. Find and read any config files referenced in the workflow — component list,
   registries, and build settings may already be defined there.
3. Extract all existing information (images, Dockerfiles, registry, platforms)
   before asking the user anything — do not ask for information that can be read.
4. Replace non-Qubership patterns using the table below, then go to *Collect requirements* for anything still missing.

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

## Collect requirements

Extract answers from the user's message first. Ask only what is missing and required to generate the workflow.
General context (triggers, runner) is already established in `SKILL.md` Step 0.

| # | Question | What it controls |
| - | --- | --- |
| 1 | Should there be a dry-run mode? | `dry-run` input + conditional — builds without pushing |
| 2 | Registry: GHCR / Docker Hub / both? | `registry` input and auth method |
| 3 | Do you have an existing Docker config file? If yes — what is its path? | Yes → read it. No → generate it (see *Config file generation*). Config file is always used — never inline components in the workflow. |
| 4 | Is a GitHub Release needed? | Yes → also load `release.md`. |

Defaults — do not ask, apply automatically:
- Platforms: `linux/amd64,linux/arm64` (set in `defaults` of config file, not in workflow inputs)
- `extra-tags` input always included in `workflow_dispatch` — user removes if not needed
- Image names / Dockerfiles: goes into config file as placeholder `"name": "your-image"` — user fills in
- Build step before Docker: only ask if user explicitly mentions Maven/npm/Go/etc
- **Config file is always generated** — never put image name, Dockerfile path, platforms, or build-context into workflow inputs

---

## Decide and generate

Use collected answers to pick the pipeline and generate output in this order:

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

For release details (tag-action inputs, assets-action patterns, permissions) — see `release.md`.

**Checkout:** `docker-action` checks out internally (`checkout: "true"` by default). Only set `ref` in release workflows — pass `refs/tags/v${{ inputs.release }}` so the build uses the tag created in the previous job. For CI builds (push/PR), omit `ref` entirely — the action uses the current commit. A separate explicit checkout is still needed in any job that reads files before the build (e.g. `resolve-config` job reading the config file).

### Tag strategy per trigger

Use different `metadata-action` templates depending on the trigger — they serve different purposes:

| Trigger | `default-template` | Result |
| --- | --- | --- |
| `push` to branch / `pull_request` | `"{{ref-name}},{{short-sha}}"` | Branch tag + short commit SHA — temporary, identifies the build |
| `workflow_dispatch` release | `"{{ref-name}},{{major}}.{{minor}},{{major}},latest"` | Full semver set — `v1.2.3`, `1.2`, `1`, `latest` |

When the workflow handles both triggers (push + workflow_dispatch), use two separate `metadata-action` steps with `if:` conditions and merge the outputs:

```yaml
- id: metadata-release
  if: github.event_name == 'workflow_dispatch'
  uses: netcracker/qubership-workflow-hub/actions/metadata-action@<sha>  # vX.Y.Z
  with:
    ref: refs/tags/v${{ inputs.release }}
    default-template: "{{ref-name}},{{major}}.{{minor}},{{major}},latest"
    extra-tags: ${{ inputs.extra-tags }}

- id: metadata-push
  if: github.event_name == 'push'
  uses: netcracker/qubership-workflow-hub/actions/metadata-action@<sha>  # vX.Y.Z
  with:
    ref: ${{ github.ref }}
    default-template: "{{ref-name}},{{short-sha}}"
```

Then pass to `docker-action`:
```yaml
tags: ${{ steps.metadata-release.outputs.result || steps.metadata-push.outputs.result }}
```

### Key action inputs reference

**`docker-config-resolver`:**
- `file-path` — path to config file

**`metadata-action`:**
- `ref` — the ref to render tags from; for release use `refs/tags/v${{ inputs.release }}`, for push use `${{ github.ref }}`
- `default-template` — tag template (see *Tag strategy* above)
- `extra-tags` — additional tags from `workflow_dispatch` input

**`docker-action`:**
- `component` — `${{ toJson(matrix.component) }}` (with config) or inline JSON array (without config)
- `platforms` — `${{ matrix.component.platforms }}` (with config) or direct value
- `tags` — from `metadata-action` output or direct
- `registry` — e.g. `ghcr.io`
- `dry-run` — `"true"` / `"false"`
- `ref` — set only in release workflows: `refs/tags/v${{ inputs.release }}`; omit for CI builds
- `checkout` — default `"true"`; set `"false"` only if repo already checked out in the same job
- `download-artifact` / `download-artifact-name` / `download-artifact-path` — for separate build job

---

## Config file generation

When config file is wanted but doesn't exist — generate it from collected answers.
Do not ask the user to fill in a template. Write the file, show it, say "adjust if anything looks wrong."

Minimal generated example (two images, GHCR):

```json
{
  "registry": "ghcr.io",
  "defaults": {
    "platforms": "linux/amd64,linux/arm64",
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
| `platforms` | Comma-separated platforms. Default: `"linux/amd64,linux/arm64"` |
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
