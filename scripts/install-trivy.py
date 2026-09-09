"""Install an exact Trivy release; verify pinned archive hashes before extracting its binary."""
import hashlib
import io
import platform
import tarfile
import urllib.request
from pathlib import Path

platforms = {
    ("Darwin", "arm64"): ("macOS-ARM64", "1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11"),
    ("Linux", "x86_64"): ("Linux-64bit", "2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a"),
    ("Linux", "aarch64"): ("Linux-ARM64", "b94ce1976bbf3c15b514b605ee88be7c6d94a29be2302847ff01cb794d47aad5"),
}
name, digest = platforms[(platform.system(), platform.machine())]
url = f"https://github.com/aquasecurity/trivy/releases/download/v0.74.0/trivy_0.74.0_{name}.tar.gz"
with urllib.request.urlopen(url, timeout=60) as response:
    archive = response.read()
if hashlib.sha256(archive).hexdigest() != digest:
    raise SystemExit("Trivy archive checksum mismatch")
with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as package:
    member = package.getmember("trivy")
    if not member.isfile():
        raise SystemExit("Expected a regular Trivy binary")
    source = package.extractfile(member)
    if source is None:
        raise SystemExit("Trivy binary not found")
    output = Path(__file__).resolve().parents[1] / ".tools" / "trivy"
    output.parent.mkdir(exist_ok=True)
    with source:
        output.write_bytes(source.read())
    output.chmod(0o755)
print("Installed checksum-verified Trivy 0.74.0")
