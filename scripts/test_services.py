"""Local-only service credentials for isolated integration/browser resources."""
import os
from pathlib import Path
import subprocess


def environment(root: Path) -> dict:
    result = dict(os.environ, GOSUMDB="sum.golang.org")
    if not result.get("TEST_MEDIA_S3_SECRET_KEY"):
        source = root / "backend/.env"
        if not source.is_file():
            raise RuntimeError("Private storage tests require make -C backend dev-up.")
        for line in source.read_text().splitlines():
            if line.startswith("DEV_S3_SECRET_KEY="):
                result["TEST_MEDIA_S3_SECRET_KEY"] = line.split("=", 1)[1]
    if len(result.get("TEST_MEDIA_S3_SECRET_KEY", "")) < 20:
        raise RuntimeError("Private storage test credentials are unavailable.")
    result.setdefault("TEST_DATABASE_DSN", "root@tcp(127.0.0.1:14000)/mysql")
    return result


def scanner_ready(root: Path, settings: dict) -> None:
    """Fail before long suites unless the fixed isolated scanner is usable.

    The Go preflight uses the actual application freshness/streaming checks,
    clean/EICAR controls and bounded reloads of the development fixture only.
    A Docker PING healthcheck alone can pass with stale loaded definitions.
    """
    print("Checking isolated scanner freshness and clean/malware controls...", flush=True)
    subprocess.run([
        "go", "test", "-race", "-count=1", "-timeout=6m", "-v",
        "-tags=integration", "-run=^TestScannerFixtureReadiness$",
        "./internal/integration",
    ], cwd=root / "backend", env=settings, check=True, timeout=420)
