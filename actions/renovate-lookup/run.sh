#!/usr/bin/env bash
set -euo pipefail
log_file="$(mktemp)"
first_log_file="$(mktemp)"
cache_root="$(mktemp -d)"
trap 'rm -f "$log_file" "$first_log_file"; rm -rf "$cache_root"' EXIT
records_filter='split("\n") | map(fromjson?) | map(select(type == "object"))'
error_filter='select((.level // 0) >= 50 or .msg == "Repository has invalid config" or ((.err | type) == "object" and .err.validationError?))'
lookup_failure_filter='select((.msg // "") | startswith("Failed to look up"))'
rate_limit_filter='select((.msg // "") | test("Rate limit exceeded"))'
warning_filter='select((.level // 0) >= 40 and (.level // 0) < 50 and (((.msg // "") | test("Rate limit exceeded")) | not))'

run_lookup() {
    lookup_attempt_count=$((lookup_attempt_count + 1))
    attempt_cache_dir="$(mktemp -d "$cache_root/attempt.XXXXXX")"
    set +e
    RENOVATE_CACHE_DIR="$attempt_cache_dir" renovate --platform=local --dry-run=lookup >"$log_file" 2>&1
    renovate_status="$?"
    set -e
}

analyze_lookup() {
    error_count="$(jq -R -s "$records_filter | map($error_filter) | length" "$log_file")"
    lookup_failure_count="$(jq -R -s "$records_filter | map($lookup_failure_filter) | length" "$log_file")"
    rate_limit_count="$(jq -R -s "$records_filter | map($rate_limit_filter) | length" "$log_file")"
    warning_count="$(jq -R -s "$records_filter | map($warning_filter) | length" "$log_file")"
}

lookup_attempt_count=0
lookup_retry_count=0
initial_lookup_failure_count=0
retry_succeeded=false
run_lookup
analyze_lookup

if [[ "$renovate_status" -eq 0 && "$lookup_failure_count" -ne 0 && "$rate_limit_count" -eq 0 && "$error_count" -eq 0 ]]; then
    lookup_retry_count=1
    initial_lookup_failure_count="$lookup_failure_count"
    cp "$log_file" "$first_log_file"
    echo '::notice::Retrying dependency lookup after soft lookup failures'
    run_lookup
    analyze_lookup
    if [[ "$renovate_status" -eq 0 && "$lookup_failure_count" -eq 0 && "$rate_limit_count" -eq 0 && "$error_count" -eq 0 ]]; then
        retry_succeeded=true
    fi
fi

{
    echo "### Local Renovate lookup"
    echo
    echo "- Exit code: $renovate_status"
    echo "- Retries: $lookup_retry_count"
    echo "- Retry recovered: $retry_succeeded"
    echo "- Lookup failures: $lookup_failure_count"
    echo "- Rate-limit records: $rate_limit_count"
    echo "- Warning records: $warning_count"
    echo "- Error records: $error_count"
    echo "- Platform: experimental local lookup"
    if [[ "$lookup_retry_count" -ne 0 ]]; then
        echo
        echo "#### Initial lookup failures"
        jq -R -s -r "$records_filter | map($lookup_failure_filter) | .[:20][] | \"- \" + (.msg | tostring | gsub(\"[\\r\\n]+\"; \" \"))" "$first_log_file"
    fi
    if [[ "$lookup_failure_count" -ne 0 ]]; then
        echo
        echo "#### Lookup failures"
        jq -R -s -r "$records_filter | map($lookup_failure_filter) | .[:20][] | \"- \" + (.msg | tostring | gsub(\"[\\r\\n]+\"; \" \"))" "$log_file"
    fi
    if [[ "$rate_limit_count" -ne 0 ]]; then
        echo
        echo "#### Rate limits"
        jq -R -s -r "$records_filter | map($rate_limit_filter) | .[:20][] | \"- \" + (.msg | tostring | gsub(\"[\\r\\n]+\"; \" \"))" "$log_file"
    fi
    if [[ "$warning_count" -ne 0 ]]; then
        echo
        echo "#### Warnings"
        jq -R -s -r "$records_filter | map($warning_filter) | .[:20][] | \"- \" + ((.msg // (if (.err | type) == \"object\" then .err.message else null end) // \"Renovate warning\") | tostring | gsub(\"[\\r\\n]+\"; \" \"))" "$log_file"
    fi
    if [[ "$error_count" -ne 0 ]]; then
        echo
        echo "#### Errors"
        jq -R -s -r "$records_filter | map($error_filter) | .[:20][] | \"- \" + (((if (.err | type) == \"object\" then .err.validationError else null end) // .msg // (if (.err | type) == \"object\" then .err.message else null end) // \"Renovate error\") | tostring | gsub(\"[\\r\\n]+\"; \" \"))" "$log_file"
    fi
} >>"$GITHUB_STEP_SUMMARY"

failure_reason=''
failure_log_file="$log_file"
if [[ "$lookup_retry_count" -ne 0 && "$retry_succeeded" != true ]]; then
    dependency_word='dependencies'
    if [[ "$initial_lookup_failure_count" -eq 1 ]]; then
        dependency_word='dependency'
    fi
    failure_reason="Renovate failed to look up $initial_lookup_failure_count $dependency_word"
    failure_log_file="$first_log_file"
elif [[ "$rate_limit_count" -ne 0 ]]; then
    failure_reason='GitHub API rate limit prevented dependency lookup'
elif [[ "$lookup_failure_count" -ne 0 ]]; then
    dependency_word='dependencies'
    if [[ "$lookup_failure_count" -eq 1 ]]; then
        dependency_word='dependency'
    fi
    failure_reason="Renovate failed to look up $lookup_failure_count $dependency_word"
elif [[ "$renovate_status" -ne 0 ]]; then
    failure_reason="Local Renovate dependency lookup exited with code $renovate_status"
elif [[ "$error_count" -ne 0 ]]; then
    failure_reason="Local Renovate dependency lookup reported $error_count error records"
fi

if [[ -n "$failure_reason" ]]; then
    stop_marker="$(openssl rand -hex 32)"
    echo '::group::Renovate debug log'
    echo "::stop-commands::$stop_marker"
    tail -c 1000000 "$failure_log_file"
    echo
    echo "::$stop_marker::"
    echo '::endgroup::'
    echo "reason=$failure_reason" >>"$GITHUB_OUTPUT"
    echo "::error::Local Renovate dependency lookup failed"
    exit 1
fi

