# Workflow patterns

General workflow structure: triggers, jobs, concurrency, timeouts,
matrix, dry-run gating, reusable workflow contracts, artifacts.

All YAML samples below show structure only. Verify every action name,
input, output, and required permission per *Mandatory conventions →
Anti-hallucination*.

## Trigger rules

Three standard patterns used across all org templates. Infer from the user's
request — do not ask unless truly ambiguous.

| Pattern | `on:` | Use when |
| --- | --- | --- |
| Release only | `workflow_dispatch` | User says "release", "publish", "manually" — all release workflows (Docker, Helm, Maven, npm, Python) are manual-only |
| CI + manual | `push` (branches) + `workflow_dispatch` | User says "build on push" or "CI build" with optional manual trigger — dev Docker build, Maven+Docker |
| CI only | `push` (branches) + `pull_request` | User says "run on PR" or "validate only" — no manual trigger needed |

All `push`-based templates include `paths-ignore` for docs/config files
(`.github/**`, `docs/**`, `README.md`, `LICENSE`, etc.) — always add this.

For tag-driven workflows:

```yaml
on:
  push:
    tags:
      - "v*.*.*"
```

For reusable workflows:

```yaml
on:
  workflow_call:
```

## Concurrency

For CI (validate, build, test on PRs and feature branches):

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

For tag, release, publish, and deploy workflows — never cancel in-progress
runs. Cancelling mid-publish can leave half-pushed images, partially
uploaded packages, or an unfinished release:

```yaml
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
```

For `workflow_dispatch` maintenance jobs (cleanup, backfill), use a
single-flight group without cancellation:

```yaml
concurrency:
  group: maintenance-${{ github.workflow }}
  cancel-in-progress: false
```

## Timeouts

Always set `timeout-minutes` at the job level. Pick by job type:

| Job type                                  | Suggested timeout |
| ----------------------------------------- | ----------------- |
| Lint, format, fast unit tests             | 10                |
| Standard build/test                       | 15–20             |
| Docker build/push, multi-arch images      | 30–45             |
| Maven/Gradle publish, full integration    | 30–60             |
| Helm chart release, multi-step publishing | 30                |
| Security scans (SBOM, CVE scan)           | 20–30             |

Do not omit `timeout-minutes` — the default (360 minutes) is too long
and turns a hung job into wasted minutes.

## Matrix strategy

Use a matrix when the same job needs to run across multiple versions,
OSes, or build variants:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [20, 22]
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<sha>  # vX.Y.Z
      - uses: actions/setup-node@<sha>  # vX.Y.Z
        with:
          node-version: ${{ matrix.node-version }}
```

Rules:

- Set `fail-fast: false` when each cell is independent and you want full
  signal across the matrix. Keep the default `true` only when one
  failure invalidates the rest.
- Use `include:` to add specific extra combinations and `exclude:` to
  drop unsupported ones — do not enumerate by hand.
- Keep matrix dimensions small. Rows × columns × variants explodes
  runner usage.
- For a required status check on a matrix job, add a single
  `matrix-complete` job with `needs: test` so branch protection has one
  stable check name to gate on.

## Config-driven matrix

A common Qubership pattern: a resolver action reads a config file in one job,
emits a JSON array as a job output, and a downstream job consumes it as `matrix:`.
Used in `docker-release`, `helm-charts-release`, and the `dev-docker-build-multiple-images` template.

For Docker multi-image builds use `docker-config-resolver` (reads `.qubership/docker.cfg`).
For Helm releases use `charts-values-update-action`. Do not parse config files manually with `jq` — use the appropriate resolver action.

Shape:

```yaml
jobs:
  resolve-config:
    runs-on: ubuntu-latest
    outputs:
      components: ${{ steps.resolve.outputs.components }}
    steps:
      - uses: actions/checkout@<sha>  # vX.Y.Z
        with:
          persist-credentials: false
      - id: resolve
        uses: netcracker/qubership-workflow-hub/actions/docker-config-resolver@<sha>  # vX.Y.Z
        with:
          file-path: .qubership/docker.cfg

  build:
    needs: resolve-config
    runs-on: ubuntu-latest
    strategy:
      fail-fast: true
      matrix:
        component: ${{ fromJson(needs.resolve-config.outputs.components) }}
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/docker-action@<sha>  # vX.Y.Z
        with:
          component: ${{ toJson(matrix.component) }}
          platforms: ${{ matrix.component.platforms }}
```

Rules:

- Emit nested objects via `toJson(matrix.component)` so nested structures survive the matrix boundary.
- Use `fail-fast: true` when one bad component invalidates the release; `false` when each is independent.
- Keep config files under `.qubership/` per org convention
  (`.qubership/docker.cfg`, `.qubership/helm-charts-release-config.yaml`).

## Dry-run release stages

For destructive release workflows (publish to Maven Central / npm /
PyPI / push tags), gate the real publish behind a dry-run job:

```yaml
jobs:
  dry-run:
    name: Dry Run Build and Publish
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/maven-release@<sha>  # vX.Y.Z
        with:
          dry-run: "true"
          # ... other inputs ...

  deploy:
    name: Build and Publish
    needs: [dry-run]
    if: ${{ needs.dry-run.result == 'success' }}
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: netcracker/qubership-workflow-hub/actions/maven-release@<sha>  # vX.Y.Z
        with:
          dry-run: "false"
          # ... same inputs as dry-run ...
```

Rules:

- Pass `dry-run` as a string (`"true"` / `"false"`) to Qubership actions
  unless the action README documents a boolean input.
- Keep dry-run and deploy `with:` blocks identical except the `dry-run`
  flag — divergence defeats the purpose.
- For publish workflows (Maven Central, npm, PyPI): place tag creation
  **after** the deploy job. Creating a tag before publish leaves an orphan
  tag if the publish fails.
- For Docker + GitHub Release workflows: place tag creation **before** the
  build, per `release.md` → *Critical rule: tag before build*.
- Use `if: ${{ needs.dry-run.result == 'success' }}` rather than relying
  on default `needs:` short-circuit when you want explicit gating.

## Reusable workflow inputs and secrets

This section is for designing **the user's own** reusable workflows
(workflows in their repo that will be called by other workflows).
Qubership-published reusable workflows (`re-*.yml` in
`netcracker/qubership-workflow-hub`) are **out of scope** of this skill
set — consume them as documented, but do not redesign them here.

For workflows triggered by `workflow_call`, declare the contract
explicitly. Callers can only pass what is declared:

```yaml
on:
  workflow_call:
    inputs:
      environment:
        description: Target deployment environment
        required: true
        type: string
      dry-run:
        description: Skip side-effecting steps
        required: false
        type: boolean
        default: false
      image-tag:
        description: Image tag to deploy
        required: false
        type: string
        default: latest
    secrets:
      REGISTRY_TOKEN:
        description: Token for the package registry
        required: true
      DEPLOY_KEY:
        required: false
    outputs:
      deployed-version:
        description: Version that was deployed
        value: ${{ jobs.deploy.outputs.version }}
```

Rules:

- Always set `type:` for inputs (`string`, `boolean`, `number`).
- Always include `description:` for inputs and secrets — it surfaces in
  the GitHub UI and reusable-workflow callers.
- Mark side-effecting inputs (`dry-run`, `force`) as `boolean` with a
  safe default (`false`).
- Pass secrets explicitly from the caller — `secrets: inherit` is
  convenient but leaks every secret in scope. Prefer named pass-through:

  ```yaml
  jobs:
    call:
      uses: org/repo/.github/workflows/re-deploy.yml@<sha>
      with:
        environment: production
      secrets:
        REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
  ```
- Declare `outputs:` at the workflow level when the caller needs a
  result. Wire them from a job output via `value:`.

## Artifacts

Use artifacts when passing generated files between jobs.

Use standard artifact actions only when no Qubership action is intended for that operation:

```yaml
- uses: actions/upload-artifact@<sha>  # vX.Y.Z
  with:
    name: build-output
    path: dist/
```
