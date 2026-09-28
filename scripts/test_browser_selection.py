"""Focused browser selection cannot quietly select flags or nonexistent files."""
import importlib.util
from pathlib import Path
import unittest

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


if __name__ == "__main__":
    unittest.main()
