"""Exercise validation failures without network access or credentials."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]


class ValidationTests(unittest.TestCase):
    def run_validation(self, validator_status=0, records=(), extract_status=0):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            (work / "renovate.json").write_text("{}")
            for name, body in {
                "renovate-config-validator": (
                    'test "$*" = "--strict --no-global renovate.json" || exit 97\n'
                    f"exit {validator_status}\n"
                ),
                "renovate": (
                    'test "$*" = "--platform=local --dry-run=extract" || exit 97\n'
                    'touch extraction-called\ncat records\n'
                    f"exit {extract_status}\n"
                ),
            }.items():
                executable = work / name
                executable.write_text("#!/bin/sh\n" + body)
                executable.chmod(0o755)
            (work / "records").write_text("\n".join(json.dumps(record) for record in records))
            output = work / "output"
            output.touch()
            env = {"PATH": f"{work}:{os.defpath}", "GITHUB_OUTPUT": str(output)}
            result = subprocess.run(
                ["bash", str(ROOT / "actions/renovate-validate/run.sh")],
                cwd=work, env=env, text=True, capture_output=True, timeout=30,
            )
            return result, output.read_text(), (work / "extraction-called").exists()

    def test_invalid_config_stops_before_preset_resolution(self):
        result, reason, extracted = self.run_validation(validator_status=2)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("reason=renovate.json failed strict validation", reason)
        self.assertFalse(extracted)

    def test_valid_config_resolves_presets(self):
        result, reason, extracted = self.run_validation()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(reason, "")
        self.assertTrue(extracted)

    def test_preset_failures_are_not_hidden_by_successful_cli_exit(self):
        cases = [
            ({"msg": "Repository has invalid config"}, "could not resolve"),
            ({"msg": "failed", "err": {"validationError": "Preset not found"}}, "could not resolve"),
            ({"msg": "Rate limit exceeded"}, "rate limit"),
        ]
        for record, expected in cases:
            with self.subTest(record=record):
                result, reason, extracted = self.run_validation(records=[record])
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertIn(expected, reason)
                self.assertTrue(extracted)

    def test_nonzero_extraction_exit_is_preserved(self):
        result, reason, _ = self.run_validation(extract_status=7)
        self.assertEqual(result.returncode, 7, result.stderr)
        self.assertIn("code 7", reason)

