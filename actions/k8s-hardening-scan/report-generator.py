#!/usr/bin/env python3
"""
A script for converting kubescape JSON results into Markdown tables.
Usage: python3 generate_report.py [--input file.json] [--output report.md]
"""

import json
import urllib.request
import argparse
import os
import sys
from pathlib import Path

def load_json_data(source):
    """Loads JSON from a file or URL."""
    if source.startswith(('http://', 'https://')):
        with urllib.request.urlopen(source) as response:
            return json.loads(response.read().decode('utf-8'))
    else:
        with open(source, 'r', encoding='utf-8') as f:
            return json.load(f)

def load_yaml_config(config_path):
    """Loads YAML configuration from a file."""
    import yaml
    default_config_path = os.getenv('GITHUB_ACTION_PATH') + '/hardening-config.yaml'
    default_config_data = {}
    config_data = {}
    # Try to load user config file
    # user config structure:
    # ignored_checks:
    #   - ControlID1
    #   - ControlID2
    if not Path(config_path).is_file():
        print(f"⚠️  Warning: Config file '{config_path}' not found. Using default config path '{default_config_path}'.")
    else:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = yaml.safe_load(f)
    with open(default_config_path, 'r', encoding='utf-8') as f:
        default_config_data = yaml.safe_load(f)
    # Merge default config with user config. Setting `mandatory` field to False for checks listed in `ignored_checks` in user config.
    for check in config_data.get('ignored_checks', []):
        if check in default_config_data.get('hardening_rules', {}):
            default_config_data['hardening_rules'][check]['mandatory'] = False
    print(f"[DEBUG]: {default_config_data}")
    return default_config_data

def get_resource_ports(resource):
    """Extracts ports from a resource definition."""
    ports = []
    object = resource.get('object', {})
    spec = object.get('spec', {})
    template = spec.get('template', {})
    spec_template = template.get('spec', {})
    containers = spec_template.get('containers', [])

    for container in containers:
        container_ports = container.get('ports', [])
        for port in container_ports:
            ports.append(port.get('containerPort'))
    print(f"[DEBUG] Resource: {resource.get('resourceID', 'Unknown')}, Ports: {ports}")
    return ports

def get_resource_images(resource):
    """Extracts container images from a resource definition."""
    images = []
    object = resource.get('object', {})
    spec = object.get('spec', {})
    template = spec.get('template', {})
    spec_template = template.get('spec', {})
    containers = spec_template.get('containers', [])

    for container in containers:
        image = container.get('image', '')
        if image:
            images.append(image)
    print(f"[DEBUG] Resource: {resource.get('resourceID', 'Unknown')}, Images: {images}")
    return images

def get_status_emoji(status):
    """Returns the emoji for a given status."""
    return '✅' if status == 'passed' else '❌'

def generate_markdown_tables(data, config):
    """Generates markdown tables for each resourceID."""
    print(f"[DEBUG] Generating markdown tables with config: {config}")
    results = data.get('results', [])
    print(f"[DEBUG] Total results found: {len(results)}")
    resources = data.get('resources', [])
    print(f"[DEBUG] Total resources found: {len(resources)}")

    # get mandatory checks list from config file
    mandatory_checks = [
        rule_id
        for rule_id, rule_data in config.get('hardening_rules', {}).items()
        if rule_data.get('mandatory') is True
    ]
    print(f"[DEBUG] Mandatory checks from config: {mandatory_checks}")
    if not results:
        return "No results found in the JSON data."
    failed_mandatory_checks_all = {}
    output_lines = []
    for resource in results:
        resource_id = resource.get('resourceID', 'Unknown')
        if not '/Deployment/' in resource_id:  # Skip non-deployment resources
            continue
        resource_data = next((r for r in resources if r.get('resourceID') == resource_id), {})
        resource_ports = get_resource_ports(resource_data)
        resource_images = get_resource_images(resource_data)
        controls = resource.get('controls', [])
        failed_mandatory_checks = []

        # Resource header
        output_lines.append(f"\n## Resource: `{resource_id}`\n")
        output_lines.append("| ControlID | Control name | Status |")
        output_lines.append("|-----------|--------------|--------|")

        # Processing each control
        for control in controls:
            control_id = control.get('controlID', '')
            control_name = control.get('name', '')
            rules = control.get('rules', [])

            # Each rule in a separate line.
            if len(rules) > 1:
                for rule in rules:
                    status = rule.get('status', '')
                    status_emoji = get_status_emoji(status)
                    output_lines.append(f"| {control_id} | {control_name} ({rule.get('name', '')}) | {status_emoji} |")
                    if control_id in mandatory_checks and status != 'passed' and control_id not in failed_mandatory_checks:
                        failed_mandatory_checks.append(control_id)
            else:
                # Normal case - single rule
                status = rules[0].get('status', '') if rules else control.get('status', {}).get('status', '')
                status_emoji = get_status_emoji(status)
                output_lines.append(f"| {control_id} | {control_name} | {status_emoji} |")
                if control_id in mandatory_checks and status != 'passed':
                    failed_mandatory_checks.append(control_id)

        # compare resource ports with prohibited ports list from config file and add a line to the table if there is a match.
        ports_check_success = 0
        ports_intersection = list(set(config.get('hardening_rules', {}).get('Critical-Ports', {}).get('critical_ports', [])) & set(resource_ports))
        if ports_intersection:
            output_lines.append(f"| Critical-Ports | Critical Ports: {', '.join(map(str, sorted(ports_intersection)))} | ❌ |")
            if 'Critical-Ports' in mandatory_checks:
                failed_mandatory_checks.append('Critical-Ports')
        else:
            output_lines.append("| Critical-Ports | Critical Ports | ✅ |")
            ports_check_success += 1
        # check if any of the container images used in the resource are using the 'latest' tag and add a line to the table if there is a match.
        latest_images_check_success = 0
        latest_images = [img for img in resource_images if img.endswith(':latest')]
        if latest_images:
            output_lines.append(f"| Latest-Tag | Images using 'latest' tag: {', '.join(latest_images)} | ❌ |")
            if 'No-Latest-Tag' in mandatory_checks:
                failed_mandatory_checks.append('No-Latest-Tag')
        else:
            output_lines.append("| Latest-Tag | No images using 'latest' tag | ✅ |")
            latest_images_check_success += 1

        # Add statistics for the resource
        total_controls = len(controls) + 2  # +2 for Critical-Ports and Latest-Tag checks
        passed = sum(1 for c in controls
                    if c.get('rules', [{}])[0].get('status', '') == 'passed') + ports_check_success + latest_images_check_success
        failed = total_controls - passed

        output_lines.append(f"\n**Total:** ✅ passed: {passed}, ❌ failed: {failed}\n")
        output_lines.append(f"**Failed mandatory checks:** {', '.join(failed_mandatory_checks) if failed_mandatory_checks else 'None'}\n")
        output_lines.append("---")

        failed_mandatory_checks_all[resource_id] = failed_mandatory_checks

    return '\n'.join(output_lines), failed_mandatory_checks_all

def generate_full_report(data, config, title="Kubescape Hardening Scan Report"):
    """Generates a full markdown report."""
    print(f"[DEBUG] Generating full report with title: {title}")
    timestamp = __import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    report = f"""# {title}

**Generation date:** {timestamp}

## Summary by resources

"""

    results = data.get('results', [])
    for resource in results:
        resource_id = resource.get('resourceID', 'Unknown')
        if not '/Deployment/' in resource_id:  # Skip non-deployment resources
            continue

        controls = resource.get('controls', [])
        passed = sum(1 for c in controls
                    if c.get('rules', [{}])[0].get('status', '') == 'passed')
        failed = len(controls) - passed
        report += f"- `{resource_id}`: ✅ {passed} / ❌ {failed}\n"

    report += "\n---\n"
    report_tables, failed_mandatory_checks_all = generate_markdown_tables(data, config)
    report += report_tables

    return report, failed_mandatory_checks_all

def main():
    parser = argparse.ArgumentParser(
        description='Converts kubescape JSON results into Markdown tables.'
    )
    parser.add_argument(
        '--input', '-i',
        help='Path to the JSON file or URL (default: specified URL)'
    )
    parser.add_argument(
        '--output', '-o',
        default='kubescape-report.md',
        help='Path for saving the markdown file (default: kubescape-report.md)'
    )
    parser.add_argument(
        '--title', '-t',
        default='Kubescape Hardening Scan Report',
        help='Report title'
    )
    parser.add_argument(
        '--config', '-c',
        default='.github/hardening-config.yaml',
        help='Path to the YAML configuration file (default: .github/hardening-config.yaml)'
    )

    args = parser.parse_args()

    try:
        config = load_yaml_config(args.config)
        print(f"Loading data from: {args.input}")
        data = load_json_data(args.input)

        print("Generating markdown report...")
        report, failed_mandatory_checks_all = generate_full_report(data, config, args.title)

        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"✅ Report successfully saved to: {args.output}")

        # Display brief statistics
        results = data.get('results', [])
        print(f"\n📊 Statistics:")
        print(f"   Total resources: {len(results)}")
        for resource in results:
            resource_id = resource.get('resourceID', 'Unknown')
            controls = resource.get('controls', [])
            passed = sum(1 for c in controls
                        if c.get('rules', [{}])[0].get('status', '') == 'passed')
            print(f"   - {resource_id}: {passed}/{len(controls)} passed")
        if failed_mandatory_checks_all:
            print("\n⚠️  Failed mandatory checks:")
            for resource_id, checks in failed_mandatory_checks_all.items():
                if checks:
                    print(f"   - {resource_id}: {', '.join(checks)}")
            # Count total failed mandatory checks across all resources
            total_failed_mandatory_checks = sum(len(v) for v in failed_mandatory_checks_all.values())
            print(f"\nTotal failed mandatory checks: {total_failed_mandatory_checks}")
            # If there are failed mandatory checks, save them to a JSON file for further processing in the workflow
            if total_failed_mandatory_checks > 0:
                with open('failed_mandatory_checks.json', 'w', encoding='utf-8') as f:
                    json.dump(failed_mandatory_checks_all, f, indent=2)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()