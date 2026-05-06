# Workflow patterns

Use this file for general workflow structure. The mandatory conventions
(pinning, permissions, anti-hallucination, naming, secrets, PR safety)
live in `SKILL.md` → *Mandatory conventions* and are not duplicated
here. The response contract lives in `SKILL.md` → *Core responsibility*
and *Preferred answer style*.

## Always output full workflow files

When creating a workflow for a user, return a complete YAML file, not a
partial snippet.

## Baseline CI shape

Use this shape for simple validation workflows:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@<sha>  # vX.Y.Z
```

Resolve `<sha>` to the latest stable release SHA at write time. Do not
copy `@v6`, `@v4`, etc. from this skill — those are placeholders.

Add language/tool steps or Qubership actions after checkout.

## Trigger rules

Use explicit triggers.

For pull request validation:

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

For manual workflows:

```yaml
on:
  workflow_dispatch:
```

For tag workflows:

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

## Job structure

Prefer clear jobs:

- `validate`
- `build`
- `scan`
- `publish`
- `tag`
- `release`
- `cleanup`

Use `needs:` when one job depends on another.

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

A common Qubership pattern: load a JSON/YAML config file in one job,
emit it as a job output, and consume it as a `matrix:` in a downstream
job. Used in `docker-release`, `helm-charts-release`, and the
`dev-docker-build-multiple-images` template.

> **Shape example only.** The Qubership action names and `with:` keys
> below are illustrative — they show the structure, not the contract.
> Before producing a final workflow, verify every action name, input,
> output, and required permission through `qubership-actions-guide`
> (read the action's README) or by forking from a current template
> via `qubership-templates-guide`.

Shape:

```yaml
jobs:
  load-config:
    runs-on: ubuntu-latest
    outputs:
      components: ${{ steps.load.outputs.components }}
      platforms: ${{ steps.load.outputs.platforms }}
    env:
      CONFIG_FILE: .qubership/docker-build-config.cfg
    steps:
      - uses: actions/checkout@<sha>  # vX.Y.Z
        with:
          persist-credentials: false
      - id: load
        run: |
          components=$(jq -c ".components" "$GITHUB_WORKSPACE/${CONFIG_FILE}")
          platforms=$(jq -c ".platforms" "$GITHUB_WORKSPACE/${CONFIG_FILE}")
          echo "components=${components}" >> $GITHUB_OUTPUT
          echo "platforms=${platforms}" >> $GITHUB_OUTPUT

  build:
    needs: load-config
    runs-on: ubuntu-latest
    strategy:
      fail-fast: true
      matrix:
        component: ${{ fromJson(needs.load-config.outputs.components) }}
    steps:
      - name: Build component
        uses: netcracker/qubership-workflow-hub/actions/docker-action@<sha>  # vX.Y.Z
        with:
          component: ${{ toJson(matrix.component) }}
          platforms: ${{ needs.load-config.outputs.platforms }}
```

Rules:

- Validate the config file before emitting it (`jq` schema check) — a
  malformed config should fail the loader job, not the matrix.
- Emit JSON via `toJson(matrix.component)` so nested structures survive.
- Use `fail-fast: true` when one bad component invalidates the release;
  `false` when each component is independent.
- Keep config files under `.qubership/` per org convention
  (`.qubership/docker.cfg`, `.qubership/docker-build-config.cfg`,
  `.qubership/helm-charts-release-config.yaml`).

## Dry-run release stages

For destructive release workflows (publish to Maven Central / npm /
PyPI / push tags), gate the real publish behind a dry-run job:

> **Shape example only.** The Qubership action names and `with:` keys
> below are illustrative — they show the gating structure, not the
> contract. Before producing a final workflow, verify every action name,
> input, output, and required permission through `qubership-actions-guide`
> (read the action's README) or by forking from a current template
> via `qubership-templates-guide`.

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
- Place tag creation **after** the deploy job, not before. Creating a
  tag pre-publish leaves an orphan tag if the publish fails.
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
