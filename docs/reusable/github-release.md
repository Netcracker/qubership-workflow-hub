# 🚀 Create GitHub Release Workflow (removed)

> [!CAUTION]
> **Removed in `v2.0.0`.** `.github/workflows/create-github-release.yml` no longer exists in this repository.
> The last release that contains it is `v1.0.7`. Pins to `v1.0.7` or older keep working,
> but they receive no fixes.

## Replacement

- Create the release with `gh release create` in a workflow step.
- Prepare release notes with the [release-drafter](release-drafter.md) reusable workflow.
- Attach files with [assets-action](../../actions/assets-action/README.md).

`.github/workflows/github-release.yaml` in this repository is the hub's own release pipeline,
not a reusable workflow — do not call it from other repositories.

See the [actions and workflows catalog](../actions-workflows-catalog.md) for the current inventory.
