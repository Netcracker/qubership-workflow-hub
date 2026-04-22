# Qubership Workflow Hub — CLAUDE.md

Enterprise monorepo of reusable GitHub Actions and Workflows maintained by Netcracker.
Centralises common CI/CD tasks (tagging, versioning, Docker builds, Maven/npm/Python publishing,
package cleanup, Helm chart releases, custom events) so individual repos don't need to
duplicate pipeline scripts.

---

## Repository structure

```
actions/          — 22 individual GitHub Actions (each self-contained)
packages/         — Shared internal packages used by Node.js actions
  action-logger/  — Lightweight colored logger (@qubership/action-logger)
.github/
  workflows/      — Reusable workflows (re-*.yml) + test workflows (test-*.yml)
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
No build step. Logic lives entirely in `action.yml` steps (shell, Python scripts, or calls
to other actions).

Actions: all others (tag-action, docker-action, branch-action, wait-for-workflow,
smart-download, chart-version, charts-values-update-action, cdxgen, etc.)

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

| Area | Rule |
|------|------|
| Version pins | Latest release tag (run `git tag --list 'v*' --sort=-version:refname | head -1`) or SHA — never `@main` in production |
| Permissions | Start with `contents: read`; elevate only where needed |
| Input names | `kebab-case` — e.g. `dry-run`, `force-create` |
| Output names | Short singular nouns — e.g. `version`, `tag`, `digest` |
| Org name in refs | Always `netcracker` lowercase — never `Netcracker` |
| Boolean inputs | Default `false`; name describes the feature when enabled |
| Dry-run | Offer `dry-run: true` for any action that writes/pushes |
| Secrets | Never echo; never use `set -x` near secrets |
| Breaking changes | Open issue first → deprecate → new major tag → keep old stable |

---

## Documentation layout

| Location | Contains |
|----------|----------|
| `actions/{name}/README.md` | Full usage docs for each action |
| `docs/reusable/{name}.md` | Full usage docs for each reusable workflow |
| `docs/actions-workflows-catalog.md` | Index of all active + deprecated actions/workflows |
| `docs/standards-and-change-policy.md` | Naming rules, version pinning, deprecation lifecycle |
| `docs/secrets-and-vars.md` | Org-level secrets reference |
| `docs/getting-started.md` | How to consume actions and workflows |

When changing an action's inputs or outputs, **always update its README and the catalog**.

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

| Command | What it does |
|---------|-------------|
| `/doc-updater <action-name\|workflow-name> [N\|--full]` | Update or create docs for a specific action or reusable workflow. Uses last N commits diff (default: 1), or `--full` for full resync of current code vs docs without git diff. |
| `/update-docs [N]` | Scan last N commits (default: 1), find all changed actions/workflows, update their docs and catalog. |

### Skill files

```
.claude/
  commands/
    doc-updater.md    — /doc-updater slash command
    update-docs.md    — /update-docs slash command
  skills/
    doc-updater/
      SKILL.md        — full doc-updater logic (parse, analyse, generate, sync catalog)
    update-docs/
      SKILL.md        — scan N commits, extract targets, invoke doc-updater logic
```

---

## What NOT to do

- Do not use `@main` in workflow examples or documentation — always use the latest release tag (check with `git tag --list 'v*' --sort=-version:refname | head -1`)
- Do not add required inputs without treating it as a breaking change
- Do not rename or remove existing inputs/outputs without a deprecation cycle
- Do not commit `node_modules/`
- Do not modify deprecated catalog entries
- Do not escalate permissions beyond what the action actually needs
