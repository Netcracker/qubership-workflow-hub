#! /usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import yaml
import re
import argparse
import json

def replace_env_variables(input_string):
    # Match patterns like ${variable_name}
    pattern = re.compile(r'\$\{(\w+)\}')

    # Replace each match with the corresponding environment variable value
    def replacer(match):
        var_name = match.group(1)
        return os.environ.get(var_name, f"${{{var_name}}}")  # Keep the original if not found

    return pattern.sub(replacer, input_string)

def set_image_versions(config_file, release, method):
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
        print(f"{chart['name']} Version: {release}")
        os.system(f"sed -i 's|^version:.*|version: {release}|' {chart_file}")
        # Update image version in values.yaml
        # If method is 'replace', replace the image version with the release version as is
        image_ver = release # Image version for metod 'replace'
        for image in chart['image']:
            search_str = image.split(':')[0]
            if method == 'parse':
                image_ver = replace_env_variables(image.split(':')[1].replace('${release}', release))
            print(f"Updating {search_str} version to {image_ver}")
            os.system(f"sed -i 's|{search_str}.*|{search_str}:{image_ver}|' {values_file}")
            # Add to dictionary for later use
            images_versions[search_str.split('/')[-1]] = image_ver
    # Write the updated images versions to GITHUB_OUTPUT as a JSON string
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f"images-versions={json.dumps(images_versions)}\n")

def main():
    parser = argparse.ArgumentParser(description="Update Helm chart and image versions.")
    parser.add_argument("--config-file", required=True, help="Path to the configuration file.")
    parser.add_argument("--release-version", required=True, help="Release version to set.")
    parser.add_argument("--version-replace-method", required=False, choices=["replace", "parse"], default="parse", help="Method to update image versions.")
    args = parser.parse_args()

    set_image_versions(args.config_file, args.release_version, args.version_replace_method)

if __name__ == "__main__":
    main()