# 🚀 Config Resolver

Reads a JSON configuration file, validates it against the selected schema, normalizes it, and
outputs flat JSON ready for use in CI/CD workflows. By default it resolves the Docker
components format (`docker/v1`) — the same behaviour as
[docker-config-resolver](../docker-config-resolver/README.md), making this action a drop-in
replacement. Any other schema is resolved generically: the file is flattened into prefixed
keys with no schema-specific fields required.

---

## Features

- **Schema-aware:** the `schema` input (or a top-level `"schema"` field in the file) selects
  the resolver mode; files without a schema are resolved as `docker/v1`.
- **`docker/v1` mode:** validates components, auto-generates `image` paths, merges `defaults`
  and `security` settings — identical output to `docker-config-resolver`.
- **Generic mode** for any other schema: no schema-specific fields are known or required —
  nested objects are flattened into prefixed keys (`sonar.skip` → `sonar_skip`), arrays are
  preserved, and key collisions fail loudly instead of silently overwriting values.
- **Validation only:** the action validates and normalizes configuration; it never decides
  which workflow jobs or steps to run or skip — that stays in the consuming workflow.
- **Fail-fast:** missing file, malformed JSON, schema mismatch, and structural errors all fail
  with actionable messages.

---

## 📌 Inputs

| Name        | Description                                                                                                                                                                   | Required | Default                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------- |
| `file-path` | Path to the configuration file (JSON). Must exist — the action fails if not found.                                                                                             | No       | `.qubership/docker.cfg` |
| `schema`    | Schema to resolve with. Empty or `docker/v1` resolves the Docker components format; any other value resolves the file generically. Must match the file's `schema` field if both are set. | No       | `""`                    |

---

## 📌 Outputs

| Name     | Description                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config` | Resolved configuration as compact flat JSON. For `docker/v1`: an array of component objects. For generic schemas: the flattened file content (object or array, matching the root). |
| `schema` | Effective schema id the configuration was resolved with — `docker/v1` when no schema is declared anywhere, otherwise the selected/declared schema.                                |

---

## How it works

### Schema selection

The resolver mode is selected explicitly, with Docker as the default:

1. The `schema` **input** on the action (highest priority).
2. Otherwise, a top-level `"schema"` field declared inside the file.
3. Otherwise — the file is resolved as `docker/v1`.

If both the input and the file declare a schema and they differ, the action fails with
`Schema mismatch` — this protects against pointing a workflow at the wrong file.

### Schema: `docker/v1` (default)

For each entry in `components` the action builds a resolved object by:

1. Deriving the `image` field from `registry`, `github.repository_owner`, and `component.name`.
2. Merging global `defaults` with the component object (component fields override defaults).
3. Merging global `security` with `component.security` (component fields override global), then
   renaming every key to `security_<key>` (e.g. `scan` → `security_scan`).
4. Dropping the raw `security` block from the output (replaced by the prefixed fields).

A `components` key is required — a file without it fails with a hint to declare a schema
instead of silently resolving to an empty array.

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

See [docker-config-resolver](../docker-config-resolver/README.md) for the full description of
the Docker components file format — the format and the resolved output are identical.

### Any other schema — generic resolution

The action does **not** hardcode fields for non-Docker schemas — any payload is accepted.
The file is validated as JSON and normalized to flat form:

- nested objects are flattened into prefixed keys, at any depth:
  `sonar.quality.gate` → `sonar_quality_gate`;
- arrays are preserved as arrays; object elements inside arrays are flattened the same way;
- a key collision after flattening (e.g. both `sonar.skip` and a literal `sonar_skip` key)
  fails with an error naming the colliding key;
- the file root must be a JSON object or array.

**Example — input config (e.g. `.qubership/workflow-policy.cfg`):**

```json
{
  "schema": "workflow-policy/v1",
  "restricted-actor-ids": ["49699333", "29139614"],
  "sonar": { "skip": true, "quality": { "gate": "strict" } },
  "envs": [ { "name": "dev", "meta": { "region": "eu" } }, "prod" ]
}
```

**Resolved `config` output:**

```json
{
  "schema": "workflow-policy/v1",
  "restricted-actor-ids": ["49699333", "29139614"],
  "sonar_skip": true,
  "sonar_quality_gate": "strict",
  "envs": [ { "name": "dev", "meta_region": "eu" }, "prod" ]
}
```

---

## Additional Information

### Configuration File Format

The configuration file must be valid **JSON**. YAML is not supported — `jq` is used to parse
the file and it requires JSON input.

The top-level `"schema"` field is optional in every mode:

| Field    | Required | Description                                                                                    |
| -------- | -------- | ----------------------------------------------------------------------------------------------- |
| `schema` | No       | Schema id (e.g. `docker/v1`, `workflow-policy/v1`). Must match the `schema` input if both set. |

For `docker/v1` the remaining fields (`registry`, `defaults`, `security`, `components`) are
described in [docker-config-resolver](../docker-config-resolver/README.md) — the format and
the resolved output are identical. For any other schema the content is free-form JSON.

### Using the Output with docker-action

In `docker/v1` mode the `config` output is directly compatible with the `component` input of
`docker-action`:

```yaml
- id: resolve
  uses: netcracker/qubership-workflow-hub/actions/config-resolver@8c6dbeb901920bae9f40d7d7b646d8d9127e1ce7 # v2.4.0

- uses: netcracker/qubership-workflow-hub/actions/docker-action@8c6dbeb901920bae9f40d7d7b646d8d9127e1ce7 # v2.4.0
  with:
    component: ${{ steps.resolve.outputs.config }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Branching on the Effective Schema

The `schema` output lets a workflow branch without re-parsing the file:

```yaml
- id: resolve
  uses: netcracker/qubership-workflow-hub/actions/config-resolver@8c6dbeb901920bae9f40d7d7b646d8d9127e1ce7 # v2.4.0
  with:
    file-path: .qubership/my.cfg

- name: Docker-specific step
  if: steps.resolve.outputs.schema == 'docker/v1'
  run: echo "docker mode"
```

---

## Usage

### Docker components (default mode)

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
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Resolve Docker Configuration
        id: resolver
        uses: netcracker/qubership-workflow-hub/actions/config-resolver@8c6dbeb901920bae9f40d7d7b646d8d9127e1ce7 # v2.4.0
        with:
          file-path: .qubership/docker.cfg

  build:
    needs: resolve
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        component: ${{ fromJson(needs.resolve.outputs.config) }}
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - uses: docker/build-push-action@263435318d21b8e681c14492fe198d362d7b3ec2 # v6.18.0
        with:
          context: ${{ matrix.component.context }}
          file: ${{ matrix.component.dockerfile }}
          tags: ${{ matrix.component.image }}:${{ github.sha }}
          platforms: ${{ matrix.component.platforms }}
```

### Generic schema — workflow policy example

The resolver only normalizes the file; evaluating the result (e.g. forcing a Docker dry-run
for restricted actors) is the consuming workflow's responsibility:

```yaml
jobs:
  policy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      restricted: ${{ steps.check.outputs.restricted }}
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Resolve Workflow Policy
        id: resolve
        uses: netcracker/qubership-workflow-hub/actions/config-resolver@8c6dbeb901920bae9f40d7d7b646d8d9127e1ce7 # v2.4.0
        with:
          file-path: .qubership/workflow-policy.cfg
          schema: workflow-policy/v1

      - name: Evaluate Actor
        id: check
        env:
          CONFIG: ${{ steps.resolve.outputs.config }}
          ACTOR_ID: ${{ github.actor_id }}
          PR_AUTHOR_ID: ${{ github.event.pull_request.user.id }}
        run: |
          RESTRICTED=false
          for id in "$ACTOR_ID" "$PR_AUTHOR_ID"; do
            [ -n "$id" ] || continue
            if echo "$CONFIG" | jq -e --arg id "$id" '."restricted-actor-ids" // [] | index($id)' > /dev/null; then
              RESTRICTED=true
            fi
          done
          echo "restricted=$RESTRICTED" >> "$GITHUB_OUTPUT"
```

Checking `github.event.pull_request.user.id` in addition to `github.actor_id` matters because
a human may rerun or synchronize a pull request that was authored by a bot.

---

## Notes

- The configuration file must be valid **JSON** — YAML is not supported.
- The action **fails immediately** if the config file does not exist at `file-path`. Ensure the
  file is present in the checked-out repository before this step runs.
- Configuration files must **not** contain secrets — the resolved configuration is printed to
  the workflow log in pretty-printed JSON.
- In `docker/v1` mode this action is a drop-in replacement for `docker-config-resolver`: same
  default `file-path`, identical `config` output for the same file.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@8c6dbeb901920bae9f40d7d7b646d8d9127e1ce7 # v2.4.0`. The SHA is the immutable pin; the
  comment shows which release it points to. Tags alone are mutable. Never use `@main` or
  short SHAs.

---

## Troubleshooting

- **`Config file not found`:** the file at `file-path` does not exist. Check the path and ensure
  `actions/checkout` ran before this action.
- **`Config file is not valid JSON`:** the file failed to parse. Validate it locally with
  `jq . <file>`.
- **`Schema mismatch`:** the `schema` input and the file's `schema` field disagree. Point the
  action at the right file or fix the declared schema.
- **`docker/v1: "components" is required`:** the file was resolved in Docker mode but has no
  `components` key. If it is not a Docker config, declare `"schema"` in the file or pass the
  `schema` input.
- **`component.name is required`:** one or more entries in `components` are missing the `name`
  field or have it set to `null` / empty string. Add a `name` to every component.
- **`key collision after flattening`:** the file contains both a nested key and a literal key
  that flatten to the same name (e.g. `sonar.skip` and `sonar_skip`). Rename one of them.
- **`configuration root must be a JSON object or array`:** generic mode requires the file root
  to be an object or array — scalars are rejected.
