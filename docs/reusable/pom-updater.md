# 🚀 Update Version on `pom.xml` (removed)

> [!CAUTION]
> **Removed in `v1.0.7`.** The `pom-updater` action (`actions/pom-updater`) no longer exists in this repository.
> The last release that contains it is `v1.0.6`. Pins to `v1.0.6` or older keep working,
> but they receive no fixes.

## Replacement

- Compute the version with [metadata-action](../../actions/metadata-action/README.md) and set it with
  Maven build tooling, e.g. `mvn versions:set -DnewVersion=<version>`.
- For Maven releases use [maven-release](../../actions/maven-release/README.md), which updates the version itself.

A reusable workflow `update-version.yml` never existed in this repository.

See the [actions and workflows catalog](../actions-workflows-catalog.md) for the current inventory.
