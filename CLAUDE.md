# Qubership Workflow Hub — CLAUDE.md

Enterprise monorepo of reusable GitHub Actions and Workflows maintained by Netcracker.
Centralises common CI/CD tasks (tagging, versioning, Docker builds, Maven/npm/Python publishing,
package cleanup, Helm chart releases, custom events) so individual repos don't need to
duplicate pipeline scripts.

---

## Repository structure

```text
actions/          — 24 individual GitHub Actions (each self-contained)
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
| `/doc-update <target>`             | Update or create docs for a specific action or reusable workflow based on `git diff main..HEAD`.                                      |
| `/doc-update --all`                | Find all changed actions/workflows from `git diff main..HEAD`, update their docs and catalog.                                         |
| `/pr [update] [base-branch]`       | Generate PR title and body following project conventions, then create or update the PR via `gh`. Runs lint audit before creating.     |
| `/workflow-audit [files...]`       | Audit workflow and action yml files for security issues (zizmor ruleset) and fix violations.                                          |
| `/md-lint [files...]`              | Audit `.md` files for markdownlint violations (full 50-rule coverage) and fix them.                                                   |

### Skill files

```text
.claude/
  commands/
    doc-update.md      — /doc-update slash command (includes --all mode)
    pr.md              — /pr slash command
    workflow-audit.md  — /workflow-audit slash command
    md-lint.md         — /md-lint slash command
  skills/
    doc-update/
      SKILL.md        — full doc-update logic (parse, analyse, generate, sync catalog; --all batch mode)
    pull-request/
      SKILL.md        — generate PR title/body, create or update PR via gh CLI
    zizmor/
      SKILL.md        — audit workflow/action yml files for security issues, fix violations
    markdown-rules/
      SKILL.md        — markdownlint rules from super-linter; apply when writing any .md file
```

---

## Markdown authoring rule

Before writing **or editing** any `.md` file — whether a new skill, guide, doc update, or
any partial edit — apply the full md-lint ruleset in-memory (all 50 rules from
`.claude/skills/markdown-rules/SKILL.md` step 3). Fix all violations before calling Write
or Edit. This prevents markdownlint CI failures.

---

## What NOT to do

- Do not use `@main` in workflow examples or documentation — always use the latest release tag
  (check with `git tag --list 'v*' --sort=-version:refname | head -1`)
- Do not add required inputs without treating it as a breaking change
- Do not rename or remove existing inputs/outputs without a deprecation cycle
- Do not commit `node_modules/`
- Do not modify deprecated catalog entries
- Do not escalate permissions beyond what the action actually needs

---

## APM skill package

The APM skill package for this repo lives at:

```text
agent-packages/qubership-workflow-hub-usage/.apm/skills/
```

These are **not** the same as `.claude/skills/` — the three APM skills do not exist in `.claude/skills/`.

### Three-layer model

| Layer | File |
| --- | --- |
| Orchestration + conventions | `qubership-workflow-conventions/SKILL.md` |
| Action catalog + routing | `qubership-actions-guide/SKILL.md` |
| Domain guides | `qubership-actions-guide/<domain>.md` |

Domain guides: `docker.md`, `helm.md`, `security.md`, `release.md`, `notifications.md`,
`maven.md`, `cleanup.md`, `utilities.md`, `pr.md`, `cla.md`

### Update order when changing an action

1. `actions/<name>/README.md`
2. `qubership-actions-guide/<domain>.md`
3. Catalog table in `qubership-actions-guide/SKILL.md`
4. Path A + Path B in `qubership-workflow-conventions/SKILL.md` — only if the route changes

### Checklist

- [ ] Action README updated
- [ ] Catalog line updated
- [ ] Domain guide updated (or new guide created if new domain)
- [ ] Path A and Path B in conventions cover the guide
- [ ] Pin table SHA updated; grep old SHA across `agent-packages/` to catch drift

### Pinning

- `netcracker/qubership-workflow-hub`: resolve SHA dynamically via GitHub API at use time — never hardcode.
- Third-party actions: hardcoded in Pin table in `qubership-actions-guide/SKILL.md`, update manually on upgrade.

### No-duplication rule

- Security rules, pinning policy, permissions → `qubership-workflow-conventions/SKILL.md` only
- Pipeline patterns, clarifying questions → domain guide files
- Action inputs/outputs → action `README.md` is the source of truth

### Support playbook

Treat the two skill systems separately:

- Local repo skills in `.claude/skills/` support contributor workflows inside this repo
- APM skills in `agent-packages/qubership-workflow-hub-usage/.apm/` support workflow generation in consumer repos

When changing a local `.claude/skills/*/SKILL.md` file:

1. Update only the skill that owns the behaviour (`doc-update`, `pull-request`, `zizmor`, etc.)
2. Keep repo-specific rules here; do not copy APM workflow-generation guidance into local skills
3. If the skill edits markdown, re-apply `.claude/skills/markdown-rules/SKILL.md`
4. If the skill audits workflow/action files, keep its pin references aligned with current upstream tags and SHAs

When changing an action or workflow-consumption pattern:

1. Update the action or workflow source first
2. Update the action README
3. Update the matching APM domain guide
4. Update the APM catalog / routing entry if the action is new or the route changed
5. Update `qubership-workflow-conventions/SKILL.md` only if orchestration or global policy changed

Maintenance checks after any skill change:

- Search for old SHAs across `.claude/skills/` and `agent-packages/`
- Check that every guide mentioned in APM routing actually exists
- Check that every active action exposed in the APM catalog still exists under `actions/`
- Keep shared rules in one place: local repo workflow-security rules in `.claude/skills/zizmor/SKILL.md`,
  APM generation rules in `qubership-workflow-conventions/`
- Run diagnostics on the touched markdown files and fix any new issues before finishing
