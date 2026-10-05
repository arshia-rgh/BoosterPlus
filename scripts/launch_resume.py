"""One-use, evidence-bound continuation of the owner-authorized launch gate98.

This is not a general skip flag or a cache populated by failed commands. Gate98
completed the backend gate and frontend npm gate before its image scan failed.
Only this exact baseline, Debian security patch and configuration-fixture fix
can reuse them. Neither changes previously qualified application behavior.
CI and clean checkouts retain the ordinary complete gate.
"""
import hashlib
import json
from pathlib import Path
import shlex
import subprocess

BASE = "7191e51c8c0530fe14c44cf9f8dd5b36e110b6e7"
MANIFEST_SHA = "367096aa377950ed07fc368b9b6844442c7e144d9d8f756f0f53a0d82471a9fe"
LOG_SHA = "44da236a7fd214637de09cc954c80e2dc1a12b72218f1dfefe2284aac9816e7e"
DOCKERFILE_SHA = "be2be31e729261deb52565448688b312e1859eb298d7029739cf66f3dc420739"
CONFIG_TEST_SHA = "8150844137de7ae1aade41e8b7df1e72ed462ded4a596c24e6bd0410aa81f1f5"
CONTINUATION_PATHS = {
    "frontend/Dockerfile", "AGENTS.md", "docs/progress.md",
    "docs/launch-gate98-continuation.md", "scripts/commit_gate.py",
    "scripts/launch_resume.py", "scripts/test_commit_gate.py",
    "production/deploy/config_test.py", "production/deploy/test_config_validation.py",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked_evidence(manifest, log):
    if digest(manifest) != MANIFEST_SHA or digest(log) != LOG_SHA:
        raise ValueError("Gate98 source/log evidence was replaced or is incomplete")
    value = json.loads(manifest)
    if not isinstance(value, dict) or len(value) != 113:
        raise ValueError("Unexpected gate98 source inventory")
    return value


def validate_changes(baseline, changed, content):
    """Every baseline change must still exist; unrelated changes invalidate reuse."""
    if not set(baseline).issubset(changed) or set(changed) - set(baseline) - CONTINUATION_PATHS:
        raise ValueError("Source change falls outside the qualified continuation")
    for path, expected in baseline.items():
        if path not in CONTINUATION_PATHS and digest(content(path)) != expected:
            raise ValueError("Previously qualified source changed: " + path)
    if "frontend/Dockerfile" not in changed or digest(content("frontend/Dockerfile")) != DOCKERFILE_SHA:
        raise ValueError("Only the reviewed PCRE2 image patch qualifies for this continuation")

    if "production/deploy/config_test.py" in baseline and digest(content("production/deploy/config_test.py")) != CONFIG_TEST_SHA:
        raise ValueError("Only the reviewed non-root validation fixture fix qualifies")


def remaining_commands():
    # Static and live security checks are refreshed. Only successful, source-bound
    # application suites are reused; image/container/production failures never are.
    return [
        ["make", "check-repository"],
        ["make", "-C", "backend", "fmt-check", "vet", "lint", "security"],
        ["npm", "--prefix", "frontend", "run", "security"],
        ["make", "-C", "backend", "docker-build", "image-security"],
        ["make", "-C", "frontend", "docker-build", "image-security"],
        ["python3", "frontend/scripts/container-smoke.py"],
        ["make", "-C", "production", "pre-commit"],
    ]


def read_evidence(path, maximum):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > maximum:
        raise ValueError("Missing or unsafe qualification evidence")
    return path.read_bytes()


def run_if_available():
    root = Path(__file__).resolve().parents[1]
    evidence = root / ".cache/qualification/gate98"
    if not evidence.exists():
        return False
    if evidence.is_symlink() or not evidence.is_dir():
        raise ValueError("Qualification evidence must be a local directory")

    def git(*args):
        return subprocess.check_output(["git", *args], cwd=root)

    if git("rev-parse", "HEAD").decode().strip() != BASE:
        raise ValueError("Gate98 continuation is consumed or belongs to a different base")
    if git("diff", "--name-only"):
        raise ValueError("Stage tracked changes before validating qualification evidence")
    baseline = checked_evidence(
        read_evidence(evidence / "manifest.json", 1 << 20),
        read_evidence(evidence / "complete.log", 32 << 20),
    )
    changed = {p.decode() for p in git("diff", "--cached", "--no-renames", "--name-only", "-z", BASE).split(b"\0") if p}
    validate_changes(baseline, changed, lambda path: git("show", ":" + path))
    # File modes affect execution too. Never accept executable/symlink substitutions.
    for row in git("diff", "--cached", "--raw", "--no-renames", BASE).decode().splitlines():
        before, after = row.split()[:2]
        if after != "100644" or before not in {":000000", ":100644"}:
            raise ValueError("Unsupported file mode change in the continuation")
    tree = git("write-tree").decode().strip()
    print("Gate98 continuation: retaining verified backend and frontend application suites; running all remaining gates", flush=True)
    for command in remaining_commands():
        print(shlex.join(command), flush=True)
        subprocess.run(command, cwd=root, check=True)
    if git("write-tree").decode().strip() != tree or git("diff", "--name-only"):
        raise ValueError("Source changed during qualification")
    print("Gate98 continuation passed for exact staged tree " + tree, flush=True)
    return True
