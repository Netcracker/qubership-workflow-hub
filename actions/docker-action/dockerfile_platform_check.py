#!/usr/bin/env python3
"""Find Dockerfile stages that put the wrong architecture into a multi-platform image.

A multi-platform build, such as ``docker buildx build --platform
linux/amd64,linux/arm64``, runs every stage once per target platform. A stage
pinned to ``$BUILDPLATFORM`` runs on the runner's architecture instead, and a
Go build in such a stage targets the runner unless ``GOARCH`` comes from
``$TARGETARCH``. A stage that is not pinned runs under QEMU emulation for the
targets the runner cannot execute natively.

Rules:

ARCH001
    The final stage uses ``--platform=$BUILDPLATFORM``, so the image for every
    target contains the runner's binaries. The fix drops the flag.
ARCH002
    A stage on ``$BUILDPLATFORM`` runs ``go build`` without ``GOARCH``, so the
    binary is built for the runner. The fix passes ``GOOS`` and ``GOARCH`` from
    ``TARGETOS`` and ``TARGETARCH``; it is applied only to a stage that runs
    nothing it compiled.
ARCH003
    ``GOARCH`` is hard-coded in ``go build``, ``ENV``, or ``ARG``, so every
    image gets that architecture. The fix replaces it with ``${TARGETARCH}``.
ARCH004
    The stage reads ``$TARGETARCH`` or ``$TARGETOS`` without declaring it with
    ``ARG``, so the value is empty. It is an error on ``$BUILDPLATFORM``, where
    an empty ``GOARCH`` means the runner's architecture, and a warning
    elsewhere. The fix adds the ``ARG``.
ARCH005
    A Go builder stage runs under emulation, which makes the build several
    times slower. The fix adds ``--platform=$BUILDPLATFORM``. It is reported
    only for a stage that builds with CGO disabled and runs nothing it
    compiled.

Exit status is 1 when an error-level finding remains, unless ``--warn-only``
is given, and 0 otherwise.
"""

import argparse
import difflib
import os
import re
import sys

BUILDPLATFORM = re.compile(r"--platform=[\"']?\$\{?BUILDPLATFORM\}?[\"']?\s*")
GO_BUILD = re.compile(r"(?<![\w/=-])go\s+build\b")
GO_TOOLS_RUN = re.compile(r"(?<![\w/=-])go\s+(install|run|generate|test)\b")
GOARCH_FIXED = re.compile(
    r"\bGOARCH=([\"']?)(amd64|arm64|arm|386|ppc64le|s390x|riscv64)\1(?=\s|$|;|&)"
)
TARGET_REF = re.compile(r"\$\{?(TARGETARCH|TARGETOS)\b")
CGO_OFF = re.compile(r"\bCGO_ENABLED[= ][\"']?0\b")
C_TOOLCHAIN = re.compile(r"\b(gcc|build-base|musl-dev|clang|g\+\+|build-essential)\b")
# Commands a builder stage may run on the build platform: none of them executes
# a binary the stage compiled for the target.
SAFE_COMMANDS = {
    "go", "apk", "apt-get", "apt", "mkdir", "cp", "mv", "rm", "ls", "chmod",
    "chown", "echo", "cd", "git", "set", "true", "export", "tar", "sed", "touch",
    "ln", "wget", "curl", "addgroup", "adduser", "useradd", "groupadd", "printf",
    "test", "[", "cat",
}  # fmt: skip
GO_SAFE_SUBCOMMANDS = {"build", "mod", "env", "version", "list", "vet", "work"}


class Instruction:
    def __init__(self, keyword, start, end, text):
        self.keyword = keyword
        self.start = start
        self.end = end
        self.text = text


class Stage:
    def __init__(self, from_instruction):
        self.from_instruction = from_instruction
        self.body = []

    @property
    def on_build_platform(self):
        return bool(BUILDPLATFORM.search(self.from_instruction.text))

    def runs(self):
        return [i for i in self.body if i.keyword == "RUN"]

    def text(self):
        return "\n".join(i.text for i in self.body)

    def declared_args(self):
        names = set()
        for i in self.body:
            if i.keyword == "ARG":
                for token in i.text.split()[1:]:
                    names.add(token.split("=", 1)[0])
        return names


class Finding:
    def __init__(self, rule, severity, line, message, fixable):
        self.rule = rule
        self.severity = severity
        self.line = line
        self.message = message
        self.fixable = fixable


def is_blank_or_comment(line):
    stripped = line.strip()
    return not stripped or stripped.startswith("#")


def parse(lines):
    """Split physical lines into stages of instructions that keep their line span."""
    instructions = []
    i = 0
    while i < len(lines):
        if is_blank_or_comment(lines[i]):
            i += 1
            continue
        start, parts = i, []
        while True:
            current = lines[i].rstrip()
            parts.append(current)
            if not current.endswith("\\") or i + 1 == len(lines):
                break
            # The builder drops comment and blank lines inside a continuation.
            i += 1
            while i + 1 < len(lines) and is_blank_or_comment(lines[i]):
                i += 1
        text = " ".join(p.rstrip("\\").strip() for p in parts)
        instructions.append(Instruction(text.split(None, 1)[0].upper(), start, i, text))
        i += 1
    stages = []
    for instruction in instructions:
        if instruction.keyword == "FROM":
            stages.append(Stage(instruction))
        elif stages:
            stages[-1].body.append(instruction)
    return stages


def cgo_disabled(stage):
    if CGO_OFF.search(stage.text()):
        return True
    # Go turns cgo off when no C compiler is on PATH, and Alpine images ship none.
    image = stage.from_instruction.text.lower()
    return "alpine" in image and not C_TOOLCHAIN.search(stage.text())


def runs_only_safe_commands(stage):
    for run in stage.runs():
        command = re.sub(r"^RUN\s+(--\S+\s+)*", "", run.text, flags=re.I)
        for segment in re.split(r"&&|\|\||;|\|", command):
            words = [
                w for w in segment.split() if not re.match(r"^[A-Z_][A-Z0-9_]*=", w)
            ]
            if not words:
                continue
            if words[0] not in SAFE_COMMANDS:
                return False
            if words[0] == "go" and (
                len(words) < 2 or words[1] not in GO_SAFE_SUBCOMMANDS
            ):
                return False
    return True


def sets_in_stage(stage, var):
    return any(
        i.keyword in ("ENV", "ARG") and re.search(r"\b%s[= ]" % var, i.text)
        for i in stage.body
    )


def check(lines):
    """Return the findings for a Dockerfile and the edits that fix the fixable ones."""
    stages = parse(lines)
    findings, edits = [], []
    for index, stage in enumerate(stages):
        final = index == len(stages) - 1
        frm = stage.from_instruction
        builds = [r for r in stage.runs() if GO_BUILD.search(r.text)]
        added_args = set()

        if final and stage.on_build_platform:
            findings.append(
                Finding(
                    "ARCH001",
                    "error",
                    frm.start + 1,
                    "The final stage runs with --platform=$BUILDPLATFORM, so the image for every "
                    "target platform contains the runner's binaries. Remove --platform from this "
                    "FROM; only builder stages that cross-compile belong on $BUILDPLATFORM.",
                    True,
                )
            )
            edits.append(("sub", frm.start, BUILDPLATFORM, ""))

        goarch_sources = builds + [i for i in stage.body if i.keyword in ("ENV", "ARG")]
        for instruction in goarch_sources:
            for line in range(instruction.start, instruction.end + 1):
                match = GOARCH_FIXED.search(lines[line])
                if match:
                    arch = match.group(2)
                    findings.append(
                        Finding(
                            "ARCH003",
                            "error",
                            line + 1,
                            "GOARCH=%s is hard-coded, so a multi-platform build puts an %s binary "
                            "into every image. Use GOARCH=${TARGETARCH} and declare ARG TARGETARCH "
                            "in the stage." % (arch, arch),
                            True,
                        )
                    )
                    edits.append(("sub", line, GOARCH_FIXED, "GOARCH=${TARGETARCH}"))
                    added_args.add("TARGETARCH")

        stage_goarch = sets_in_stage(stage, "GOARCH")
        builds_without_goarch = [
            r for r in builds if "GOARCH" not in r.text and not stage_goarch
        ]
        plain_go_build = not GO_TOOLS_RUN.search(stage.text())
        # On the build platform, cross-compiled binaries cannot run in the same stage.
        cross_compilable = plain_go_build and runs_only_safe_commands(stage)

        if stage.on_build_platform and not final and builds_without_goarch:
            message = (
                "This stage runs on $BUILDPLATFORM, but `go build` sets no GOARCH, so every image "
                "gets a binary for the runner's architecture. Prefix the build with "
                "GOOS=${TARGETOS} GOARCH=${TARGETARCH} and declare both with ARG in the stage."
            )
            if not cross_compilable:
                message += (
                    " The fix is not applied automatically: the stage also runs go install, go run, "
                    "go generate, go test, or a command that may run a binary the stage built, "
                    "and those need binaries for the runner."
                )
            findings.append(
                Finding(
                    "ARCH002",
                    "error",
                    builds_without_goarch[0].start + 1,
                    message,
                    cross_compilable,
                )
            )
            if cross_compilable:
                for run in builds_without_goarch:
                    edits.append(("go-build", run.start, run.end))
                added_args |= {"TARGETOS", "TARGETARCH"}

        emulated = (
            not stage.on_build_platform
            and not final
            and builds
            and cgo_disabled(stage)
            and cross_compilable
        )
        if emulated:
            findings.append(
                Finding(
                    "ARCH005",
                    "warning",
                    frm.start + 1,
                    "This Go builder stage runs under QEMU emulation for target platforms the runner "
                    "cannot execute, which makes the build several times slower. CGO is disabled, so "
                    "the stage can cross-compile: add --platform=$BUILDPLATFORM to FROM and pass "
                    "GOOS=${TARGETOS} GOARCH=${TARGETARCH} to go build.",
                    True,
                )
            )
            edits.append(("platform", frm.start))
            for run in builds_without_goarch:
                edits.append(("go-build", run.start, run.end))
            if builds_without_goarch:
                added_args |= {"TARGETOS", "TARGETARCH"}

        read_args = set(TARGET_REF.findall(stage.text()))
        undeclared_reads = sorted(read_args - stage.declared_args())
        if undeclared_reads:
            message = (
                "The stage reads %s without declaring it with ARG after FROM, so the value is "
                "empty." % ", ".join("$" + a for a in undeclared_reads)
            )
            if stage.on_build_platform:
                message += " On $BUILDPLATFORM, go build then targets the runner's architecture."
            message += " Add %s after this FROM." % ", ".join(
                "ARG " + a for a in undeclared_reads
            )
            # Under emulation an empty GOARCH means the target, so only the build
            # platform turns the empty value into a wrong-architecture binary.
            severity = "error" if stage.on_build_platform else "warning"
            findings.append(Finding("ARCH004", severity, frm.start + 1, message, True))
        missing = sorted((read_args | added_args) - stage.declared_args())
        if missing:
            eol = "\r\n" if lines[frm.end].endswith("\r\n") else "\n"
            edits.append(
                ("insert", frm.end + 1, "".join("ARG %s%s" % (a, eol) for a in missing))
            )
    return findings, edits


def apply(lines, edits):
    """Return a copy of the lines with the edits applied."""
    lines = list(lines)
    inserts = []
    for edit in edits:
        kind = edit[0]
        if kind == "sub":
            _, line, pattern, replacement = edit
            lines[line] = pattern.sub(replacement, lines[line], count=1)
        elif kind == "platform":
            line = edit[1]
            if not BUILDPLATFORM.search(lines[line]):
                lines[line] = re.sub(
                    r"^(\s*FROM\s+)",
                    r"\1--platform=$BUILDPLATFORM ",
                    lines[line],
                    count=1,
                    flags=re.I,
                )
        elif kind == "go-build":
            _, start, end = edit
            span = range(start, end + 1)
            prefix = "GOARCH=${TARGETARCH} "
            if not any("GOOS" in lines[line] for line in span):
                prefix = "GOOS=${TARGETOS} " + prefix
            for line in span:
                lines[line] = GO_BUILD.sub(lambda m: prefix + m.group(0), lines[line])
        elif kind == "insert":
            inserts.append((edit[1], edit[2]))
    for at, text in sorted(inserts, reverse=True):
        lines.insert(at, text)
    return lines


def summary(shown, lines, findings, edits):
    """Return a Markdown section with the findings and the diff that --fix applies."""
    out = [
        "### Multi-platform Dockerfile check: `%s`" % shown,
        "",
        "| Rule | Line | Severity | Finding |",
        "| --- | --- | --- | --- |",
    ]
    for finding in findings:
        out.append(
            "| %s | %d | %s | %s |"
            % (
                finding.rule,
                finding.line,
                finding.severity,
                finding.message.replace("|", "\\|"),
            )
        )
    out.append("")
    # An inserted edit can hold several lines, so compare the text line by line.
    before = [line + "\n" for line in "".join(lines).splitlines()]
    after = [line + "\n" for line in "".join(apply(lines, edits)).splitlines()]
    diff = list(difflib.unified_diff(before, after, shown, shown + " (fixed)"))
    if diff:
        out += ["The diff that `--fix` applies:", "", "````diff"]
        out += [line.rstrip("\n") for line in diff]
        out += ["````", ""]
    if not all(finding.fixable for finding in findings):
        out += ["`--fix` leaves some findings unchanged; fix them by hand.", ""]
    return "\n".join(out) + "\n"


def dockerfiles(paths):
    for path in paths:
        if os.path.isdir(path):
            for directory, subdirectories, files in os.walk(path):
                subdirectories[:] = [
                    d
                    for d in subdirectories
                    if d not in (".git", "node_modules", "vendor")
                ]
                for name in files:
                    if (
                        name == "Dockerfile"
                        or name.endswith(".Dockerfile")
                        or name.startswith("Dockerfile.")
                    ):
                        yield os.path.join(directory, name)
        else:
            yield path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument(
        "--fix",
        action="store_true",
        help="rewrite the files to fix the fixable findings",
    )
    parser.add_argument("--format", choices=("text", "github"), default="text")
    parser.add_argument(
        "--warn-only",
        action="store_true",
        help="report every finding as a warning and exit with status 0",
    )
    parser.add_argument(
        "--summary",
        metavar="PATH",
        help="append a Markdown summary of the findings and the fix diff to PATH",
    )
    parser.add_argument(
        "paths", nargs="+", help="Dockerfiles, or directories to search for them"
    )
    args = parser.parse_args(argv)
    errors = 0
    for path in dockerfiles(args.paths):
        with open(path, encoding="utf-8", newline="") as fh:
            lines = fh.readlines()
        findings, edits = check(lines)
        shown = os.path.relpath(path)
        if args.summary and findings:
            with open(args.summary, "a", encoding="utf-8") as fh:
                fh.write(summary(shown, lines, findings, edits))
        if args.fix and edits:
            fixed = apply(lines, edits)
            with open(path, "w", encoding="utf-8", newline="") as fh:
                fh.writelines(fixed)
            for finding in findings:
                if finding.fixable:
                    print("%s:%d: fixed %s" % (shown, finding.line, finding.rule))
            findings, _ = check(fixed)
        for finding in findings:
            severity = "warning" if args.warn_only else finding.severity
            if severity == "error":
                errors += 1
            if args.format == "github":
                print(
                    "::%s file=%s,line=%d,title=%s::%s"
                    % (severity, shown, finding.line, finding.rule, finding.message)
                )
            else:
                print(
                    "%s:%d: %s %s: %s"
                    % (shown, finding.line, severity, finding.rule, finding.message)
                )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
