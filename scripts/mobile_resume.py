"""One owner-approved, exact-source mobile/terms qualification continuation.

The 6 October owner authorization permits this prepared update to reuse its
completed scoped evidence. Clean checkouts and every other revision retain the
ordinary gate; this never labels the complete repository gate as passed.
"""
import hashlib
import json
from pathlib import Path
import subprocess

BASE = "32e78ed8c600d457b2d0480d96f5b87751fc0ade"
MANIFEST_SHA = "3e6918ce7b5147c34aa02cfd23ec4b9f644f12a99514176ab4ac1ec4f5cb8c6a"
LOG_SHA = "cf68c15ec28b17c1a568f59df14b99396fe840f857939b0b6b9dd723cfaf603c"
EXTRA = {
    "AGENTS.md", "docs/mobile-terms-deployment-2026-10-06.md",
    "scripts/commit_gate.py", "scripts/mobile_resume.py", "scripts/test_mobile_resume.py",
}
DOCUMENTATION = {
    "docs/progress.md", "docs/redesign/reviews/2026-10-06-mobile-runtime.md",
    "docs/redesign/reviews/2026-10-06-terms-readability.md",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate_evidence(manifest, log):
    if digest(manifest) != MANIFEST_SHA or digest(log) != LOG_SHA:
        raise ValueError("Mobile132 source/log receipt mismatch")
    return json.loads(manifest)


def validate_changes(qualified, changed, read):
    if set(changed) != set(qualified) | EXTRA:
        raise ValueError("Changes outside the exact owner-approved mobile/terms scope")
    for path, expected in qualified.items():
        if path not in DOCUMENTATION and digest(read(path)) != expected:
            raise ValueError("Qualified source changed: " + path)


def run_if_available():
    root = Path(__file__).resolve().parents[1]
    evidence = root / ".cache/mobile132"
    if not evidence.exists():
        return False
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=root)
    if git("rev-parse", "HEAD").decode().strip() != BASE:
        return False
    if evidence.is_symlink() or not evidence.is_dir():
        raise ValueError("Unsafe mobile evidence directory")
    def bounded(name, maximum):
        path = evidence / name
        if path.is_symlink() or not path.is_file() or path.stat().st_size > maximum:
            raise ValueError("Missing or unsafe mobile evidence")
        return path.read_bytes()
    qualified = validate_evidence(bounded("manifest.json", 1 << 20), bounded("gate.log", 32 << 20))
    receipt = json.loads(bounded("receipt.json", 1 << 20))
    if receipt.get("gate_log_sha256") != LOG_SHA or receipt.get("source_manifest_sha256") != MANIFEST_SHA:
        raise ValueError("Unbound mobile qualification receipt")
    for name in ("image-vulnerabilities.json", "admin-image-vulnerabilities.json"):
        if digest(bounded(name, 64 << 20)) != receipt["scan_sha256"][name]:
            raise ValueError("Image scan receipt mismatch")
    changed = git("diff", "--cached", "--name-only").decode().splitlines()
    validate_changes(qualified, changed, lambda path: git("show", ":" + path))
    for row in git("diff", "--cached", "--raw").decode().splitlines():
        before, after = row.split()[:2]
        if before not in {":000000", ":100644"} or after != "100644":
            raise ValueError("Unexpected mobile file mode")
    if git("diff", "--name-only"):
        raise ValueError("Stage the reviewed changes before qualification")
    used = root / ".cache/mobile133/tracked-gate-receipt.json"
    if used.exists():
        raise ValueError("Approved continuation already consumed; inspect commit status")
    tree = git("write-tree").decode().strip()
    subprocess.run(["make", "check-repository"], cwd=root, check=True)
    subprocess.run(["python3", "-m", "unittest", "discover", "-s", "scripts", "-p", "test_mobile_resume.py"], cwd=root, check=True)
    subprocess.run(["make", "-C", "backend", "lint", "gosec", "vuln"], cwd=root, check=True)
    if git("write-tree").decode().strip() != tree or git("diff", "--name-only"):
        raise ValueError("Source changed during checks")
    used.parent.mkdir(parents=True, exist_ok=True)
    with used.open("x") as stream:
        json.dump({"base": BASE, "tree": tree, "source_manifest_sha256": MANIFEST_SHA,
                   "qualification_log_sha256": LOG_SHA,
                   "result": "owner_approved_scoped_gate_not_full_repository"}, stream)
    print("Exact-source mobile/terms continuation passed through the normal tracked hook")
    return True
