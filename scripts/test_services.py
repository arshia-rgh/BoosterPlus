"""Local-only service credentials for isolated integration/browser resources."""
import os
from pathlib import Path


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
