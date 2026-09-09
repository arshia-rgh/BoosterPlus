"""Run browser tests against a freshly migrated TiDB schema and real local SMTP."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="boosterplus-browser-") as temporary:
    directory = Path(temporary)
    environment = dict(os.environ, GOSUMDB="sum.golang.org", BROWSER_TEST_DIRECTORY=temporary)
    environment.setdefault("TEST_DATABASE_DSN", "root@tcp(127.0.0.1:14000)/mysql")
    with (directory / "backend.log").open("w+") as output:
        backend = subprocess.Popen(["go", "test", "-race", "-tags=integration,browsertest", "-count=1", "-timeout=12m", "./internal/integration", "-run", "^TestBrowserEnvironment$"], cwd=root / "backend", env=environment, stdout=output, stderr=subprocess.STDOUT)
        result = 1
        try:
            deadline = time.monotonic() + 120
            while not (directory / "ready.json").exists():
                if backend.poll() is not None or time.monotonic() > deadline:
                    output.seek(0)
                    raise RuntimeError("Browser database setup failed:\n" + output.read())
                time.sleep(0.2)
            settings = json.loads((directory / "ready.json").read_text())
            environment.update(API_ORIGIN=settings["api_origin"], PROXY_SHARED_KEY=settings["proxy_key"], BROWSER_TEST_CONFIG=str(directory / "ready.json"))
            result = subprocess.run(["npx", "playwright", "test"], cwd=root / "frontend", env=environment, check=False).returncode
        finally:
            (directory / "stop").touch()
            try:
                backend.wait(timeout=25)
            except subprocess.TimeoutExpired:
                backend.terminate()
                backend.wait(timeout=10)
                result = 1
            if backend.returncode != 0:
                output.seek(0)
                print(output.read())
                result = 1
        raise SystemExit(result)
