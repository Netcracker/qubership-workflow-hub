# 🚀 Broadcast Files Workflow (moved)

> [!CAUTION]
> **Moved out of this repository in `v2.0.8`.** The last release that contains
> `.github/workflows/broadcast-files.yml` here is `v2.0.7`; it receives no fixes.

The workflow now lives in the organization repository as
[`Netcracker/.github` → `.github/workflows/broadcast-files.yaml`](https://github.com/Netcracker/.github/blob/main/.github/workflows/broadcast-files.yaml).
It is not a reusable workflow: it runs on `workflow_dispatch` in `Netcracker/.github` and propagates
files to the organization repositories according to a config file (`config-file` and `section` inputs,
optional `repos` filter).

Component repositories do not need to add it. To request new files or changes, open an issue in
[Netcracker/.github](https://github.com/Netcracker/.github/issues).

See the [actions and workflows catalog](../actions-workflows-catalog.md) for the current inventory.
