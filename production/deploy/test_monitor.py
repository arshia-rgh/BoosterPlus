from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest

from monitor import THRESHOLDS, evaluate, notify


class MonitoringState(unittest.TestCase):
    def test_missing_partial_stale_negative_and_boolean_values_fail_closed(self):
        stamp = datetime.fromtimestamp(1000, timezone.utc).isoformat()
        good = {"observed_at": stamp, "values": dict.fromkeys(THRESHOLDS, 0)}
        self.assertEqual(evaluate(good, 1001), [])
        self.assertIn("metrics_stale", evaluate(good, 1121))
        for value in (-1, True, "0", None):
            bad = {"observed_at": stamp, "values": dict(good["values"], jobs_failed=value)}
            self.assertIn("jobs_failed_unavailable", evaluate(bad, 1001))
        self.assertIn("jobs_failed", evaluate({"observed_at": stamp, "values": dict(good["values"], jobs_failed=1)}, 1001))
        self.assertEqual(evaluate({}, 1001), ["metrics_unavailable"])

    def test_firing_dedup_retry_and_recovery(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            sent = []
            notify(root, "boosterplus-fixture", [], sent.append, 1000)
            self.assertEqual(sent, [])
            notify(root, "boosterplus-fixture", ["jobs_failed"], sent.append, 1001)
            notify(root, "boosterplus-fixture", ["jobs_failed"], sent.append, 1002)
            self.assertEqual(len(sent), 1)
            def failed(_):
                raise RuntimeError("destination unavailable")
            with self.assertRaises(RuntimeError):
                notify(root, "boosterplus-fixture", [], failed, 1003)
            notify(root, "boosterplus-fixture", [], sent.append, 1004)
            self.assertEqual(len(sent), 2)
            self.assertEqual(sent[-1]["state"], "resolved")
            self.assertNotIn("values", sent[-1])


if __name__ == "__main__":
    unittest.main()
