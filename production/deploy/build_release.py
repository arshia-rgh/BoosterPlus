"""CI-only immutable image/SBOM bundle build; no runtime credentials."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

from artifacts import REPOSITORY, validate

ROOT = Path(__file__).resolve().parents[2]
BUILDS = {
    "backend": ("backend", "backend/Dockerfile", None),
    "storefront": ("frontend", "frontend/Dockerfile", "storefront"),
    "admin": ("frontend", "frontend/Dockerfile", "admin"),
    "scanner": ("backend", "backend/deploy/scanner.Dockerfile", None),
    "gateway": ("production/gateway", "production/gateway/Dockerfile", None),
}


def successful_quality_run(commit):
    result = subprocess.run(["gh", "api", "repos/" + REPOSITORY +
                             "/actions/workflows/ci.yml/runs?head_sha=" + commit +
                             "&branch=main&event=push&status=success&per_page=20"],
                            capture_output=True, text=True, timeout=60, check=True)
    runs = json.loads(result.stdout).get("workflow_runs", [])
    return next((run["id"] for run in runs if run.get("head_sha") == commit
                 and run.get("head_branch") == "main" and run.get("event") == "push"
                 and run.get("conclusion") == "success" and run.get("status") == "completed"
                 and run.get("head_repository", {}).get("full_name") == REPOSITORY), None)


def build():
    commit = os.environ.get("GITHUB_SHA", "")
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_REPOSITORY") != REPOSITORY or os.environ.get("GITHUB_REF") != "refs/heads/main" or not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("Artifact build requires this repository's main-branch Actions workflow")
    if subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, cwd=ROOT).strip() != commit:
        raise ValueError("Checkout does not match the workflow source commit")
    quality = successful_quality_run(commit)
    if not quality:
        raise ValueError("A successful complete CI gate on this exact main commit is required before publishing artifacts")
    schema = int(re.search(r"const SchemaVersion = (\d+)", (ROOT / "backend/internal/database/schema.go").read_text()).group(1))
    output = ROOT / ".cache/release"
    output.mkdir(parents=True, exist_ok=False)
    images = {}
    for name, (context, dockerfile, target) in BUILDS.items():
        image_name = "ghcr.io/arshia-rgh/boosterplus-" + name
        tag = image_name + ":" + commit
        command = ["docker", "buildx", "build", "--load", "--platform", "linux/amd64",
                   "--label", "org.opencontainers.image.revision=" + commit,
                   "--label", "org.opencontainers.image.source=https://github.com/" + REPOSITORY,
                   "--label", "io.playora.schema=" + str(schema), "-f", dockerfile, "-t", tag]
        if target:
            command += ["--target", target]
        subprocess.run(command + [context], cwd=ROOT, check=True)
        subprocess.run([str(ROOT / ".tools/trivy"), "image", "--quiet", "--scanners", "vuln",
                        "--ignore-unfixed", "--severity", "HIGH,CRITICAL", "--exit-code", "1", tag], check=True)
        sbom = output / (name + ".sbom.json")
        subprocess.run([str(ROOT / ".tools/trivy"), "image", "--quiet", "--format", "spdx-json", "--output", str(sbom), tag], check=True)
        subprocess.run(["docker", "push", tag], check=True)
        digests = json.loads(subprocess.check_output(["docker", "image", "inspect", "--format", "{{json .RepoDigests}}", tag], text=True))
        digest = next(value for value in digests if value.startswith(image_name + "@sha256:"))
        images[name] = {"image": digest, "sbom_sha256": hashlib.sha256(sbom.read_bytes()).hexdigest()}
    document = validate({"format": 1, "repository": REPOSITORY, "commit": commit, "schema": schema,
                         "platform": "linux/amd64", "build_run": "https://github.com/" + REPOSITORY + "/actions/runs/" + os.environ["GITHUB_RUN_ID"],
                         "quality_run": "https://github.com/" + REPOSITORY + "/actions/runs/" + str(quality), "images": images})
    (output / "release.json").write_text(json.dumps(document, sort_keys=True, indent=2) + "\n")
    print("Immutable image/SBOM manifest created; independent operator signature is still required")


if __name__ == "__main__":
    build()
