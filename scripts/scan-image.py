"""Keep a full local JSON image audit and emit only actionable findings in the gate."""
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
images = {"boosterplus-backend:local": "backend", "boosterplus-frontend:local": "frontend"}
image = sys.argv[1]
project = images[image]
report = root / project / ".cache" / "image-vulnerabilities.json"
report.parent.mkdir(exist_ok=True)
report.unlink(missing_ok=True)
result = subprocess.run([
    str(root / ".tools" / "trivy"), "image", "--quiet", "--format", "json",
    "--output", str(report), "--scanners", "vuln", "--severity", "HIGH,CRITICAL",
    "--ignore-unfixed", "--exit-code", "1", image,
], check=False)
if report.exists():
    data = json.loads(report.read_text())
    for target in data.get("Results", []):
        for vulnerability in target.get("Vulnerabilities", []):
            print(target["Target"], vulnerability["PkgName"], vulnerability["VulnerabilityID"],
                  vulnerability["InstalledVersion"], "->", vulnerability.get("FixedVersion", "unfixed"))
if result.returncode:
    raise SystemExit(result.returncode)
print(f"{image}: no fixable HIGH/CRITICAL vulnerabilities; full report: {report}")
