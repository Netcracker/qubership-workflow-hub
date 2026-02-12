#!/usr/bin/env bash

# =============================================================================
# Script generates JSON metadata for Helm charts from .tgz archives
#
# Usage:
#   ./script.sh [SOURCE_DIR] [OUTPUT_DIR]
#
#   SOURCE_DIR  — directory containing .tgz files (default: current directory)
#   OUTPUT_DIR  — directory to save generated .json files (default: current)
#
# name, version, appVersion are obtained via: helm show chart
# reference — from environment variable CHART_REFERENCE
# =============================================================================

set -euo pipefail

# Check for required helm command
if ! command -v helm >/dev/null 2>&1; then
    echo "Error: command 'helm' not found in the system"
    exit 1
fi

# Check required environment variable
: "${CHART_REFERENCE:?Error: environment variable CHART_REFERENCE is not set. Example: oci://ghcr.io/org/chart:1.2.3}"

# Fixed values
CHART_TYPE="application"
MIME_TYPE="application/vnd.qubership.helm.chart"

# Determine input/output directories
SOURCE_DIR="${1:-$(pwd)}"
OUTPUT_DIR="${2:-$(pwd)}"

# Verify source directory exists
if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "Error: source directory does not exist: $SOURCE_DIR"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Source directory:     $SOURCE_DIR"
echo "Output directory:     $OUTPUT_DIR"
echo "Reference:            $CHART_REFERENCE"
echo ""

# Change to source directory to find .tgz files
cd "$SOURCE_DIR" || exit 1

shopt -s nullglob
tgz_files=(*.tgz)

if [[ ${#tgz_files[@]} -eq 0 ]]; then
    echo "No *.tgz files found in directory $SOURCE_DIR"
    exit 0
fi

for tgz in "${tgz_files[@]}"; do
    echo "Processing: $tgz"

    # Get chart metadata directly via helm
    helm_output=$(helm show chart "$tgz" 2>/dev/null) || {
        echo "  → Error: helm show chart $tgz failed"
        continue
    }

    CHART_NAME=$(echo "$helm_output"     | grep '^name:'     | sed 's/^name:[[:space:]]*//; s/"//g')
    CHART_VERSION=$(echo "$helm_output"  | grep '^version:'  | sed 's/^version:[[:space:]]*//; s/"//g')
    APP_VERSION=$(echo "$helm_output"    | grep '^appVersion:' | sed 's/^appVersion:[[:space:]]*//; s/"//g' || echo "")

    if [[ -z "$CHART_NAME" || -z "$CHART_VERSION" ]]; then
        echo "  → Error: failed to extract name or version"
        continue
    fi

    APP_VERSION="${APP_VERSION:-}"
    echo "  → Chart: $CHART_NAME / $CHART_VERSION (app: ${APP_VERSION:-not specified})"

    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT

    tar -xzf "$tgz" -C "$temp_dir"

    chart_dir=$(find "$temp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [[ -z "$chart_dir" ]]; then
        echo "  → Error: chart root directory not found"
        continue
    fi

    components="[]"

    # values.schema.json
    schema_file="$chart_dir/values.schema.json"
    if [[ -f "$schema_file" ]]; then
        schema_b64=$(base64 -w 0 "$schema_file")
        schema_comp=$(jq -n --arg content "$schema_b64" '{
            type: "data",
            "mime-type": "application/vnd.nc.helm.values.schema",
            name: "values.schema.json",
            data: [{
                type: "configuration",
                name: "values.schema.json",
                contents: { attachment: { contentType: "application/json", encoding: "base64", content: $content } }
            }]
        }')
        components=$(echo "$components" | jq --argjson c "$schema_comp" '. + [$c]')
    fi

    # resource-profile-baselines
    profiles_dir="$chart_dir/resource-profiles"
    if [[ -d "$profiles_dir" ]]; then
        data_items="[]"
        while IFS= read -r -d '' file; do
            filename=$(basename "$file")
            ext="${filename##*.}"
            ext="${ext,,}"
            content_type="application/yaml"
            [[ "$ext" == "json" ]] && content_type="application/json"
            content_b64=$(base64 -w 0 "$file")

            item=$(jq -n --arg fn "$filename" --arg ct "$content_type" --arg cb "$content_b64" '{
                type: "configuration",
                name: $fn,
                contents: { attachment: { contentType: $ct, encoding: "base64", content: $cb } }
            }')
            data_items=$(echo "$data_items" | jq --argjson i "$item" '. + [$i]')
        done < <(find "$profiles_dir" -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) -print0)

        if [[ "$data_items" != "[]" ]]; then
            profiles_comp=$(jq -n --argjson items "$data_items" '{
                type: "data",
                "mime-type": "application/vnd.nc.resource-profile-baseline",
                name: "resource-profile-baselines",
                data: $items
            }')
            components=$(echo "$components" | jq --argjson c "$profiles_comp" '. + [$c]')
        fi
    fi

    # Generate final JSON
    json_file="$OUTPUT_DIR/${tgz%.tgz}.json"

    jq -n \
        --arg name       "$CHART_NAME" \
        --arg version    "$CHART_VERSION" \
        --arg appVersion "$APP_VERSION" \
        --arg type       "$CHART_TYPE" \
        --arg mime       "$MIME_TYPE" \
        --arg ref        "$CHART_REFERENCE" \
        --argjson comps  "$components" \
        '{
            name: $name,
            version: $version,
            appVersion: $appVersion,
            type: $type,
            "mime-type": $mime,
            reference: $ref,
            components: $comps
        }' > "$json_file"

    echo "  → Created: $json_file"
done

echo ""
echo "Processing completed."
