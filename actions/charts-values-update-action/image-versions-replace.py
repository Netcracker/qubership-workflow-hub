#! /usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import os
from packaging import version
import re
import subprocess
import sys
import yaml

def replace_env_variables(input_string):
    # Match patterns like ${variable_name}
    pattern = re.compile(r'\$\{(\w+)\}')

    # Replace each match with the corresponding environment variable value
    def replacer(match):
        var_name = match.group(1)
        return os.environ.get(var_name, f"${{{var_name}}}")  # Keep the original if not found

    return pattern.sub(replacer, input_string)

def get_latest_stable_version(versions):
    stable_versions = []

    for v in versions:
        try:
            ver = version.parse(v)
            # Check that version is stable
            if not ver.is_prerelease:
                stable_versions.append((v, ver))
        except version.InvalidVersion:
            continue

    if not stable_versions:
        return None

    latest = sorted(stable_versions, key=lambda x: x[1])[-1][0]
    return latest

def get_latest_version_by_regex(versions, pattern_str):
    try:
        print(f"Using regex pattern: {pattern_str}")
        pattern = r'' + pattern_str
        compiled_pattern = re.compile(pattern)
    except re.error as e:
        print(f"::error::Invalid regular expression '{pattern}': {str(e)}")
        sys.exit(1)
        #raise ValueError(f"Incorrect regular expression: {str(e)}") from None

    matched_versions = []

    for v in versions:
        try:
            if compiled_pattern.fullmatch(v):
                ver = v
                matched_versions.append((v, ver))
        except version.InvalidVersion:
            continue

    if not matched_versions:
        return None

    return sorted(matched_versions, key=lambda x: x[1])[-1][0]

def replace_tag_regexp(image_str, tag_re):
    # Try to find the requested tag for given image_str
    if tag_re.startswith("#"):
        try:
            os.system(f"skopeo login -u $GITHUB_ACTOR -p $GITHUB_TOKEN ghcr.io")
            tags = subprocess.run(f"skopeo list-tags docker://{image_str} | jq -r '.Tags[]'", shell=True, text=True, check=True, capture_output=True).stdout.split()
            if tag_re[1:] == 'latest':
                result_tag = get_latest_stable_version(tags)
            else:
                result_tag = get_latest_version_by_regex(tags, tag_re[1:])
            if not result_tag:
                print(f"::error::No matching tag found for {image_str} with pattern {tag_re}")
                #raise ValueError(f"No matching tag found for {image_str} with pattern {tag_re}")
                sys.exit(1)
            return(result_tag)
        except Exception as e:
          print(f"Error: {e}")

    else:
        return tag_re

def create_summary(images_versions):
    # Create a summary of the images versions
    summary = "## Image Versions Updated\n"
    for image, version in images_versions.items():
        summary += f"- **{image}**: `{version}`\n"
    # Write the summary to a file
    with open('summary.md', 'w') as f:
        f.write(summary)
    print("Summary created in summary.md")

def set_image_versions(config_file, release, chart_version,  method):
    with open(config_file, 'r') as f:
        data = yaml.safe_load(f)
    # Define dict for images versions {"image_name1": "version", "image_name2": "version"}
    images_versions = {}
    # Loop through each chart in the configuration
    # and update the version in Chart.yaml and image version in values.yaml
    for chart in data['charts']:
        chart_file = chart['chart_file']
        values_file = chart['values_file']
        chart_name = chart['name']
        # Update chart version in Chart.yaml
        print(f"{chart_name} Version: {chart_version}")
        print(f"Chart file: {chart_file}")
        print(f"Values file: {values_file}")
        os.system(f"sed -i 's|^version:.*|version: {chart_version}|' {chart_file}")
        # Update image version in values.yaml
        # If method is 'replace', replace the image version with the release version as is
        image_ver = release # Image version for method 'replace'
        for image in chart['image']:
            search_str = image.split(':')[0]
            if method == 'parse':
                image_ver = replace_env_variables(image.split(':')[1].replace('${release}', release))
                image_ver = replace_tag_regexp(search_str, image_ver)
            print(f"{values_file}: Updating {search_str} version to {image_ver}")
            os.system(f"sed -i 's|{search_str}:[a-zA-Z0-9._-]*|{search_str}:{image_ver}|' {values_file}")
            # Check if image key exists in values.yaml
            replacements = subprocess.run(f"grep -o '{search_str}' {values_file} | wc -l", shell=True, check=True, capture_output=True).stdout.split()[0]
            if int(replacements) == 0:
                print(f"::warning::Image {search_str} not found in {values_file}")
                os.system(f"echo '::warning::Image {search_str} not found in {values_file}' >> $GITHUB_STEP_SUMMARY")
            else:
                print(f"Replaced {str(replacements)} occurrence(s) of {search_str} in {values_file}")
                print(f"{values_file}: {search_str} version set to {image_ver}")
            # Add to dictionary for action output
            images_versions[search_str.split('/')[-1]] = image_ver
    # Write the updated images versions to GITHUB_OUTPUT as a JSON string
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f"images-versions={json.dumps(images_versions)}\n")
    create_summary(images_versions)

def main():
    parser = argparse.ArgumentParser(description="Update Helm chart and image versions.")
    parser.add_argument("--config-file", required=True, help="Path to the configuration file.")
    parser.add_argument("--release-version", required=True, help="Release version to set.")
    parser.add_argument("--chart-version", required=True, help="Chart version to set.")
    parser.add_argument("--version-replace-method", required=False, choices=["replace", "parse"], default="parse", help="Method to update image versions.")
    args = parser.parse_args()

    set_image_versions(args.config_file, args.release_version, args.chart_version, args.version_replace_method)

if __name__ == "__main__":
    main()
