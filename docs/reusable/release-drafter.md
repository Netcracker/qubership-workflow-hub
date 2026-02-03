# 🚀 GitHub Release Drafter Workflow

This **GitHub Release Drafter** GitHub Workflow drafts a new release based on merged pull requests.

## Features

- Drafts a new release based on merged pull requests.
- Supports custom configuration files.
- Allows enabling or disabling the publish option.

## 📌 Inputs

| Name          | Description                              | Required | Default                     |
| ------------- | ---------------------------------------- | -------- | --------------------------- |
| `version`     | Release version                          | Yes      | None                        |
| `ref`         | Branch name to create release from       | No       | `main`                      |
| `publish`     | Enable publish release?                  | No       | `false`                     |
| `config-name` | Release Drafter configuration file       | No       | `release-drafter-config.yml`|

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Draft GitHub Release Workflow

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  call-release-drafter:
    uses: netcracker/qubership-workflow-hub/.github/workflows/release-drafter.yml@v2.0.10
    with:
      version: "1.0.0"
      ref: "main"
      publish: "true"
      config-name: "release-drafter-config.yml"
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}