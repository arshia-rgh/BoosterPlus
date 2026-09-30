"""Audit pinned data/mail/recovery images; required on server/full qualification."""
from pathlib import Path
import re
import subprocess

from backup import IMAGE as RESTIC_IMAGE
from manage import ROOT


def inventory():
    images = {RESTIC_IMAGE}
    for name in ("compose.self-hosted.yaml", "compose.mail.yaml", "compose.pitr.yaml"):
        for line in (ROOT / name).read_text().splitlines():
            value = line.strip().removeprefix("image: ")
            if not line.strip().startswith("image: ") or value.startswith("${"):
                continue
            if not re.fullmatch(r"[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}", value):
                raise ValueError("Infrastructure image must have an immutable digest")
            images.add(value)
    return sorted(images)


def main():
    output = ROOT / ".cache/infrastructure-audits"
    output.mkdir(parents=True, exist_ok=True)
    for index, image in enumerate(inventory()):
        result = subprocess.run([str(ROOT.parent / ".tools/trivy"), "image", "--quiet", "--platform", "linux/amd64",
                                 "--format", "json", "--output", str(output / (str(index) + ".json")),
                                 "--scanners", "vuln", "--ignore-unfixed", "--severity", "HIGH,CRITICAL", "--exit-code", "1", image],
                                timeout=1800, check=False)
        if result.returncode:
            raise RuntimeError("Infrastructure image audit failed; inspect its report before release")
    print("Pinned infrastructure images have no fixable HIGH/CRITICAL findings; full private reports retained")


if __name__ == "__main__":
    main()
