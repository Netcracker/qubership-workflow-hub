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
            os.system("skopeo login -u $GITHUB_ACTOR -p $GITHUB_TOKEN ghcr.io")
            tags = subprocess.run(f"skopeo list-tags docker://{image_str} | jq -r '.Tags[]'", shell=True, text=True, check=True, capture_output=True).stdout.split()
            if tag_re == '#latest':
                result_tag = get_latest_stable_version(tags)
            else:
                result_tag = get_latest_version_by_regex(tags, tag_re[1:])
            if not result_tag:
                print(f"::error::No matching tag found for {image_str} with pattern {tag_re}")
                sys.exit(1)
            return(result_tag)
        except Exception as e:
          print(f"Error: {e}")

    else:
        return tag_re

def create_summary(images_versions):
    # Create a summary of the images versions
    summary = "## Image Versions Updated\n"
    for image, image_version in images_versions.items():
        summary += f"- **{image}**: `{image_version}`\n"
    # Write the summary to a file
    with open('summary.md', 'w') as f:
        f.write(summary)
    print("Summary created in summary.md")

def find_image_by_name_tag(image_str, tag, default_tag="main") -> str:
    # os.system("skopeo login -u $GITHUB_ACTOR -p $GITHUB_TOKEN ghcr.io")
    tag_count = subprocess.run(f"skopeo list-tags docker://{image_str} | jq -r '.Tags[] | select(. == \"{tag}\")' | wc -l", shell=True, text=True, check=True, capture_output=True).stdout.split()
    if int(tag_count[0]) > 0:
        return tag
    else:
        print(f"::warning::Tag {tag} not found for image {image_str}")
        return default_tag

def set_image_versions(config_file, tag, chart_version,  method, default_tag):
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
        # If method is 'replace', replace the image version with the tag version as is
        image_ver = tag # Image version for method 'replace'
        for image in chart['image']:
            print(f"Processing image: {image}")
            search_str = image.split(':')[0] # Full image name, e.g. ghcr.io/myorg/myimage
            # If ${owner} in image name, replace it with GITHUB_REPOSITORY_OWNER variable
            # for substitution, but for search replace it with "netcracker"
            if '${owner}' in search_str:
                replace_str = search_str.replace('${owner}', os.environ['GITHUB_REPOSITORY_OWNER'].lower())
                search_str = search_str.replace('${owner}', 'netcracker')
            else:
                replace_str = search_str
            # If method is 'parse', parse the version string from config file.
            # - Replacing ${tag} with tag variable value
            # - Replace environment variables in version string
            # - Replace regex pattern in version string
            if method == 'parse':
                image_ver = replace_env_variables(image.split(':')[1].replace('${tag}', tag).replace('${release}', tag))
                image_ver = replace_tag_regexp(search_str, image_ver)
                # If default_tag is provided, check if the image with requested tag exists
                # if not found, use the default_tag
                # Search for image by replace_str and image_ver
                if default_tag:
                    image_ver = find_image_by_name_tag(replace_str, image_ver, default_tag)
            # Update image version in values.yaml
            print(f"{values_file}: Updating {search_str} version to {image_ver}")
            os.system(f"sed -i 's|{search_str}:[a-zA-Z0-9._-]*|{replace_str}:{image_ver}|' {values_file}")
            # Check if image key exists in values.yaml
            replacements = subprocess.run(f"grep -o '{replace_str}' {values_file} | wc -l", shell=True, check=True, capture_output=True).stdout.split()[0]
            if int(replacements) == 0:
                print(f"::warning::Image {search_str} not found in {values_file}")
            else:
                print(f"Replaced {str(replacements)} occurrence(s) of {search_str} in {values_file}")
                print(f"{values_file}: {search_str} version set to {replace_str}:{image_ver}")
            # Add to dictionary for action output
            images_versions[replace_str.split('/')[-1]] = image_ver
    # Write the updated images versions to GITHUB_OUTPUT as a JSON string
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f"images-versions={json.dumps(images_versions)}\n")
    create_summary(images_versions)

def main():
    parser = argparse.ArgumentParser(description="Update Helm chart and image versions.")
    parser.add_argument("--config-file", required=True, help="Path to the configuration file.")
    parser.add_argument("--tag", required=True, help="Tag to set.")
    parser.add_argument("--chart-version", required=True, help="Chart version to set.")
    parser.add_argument("--version-replace-method", required=False, choices=["replace", "parse"], default="parse", help="Method to update image versions.")
    parser.add_argument("--default-tag", required=False, default="main", help="Default image tag if tag is not found.")
    args = parser.parse_args()

    set_image_versions(args.config_file, args.tag, args.chart_version, args.version_replace_method, args.default_tag)

if __name__ == "__main__":
    main()
