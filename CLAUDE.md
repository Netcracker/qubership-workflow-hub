# Qubership Workflow Hub — CLAUDE.md

Enterprise monorepo of reusable GitHub Actions and Workflows maintained by Netcracker.
Centralises common CI/CD tasks (tagging, versioning, Docker builds, Maven/npm/Python publishing,
package cleanup, Helm chart releases, custom events) so individual repos don't need to
duplicate pipeline scripts.

---

## Repository structure

```text
actions/          — 23 individual GitHub Actions (each self-contained)
packages/         — Shared internal packages used by Node.js actions
  action-logger/  — Lightweight colored logger (@qubership/action-logger)
.github/
  workflows/      — Reusable workflows (re-*.yml) + test workflows (test-*.yml)
.qubership/       — Qubership-specific configuration files (docker.cfg, hardening rules, etc.)
docs/
  reusable/       — Documentation for each reusable workflow
  *.md            — Repo-wide guides (standards, secrets, contributing)
.claude/
  commands/       — Slash commands (invoke via /command-name)
  skills/         — Skill logic loaded by commands
```

---

## Action types

There are two kinds of actions in this repo:

### Node.js actions (`runs.using: node24`)

Have `src/`, `dist/`, `package.json`, `package-lock.json`.

Actions: `metadata-action`, `cla-assistant`, `container-package-cleanup`,
`custom-event`, `assets-action`, `pr-assigner`

**Build:** `npm run build` — bundles `src/index.js` → `dist/index.js` via esbuild.
**Test:** `npm run test` — Jest with `--experimental-vm-modules`.
**Important:** `dist/` is **committed to git** — it is what GitHub Actions executes.
Always rebuild and commit `dist/` after changing `src/`.

### Composite actions (`runs.using: composite`)

No build step. Logic lives entirely in `action.yml` (or `action.yaml`) steps — shell scripts,
Python scripts, or calls to other actions. Some actions include additional files in their
directory (e.g. `*.py`, `*.sh`, `*.yaml` config) that are referenced from steps.

Actions: all others (tag-action, docker-action, branch-action, wait-for-workflow,
smart-download, chart-version, charts-values-update-action, cdxgen, etc.)

**Note:** 8 composite actions use the `.yaml` extension (`action.yaml`) instead of `.yml`.
When writing glob patterns or searching for action definitions, match both:
`actions/*/action.yml` and `actions/*/action.yaml`.

---

## Build & test commands

Run these from inside the specific action directory (e.g. `actions/metadata-action/`):

```bash
npm install        # install dependencies (first time or after package.json changes)
npm run build      # bundle src/ → dist/index.js
npm run test       # run Jest tests
```

No repo-root build script — each action is built independently.

---

## Key conventions (from docs/standards-and-change-policy.md)

| Area             | Rule                                                           |
| ---------------- | -------------------------------------------------------------- |
| Version pins     | Latest release tag or SHA — never `@main` in production        |
| Permissions      | Start with `contents: read`; elevate only where needed         |
| Input names      | `kebab-case` — e.g. `dry-run`, `force-create`                  |
| Output names     | Short singular nouns — e.g. `version`, `tag`, `digest`         |
| Org name in refs | Always `netcracker` lowercase — never `Netcracker`             |
| Boolean inputs   | Default `false`; name describes the feature when enabled       |
| Dry-run          | Offer `dry-run: true` for any action that writes/pushes        |
| Secrets          | Never echo; never use `set -x` near secrets                    |
| Breaking changes | Open issue first → deprecate → new major tag → keep old stable |

---

## Documentation layout

| Location                              | Contains                                             |
| ------------------------------------- | ---------------------------------------------------- |
| `actions/{name}/README.md`            | Full usage docs for each action                      |
| `docs/reusable/{name}.md`             | Full usage docs for each reusable workflow           |
| `docs/actions-workflows-catalog.md`   | Index of all active + deprecated actions/workflows   |
| `docs/standards-and-change-policy.md` | Naming rules, version pinning, deprecation lifecycle |
| `docs/secrets-and-vars.md`            | Org-level secrets reference                          |
| `docs/getting-started.md`             | How to consume actions and workflows                 |

When changing an action's inputs or outputs, **always update its README and the catalog**.

When reading a composite action for doc generation, also read any co-located scripts
(`*.py`, `*.sh`) — they contain logic not visible in `action.yml`/`action.yaml` alone.

---

## Shared package

`packages/action-logger/` provides `@qubership/action-logger` — a lightweight colored
logger for GitHub Actions. Node.js actions reference it as a local file dependency:

```json
"@qubership/action-logger": "file:../../packages/action-logger"
```

---

## Code style

- **Formatter:** Biome (`biome.json` at root) — covers all files except `dist/`
- **EditorConfig:** UTF-8, spaces, LF for shell/Python/Go, CRLF for `.bat`/`.cmd`
- **Python:** Black profile (via `.editorconfig`)
- **Shell scripts:** 4-space indent, LF line endings

---

## Claude Code skills

| Command                            | What it does                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/doc-update <target> [N\|--full]` | Update or create docs for a specific action or reusable workflow. Uses last N commits diff (default: 1), or `--full` for full resync. |
| `/sync-docs [N]`                   | Scan last N commits (default: 1), find all changed actions/workflows, update their docs and catalog.                                  |
| `/pr [update] [base-branch]`       | Generate PR title and body following project conventions, then create or update the PR via `gh`. Runs lint audit before creating.     |
| `/workflow-audit [files...]`       | Audit workflow and action yml files for security issues (zizmor ruleset) and fix violations.                                          |
| `/md-lint [files...]`              | Audit `.md` files for markdownlint violations (full 50-rule coverage) and fix them.                                                   |
| `/lint [base-branch]`              | Run markdown and zizmor audits on all changed files, fix violations, commit fixes.                                                    |

### Skill files

```text
.claude/
  commands/
    doc-update.md      — /doc-update slash command
    sync-docs.md       — /sync-docs slash command
    pr.md              — /pr slash command
    workflow-audit.md    — /workflow-audit slash command
    md-lint.md         — /md-lint slash command
    lint.md            — /lint slash command
  skills/
    doc-update/
      SKILL.md        — full doc-update logic (parse, analyse, generate, sync catalog)
    sync-docs/
      SKILL.md        — scan N commits, extract targets, invoke doc-update logic
    pull-request/
      SKILL.md        — generate PR title/body, create or update PR via gh CLI
    zizmor/
      SKILL.md        — audit workflow/action yml files for security issues, fix violations
    md-lint/
      SKILL.md        — full markdownlint rule coverage (50 rules), audit and fix .md files
    lint/
      SKILL.md        — run markdown + zizmor audits, fix violations, commit fixes
```

---

## What NOT to do

- Do not use `@main` in workflow examples or documentation — always use the latest release tag
  (check with `git tag --list 'v*' --sort=-version:refname | head -1`)
- Do not add required inputs without treating it as a breaking change
- Do not rename or remove existing inputs/outputs without a deprecation cycle
- Do not commit `node_modules/`
- Do not modify deprecated catalog entries
- Do not escalate permissions beyond what the action actually needs
