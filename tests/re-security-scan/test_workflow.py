"""Execute the workflow's Bash preparation steps with controlled Docker metadata.

Run with Python, PyYAML and Bash installed: python tests/re-security-scan/test_workflow.py
"""
import os
import json
from pathlib import Path
import shutil
import shlex
import subprocess
import tempfile
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = yaml.safe_load((ROOT / '.github/workflows/re-security-scan.yml').read_text(encoding='utf-8'))
BASH = os.environ.get('TEST_BASH') or shutil.which('bash')


def step(job, step_id):
    return next(s for s in WORKFLOW['jobs'][job]['steps'] if s.get('id') == step_id)


def execute(script, **env):
    with tempfile.TemporaryDirectory() as directory:
        script_path = Path(directory) / 'step.sh'
        script_path.write_text(script, encoding='utf-8', newline='\n')
        result = subprocess.run([BASH, script_path.as_posix()], cwd=directory,
                                env={**os.environ, 'GITHUB_OUTPUT': 'outputs', **env},
                                capture_output=True, text=True)
        output_path = Path(directory) / 'outputs'
        outputs = dict(line.split('=', 1) for line in output_path.read_text().splitlines()) if output_path.exists() else {}
        return result, outputs


class PreparationTests(unittest.TestCase):
    def prepare(self, image, platform='linux/amd64', runner='', target='docker'):
        result, outputs = execute(step('init', 'prepare-outputs')['run'],
                                  TARGET=target, INCOMMING_IMAGE=image,
                                  SCAN_PLATFORM=platform, RUNNER=runner)
        self.assertEqual(result.returncode, 0, result.stderr)
        return outputs

    def test_native_platforms_remain_distinct(self):
        for arch in ('amd64', 'arm64'):
            with self.subTest(arch=arch):
                result, outputs = execute('docker() { echo "linux/$MOCK_ARCH"; }\n' +
                                          step('init', 'prepare-platform')['run'], MOCK_ARCH=arch)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(outputs['SCAN_PLATFORM'], f'linux/{arch}')
                prepared = self.prepare('ghcr.io/team/collector:main', outputs['SCAN_PLATFORM'])
                self.assertEqual(prepared['SCAN_CATEGORY'], f'collector:main@linux/{arch}')

    def test_failed_docker_lookup_does_not_emit_platform(self):
        result, outputs = execute('docker() { return 1; }\n' + step('init', 'prepare-platform')['run'])
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('SCAN_PLATFORM', outputs)

    def test_invalid_platform_does_not_emit_category(self):
        result, outputs = execute('docker() { echo "linux/"; }\n' + step('init', 'prepare-platform')['run'])
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('SCAN_PLATFORM', outputs)

    def test_tag_platform_matrix_and_artifact_names(self):
        categories, filenames = set(), set()
        for tag in ('latest', 'main'):
            for arch in ('amd64', 'arm64'):
                prepared = self.prepare(f'ghcr.io/team/collector:{tag}', f'linux/{arch}')
                categories.add(prepared['SCAN_CATEGORY'])
                for scanner in ('GRYPE', 'TRIVY'):
                    name = prepared[f'{scanner}_FILENAME']
                    self.assertNotIn('/', name)
                    filenames.add(name)
                self.assertEqual(prepared['IMAGE_SHORT_NAME'], 'collector')
        self.assertEqual(len(categories), 4)
        self.assertEqual(len(filenames), 8)

    def test_default_tag_registry_port_and_digest(self):
        cases = [('localhost:5000/team/collector', 'collector:latest', 'collector'),
                 ('localhost:5000/team/collector:main', 'collector:main', 'collector'),
                 ('ghcr.io/team/collector@sha256:abcdef', 'collector@sha256', 'collector@sha256')]
        for image, base, legacy in cases:
            with self.subTest(image=image):
                prepared = self.prepare(image)
                self.assertEqual(prepared['SCAN_CATEGORY'], f'{base}@linux/amd64')
                self.assertEqual(prepared['IMAGE_SHORT_NAME'], legacy)

    def test_runner_label_does_not_define_category(self):
        default = self.prepare('collector:main')
        custom = self.prepare('collector:main', runner='ubuntu-24.04')
        self.assertEqual(default['SCAN_CATEGORY'], custom['SCAN_CATEGORY'])
        self.assertNotEqual(default['GRYPE_FILENAME'], custom['GRYPE_FILENAME'])

    def test_source_ignores_platform_and_retains_filenames(self):
        prepared = self.prepare('', platform='', target='source')
        self.assertNotIn('SCAN_CATEGORY', prepared)
        self.assertEqual(prepared['GRYPE_FILENAME'], 'grype.sarif')
        self.assertEqual(prepared['TRIVY_FILENAME'], 'trivy.sarif')


class LegacyRetirementTests(unittest.TestCase):
    def retire(self, *, new_error='', legacy_count=2, api_failure=False, enabled=True):
        analyses = [[
            {'sarif_id': 'new-id', 'commit_sha': 'commit',
             'category': 'collector:main@linux/arm64/', 'error': new_error, 'results_count': 3},
            {'sarif_id': 'old-id', 'commit_sha': 'old-commit',
             'category': 'collector/', 'error': '', 'results_count': legacy_count},
        ]]
        response = shlex.quote(json.dumps(analyses))
        mock = ('gh() { return 1; }\n' if api_failure else
                f'gh() {{ printf "%s" {response}; }}\n')
        return execute(mock + 'sleep() { :; }\n' + step('retire-legacy-category', 'legacy')['run'],
                       LEGACY_CATEGORY='collector', SCAN_CATEGORY='collector:main@linux/arm64',
                       GRYPE_SCAN=str(enabled).lower(), TRIVY_SCAN='false',
                       GRYPE_SARIF_ID='new-id', TRIVY_SARIF_ID='',
                       GITHUB_REPOSITORY='owner/repo', GITHUB_REF='refs/heads/main', GITHUB_SHA='commit')

    def test_released_category_retires_after_platform_analysis_processed(self):
        result, outputs = self.retire()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(outputs, {'grype': 'true'})

    def test_empty_legacy_category_needs_no_upload(self):
        result, outputs = self.retire(legacy_count=0)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(outputs, {})

    def test_processing_failure_preserves_legacy_results(self):
        result, outputs = self.retire(new_error='scan processing failed')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(outputs, {})

    def test_api_failure_preserves_legacy_results(self):
        result, outputs = self.retire(api_failure=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(outputs, {})

    def test_disabled_scanner_needs_no_upload(self):
        result, outputs = self.retire(enabled=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(outputs, {})


if __name__ == '__main__':
    unittest.main(verbosity=2)
