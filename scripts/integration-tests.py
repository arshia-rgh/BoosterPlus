"""Run mandatory race-enabled TiDB/storage/scanner integration tests."""
from pathlib import Path
import subprocess
import sys
from test_services import environment

root = Path(__file__).resolve().parents[1]
raise SystemExit(subprocess.run(
    # The full commerce suite runs serial disposable schemas under the race detector.
    # Bound the whole suite explicitly as it grows; individual assertions are unchanged.
    ["go", "test", "-race", "-count=1", "-timeout=20m", "-tags=integration", *sys.argv[1:], "./internal/integration/..."],
    cwd=root / "backend", env=environment(root), check=False,
).returncode)
