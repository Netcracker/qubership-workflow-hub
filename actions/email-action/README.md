# 🚀 Email Notification Action

Send email notifications via SMTP with fallback to repository variables for connection settings.

A composite wrapper over [dawidd6/action-send-mail](https://github.com/dawidd6/action-send-mail)
that resolves connection parameters from inputs, environment variables, or hardcoded defaults —
so callers only need to supply secrets explicitly.

## Features

- Fallback resolution: `input → env var / repository var → hardcoded default` for all
  connection settings
- Supports plain-text body, HTML body, and Markdown-to-HTML conversion
- Supports CC, BCC, Reply-To, file attachments, and message priority
- Works with Gmail App Password, any SMTP server, STARTTLS (port 587), and TLS (port 465)
- Validates required parameters (`password`, `from`, `to`) early with clear error messages
- Masks the SMTP password in logs via `::add-mask::` before any output

## 📌 Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `subject` | Email subject line. | Yes | - |
| `to` | Recipient addresses, comma-separated. Falls back to `EMAIL_TO` env var. | No | - |
| `from` | Sender address or `Display Name <addr>`. Falls back to `EMAIL_FROM` env var. | No | - |
| `body` | Plain-text message body or path prefixed with `file://`. | No | - |
| `html-body` | HTML message body or path prefixed with `file://`. Takes precedence over `body` when set. | No | - |
| `server-address` | SMTP server hostname. Falls back to `EMAIL_SMTP_HOST` env var, then `smtp.gmail.com`. | No | `smtp.gmail.com` |
| `server-port` | SMTP server port. Falls back to `EMAIL_SMTP_PORT` env var, then `587`. | No | `587` |
| `secure` | Set `true` to use TLS (port 465). Leave empty or `false` for STARTTLS on port 587. Falls back to `EMAIL_SECURE` env var. | No | `false` |
| `username` | SMTP authentication username. Falls back to `EMAIL_USERNAME` env var. | No | - |
| `password` | SMTP password or App Password. Falls back to `EMAIL_PASSWORD` env var. Required if not set via env. | No | - |
| `cc` | Carbon copy recipients, comma-separated. | No | - |
| `bcc` | Blind carbon copy recipients, comma-separated. | No | - |
| `reply-to` | Reply-To address. | No | - |
| `attachments` | Attachment file paths, comma-separated. | No | - |
| `priority` | Message priority: `high`, `normal`, or `low`. | No | - |
| `convert-markdown` | Convert `body` from Markdown to HTML before sending. | No | `false` |

## How it works

1. **Resolve** — a `bash` step reads each connection input and falls back to the matching
   env var if the input is empty. Resolved values are written to `$GITHUB_OUTPUT` (except
   the password, which goes to `$GITHUB_ENV` to avoid appearing in step output logs).
   The password is also masked with `::add-mask::` before any output.
2. **Validate** — if `password`, `from`, or `to` cannot be resolved, the step exits with a
   descriptive error.
3. **Send** — `dawidd6/action-send-mail` is called with the resolved parameters.

## Additional Information

### Fallback priority

```text
input (explicit) → env var / repository var → hardcoded default
```

| Setting | Input | Env var | Default |
| --- | --- | --- | --- |
| SMTP host | `server-address` | `EMAIL_SMTP_HOST` | `smtp.gmail.com` |
| SMTP port | `server-port` | `EMAIL_SMTP_PORT` | `587` |
| TLS mode | `secure` | `EMAIL_SECURE` | `false` |
| Username | `username` | `EMAIL_USERNAME` | - |
| Password | `password` | `EMAIL_PASSWORD` | - (required) |
| Sender | `from` | `EMAIL_FROM` | - (required) |
| Recipients | `to` | `EMAIL_TO` | - (required) |

### Passing repository variables and secrets

Composite actions cannot read `secrets.*` or `vars.*` directly. Pass them via `env:` on the
step and the action will pick them up through the fallback chain:

```yaml
- uses: netcracker/qubership-workflow-hub/actions/email-action@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
  env:
    EMAIL_SMTP_HOST: ${{ vars.EMAIL_SMTP_HOST }}
    EMAIL_FROM:      ${{ vars.EMAIL_FROM }}
    EMAIL_PASSWORD:  ${{ secrets.EMAIL_PASSWORD }}
  with:
    to: team@example.com
    subject: "Notification"
```

### Gmail setup

1. Enable 2-Step Verification on the Gmail account.
2. Generate an **App Password**: Google Account → Security → App Passwords.
3. Store the App Password as `secrets.EMAIL_PASSWORD`.
4. Set `vars.EMAIL_FROM` to the Gmail address (e.g. `notifications@gmail.com`).
5. The defaults (`smtp.gmail.com:587`, STARTTLS) are pre-configured — no further setup needed.

## Usage

### Minimal — connection settings from repository variables

```yaml
name: Notify on failure

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

jobs:
  notify:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Send failure email
        uses: netcracker/qubership-workflow-hub/actions/email-action@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
        env:
          EMAIL_SMTP_HOST: ${{ vars.EMAIL_SMTP_HOST }}
          EMAIL_SMTP_PORT: ${{ vars.EMAIL_SMTP_PORT }}
          EMAIL_FROM:      ${{ vars.EMAIL_FROM }}
          EMAIL_PASSWORD:  ${{ secrets.EMAIL_PASSWORD }}
        with:
          to: dev-team@example.com
          subject: "CI failed on ${{ github.ref }}"
          body: "Workflow ${{ github.workflow }} failed. See ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### HTML body

```yaml
    steps:
      - name: Send release email
        uses: netcracker/qubership-workflow-hub/actions/email-action@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
        env:
          EMAIL_SMTP_HOST: ${{ vars.EMAIL_SMTP_HOST }}
          EMAIL_FROM:      ${{ vars.EMAIL_FROM }}
          EMAIL_PASSWORD:  ${{ secrets.EMAIL_PASSWORD }}
        with:
          to: stakeholders@example.com
          subject: "Release ${{ github.ref_name }} published"
          html-body: |
            <h2>Release ${{ github.ref_name }}</h2>
            <p>Published by <strong>${{ github.actor }}</strong>.</p>
            <p><a href="${{ github.server_url }}/${{ github.repository }}/releases/tag/${{ github.ref_name }}">View release</a></p>
```

### All connection settings explicit

```yaml
    steps:
      - name: Send notification
        uses: netcracker/qubership-workflow-hub/actions/email-action@cabbb90e9471163cfac84bd50ff0296b2803b44c  # v2.3.0
        with:
          server-address: smtp.gmail.com
          server-port: "587"
          username: bot@example.com
          password: ${{ secrets.SMTP_PASSWORD }}
          from: "CI Bot <bot@example.com>"
          to: team@example.com
          cc: manager@example.com
          subject: "Pipeline failed"
          body: "Job ${{ github.job }} failed."
          priority: high
```

## Notes

- `html-body` and `body` can both be set — `html-body` is used as the HTML part and `body`
  as the plain-text fallback for email clients that do not render HTML.
- File-based bodies (`file://path`) are resolved relative to the workspace root.
- The SMTP password is never written to `$GITHUB_OUTPUT`; it is passed between steps via
  `$GITHUB_ENV` and masked in logs.
- Pin to a full 40-character commit SHA with the release tag as a trailing comment, e.g.
  `@cabbb90e9471163cfac84bd50ff0296b2803b44c # v2.3.0`. The SHA is the immutable pin;
  the comment shows which release it points to. Tags alone are mutable. Never use `@main`
  or short SHAs.
