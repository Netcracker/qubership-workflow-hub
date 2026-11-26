# Cleanup — stale container images and Maven packages

## Template coverage

| Package type | Starting point |
| --- | --- |
| Container images | Fetch `cleanup-old-docker-container.yaml` from `Netcracker/.github/workflow-templates` and adapt it. |
| Maven packages | No template exists — build from scratch using the pipeline shape and inputs reference below. |

---

## Clarifying questions

Extract answers from the user's message first. Ask only what is missing.
Trigger and runner are inferred per `workflow-patterns.md` → *Trigger rules* — do not ask.

| Question | What it controls |
| --- | --- |
| Container images or Maven packages? | Determines which pipeline shape and filter logic to use |
| How many days to keep? | Maps to `threshold-days`. Default: `7` — apply without asking unless user specifies otherwise |
| Any tags/versions that must never be deleted? | Maps to `excluded-tags` (container) or `excluded-patterns` (Maven) |

---

## Action: `container-package-cleanup`

Auto-discovers all packages for the repo via `GITHUB_REPOSITORY` — no package list needed.

**Required env on the action step:**

```yaml
env:
  PACKAGE_TOKEN: ${{ secrets.GH_RWD_PACKAGE_TOKEN }}
```

`PACKAGE_TOKEN` must have `read:packages` + `delete:packages` scopes.
`GITHUB_TOKEN` does **not** have `delete:packages` — a dedicated PAT or GitHub App token is required.

**Permissions:** `contents: read` — the action operates only on the package registry, not repo contents.

---

## Container images

### Tag filter logic

Filters are applied in this order:

1. Candidates: all versions older than `threshold-days`
1. If `included-tags` is set — keep only versions whose tags match (wildcard `*` / `?` supported)
1. Remove any version whose tags match `excluded-tags` — these are never deleted regardless of age

**`excluded-tags` recommended value:**

```text
release*,semver,main,latest
```

- `release*` — any tag starting with "release"
- `semver` — special word (not a literal tag): matches version tags such as `1.2.3`, `v1.2.3` and `1.2.3-beta`, but not `dependabot-1.2.3`. It is a simplified match, not a strict SemVer check. Protects versioned release images
- `main`, `latest` — floating tags always kept

Broad patterns such as `*.*` or `*.*.*` match **any** tag that contains dots, including Dependabot tags like `dependabot-pip-2025.6.15`, so those images would never be deleted. Add them only when every tag with a dot must be kept; prefer `semver`.

These tag recommendations are for **container tags**. Do not copy them to Maven exclusions (see the Maven section): there `*.*` also matches `1.0.0-SNAPSHOT`.

### Pipeline shape (container)

When adapting the template, the canonical `workflow_dispatch` inputs block is:

```yaml
on:
  schedule:
    - cron: "0 0 * * 0"  # every Sunday at midnight
  workflow_dispatch:
    inputs:
      threshold-days:
        description: "Number of days to keep container versions"
        required: false
        default: "7"
      included-tags:
        description: "Tags to include for deletion"
        required: false
        default: "*"
      excluded-tags:
        description: "Tags to exclude from deletion"
        required: false
        default: "release*,semver,main,latest"  # semver protects versioned release images; *.* would also protect Dependabot tags
      dry-run:
        description: "Enable dry-run mode"
        required: false
        default: true
        type: boolean
      debug:
        description: "Enable debug mode"
        required: false
        default: false  # action default is true — set false to reduce log noise
        type: boolean
```

**Always set `dry-run: true` as the `workflow_dispatch` default.** Operators preview before committing to deletion. Scheduled runs can use `false` after filters are validated.

---

## Maven packages

No org template — build from scratch.

### Pattern logic

- No include filter (`included-patterns` and `included-tags` empty): action automatically targets `*SNAPSHOT*` only — safe default for most repos.
- Include filter **set**: only versions matching it are candidates; `*SNAPSHOT*` is not added automatically, so keep it in the list unless other versions should be deleted.
- `excluded-patterns` / `excluded-tags`: versions matching these are never deleted and always win over inclusions.
- Do not put `*.*` in Maven exclusions: it also matches `1.0.0-SNAPSHOT`, so nothing would be deleted. Release versions are already kept because they do not match the `*SNAPSHOT*` inclusion.
- `threshold-versions`: keep this many newest versions per package (default: `1`).

### `excluded-patterns` recommended value (Maven)

```text
latest,release*
```

- `latest` — floating version name, always kept
- `release*` — any version starting with "release"
- Do not add `*.*`: it matches every dotted version, including `1.0.0-SNAPSHOT`, so exclusions would protect all SNAPSHOT versions and nothing would be deleted. The action then writes a warning and the job summary section *Versions protected by excluded patterns*.

Release versions such as `1.2.3` need no exclusion: they do not match the `*SNAPSHOT*` inclusion.

### Migrating an existing Maven workflow

If an existing workflow passes `*.*` in `excluded-patterns`, remove it **before** updating the pinned version of the action. Older versions ignore the pattern inputs, newer versions apply them.

Before:

```yaml
with:
  package-type: maven
  included-patterns: '*SNAPSHOT*'
  excluded-patterns: 'latest,release*,*.*'
```

After:

```yaml
with:
  package-type: maven
  included-patterns: '*SNAPSHOT*'
  excluded-patterns: 'latest,release*'
```

### Common Maven use cases

| Goal | Configuration |
| --- | --- |
| Delete old SNAPSHOTs (default) | No patterns needed — `*SNAPSHOT*` is the automatic default |
| Delete old SNAPSHOTs but keep last 3 | `threshold-versions: 3` |
| Delete specific release versions | `included-patterns: "1.0.*"` |
| Protect a specific version | `excluded-patterns: "1.2.3-SNAPSHOT"` |

### Pipeline shape (Maven)

```yaml
on:
  schedule:
    - cron: "0 0 * * 0"  # every Sunday at midnight
  workflow_dispatch:
    inputs:
      threshold-days:
        description: "Number of days to keep versions"
        required: false
        default: "7"
      threshold-versions:
        description: "Number of newest versions to keep per package"
        required: false
        default: "1"
      included-patterns:
        description: "Patterns to include for deletion (default: *SNAPSHOT*)"
        required: false
        default: ""
      excluded-patterns:
        description: "Patterns to exclude from deletion"
        required: false
        default: "latest,release*"  # do not add *.* — it also matches SNAPSHOT versions
      dry-run:
        description: "Enable dry-run mode"
        required: false
        default: true
        type: boolean
      debug:
        description: "Enable debug mode"
        required: false
        default: false  # action default is true — set false to reduce log noise
        type: boolean
```

---

## Inputs reference

| Input | Action default | Description |
| --- | --- | --- |
| `package-type` | `container` | `container` or `maven` |
| `threshold-days` | `7` | Delete versions older than this many days |
| `threshold-versions` | `1` | *(Maven only)* Keep this many newest versions per package |
| `included-tags` | `""` | Only delete versions matching these tags/versions. Merged with `included-patterns`. Wildcard `*`/`?` supported |
| `excluded-tags` | `""` | Never delete versions matching these. Merged with `excluded-patterns`; exclusions always win |
| `included-patterns` | `""` | Merged with `included-tags`. For Maven, when no include filter is given: `*SNAPSHOT*` applied automatically |
| `excluded-patterns` | `""` | Merged with `excluded-tags`. Never delete versions matching these patterns |
| `dry-run` | `false` | Print what would be deleted without actually deleting. Accepts `true` or `false` in any letter case; an empty value means `false`; any other value fails the action. |
| `debug` | `true` | Extra debug logs — set `false` in production to reduce noise. Accepts `true` or `false` in any letter case; an empty value means `false`; any other value fails the action. |
| `batch-size` | `15` | Number of versions deleted in parallel per package. Positive integer; empty or `0` uses the default. Any other value (negative, `1.5`, non-numeric) fails the action before anything is deleted |
| `max-errors` | `5` | Stop after this many errors. Positive integer; empty or `0` uses the default. Any other value fails the action before anything is deleted |
