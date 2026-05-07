# Release — tags, GitHub Releases, and assets

This guide applies to any domain (Docker, Helm, Maven, npm, Python, etc.).
Load it whenever the workflow needs to create a Git tag, a GitHub Release, or upload release assets.

## Clarifying questions

General workflow questions are collected in Step 0 of `SKILL.md`. Ask only the release-specific questions below.

| # | Question | What it controls |
| - | --- | --- |
| 1 | Should the workflow create a Git tag, or does the tag already exist? | Creating → `tag-action` with `create-tag: true`. Already exists → skip `tag-action`. |
| 2 | Should a GitHub Release be created? If yes — minimal release or with auto-generated changelog from PR history? | Minimal → `tag-action` with `create-release: true`. Changelog → `release-drafter` (requires `.github/release-drafter-config.yml` in the repo). |
| 3 | Should release assets be uploaded? | Yes → `assets-action`. |
| 4 | Where do the assets come from? | Build artifacts produced during the workflow (jars, tgz, zips, binaries) → `upload-artifact` in producer job + `download-artifact` before `assets-action`, no `checkout` needed. Files already in the repo → `checkout` at the release tag is enough. |

---

## Patterns

### Tag only

```
tag-action (check)  →  tag-action (create)
verify tag absent      creates vX.Y.Z tag
```

Use when only a Git tag is needed, no GitHub Release page.

---

### Tag + minimal GitHub Release

```
tag-action (check)  →  tag-action (create, create-release: true)
verify tag absent      creates tag and empty GitHub Release
```

`tag-action` with `create-release: true` creates both in one step.
Release body will be empty — edit manually afterwards if needed.

---

### Tag + GitHub Release with changelog (release-drafter)

```
tag-action (check)  →  tag-action (create)  →  release-drafter
verify tag absent      creates tag              generates changelog, publishes release
```

`release-drafter` reads PR titles and labels to build the changelog automatically.
**Requires** `.github/release-drafter-config.yml` in the repo.
Ask the user if it exists. If not — generate the default config below and write it to `.github/release-drafter-config.yml`.

`release-drafter` inputs:
- `config-name: release-drafter-config.yml`
- `publish: true`
- `name: ${{ inputs.release }}`
- `tag: v${{ inputs.release }}`
- `version: ${{ inputs.release }}`
- `commitish:` — branch or ref the release points to

Action ref: `netcracker/release-drafter@<sha>  # v1.0.0`

### Default `release-drafter-config.yml`

Generate and write to `.github/release-drafter-config.yml` if the file doesn't exist:

```yaml
name-template: 'v$RESOLVED_VERSION'
tag-template: 'v$RESOLVED_VERSION'

categories:
  - title: '💥 Breaking Changes'
    labels:
      - breaking-change
  - title: '💡 New Features'
    labels:
      - feature
      - enhancement
  - title: '🐞 Bug Fixes'
    labels:
      - bug
      - fix
      - bugfix
  - title: '⚙️ Technical Debt'
    labels:
      - refactor
  - title: '📝 Documentation'
    labels:
      - documentation

change-template: "- (#$NUMBER) $TITLE by @$AUTHOR"

no-changes-template: 'No significant changes'

template: |
  ## 🚀 Release

  ### What's Changed
  $CHANGES

  ---

  **Full Changelog**: https://github.com/$OWNER/$REPOSITORY/compare/$PREVIOUS_TAG...v$RESOLVED_VERSION

version-resolver:
  major:
    labels:
      - major
  minor:
    labels:
      - minor
  patch:
    labels:
      - patch
  default: patch
```

Version bump is determined by PR labels: `major`, `minor`, `patch`. Default is `patch` if no label set.

---

### Tag + GitHub Release + assets from repo files

```
tag-action (check)  →  tag-action (create, create-release: true)  →  checkout (ref: tag)  →  assets-action
verify tag absent      creates tag and release                        fetch repo at tag       upload files
```

Use when assets are files committed to the repo (scripts, configs, docs).
`checkout` with `ref: v${{ inputs.release }}` fetches the tagged state.

---

### Tag + GitHub Release + assets from build artifacts

```
[producer job]                   [release job]                         [upload-assets job]
build  →  upload-artifact    →   tag-action (check)                →   download-artifact  →  assets-action
           saves to GHA           tag-action (create + release)         restores files        uploads to release
```

Use when assets are produced during the workflow (jars, .tgz chart packages, zips, binaries).
- `upload-artifact` in the producer job saves files to GitHub Actions storage
- `download-artifact` in the upload-assets job restores them — **no `checkout` needed**
- Pass `artifact-ids` output from the producer job to `download-artifact` for precision

This is the pattern used in Helm chart releases — `.tgz` packages produced by `charts-values-update-action`
are saved as artifacts and downloaded in the `github-release` job before `assets-action`.

---

## Key action inputs

### `tag-action`

| Input | Description |
| --- | --- |
| `ref` | Branch or commit to tag |
| `tag-name` | Tag name, e.g. `v${{ inputs.release }}` |
| `check-tag` | `true` — fail if tag already exists |
| `create-tag` | `true` — create the tag |
| `create-release` | `true` — also create a minimal GitHub Release |
| `tag-message` | Annotated tag message, e.g. `Release v1.2.3` |
| `dry-run` | `true` — simulate without pushing anything |
| `skip-checkout` | `true` — skip checkout if repo already checked out in a previous step |

**Always run check and create as separate steps or jobs.** Never combine `check-tag: true` and `create-tag: true` in one step.

### `assets-action`

| Input | Description |
| --- | --- |
| `tag` | Release tag to upload assets to |
| `item-path` | Comma-separated file paths or glob patterns, e.g. `./*.tgz` |
| `archive-type` | `zip` (default), `tar`, `tar.gz` — used when item is a directory |
| `retries` | Upload retry attempts, default `3` |

Requires `permissions: contents: write`.

---

## Permissions

| Job | Minimum permissions |
| --- | --- |
| Tag check only | `contents: read` |
| Create tag / release | `contents: write` |
| Upload assets | `contents: write` |
| release-drafter | `contents: write` |
