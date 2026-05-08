# Helm — config and release pipeline

## Clarifying questions

General workflow questions (triggers, dry-run, runner, concurrency) are collected in Step 0
of `SKILL.md` before this guide is loaded. Ask only the Helm-specific questions below.

| Question                                                              | Why                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Should there be a dry-run mode?                                       | Helm release modifies files and publishes charts — dry-run lets you verify before committing |
| Do you have a Helm release config file? If yes — what is its path?    | If yes — read it. If no — generate it from collected answers (chart paths, image keys, chart name), using `.qubership/helm-charts-release-config.yaml` as the default path. |
| Is a GitHub Release needed alongside the Helm release?                | Yes → also load `release.md` for tag/release/assets patterns.     |
| Should the workflow also update Docker image versions in values.yaml? | Determines whether `charts-values-update-action` is needed; if yes — ask which image keys in `values.yaml` to update |

## `.qubership/helm-charts-release-config.yaml` schema

```yaml
charts:
  - chart_file: ./charts/my-chart/Chart.yaml
    values_file: ./charts/my-chart/values.yaml
    name: my-chart
    version: my-image:${tag}
    image:
      - image.repository.my-image
      - image.repository.another-image
```

| Field         | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `chart_file`  | Path to the Helm `Chart.yaml`                               |
| `values_file` | Path to the Helm `values.yaml`                              |
| `name`        | Chart name                                                  |
| `version`     | Image version template — `${tag}` is substituted at runtime |
| `image`       | List of image keys in `values.yaml` to update               |

## Release pipeline

```
metadata-action  →  charts-values-update-action  →  chart-version
produces version     updates values.yaml images        updates Chart.yaml
                     reads helm-charts-release-config.yaml
```

`charts-values-update-action` reads the config, substitutes `${tag}` with
the release version, and updates image references in `values.yaml`.
`chart-version` then updates `version` and `appVersion` in `Chart.yaml`.

