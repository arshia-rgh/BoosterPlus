import unittest
from capacity import DEFAULT, SMALL, GIB, budget, selected, memory_limit
from manage import compose


class CapacityPolicy(unittest.TestCase):
    def test_compose_normalized_memory_types(self):
        for value in (GIB, str(GIB)):
            self.assertEqual(memory_limit({"mem_limit": value}), GIB)
        for value in (None, True, False, 0, -1, "1g", "-1", "9" * 100, 1.5, "１２３"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                memory_limit({"mem_limit": value})

    def test_opt_in_topology_and_overlay_order(self):
        self.assertEqual(selected({}), DEFAULT)
        manifest = {"DEPLOY_PROJECT": "boosterplus-budget", "HOST_PROFILE": SMALL,
                    "DATA_TOPOLOGY": "self-hosted-single", "MAIL_MODE": "self-hosted", "PITR_ENABLED": "true"}
        self.assertTrue(compose(manifest)[-3].endswith("compose.small.yaml"))
        self.assertTrue(compose(manifest)[-1].endswith("compose.small-mail.yaml"))
        external = compose(dict(manifest, MAIL_MODE="external"))
        self.assertTrue(external[-1].endswith("compose.small.yaml"))
        self.assertFalse(any(value.endswith("compose.small-mail.yaml") for value in external))
        for invalid in ({"HOST_PROFILE": SMALL}, dict(manifest, HOST_PROFILE="typo")):
            with self.assertRaises(ValueError):
                compose(invalid)
        with self.assertRaises(ValueError):
            compose(manifest, staging=True)

    def test_capture_budget_preserves_32gib_scratch_plus_headroom(self):
        small = budget(SMALL)
        self.assertGreaterEqual(small["capture_free"] - 32 * GIB, 32 * GIB)
        self.assertGreater(small["warning_free"], small["capture_free"])
        self.assertGreater(small["startup_free"], small["warning_free"])
        self.assertEqual(budget()["capture_free"], 100 * GIB)


if __name__ == "__main__":
    unittest.main()
