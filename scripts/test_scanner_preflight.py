"""Scanner preflight must precede long suites and cannot ignore a failed check."""
from pathlib import Path
import importlib.util
import runpy
import subprocess
import unittest
from unittest.mock import patch

from test_services import scanner_ready


class ScannerPreflightTest(unittest.TestCase):
    def test_real_application_preflight_is_bounded_and_exact(self):
        root = Path("/isolated/fixture")
        settings = {"TEST_DATABASE_DSN": "synthetic"}
        with patch("test_services.subprocess.run") as run:
            scanner_ready(root, settings)
        args, options = run.call_args
        self.assertIn("-run=^TestScannerFixtureReadiness$", args[0])
        self.assertIn("-race", args[0])
        self.assertEqual(options["cwd"], root / "backend")
        self.assertEqual(options["env"], settings)
        self.assertIs(options["check"], True)
        self.assertEqual(options["timeout"], 420)

    def test_failed_preflight_never_starts_long_integration_suite(self):
        script = Path(__file__).with_name("integration-tests.py")
        failure = subprocess.CalledProcessError(1, ["go", "test"])
        with patch("test_services.environment", return_value={}), \
                patch("test_services.scanner_ready", side_effect=failure), \
                patch("subprocess.run") as run, \
                self.assertRaises(subprocess.CalledProcessError):
            runpy.run_path(str(script), run_name="__main__")
        run.assert_not_called()

    def test_failed_preflight_is_not_retried_or_suppressed(self):
        failure = subprocess.TimeoutExpired(["go", "test"], 420)
        with patch("test_services.subprocess.run", side_effect=failure) as run, \
                self.assertRaises(subprocess.TimeoutExpired):
            scanner_ready(Path("/isolated/fixture"), {})
        self.assertEqual(run.call_count, 1)

    def test_failed_preflight_never_starts_browser_population(self):
        spec = importlib.util.spec_from_file_location(
            "scanner_browser_fixture", Path(__file__).with_name("browser-tests.py"))
        browser = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(browser)
        failure = subprocess.CalledProcessError(1, ["go", "test"])
        with patch("sys.argv", ["browser-tests.py"]), \
                patch.object(browser, "service_environment", return_value={}), \
                patch.object(browser, "scanner_ready", side_effect=failure), \
                patch.object(browser, "run_project") as run, \
                self.assertRaises(subprocess.CalledProcessError):
            browser.main()
        run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
