# Helm — config and release pipeline

## Clarifying questions

Ask these before designing any Helm workflow (Path B — scratch):

| Question                                                              | Why                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Do you have a Helm release config file? If yes — what is its path?    | If yes — read it. If no — generate it together with the workflow, using `.qubership/helm-charts-release-config.yaml` as the default path (passed via the action's config input). |
| Is a GitHub Release needed alongside the Helm release?                | Determines whether `assets-action` is needed                      |
| Should the workflow also update Docker image versions in values.yaml? | Determines whether `charts-values-update-action` is needed        |

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

