"""Select staged checks; the owner deferred aggregate qualification until DI15."""
from pathlib import PurePosixPath
import subprocess

# Owner instruction, 28 September 2026: retain focused stage verification and run
# the complete repository gate at DI15. Restore normal selection at that exit.
# CI and root/project pre-commit targets always retain their complete gates.
FOCUSED_UNTIL_DI15 = True


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
    mode = "focused until DI15" if FOCUSED_UNTIL_DI15 else "complete"
    print(f"Required staged-change gate: {selected} ({mode})", flush=True)
    for command in commands(selected, FOCUSED_UNTIL_DI15):
        subprocess.run(command, check=True)


def commands(selected, focused):
    """Keep the full gate available without an environment-variable bypass."""
    if selected == "full":
        return [["make", "stage-check" if focused else "pre-commit"]]
    result = [["make", "check-repository"]]
    if selected == "frontend":
        result.append(["make", "-C", "frontend", "stage-check" if focused else "pre-commit"])
    elif selected != "repository":
        raise ValueError("Unknown gate scope")
    return result


if __name__ == "__main__":
    main()
