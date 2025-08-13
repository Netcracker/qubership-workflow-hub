# Getting Started

General instructions for using the actions and reusable workflows from this repository and for creating your own.

## 1. Basic project structure
Minimal directories in your repository:
```
your-repo/
  .github/
    workflows/          # Workflow definition files (YAML)
    actions/ (optional)  # Your own local actions (composite / js)
  README.md
```

If you create a local reusable workflow, it also lives in `.github/workflows/*.yml` and is marked with `on: workflow_call`.

## 2. Using an action from this hub
Example: using tag-action (pin by major version or exact SHA is recommended):
```yaml
name: Tag Release
on:
  workflow_dispatch:

jobs:
  tag:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Create tag
        uses: netcracker/qubership-workflow-hub/actions/tag-action@v1
        with:
          tag-name: v1.2.3
```

## 3. Composition: metadata-action + tag-action
```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Compute metadata
        id: meta
        uses: netcracker/qubership-workflow-hub/actions/metadata-action@v1
        with:
          version-strategy: auto
      - name: Tag
        uses: netcracker/qubership-workflow-hub/actions/tag-action@v1
        with:
          tag-name: "v${{ steps.meta.outputs.version }}"
```

## 4. Using a reusable workflow from the hub
A reusable workflow is a file in `.github/workflows/` in the source repository with `on: workflow_call`.
```yaml
name: Draft Release
on:
  workflow_dispatch:

jobs:
  draft:
    uses: netcracker/qubership-workflow-hub/.github/workflows/release-drafter.yaml@v1
    with:
      config-file: .github/release-drafter.yml
```

## 5. Creating your own reusable workflow
Example local file `.github/workflows/build-and-test.yml`:
```yaml
name: build-and-test
on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
    secrets:
      NPM_TOKEN:
        required: false
    outputs:
      test-summary:
        description: "Test result line"
        value: ${{ jobs.tests.outputs.summary }}

jobs:
  tests:
    runs-on: ubuntu-latest
    outputs:
      summary: ${{ steps.result.outputs.summary }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test -- --reporter=min
      - id: result
        run: echo "summary=All tests passed" >> $GITHUB_OUTPUT
```
Call this workflow from another repository:
```yaml
jobs:
  ci:
    uses: your-org/your-repo/.github/workflows/build-and-test.yml@v1
    with:
      node-version: '22'
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 6. Local composite action (optional)
`your-repo/.github/actions/setup-env/action.yml`:
```yaml
name: setup-env
runs:
  using: composite
  steps:
    - run: echo "Node $(node -v)" >> $GITHUB_STEP_SUMMARY
      shell: bash
```
Usage:
```yaml
      - uses: ./.github/actions/setup-env
```

## 7. Permissions / tokens
Minimize permissions:
```yaml
permissions:
  contents: read
  packages: write
  id-token: write   # if you need OIDC federation
```
Elevate `contents: write` only for operations that need to create tags, releases, or commits.

## 8. Dry‑run and debug
Many actions accept `dry-run: true` and `debug: true` — run in dry‑run first before production.

## 9. Version strategy
Use a `@v1` major tag or an exact SHA; update when necessary.

## 10. Structuring a monorepo
If you have many internal workflows and actions:
```
repo/
  actions/                 # Published actions (like in this hub)
  .github/
    workflows/             # Reusable + consuming workflows
    actions/               # Local composite actions
  docs/                    # Documentation (this structure)
```

## 11. Helpful GitHub Docs links
- Actions Overview: https://docs.github.com/actions
- Creating Actions: https://docs.github.com/actions/creating-actions
- Composite Actions: https://docs.github.com/actions/creating-actions/creating-a-composite-action
- Reusable Workflows: https://docs.github.com/actions/using-workflows/reusing-workflows
- Workflow Syntax: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- Permissions: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#permissions
- Contexts & Expressions: https://docs.github.com/actions/learn-github-actions/contexts
- Caching Dependencies: https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows
- Security Hardening: https://docs.github.com/actions/security-guides/security-hardening-for-github-actions

---
