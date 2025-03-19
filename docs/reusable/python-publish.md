# 🚀 Python Publish Workflow

This **Python Publish** GitHub Workflow automates building, testing, and publishing Python packages using Poetry.

## Features

- Automates building, testing, and publishing Python packages.
- Supports versioning with Poetry.
- Allows running tests with pytest.

## 📌 Inputs

| Name                   | Description                              | Required | Default  |
| ---------------------- | ---------------------------------------- | -------- | -------- |
| `version`              | Specific version to set                  | No       | None     |
| `poetry_version_options` | Poetry version options (e.g., patch)    | No       | `patch`  |
| `python-version`       | Python version to use                    | No       | `3.11`   |
| `poetry_build_params`  | Additional parameters for Poetry build   | No       | None     |
| `pytest_run`           | Whether to run tests with pytest         | Yes      | None     |
| `pytest_params`        | Additional parameters for pytest         | No       | None     |

## 📌 Secrets

| Name             | Description                              | Required |
| ---------------- | ---------------------------------------- | -------- |
| `PYPI_API_TOKEN` | API token for publishing to PyPI         | Yes      |

## Usage Example

Below is an example of how to use this reusable workflow in a GitHub Actions workflow:

```yaml
name: Python Publish Workflow

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  call-python-publish:
    uses: netcracker/qubership-workflow-hub/.github/workflows/python-publish.yml@main
    with:
      version: "1.0.0"
      poetry_version_options: "patch"
      python-version: "3.11"
      poetry_build_params: "--format wheel"
      pytest_run: true
      pytest_params: "--maxfail=1 --disable-warnings"
    secrets:
      PYPI_API_TOKEN: ${{ secrets.PYPI_API_TOKEN }}