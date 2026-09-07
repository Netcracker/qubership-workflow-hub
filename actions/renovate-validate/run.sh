#!/usr/bin/env bash
set -euo pipefail

set +e
renovate-config-validator --strict --no-global renovate.json
validation_status="$?"
set -e

if [[ "$validation_status" -ne 0 ]]; then
    echo 'reason=renovate.json failed strict validation' >>"$GITHUB_OUTPUT"
    exit "$validation_status"
fi

set -o pipefail
log_file="$(mktemp)"
trap 'rm -f "$log_file"' EXIT
records_filter='split("\n") | map(fromjson?) | map(select(type == "object"))'
rate_limit_filter='select((.msg // "") | test("Rate limit exceeded"))'
validation_filter='select(.msg == "Repository has invalid config" or ((.err | type) == "object" and .err.validationError?))'

set +e
renovate --platform=local --dry-run=extract 2>&1 | tee "$log_file"
renovate_status="${PIPESTATUS[0]}"
set -e

rate_limit_count="$(jq -R -s "$records_filter | map($rate_limit_filter) | length" "$log_file")"
validation_count="$(jq -R -s "$records_filter | map($validation_filter) | length" "$log_file")"

if [[ "$rate_limit_count" -ne 0 ]]; then
    echo 'reason=GitHub API rate limit prevented shared preset resolution' >>"$GITHUB_OUTPUT"
    echo "::error::GitHub API rate limit hit; preset resolution could not be verified"
    jq -R -s -r "$records_filter | map($rate_limit_filter) | .[] | .msg" "$log_file"
    exit 1
fi

if [[ "$validation_count" -ne 0 ]]; then
    echo 'reason=Renovate could not resolve the repository configuration' >>"$GITHUB_OUTPUT"
    echo "::error::Renovate could not resolve the repository configuration"
    jq -R -s -r "$records_filter | map($validation_filter) | .[] | if (.err | type) == \"object\" then (.err.validationError // .msg) else .msg end" "$log_file"
    exit 1
fi

if [[ "$renovate_status" -ne 0 ]]; then
    echo "reason=Renovate preset resolution exited with code $renovate_status" >>"$GITHUB_OUTPUT"
    echo "::error::Renovate preset resolution exited with code $renovate_status"
    exit "$renovate_status"
fi

