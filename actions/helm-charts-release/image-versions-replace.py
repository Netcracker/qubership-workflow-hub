#! /usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import os
import re
import subprocess
import yaml

def replace_env_variables(input_string):
    # Match patterns like ${variable_name}
    pattern = re.compile(r'\$\{(\w+)\}')

    # Replace each match with the corresponding environment variable value
    def replacer(match):
        var_name = match.group(1)
        return os.environ.get(var_name, f"${{{var_name}}}")  # Keep the original if not found

    return pattern.sub(replacer, input_string)

def replace_tag_regexp(image_str, tag_re):
    # Try to find the requested tag for given image_str
    if tag_re.startswith("#"):
        try:
            os.system(f"skopeo login -u $GITHUB_ACTOR -p $GITHUB_TOKEN ghcr.io")
            result_tag = subprocess.run(f"skopeo list-tags docker://{image_str} | jq -r '.Tags[] | select(test(\"^{tag_re[1:]}\"))' | sort -V | tail -n 1", shell=True, text=True, check=True, capture_output=True).stdout.rstrip()
            return(result_tag)
            #os.system(f"skopeo list-tags docker://{image_str} | jq -r '.Tags[] | select(test("^{tag_re[1:]}"))' | sort -V | tail -n 1")
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
        # Update chart version in Chart.yaml
        print(f"{chart['name']} Version: {chart_version}")
        os.system(f"sed -i 's|^version:.*|version: {chart_version}|' {chart_file}")
        # Update image version in values.yaml
        # If method is 'replace', replace the image version with the release version as is
        image_ver = release # Image version for metod 'replace'
        for image in chart['image']:
            search_str = image.split(':')[0]
            if method == 'parse':
                image_ver = replace_env_variables(image.split(':')[1].replace('${release}', release))
                image_ver = replace_tag_regexp(search_str, image_ver)
            print(f"Updating {search_str} version to {image_ver}")
            os.system(f"sed -i 's|{search_str}:[a-zA-Z0-9._-]*|{search_str}:{image_ver}|' {values_file}")
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