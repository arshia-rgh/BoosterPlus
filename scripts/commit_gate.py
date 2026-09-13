"""Select checks from staged paths; unknown or infrastructure changes fail to full."""
from pathlib import PurePosixPath
import subprocess


def scope(paths):
    frontend = False
    for path in paths:
        relative = PurePosixPath(path)
        if path.startswith(("docs/",)) or path in {
            "README.md", "AGENTS.md", "UI_UX_ROADMAP.md", "IMPLEMENTATION_PHASES.md",
            "BOOSTER_PLUS_SPEC.md", "final-launch.md", "frontend/README.md", "backend/README.md",
        }:
            continue
        if path.startswith(("frontend/app/", "frontend/admin-app/", "frontend/public/", "frontend/tests/")):
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
    selected = scope([item.decode() for item in raw.split(b"\0") if item])
    print(f"Required staged-change gate: {selected}", flush=True)
    if selected == "full":
        subprocess.run(["make", "pre-commit"], check=True)
    else:
        subprocess.run(["make", "check-repository"], check=True)
        if selected == "frontend":
            subprocess.run(["make", "-C", "frontend", "pre-commit"], check=True)


if __name__ == "__main__":
    main()
