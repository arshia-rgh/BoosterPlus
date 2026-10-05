"""Run mandatory race-enabled TiDB/storage/scanner integration tests."""
from pathlib import Path
import subprocess
import sys
from test_services import environment

root = Path(__file__).resolve().parents[1]
raise SystemExit(subprocess.run(
    # The full commerce suite runs serial disposable schemas under the race detector.
    # On the compact VPS, 209 of 241 cases passed before the former 60m total
    # limit interrupted a nine-second schema setup. That projects about 70m
    # for the complete suite; retain bounded headroom for the remaining cases.
    # Individual SQL/assertion deadlines and required scenarios are unchanged.
    # Verbose/fail-fast output exposes actual failures without marking a partial
    # run passed. Production's real-TiKV suite has its own measured budget.
    ["go", "test", "-race", "-count=1", "-timeout=90m", "-v", "-failfast", "-tags=integration", *sys.argv[1:], "./internal/integration/..."],
    cwd=root / "backend", env=environment(root), check=False,
).returncode)
