# 🚀 GitHub Metadata Action

This **GitHub Metadata** GitHub Action extracts metadata from the current GitHub context and generates a version string based on templates and tags.

## Features

- Extracts metadata from the current GitHub context.
- Generates a version string based on templates and tags.
- Supports custom templates and configuration files.

## 📌 Inputs

| Name               | Description                              | Required | Default                  |
| ------------------ | ---------------------------------------- | -------- | ------------------------ |
| `ref`              | Current branch or tag ref                | No       |                          |
| `default-template` | Template to use                          | No       |                          |
| `config-file-path` | Path to the configuration file           | No       |                          |
| `branch-template`  | Template for branch names                | No       |                          |
| `dist-tags`        | Tags to use                              | No       |                          |

## 📌 Outputs

| Name               | Description                              |
| ------------------ | ---------------------------------------- |
| `rendered-template`| Rendered template with metadata          |
| `ref`              | Current branch or tag ref                |
| `ref-name`         | Current branch or tag name               |
| `date`             | Current date                             |
| `time`             | Current time                             |
| `timestamp`        | Current timestamp                        |
| `dist-tag`         | Current tag                              |
| `major`            | Major version                            |
| `minor`            | Minor version                            |
| `patch`            | Patch version                            |

## Usage Example

Below is an example of how to use this action in a GitHub Actions workflow:

```yaml
name: Extract Metadata

on:
  push:
    branches:
      - main

jobs:
  extract-metadata:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Extract Metadata
        uses: Netcracker/qubership-workflow-hub/actions/github-metadata@main
        with:
          ref: 'main'
          default-template: 'v{{major}}.{{minor}}.{{patch}}-{{date}}'
          config-file-path: './.github/github-metadata-config.yml'
          branch-template: '{"main": "v{{major}}.{{minor}}.{{patch}}-{{date}}"}'
          dist-tags: '{"main": "latest"}'