"""Exercise lookup classification and retries with a local CLI substitute."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
SOFT = {"level": 40, "msg": "Failed to look up docker package example"}


class LookupTests(unittest.TestCase):
    def run_lookup(self, attempts):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            (work / "attempts.json").write_text(json.dumps(attempts))
            executable = work / "renovate"
            executable.write_text(
                f"#!{sys.executable}\n"
                + """
import json, os, sys
from pathlib import Path
if sys.argv[1:] != ["--platform=local", "--dry-run=lookup"]:
    sys.exit(97)
calls = Path("calls")
previous = calls.read_text().splitlines() if calls.exists() else []
with calls.open("a") as stream:
    stream.write(os.environ["RENOVATE_CACHE_DIR"] + "\\n")
attempts = json.loads(Path("attempts.json").read_text())
if len(previous) >= len(attempts):
    sys.exit(98)
status, records = attempts[len(previous)]
for record in records:
    print(json.dumps(record))
sys.exit(status)
"""
            )
            executable.chmod(0o755)
            output, summary = work / "output", work / "summary"
            output.touch()
            summary.touch()
            env = {
                "PATH": f"{work}:{os.defpath}",
                "GITHUB_OUTPUT": str(output),
                "GITHUB_STEP_SUMMARY": str(summary),
            }
            result = subprocess.run(
                ["bash", str(ROOT / "actions/renovate-lookup/run.sh")],
                cwd=work,
                env=env,
                text=True,
                capture_output=True,
                timeout=30,
            )
            calls = work / "calls"
            caches = calls.read_text().splitlines() if calls.exists() else []
            self.assertTrue(
                all(not Path(cache).exists() for cache in caches),
                "Cache was not cleaned up",
            )
            return result, output.read_text(), summary.read_text(), caches

    def test_retry_recovers_with_a_fresh_cache(self):
        result, reason, summary, caches = self.run_lookup([(0, [SOFT]), (0, [])])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(reason, "")
        self.assertEqual(len(caches), 2)
        self.assertNotEqual(caches[0], caches[1])
        self.assertIn("Retry recovered: true", summary)
        self.assertIn(SOFT["msg"], summary)

    def test_failures_and_retry_limits(self):
        cases = [
            ([(0, [])], 0, 1, ""),
            ([(0, [SOFT]), (0, [SOFT])], 1, 2, "failed to look up 1 dependency"),
            ([(0, [{"msg": "Rate limit exceeded"}])], 1, 1, "rate limit"),
            ([(0, [{"level": 50, "msg": "failure"}])], 1, 1, "error records"),
            ([(7, [])], 1, 1, "code 7"),
            ([(0, [SOFT]), (7, [])], 1, 2, "failed to look up 1 dependency"),
        ]
        for attempts, status, count, expected in cases:
            with self.subTest(attempts=attempts):
                result, reason, summary, caches = self.run_lookup(attempts)
                self.assertEqual(result.returncode, status, result.stderr)
                self.assertEqual(len(caches), count)
                if status:
                    self.assertIn(expected, reason)
                    self.assertIn("::stop-commands::", result.stdout)
                else:
                    self.assertEqual(reason, "")
                self.assertIn("Local Renovate lookup", summary)
