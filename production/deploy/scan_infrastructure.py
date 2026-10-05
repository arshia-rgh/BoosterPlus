"""Scan vendor images, retaining exact owner-accepted findings without hiding them."""
import json
import re
import subprocess

from backup import IMAGE as RESTIC_IMAGE
from manage import ROOT

POLICY = ROOT / "security/vendor-image-acceptance.json"
FIELDS = ("VulnerabilityID", "PkgName", "InstalledVersion", "FixedVersion", "Severity")


def inventory():
    images = {RESTIC_IMAGE}
    for name in ("compose.self-hosted.yaml", "compose.mail.yaml", "compose.pitr.yaml", "compose.webmail.yaml"):
        for line in (ROOT / name).read_text().splitlines():
            value = line.strip().removeprefix("image: ")
            if not line.strip().startswith("image: ") or value.startswith("${"):
                continue
            if not re.fullmatch(r"[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}", value):
                raise ValueError("Infrastructure image must have an immutable digest")
            images.add(value)
    return sorted(images)


def findings(report, image):
    """Bind complete findings to the exact artifact and package location."""
    if (report.get("SchemaVersion") != 2 or report.get("ArtifactName") != image
            or report.get("ArtifactType") != "container_image"
            or not isinstance(report.get("Results"), list)):
        raise ValueError("Incomplete or mismatched infrastructure scan report")
    result = []
    for target in report["Results"]:
        if not isinstance(target, dict) or not isinstance(target.get("Target"), str):
            raise ValueError("Invalid infrastructure scan target")
        vulnerabilities = target.get("Vulnerabilities")
        if vulnerabilities is None:
            vulnerabilities = []
        if not isinstance(vulnerabilities, list):
            raise ValueError("Invalid vulnerability list")
        for vulnerability in vulnerabilities:
            if not isinstance(vulnerability, dict) or any(
                not isinstance(vulnerability.get(field), str) or not vulnerability[field]
                for field in FIELDS
            ):
                raise ValueError("Incomplete vulnerability record")
            if vulnerability["Severity"] not in ("HIGH", "CRITICAL"):
                raise ValueError("Unexpected scan severity")
            result.append({"Target": target["Target"], "PkgPath": vulnerability.get("PkgPath", ""),
                           **{field: vulnerability[field] for field in FIELDS}})
    return result


def fingerprint(finding):
    return json.dumps(finding, sort_keys=True, separators=(",", ":"))


def assess(report, image, policy):
    if policy.get("schema") != 1 or policy.get("owner_decision") != "2026-10-02-official-vendor-images":
        raise ValueError("Missing reviewed owner acceptance")
    entries = policy.get("images")
    if not isinstance(entries, dict):
        raise ValueError("Invalid owner acceptance inventory")
    actual = findings(report, image)
    entry = entries.get(image, {})
    accepted = {fingerprint(value) for value in entry.get("findings", [])}
    unexpected = [value for value in actual if fingerprint(value) not in accepted]
    return actual, unexpected


def audit(image, destination, policy, runner=subprocess.run):
    # A fresh file prevents a failed scan from reusing an earlier successful report.
    destination.unlink(missing_ok=True)
    result = runner([str(ROOT.parent / ".tools/trivy"), "image", "--quiet", "--platform", "linux/amd64",
                     "--format", "json", "--output", str(destination), "--scanners", "vuln",
                     "--ignore-unfixed", "--severity", "HIGH,CRITICAL", "--exit-code", "0", image],
                    timeout=1800, check=False)
    if result.returncode:
        raise RuntimeError("Infrastructure scanner failed; owner acceptance never covers scan errors")
    return assess(json.loads(destination.read_text()), image, policy)


def main():
    output = ROOT / ".cache/infrastructure-audits"
    output.mkdir(parents=True, exist_ok=True)
    policy = json.loads(POLICY.read_text())
    blocked = False
    accepted_count = 0
    summary = []
    # Scan every image even when another fails, so the evidence is complete.
    for index, image in enumerate(inventory()):
        try:
            actual, unexpected = audit(image, output / (str(index) + ".json"), policy)
            accepted_count += len(actual) - len(unexpected)
            blocked = blocked or bool(unexpected)
            status = "BLOCKED" if unexpected else "OWNER-ACCEPTED FINDINGS" if actual else "CLEAN"
            print(f"{image}: {status}; findings={len(actual)}, unaccepted={len(unexpected)}", flush=True)
            summary.append({"image": image, "status": status, "findings": len(actual), "unaccepted": len(unexpected)})
        except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired):
            blocked = True
            summary.append({"image": image, "status": "SCAN ERROR"})
            print(f"{image}: SCAN ERROR; inspect private report/tool output", flush=True)
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    if blocked:
        raise RuntimeError("Infrastructure audit blocked by unaccepted findings or scan failure")
    print(f"Infrastructure policy satisfied; {accepted_count} owner-accepted findings remain. This is not a clean scan.")


if __name__ == "__main__":
    main()
