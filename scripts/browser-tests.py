"""Run browser tests against a freshly migrated TiDB schema and real local SMTP."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import time
from test_services import environment as service_environment

root = Path(__file__).resolve().parents[1]
# Each device project represents an independent client population. Give it an
# isolated database and unchanged production rate budgets instead of lifting
# shared-IP authentication limits as browser coverage grows.
def run_project(project, specs=()):
    with tempfile.TemporaryDirectory(prefix="boosterplus-browser-") as temporary:
        directory = Path(temporary)
        environment = dict(service_environment(root), BROWSER_TEST_DIRECTORY=temporary)
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
                # Global policy publication runs after ordinary journeys in the same isolated device database.
                # Complementary filters execute every test; both results are required, with no retries or skipped failures.
                if specs:
                    results = []
                    for batch in focused_batches(specs):
                        results.append(subprocess.run(["npx", "playwright", "test", *batch, "--project=" + project, "--output=test-results/focused-" + project], cwd=root / "frontend", env=environment, check=False).returncode)
                    result = 1 if any(results) else 0
                else:
                    ordinary = subprocess.run(["npx", "playwright", "test", "--grep-invert=@global-policy", "--project=" + project, "--output=test-results/" + project], cwd=root / "frontend", env=environment, check=False).returncode
                    policies = subprocess.run(["npx", "playwright", "test", "--grep=@global-policy", "--project=" + project, "--output=test-results/policies-" + project], cwd=root / "frontend", env=environment, check=False).returncode
                    result = 1 if ordinary or policies else 0
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
            return result



def focused_batches(specs):
    """Global terms publication must follow ordinary journeys even in focused runs."""
    policies = [name for name in specs if name == "tests/e2e/admin-policy.spec.ts"]
    ordinary = [name for name in specs if name not in policies]
    return [batch for batch in (ordinary, policies) if batch]


def selected_specs(names):
    """Accept exact existing spec filenames, never flags or arbitrary paths."""
    base = root / "frontend/tests/e2e"
    for name in names:
        if Path(name).name != name or not name.endswith(".spec.ts") or not (base / name).is_file():
            raise ValueError("Use an existing browser spec filename")
    return ["tests/e2e/" + name for name in names]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", action="append", default=[], help="Exact changed spec filename; omission runs the complete suite")
    parser.add_argument("--project", action="append", choices=("desktop", "mobile"), help="Focused device project; omission checks both")
    args = parser.parse_args()
    try:
        specs = selected_specs(args.spec)
    except ValueError as error:
        parser.error(str(error))
    print("Browser qualification: " + (", ".join(specs) if specs else "complete suite"), flush=True)
    results = [run_project(project, specs) for project in (args.project or ("desktop", "mobile"))]
    raise SystemExit(1 if any(results) else 0)


if __name__ == "__main__":
    main()
