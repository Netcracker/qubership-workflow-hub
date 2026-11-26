# 🚀 Docker Publish Workflow (removed)

> [!CAUTION]
> **Removed in `v2.0.0`.** `.github/workflows/docker-publish.yml` no longer exists in this repository.
> The last release that contains it is `v1.0.7`. Pins to `v1.0.7` or older keep working,
> but they receive no fixes.

## Replacement

- Single image: call [docker-action](../../actions/docker-action/README.md) from your own workflow.
- Several images from `.qubership/docker.cfg`: resolve the components with
  [config-resolver](../../actions/config-resolver/README.md) and build them with `docker-action` in a matrix,
  or call the [infra-docker-build](infra-docker-build.md) reusable workflow.

See the [actions and workflows catalog](../actions-workflows-catalog.md) for the current inventory.
