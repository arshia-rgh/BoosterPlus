"""Run mandatory race-enabled TiDB/storage/scanner integration tests."""
from pathlib import Path
import subprocess
import sys
from test_services import environment

root = Path(__file__).resolve().parents[1]
raise SystemExit(subprocess.run(
    ["go", "test", "-race", "-count=1", "-tags=integration", *sys.argv[1:], "./internal/integration/..."],
    cwd=root / "backend", env=environment(root), check=False,
).returncode)
