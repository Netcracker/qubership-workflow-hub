# 🚀 Docker Build and Publish Composite Action

This **Docker Build and Publish** GitHub Action automates the process of building and publishing Docker images using Docker Buildx. It supports multi-platform builds, custom tagging, and integration with GitHub Container Registry.

---

## Features

- Automatically builds and pushes Docker images to a container registry.
- Supports multi-platform builds using Docker Buildx.
- Allows custom image names and tags.
- Provides dry-run mode for testing without pushing images.
- Supports metadata extraction for automatic tagging.

---

## 📌 Inputs

| Name               | Description                                                                 | Required | Default                     |
| ------------------ | --------------------------------------------------------------------------- | -------- | --------------------------- |
| `ref`              | Branch to create a release from.                                           | No       | `""`                        |
| `custom-image-name`| Custom name for the Docker image. If not provided, it will be auto-generated. | No       | `""`                        |
| `context`          | Pipeline context for the Docker build.                                     | No       | `git`                       |
| `dry-run`          | Run without pushing (dry run).                                             | No       | `false`                     |
| `download-artifact`| Flag to download the artifact.                                             | No       | `false`                     |
| `component`        | Component configuration in JSON format (an array with a single object).    | No       | `[{"name": "default", "file": "integration-tests/Dockerfile", "context": "integration-tests"}]` |
| `platforms`        | Platforms for which the Docker image will be built.                       | No       | `linux/amd64`               |
| `tags`             | Additional Docker image tags. If tags are provided, they will be added to the automatically generated tags. | No       | `""`                        |                     |

---

## 📌 Outputs

| Name                     | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `CONTAINER_NAME_RESULT`  | The final name of the Docker image.              |

---

## Additional Information

### Dry-Run Mode

When `dry-run` is set to `true`, the action will simulate the build and push process without actually pushing the image to the registry. This is useful for testing and debugging.

### Multi-Platform Builds

The `platforms` input allows you to specify multiple platforms (e.g., `linux/amd64,linux/arm64`) for the Docker image. This is useful for creating images that can run on different architectures.

### Automatic Tagging

If the `tags` input is empty, the action will automatically generate tags based on the branch name, semantic versioning, or other metadata.

Let me know if you need further clarification or updates!

## 📌 Logic for Determining the Docker Image Name

The action uses the following logic to determine the final name of the Docker image (`CONTAINER_NAME_RESULT`):

1. **Check if the `image-name` input is provided**:
   - If the `image-name` input is specified by the user, it is directly used as the name of the Docker image.

2. **Fallback to the component name**:
   - If `image-name` is not provided, the action calculates the repository name (extracted from the `GITHUB_REPOSITORY` environment variable) and uses it as the Docker image name.
   - If `image-name` is provided and a component file is defined, the names will be taken from the component configuration instead.

### Example Configuration

Below is an example of how to configure the action to use a component file for determining the image name:

```yaml
with:
  component: |
    [
      {
        "name": "custom-image-name",
        "file": "./Dockerfile",
        "context": "."
      }
    ]
  image-name: ""
```

In this configuration:
- If `image-name` is left empty, the action will use the `name` field from the `component` configuration (`custom-image-name`) as the Docker image name.
- If no `component` is provided, the repository name will be used as the fallback.