"""Check the findings and the fixes of dockerfile_platform_check.py on small Dockerfiles.

Each test writes one Dockerfile, runs the script on it in a subprocess, and asserts the
reported rules with their lines and, for --fix, the rewritten file.
"""

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "dockerfile_platform_check.py"
FINDING = re.compile(r"^Dockerfile:(\d+): (error|warning) (ARCH\d+): ", re.M)


class DockerfilePlatformCheckTests(unittest.TestCase):
    def run_script(self, dockerfile, *flags):
        """Run the script on the Dockerfile text and return (status, stdout, file text).

        The file text is read back after the run, so it shows what --fix wrote.
        """
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Dockerfile"
            path.write_bytes(dockerfile.encode())
            result = subprocess.run(
                [sys.executable, str(SCRIPT), *flags, "Dockerfile"],
                cwd=directory,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.stderr, "")
            return result.returncode, result.stdout, path.read_bytes().decode()

    def run_summary(self, dockerfile):
        """Run the script with --summary and return the Markdown it wrote, or None."""
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "Dockerfile").write_text(dockerfile)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--summary", "summary.md", "Dockerfile"],
                cwd=directory,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.stderr, "")
            summary = Path(directory, "summary.md")
            return summary.read_text() if summary.exists() else None

    def run_check(self, dockerfile, *flags):
        """Return (status, findings) where findings are (line, severity, rule) tuples."""
        status, stdout, _ = self.run_script(dockerfile, *flags)
        findings = [(int(n), sev, rule) for n, sev, rule in FINDING.findall(stdout)]
        return status, findings

    def assert_silent(self, dockerfile):
        status, stdout, _ = self.run_script(dockerfile)
        self.assertEqual(stdout, "")
        self.assertEqual(status, 0)

    def fix(self, dockerfile):
        """Run --fix and return the rewritten file; nothing may remain to report."""
        status, stdout, fixed = self.run_script(dockerfile, "--fix")
        remaining = [line for line in stdout.splitlines() if " fixed " not in line]
        self.assertEqual(remaining, [], stdout)
        self.assertEqual(status, 0, stdout)
        return fixed

    def test_a_builder_that_cross_compiles_for_the_target_is_not_reported(self):
        self.assert_silent(
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "ARG TARGETOS\n"
            "ARG TARGETARCH\n"
            "RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )

    def test_a_final_stage_on_the_build_platform_is_an_error_and_loses_the_flag(self):
        dockerfile = (
            "FROM --platform=$BUILDPLATFORM alpine:3.22\nRUN apk add --no-cache curl\n"
        )
        self.assertEqual(self.run_check(dockerfile), (1, [(1, "error", "ARCH001")]))
        self.assertEqual(
            self.fix(dockerfile), "FROM alpine:3.22\nRUN apk add --no-cache curl\n"
        )

    def test_a_go_build_on_the_build_platform_without_goarch_gets_the_target_architecture(
        self,
    ):
        dockerfile = (
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "RUN go build -o /a ./cmd/a \\\n"
            "    && go build -o /b ./cmd/b\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /a /b /\n"
        )
        self.assertEqual(self.run_check(dockerfile), (1, [(2, "error", "ARCH002")]))
        self.assertEqual(
            self.fix(dockerfile),
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "ARG TARGETARCH\n"
            "ARG TARGETOS\n"
            "RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /a ./cmd/a \\\n"
            "    && GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /b ./cmd/b\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /a /b /\n",
        )

    def test_a_go_build_after_a_comment_inside_a_continuation_is_reported(self):
        status, findings = self.run_check(
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "RUN apk add --no-cache git \\\n"
            "    # the build needs git for VCS stamping\n"
            "\n"
            "    && go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )
        self.assertEqual((status, findings), (1, [(2, "error", "ARCH002")]))

    def test_a_go_build_beside_a_command_that_needs_runner_binaries_is_left_unchanged_by_fix(
        self,
    ):
        for command in (
            "go install example.com/tool@v1.0.0",
            "go run ./gen",
            "go generate ./...",
            "go test ./...",
            "/app --version",
        ):
            with self.subTest(command=command):
                dockerfile = (
                    "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
                    "RUN go build -o /app .\n"
                    "RUN %s\n"
                    "FROM alpine:3.22\n"
                    "COPY --from=builder /app /app\n" % command
                )
                _, _, fixed = self.run_script(dockerfile, "--fix")
                self.assertEqual(fixed, dockerfile)
                self.assertEqual(
                    self.run_check(dockerfile), (1, [(2, "error", "ARCH002")])
                )

    def test_a_hard_coded_goarch_in_go_build_is_replaced_by_the_target_architecture(
        self,
    ):
        dockerfile = (
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )
        self.assertEqual(self.run_check(dockerfile), (1, [(2, "error", "ARCH003")]))
        self.assertEqual(
            self.fix(dockerfile),
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "ARG TARGETARCH\n"
            "RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n",
        )

    def test_a_hard_coded_goarch_in_env_is_replaced_by_the_target_architecture(self):
        dockerfile = (
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "ENV CGO_ENABLED=0 GOARCH=amd64\n"
            "RUN go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )
        self.assertEqual(self.run_check(dockerfile), (1, [(2, "error", "ARCH003")]))
        self.assertEqual(
            self.fix(dockerfile),
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "ARG TARGETARCH\n"
            "ENV CGO_ENABLED=0 GOARCH=${TARGETARCH}\n"
            "RUN go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n",
        )

    def test_target_variables_read_without_arg_on_the_build_platform_are_an_error(self):
        dockerfile = (
            "FROM --platform=$BUILDPLATFORM golang:1.27 AS build\n"
            "RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=build /app /app\n"
        )
        self.assertEqual(self.run_check(dockerfile), (1, [(1, "error", "ARCH004")]))
        self.assertEqual(
            self.fix(dockerfile),
            "FROM --platform=$BUILDPLATFORM golang:1.27 AS build\n"
            "ARG TARGETARCH\n"
            "ARG TARGETOS\n"
            "RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=build /app /app\n",
        )

    def test_target_variables_read_without_arg_under_emulation_are_a_warning(self):
        """Under emulation an empty GOARCH means the target, so the image is correct."""
        self.assertEqual(
            self.run_check(
                "FROM golang:1.27 AS build\n"
                "RUN GOARCH=${TARGETARCH} go build -o /app .\n"
                "FROM alpine:3.22\n"
                "COPY --from=build /app /app\n"
            ),
            (0, [(1, "warning", "ARCH004")]),
        )

    def test_an_emulated_go_builder_with_cgo_disabled_is_a_warning_and_moves_to_the_build_platform(
        self,
    ):
        dockerfile = (
            "FROM golang:1.27 AS builder\n"
            "RUN CGO_ENABLED=0 go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )
        self.assertEqual(self.run_check(dockerfile), (0, [(1, "warning", "ARCH005")]))
        self.assertEqual(
            self.fix(dockerfile),
            "FROM --platform=$BUILDPLATFORM golang:1.27 AS builder\n"
            "ARG TARGETARCH\n"
            "ARG TARGETOS\n"
            "RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n",
        )

    def test_an_emulated_alpine_go_builder_without_a_c_compiler_is_a_warning(self):
        """Go turns cgo off when no C compiler is installed, as in golang:*-alpine."""
        self.assertEqual(
            self.run_check(
                "FROM golang:1.27-alpine AS builder\n"
                "RUN go build -o /app .\n"
                "FROM alpine:3.22\n"
                "COPY --from=builder /app /app\n"
            ),
            (0, [(1, "warning", "ARCH005")]),
        )

    def test_an_emulated_alpine_go_builder_that_installs_a_c_compiler_is_not_reported(
        self,
    ):
        """The control is the same stage without apk add build-base, which is reported."""
        self.assert_silent(
            "FROM golang:1.27-alpine AS builder\n"
            "RUN apk add --no-cache build-base\n"
            "RUN go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )

    def test_an_emulated_go_builder_with_cgo_enabled_is_not_reported(self):
        """A cgo build needs a C cross-compiler, so the stage stays under emulation.

        The control is the same stage with CGO_ENABLED=0, which
        test_an_emulated_go_builder_with_cgo_disabled_is_a_warning_and_moves_to_the_build_platform
        reports.
        """
        self.assert_silent(
            "FROM golang:1.27 AS builder\n"
            "RUN go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )

    def test_an_emulated_go_builder_that_runs_its_binary_is_not_reported(self):
        """On the build platform the binary would be built for the target and could not run.

        The control is the same stage without the /app --version line, which
        test_an_emulated_go_builder_with_cgo_disabled_is_a_warning_and_moves_to_the_build_platform
        reports.
        """
        self.assert_silent(
            "FROM golang:1.27 AS builder\n"
            "RUN CGO_ENABLED=0 go build -o /app .\n"
            "RUN /app --version\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )

    def test_warn_only_reports_errors_as_warnings_and_exits_with_zero(self):
        self.assertEqual(
            self.run_check(
                "FROM --platform=$BUILDPLATFORM alpine:3.22\n", "--warn-only"
            ),
            (0, [(1, "warning", "ARCH001")]),
        )

    def test_github_format_prints_an_annotation_with_the_file_and_line(self):
        _, stdout, _ = self.run_script(
            "FROM --platform=$BUILDPLATFORM alpine:3.22\n", "--format=github"
        )
        self.assertRegex(
            stdout, r"^::error file=Dockerfile,line=1,title=ARCH001::The final stage "
        )

    def test_summary_lists_the_findings_and_the_diff_that_fix_applies(self):
        summary = self.run_summary(
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "RUN go build -o /app .\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )
        self.assertIn(
            "| ARCH002 | 2 | error | This stage runs on $BUILDPLATFORM", summary
        )
        self.assertIn(
            "````diff\n"
            "--- Dockerfile\n"
            "+++ Dockerfile (fixed)\n"
            "@@ -1,4 +1,6 @@\n"
            " FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "-RUN go build -o /app .\n"
            "+ARG TARGETARCH\n"
            "+ARG TARGETOS\n"
            "+RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /app .\n"
            " FROM alpine:3.22\n"
            " COPY --from=builder /app /app\n"
            "````\n",
            summary,
        )
        self.assertNotIn("fix them by hand", summary)

    def test_summary_names_findings_that_fix_leaves_unchanged(self):
        summary = self.run_summary(
            "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
            "RUN go build -o /app .\n"
            "RUN go run ./gen\n"
            "FROM alpine:3.22\n"
            "COPY --from=builder /app /app\n"
        )
        self.assertIn("| ARCH002 | 2 | error |", summary)
        self.assertNotIn("````diff", summary)
        self.assertIn(
            "`--fix` leaves some findings unchanged; fix them by hand.", summary
        )

    def test_summary_is_not_written_for_a_dockerfile_without_findings(self):
        """The control is the same Dockerfile without the ARG lines, which gets a summary.

        test_summary_lists_the_findings_and_the_diff_that_fix_applies checks that one.
        """
        self.assertIsNone(
            self.run_summary(
                "FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS builder\n"
                "ARG TARGETOS\n"
                "ARG TARGETARCH\n"
                "RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /app .\n"
                "FROM alpine:3.22\n"
                "COPY --from=builder /app /app\n"
            )
        )

    def test_fix_keeps_crlf_line_endings(self):
        self.assertEqual(
            self.fix(
                "FROM --platform=$BUILDPLATFORM golang:1.27 AS build\r\n"
                "RUN GOARCH=${TARGETARCH} go build -o /app .\r\n"
                "FROM alpine:3.22\r\n"
                "COPY --from=build /app /app\r\n"
            ),
            "FROM --platform=$BUILDPLATFORM golang:1.27 AS build\r\n"
            "ARG TARGETARCH\r\n"
            "RUN GOARCH=${TARGETARCH} go build -o /app .\r\n"
            "FROM alpine:3.22\r\n"
            "COPY --from=build /app /app\r\n",
        )


if __name__ == "__main__":
    unittest.main()
