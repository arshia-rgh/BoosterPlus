"""Select lightweight staged checks under the current owner release policy."""
from pathlib import PurePosixPath
import subprocess

# Owner instruction, 14 October 2026: do not automatically run the complete gate
# for commits/deployments until the owner restores that requirement. Maintain
# regression tests and run focused integration/browser checks for changed flows.
# Explicit root/project pre-commit and full-gate targets remain available only
# for owner-requested complete qualification; never report focused as full.
FOCUSED_DEPLOYMENT_CHECKS = True
# Owner instruction, 30 September: disk-intensive launch qualification moves to
# the deployment server. This narrow preparation window is not a full-gate pass.
# Restore False only after the server's final complete gate is recorded.
LAUNCH_SERVER_QUALIFICATION_PENDING = True


def launch_preparation_only(paths):
    """Only deployment and explicitly listed operational Go paths use this window.

    Operational Go changes retain the complete local static/security/race/build
    gate. Real database/container qualification remains explicitly server-only.
    """
    return bool(paths) and all(path.startswith(("production/", "docs/", "backend/internal/opsmetrics/", "backend/internal/recovery/", "backend/internal/privacyjournal/")) or path in {
        "AGENTS.md", "final-launch.md", ".github/workflows/release.yml", ".github/workflows/ci.yml",
        "scripts/commit_gate.py", "scripts/test_commit_gate.py",
        "backend/internal/privacy/journal.go", "backend/internal/privacy/model.go", "backend/internal/privacy/change.go", "backend/internal/privacy/recovery.go",
        "backend/internal/config/privacy.go", "backend/internal/config/privacy_test.go", "backend/internal/config/config.go", "backend/internal/app/server.go",
        "backend/internal/cli/recovery_test.go", "backend/internal/cli/privacy_recovery.go", "backend/internal/integration/privacy_recovery_test.go",
        "backend/internal/cli/metrics.go", "backend/internal/cli/recovery.go", "backend/internal/cli/operations.go",
        "backend/internal/integration/opsmetrics_test.go", "backend/internal/integration/recovery_test.go",
    } for path in paths)


def preparation_commands(paths=()):
    backend = ["make", "-C", "backend", "stage-check"] if any(path.startswith("backend/") for path in paths) else ["make", "-C", "backend", "lint", "gosec", "vuln"]
    return [["make", "check-repository"], backend,
            ["make", "-C", "production", "preparation-check"]]


def scope(paths):
    frontend = False
    for path in paths:
        relative = PurePosixPath(path)
        if path.startswith(("docs/",)) or path in {
            "README.md", "AGENTS.md", "UI_UX_ROADMAP.md", "IMPLEMENTATION_PHASES.md",
            "BOOSTER_PLUS_SPEC.md", "final-launch.md", "frontend/README.md", "backend/README.md",
        }:
            continue
        if path.startswith(("frontend/app/", "frontend/admin-app/", "frontend/booster-app/", "frontend/public/", "frontend/tests/")):
            frontend = True
            continue
        # Build/server/dependency/security configuration and unknown paths need all checks.
        if relative.parts:
            return "full"
    return "frontend" if frontend else "repository"


def main():
    raw = subprocess.check_output([
        "git", "diff", "--cached", "--no-renames", "--name-only", "-z",
    ])
    paths = [item.decode() for item in raw.split(b"\0") if item]
    selected = scope(paths)
    if FOCUSED_DEPLOYMENT_CHECKS:
        print(f"Required staged-change gate: {selected} (owner-directed lightweight checks; full suite not run)", flush=True)
        for command in commands(selected, True):
            subprocess.run(command, check=True)
        return
    if selected == "full":
        from service144_resume import run_if_available as service144_continuation
        if service144_continuation():
            return
        from mobile_resume import run_if_available as mobile_continuation
        if mobile_continuation():
            return
        from launch_resume import run_if_available
        if run_if_available():
            return
    if LAUNCH_SERVER_QUALIFICATION_PENDING and selected == "full" and launch_preparation_only(paths):
        print("Required gate: launch preparation; heavy/full qualification DEFERRED TO SERVER, not passed", flush=True)
        for command in preparation_commands(paths):
            subprocess.run(command, check=True)
        return
    print(f"Required staged-change gate: {selected} (complete)", flush=True)
    for command in commands(selected, False):
        subprocess.run(command, check=True)


def commands(selected, focused):
    """Keep the full gate available without an environment-variable bypass."""
    if selected == "full":
        return [["make", "deploy-check" if focused else "pre-commit"]]
    result = [["make", "check-repository"]]
    if selected == "frontend":
        result.append(["make", "-C", "frontend", "stage-check" if focused else "pre-commit"])
    elif selected != "repository":
        raise ValueError("Unknown gate scope")
    return result


if __name__ == "__main__":
    main()
