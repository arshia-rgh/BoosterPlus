"""Focused browser selection cannot quietly select flags or nonexistent files."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch, call

spec = importlib.util.spec_from_file_location("browser_tests", Path(__file__).with_name("browser-tests.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BrowserSelectionTest(unittest.TestCase):
    def test_default_remains_complete(self):
        self.assertEqual(module.selected_specs([]), [])

    def test_exact_existing_changed_spec(self):
        self.assertEqual(module.selected_specs(["payments.spec.ts"]), ["tests/e2e/payments.spec.ts"])

    def test_focused_policy_publication_runs_after_ordinary_journeys(self):
        policy = "tests/e2e/admin-policy.spec.ts"
        orders = "tests/e2e/orders.spec.ts"
        self.assertEqual(module.focused_batches([policy, orders]), [[orders], [policy]])
        self.assertEqual(module.focused_batches([policy]), [[policy]])
        self.assertEqual(module.focused_batches([orders]), [[orders]])
        shop = "tests/e2e/shop-purchase.spec.ts"
        self.assertEqual(module.focused_batches([shop, orders, policy]), [[orders], [shop, policy]])

    def test_invalid_selections_fail_closed(self):
        for value in ["../payments.spec.ts", "--pass-with-no-tests", "missing.spec.ts", "payments.spec", "/tmp/payments.spec.ts"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                module.selected_specs([value])

    def test_complete_batches_use_distinct_environments_and_retain_failures(self):
        for results in ([0, 0], [1, 0], [0, 1], [1, 1]):
            with self.subTest(results=results), patch.object(module, "run_batch", side_effect=results) as run:
                self.assertEqual(module.run_project("desktop"), int(any(results)))
                self.assertEqual(run.call_args_list, [
                    call("desktop", ["--grep-invert=@global-policy"], 0),
                    call("desktop", ["--grep=@global-policy"], 1),
                ])

    def test_focused_batches_each_receive_their_own_environment(self):
        orders, policy = "tests/e2e/orders.spec.ts", "tests/e2e/admin-policy.spec.ts"
        with patch.object(module, "run_batch", return_value=0) as run:
            self.assertEqual(module.run_project("mobile", [policy, orders]), 0)
            self.assertEqual(run.call_args_list, [call("mobile", [orders], 0), call("mobile", [policy], 1)])


if __name__ == "__main__":
    unittest.main()
