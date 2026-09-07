#!/usr/bin/env bash
set -euo pipefail
dashboard_title='Dependency Dashboard'
health_label='renovate-health'
health_title='Renovate health check failed'
health_marker='<!-- renovate-health-check -->'
run_url="https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
opt_out_hint="If this repository is not meant to run Renovate, set the Actions variable \`RENOVATE_HEALTH_CHECK\` to \`false\` to stop the health check. Config validation continues on changes and on the weekly schedule."
opt_out_hint_issue="$opt_out_hint Close this issue manually after setting the variable because only a passing check closes it automatically."
dashboard_url=''
reasons=()
notes=()

issues_enabled="$(gh api "repos/$GH_REPO" --jq '.has_issues')"
dashboard_json=''
if [[ "$issues_enabled" == 'true' ]]; then
    # The server-side author filter uses the raw renovate[bot] login,
    # while the returned JSON uses app/renovate. The shared presets use
    # Renovate's default title. Update all three values together.
    dashboard_issues_json="$(gh issue list \
        --state open \
        --author 'renovate[bot]' \
        --limit 1000 \
        --json author,body,number,title,url)"

    dashboard_json="$(jq -c \
        --arg author 'app/renovate' \
        --arg title "$dashboard_title" \
        '[.[] | select(.title == $title and .author.login == $author)] | first // empty' \
        <<<"$dashboard_issues_json")"
else
    notes+=("Issues are disabled, so Renovate cannot publish a Dependency Dashboard and this workflow cannot file a health issue. Dashboard inspection is skipped; validation and lookup results are still reported. $opt_out_hint")
fi

if [[ -n "$dashboard_json" ]]; then
    dashboard_body="$(jq -r '.body' <<<"$dashboard_json")"
    dashboard_url="$(jq -r '.url' <<<"$dashboard_json")"

    if grep -q '^## Repository Problems[[:space:]]*$' <<<"$dashboard_body"; then
        # Renovate records these notices as repository problems even though
        # timestamp-optional allows the updates to proceed and the local job
        # independently checks dependency lookups.
        timestamp_optional_release_warning="⚠️ WARN: Some release(s) did not have a releaseTimestamp, but as we're running with minimumReleaseAgeBehaviour=timestamp-optional, proceeding. See debug logs for more information"
        timestamp_optional_upgrade_warning="⚠️ WARN: Some upgrade(s) did not have a releaseTimestamp, but as we're running with minimumReleaseAgeBehaviour=timestamp-optional, proceeding. See debug logs for more information"
        package_lookup_warning='⚠️ WARN: Package lookup failures'
        repository_problems_intro_pattern='^These problems occurred while renovating this repository\. \[View logs\]\(https://developer\.mend\.io/[^[:space:])]+\)\.$'
        ignored_repository_problem_count=0
        actionable_repository_problem_count=0

        while IFS= read -r repository_problem_line; do
            if [[ -z "$repository_problem_line" ]]; then
                continue
            fi
            if [[ "$repository_problem_line" == 'These problems occurred while renovating this repository.' ]]; then
                continue
            fi
            if [[ "$repository_problem_line" =~ $repository_problems_intro_pattern ]]; then
                continue
            fi
            if [[ "$repository_problem_line" == " - $timestamp_optional_release_warning" || "$repository_problem_line" == " - $timestamp_optional_upgrade_warning" || "$repository_problem_line" == " - $package_lookup_warning" ]]; then
                ignored_repository_problem_count=$((ignored_repository_problem_count + 1))
                notes+=("${repository_problem_line# - }")
            else
                actionable_repository_problem_count=$((actionable_repository_problem_count + 1))
            fi
        done < <(awk '
            /^## Repository Problems[[:space:]]*$/ { in_repository_problems = 1; next }
            in_repository_problems && /^## / { exit }
            in_repository_problems { print }
        ' <<<"$dashboard_body")

        if [[ "$ignored_repository_problem_count" -eq 0 || "$actionable_repository_problem_count" -ne 0 ]]; then
            reasons+=('Dependency Dashboard reports repository problems')
        elif [[ "$LOOKUP_RESULT" == 'success' ]]; then
            notes+=('Dependency Dashboard only reports expected timestamp notices or lookup failures covered by the local check')
        fi
    fi
    if grep -q '^## Errored[[:space:]]*$' <<<"$dashboard_body"; then
        reasons+=('Dependency Dashboard reports errored updates')
    fi
elif [[ "$issues_enabled" == 'true' ]]; then
    reasons+=('Renovate Dependency Dashboard was not found')
fi

if [[ "$VALIDATION_RESULT" != 'success' ]]; then
    if [[ -n "$VALIDATION_REASON" ]]; then
        reasons+=("$VALIDATION_REASON")
    else
        reasons+=("Renovate configuration validation job finished with: $VALIDATION_RESULT")
    fi
fi
if [[ "$LOOKUP_RESULT" != 'success' ]]; then
    if [[ -n "$LOOKUP_REASON" ]]; then
        reasons+=("$LOOKUP_REASON")
    else
        reasons+=("Local Renovate lookup job finished with: $LOOKUP_RESULT")
    fi
fi

health_number=''
if [[ "$issues_enabled" == 'true' ]]; then
    health_issues_json="$(gh issue list \
        --state open \
        --label "$health_label" \
        --limit 1000 \
        --json body,number,title,url)"

    health_number="$(jq -r \
        --arg marker "$health_marker" \
        --arg title "$health_title" \
        '[.[] | select(.title == $title and ((.body // "") | contains($marker)))] | first | .number // empty' \
        <<<"$health_issues_json")"
fi

if ((${#reasons[@]} == 0)); then
    {
        echo '### Renovate health'
        echo
        echo 'Healthy'
        echo
        if ((${#notes[@]} != 0)); then
            printf -- '- %s\n' "${notes[@]}"
        fi
        if [[ -n "$dashboard_url" ]]; then
            echo "- [Renovate Dependency Dashboard]($dashboard_url)"
        fi
        echo "- [Renovate health-check run]($run_url)"
    } >>"$GITHUB_STEP_SUMMARY"

    if [[ -n "$health_number" ]]; then
        recovery_file="$(mktemp)"
        trap 'rm -f "$recovery_file"' EXIT
        {
            echo 'The Renovate health check passed. This issue is closing automatically.'
            echo
            echo '### Details'
            echo
            echo "- [Successful Renovate health-check run]($run_url)"
            if [[ -n "$dashboard_url" ]]; then
                echo "- [Renovate Dependency Dashboard]($dashboard_url)"
            fi
        } >"$recovery_file"
        gh issue comment "$health_number" --body-file "$recovery_file"
        gh issue close "$health_number" --reason completed
    fi
    exit 0
fi

report_file="$(mktemp)"
trap 'rm -f "$report_file"' EXIT
if [[ -n "$health_number" ]]; then
    {
        echo 'The Renovate health check is still failing.'
        echo
        echo '### Problems'
        echo
        printf -- '- %s\n' "${reasons[@]}"
        echo
        echo '### Details'
        echo
        echo "- [Latest failed Renovate health-check run]($run_url)"
        if [[ -n "$dashboard_url" ]]; then
            echo "- [Renovate Dependency Dashboard]($dashboard_url)"
        fi
        echo
        echo 'This issue remains open and will close automatically after a successful check.'
        echo
        echo "$opt_out_hint_issue"
    } >"$report_file"
else
    {
        echo "$health_marker"
        echo 'The Renovate health check needs attention.'
        echo
        echo '### Problems'
        echo
        printf -- '- %s\n' "${reasons[@]}"
        echo
        echo 'Review the details below, fix the listed problems, and rerun the health check. This issue updates after repeated failures and closes automatically after a successful check.'
        echo
        echo "$opt_out_hint_issue"
        echo
        echo '### Details'
        echo
        echo "- [Failed Renovate health-check run]($run_url)"
        if [[ -n "$dashboard_url" ]]; then
            echo "- [Renovate Dependency Dashboard]($dashboard_url)"
        fi
    } >"$report_file"
fi

{
    echo '### Renovate health'
    echo
    echo 'Unhealthy'
    echo
    printf -- '- %s\n' "${reasons[@]}"
    echo
    if ((${#notes[@]} != 0)); then
        printf -- '- %s\n' "${notes[@]}"
        echo
    fi
    if [[ -n "$dashboard_url" ]]; then
        echo "- [Renovate Dependency Dashboard]($dashboard_url)"
    fi
    echo "- [Renovate health-check run]($run_url)"
} >>"$GITHUB_STEP_SUMMARY"

if [[ "$issues_enabled" == 'true' ]]; then
    if [[ -n "$health_number" ]]; then
        gh issue comment "$health_number" --body-file "$report_file"
    else
        gh label create "$health_label" \
            --color D73A4A \
            --description 'Automated Renovate health incident' \
            --force
        gh issue create --title "$health_title" --label "$health_label" --body-file "$report_file"
    fi
fi

echo '::error::Renovate health check failed'
exit 1

