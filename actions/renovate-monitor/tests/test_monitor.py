"""Check health decisions and issue lifecycle without calling GitHub."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
LOOKUP_WARNING = "⚠️ WARN: Package lookup failures"
TIMESTAMP_WARNINGS = [
    f"⚠️ WARN: Some {kind}(s) did not have a releaseTimestamp, but as we're running with "
    "minimumReleaseAgeBehaviour=timestamp-optional, proceeding. See debug logs for more information"
    for kind in ("release", "upgrade")
]


class MonitorTests(unittest.TestCase):
    def run_monitor(
        self,
        body="",
        issues=True,
        existing=False,
        missing_dashboard=False,
        validation="success",
        lookup="success",
        reason="",
        fail_command="",
    ):
        dashboard = (
            []
            if missing_dashboard
            else [
                {
                    "author": {"login": "app/renovate"},
                    "body": body,
                    "number": 1,
                    "title": "Dependency Dashboard",
                    "url": "https://github.com/example/repo/issues/1",
                }
            ]
        )
        health = [
            {
                "body": "<!-- renovate-health-check -->",
                "number": 2,
                "title": "Renovate health check failed",
                "url": "https://github.com/example/repo/issues/2",
            }
        ]
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            (work / "fixture.json").write_text(
                json.dumps(
                    {
                        "issues": issues,
                        "dashboard": dashboard,
                        "health": health if existing else [],
                        "fail": fail_command,
                    }
                )
            )
            executable = work / "gh"
            executable.write_text(
                f"#!{sys.executable}\n"
                + """
import json, sys
from pathlib import Path
args = sys.argv[1:]
fixture = json.loads(Path("fixture.json").read_text())
entry = {"args": args}
if "--body-file" in args:
    entry["body"] = Path(args[args.index("--body-file") + 1]).read_text()
with Path("calls").open("a") as stream:
    stream.write(json.dumps(entry) + "\\n")
if fixture["fail"] and " ".join(args).startswith(fixture["fail"]):
    sys.exit(42)
if args == ["api", "repos/example/repo", "--jq", ".has_issues"]:
    print(str(fixture["issues"]).lower())
elif args[:2] == ["issue", "list"] and "--author" in args:
    assert args[args.index("--author") + 1] == "renovate[bot]"
    print(json.dumps(fixture["dashboard"]))
elif args[:2] == ["issue", "list"] and "--label" in args:
    assert args[args.index("--label") + 1] == "renovate-health"
    print(json.dumps(fixture["health"]))
elif args[:2] in (["issue", "create"], ["issue", "comment"], ["issue", "close"], ["label", "create"]):
    pass
else:
    sys.exit(97)
"""
            )
            executable.chmod(0o755)
            summary = work / "summary"
            summary.touch()
            env = {
                "PATH": f"{work}:{os.defpath}",
                "GH_REPO": "example/repo",
                "GH_TOKEN": "test-only",
                "GITHUB_REPOSITORY": "example/repo",
                "GITHUB_RUN_ID": "123",
                "GITHUB_STEP_SUMMARY": str(summary),
                "VALIDATION_RESULT": validation,
                "LOOKUP_RESULT": lookup,
                "VALIDATION_REASON": "",
                "LOOKUP_REASON": reason,
            }
            result = subprocess.run(
                ["bash", str(ROOT / "actions/renovate-monitor/run.sh")],
                cwd=work,
                env=env,
                text=True,
                capture_output=True,
                timeout=30,
            )
            calls = work / "calls"
            entries = [json.loads(line) for line in calls.read_text().splitlines()] if calls.exists() else []
            return result, summary.read_text(), entries

    def test_disabled_issues_preserve_job_failure_without_issue_api(self):
        result, summary, calls = self.run_monitor(issues=False, validation="failure")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("validation job finished with: failure", summary)
        self.assertIn("Issues are disabled", summary)
        self.assertEqual([call["args"][0] for call in calls], ["api"])

    def test_disabled_issues_allow_partial_success(self):
        result, summary, calls = self.run_monitor(issues=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Dashboard inspection is skipped", summary)
        self.assertEqual(len(calls), 1)

    def test_known_warnings_remain_visible(self):
        for warning in [LOOKUP_WARNING, *TIMESTAMP_WARNINGS]:
            for extra, status in [("", 0), ("\n - Unknown problem", 1)]:
                with self.subTest(warning=warning, extra=extra):
                    result, summary, _ = self.run_monitor(body=f"## Repository Problems\n - {warning}{extra}")
                    self.assertEqual(result.returncode, status, result.stderr)
                    self.assertIn(warning, summary)

    def test_unhealthy_states_are_not_ignored(self):
        cases = [
            {"body": "## Errored\n - Failed update"},
            {"missing_dashboard": True},
            {"validation": "failure"},
            {"validation": "skipped"},
            {"validation": "cancelled"},
            {"lookup": "failure", "reason": "Registry unavailable"},
            {
                "body": f"## Repository Problems\n - {LOOKUP_WARNING}",
                "lookup": "failure",
            },
        ]
        for case in cases:
            with self.subTest(case=case):
                result, summary, calls = self.run_monitor(existing=True, **case)
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertIn("Unhealthy", summary)
                self.assertNotIn(["issue", "close"], [call["args"][:2] for call in calls])
                if case.get("reason"):
                    self.assertIn(case["reason"], summary)

    def test_issue_lifecycle(self):
        cases = [
            (False, "success", []),
            (False, "failure", [["label", "create"], ["issue", "create"]]),
            (True, "failure", [["issue", "comment"]]),
            (True, "success", [["issue", "comment"], ["issue", "close"]]),
        ]
        for existing, validation, expected in cases:
            with self.subTest(existing=existing, validation=validation):
                result, _, calls = self.run_monitor(existing=existing, validation=validation)
                self.assertEqual(
                    result.returncode,
                    0 if validation == "success" else 1,
                    result.stderr,
                )
                mutations = [
                    call for call in calls if call["args"][:2] not in (["api", "repos/example/repo"], ["issue", "list"])
                ]
                self.assertEqual([call["args"][:2] for call in mutations], expected)
                for call in mutations:
                    if "body" in call:
                        self.assertIn(
                            "https://github.com/example/repo/actions/runs/123",
                            call["body"],
                        )
                if not existing and validation == "failure":
                    self.assertIn("<!-- renovate-health-check -->", mutations[-1]["body"])
                if existing and validation == "success":
                    self.assertEqual(
                        mutations[-1]["args"],
                        ["issue", "close", "2", "--reason", "completed"],
                    )

    def test_api_and_comment_failures_are_not_success(self):
        for command in ["api", "issue comment"]:
            with self.subTest(command=command):
                result, _, calls = self.run_monitor(existing=True, fail_command=command)
                self.assertEqual(result.returncode, 42, result.stderr)
                self.assertNotIn(["issue", "close"], [call["args"][:2] for call in calls])
