"""Check the actual repository files, excluding ignored runtime/dependency data."""

from pathlib import Path
import re
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
scanner = root / ".tools/gitleaks"
if not scanner.is_file():
    raise SystemExit("Gitleaks is required; run make bootstrap.")
listing = subprocess.check_output(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=root
)
paths = sorted({Path(p.decode()) for p in listing.split(b"\0") if p})
prohibited = re.compile(r"\.Schema\.(Create|WriteTo)\s*\(|/ent/enttest\"")
with tempfile.TemporaryDirectory(prefix="boosterplus-secret-scan-") as directory:
    destination = Path(directory)
    for relative in paths:
        source = root / relative
        if not source.exists():
            continue  # A tracked deletion contributes no content to the next commit.
        if source.is_symlink() or not source.is_file():
            raise SystemExit(f"Review unsupported repository file: {relative}")
        if ".env" == source.name or (source.name.startswith(".env.") and source.name != ".env.example"):
            raise SystemExit(f"Environment secrets must not be committed: {relative}")
        if source.suffix == ".go":
            text = source.read_text()
            if "Code generated" not in text[:512] and prohibited.search(text):
                raise SystemExit(f"Ent migration use is prohibited: {relative}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    subprocess.run(
        [str(scanner), "dir", "--no-banner", "--redact", "--ignore-gitleaks-allow", str(destination)],
        check=True,
        cwd=root,
    )
print(f"Repository policy and secret scan passed for {len(paths)} files.")
