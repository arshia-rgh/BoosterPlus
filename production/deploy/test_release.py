import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

from release import checked_schema, execute, require_backup
from state import pending, write
from test_artifacts import fixture


class ReleaseLifecycle(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "operations").mkdir(mode=0o700)
        self.target = fixture()
        (self.root / "release.json").write_text(json.dumps(self.target))
        self.manifest = {"DATA_TOPOLOGY": "self-hosted-single", "DATA_DIRECTORY": str(self.root),
                         "DEPLOY_PROJECT": "boosterplus-fixture", "SITE_ADDRESS": "fixture.invalid",
                         "RELEASE_TRUST_KEY": "fixture", "RELEASE_TRUST_KEY_SHA256": "a" * 64}
        self.calls = []
        self.schema = 0

    def runner(self, manifest, args, **kwargs):
        self.calls.append(args)
        if args[-2:] == ["migrate", "version"]:
            if "db" in args:
                return str(self.schema) + "\n"
            return "boosterplus 0.1.0; supported schema: 39\n"
        if args[-3:] == ["db", "migrate", "up"]:
            self.schema = 39
        return ""

    def run_release(self, **kwargs):
        with patch("release.verify", return_value=self.target):
            execute(self.manifest, self.root, runner=self.runner, smoke=lambda _: None, **kwargs)

    def test_first_release_migrates_before_serving_and_records_exact_artifacts(self):
        self.run_release()
        self.assertIsNone(pending(self.root / "operations", "boosterplus-fixture"))
        current = json.loads((self.root / "operations/boosterplus-fixture-current.json").read_text())
        self.assertEqual(current["release"], self.target)
        migration = next(i for i, call in enumerate(self.calls) if call[-3:] == ["db", "migrate", "up"])
        serving = next(i for i, call in enumerate(self.calls) if call[-4:] == ["api", "storefront", "admin", "gateway"])
        self.assertLess(migration, serving)
        self.assertEqual(self.calls[-1][-1], "worker")

    def test_failed_smoke_stops_traffic_preserves_receipt_and_never_starts_worker(self):
        with patch("release.verify", return_value=self.target):
            with self.assertRaisesRegex(RuntimeError, "smoke"):
                execute(self.manifest, self.root, runner=self.runner,
                        smoke=lambda _: (_ for _ in ()).throw(RuntimeError("smoke")))
        self.assertFalse((self.root / "operations/boosterplus-fixture-current.json").exists())
        self.assertEqual(pending(self.root / "operations", "boosterplus-fixture")["state"], "starting")
        self.assertEqual(self.calls[-1][0], "stop")
        self.assertFalse(any(call[0] == "up" and call[-1] == "worker" for call in self.calls))
        with self.assertRaisesRegex(ValueError, "interrupted"):
            self.run_release()
        self.run_release(resume=True)

    def test_preflight_failure_does_not_interrupt_existing_service(self):
        with patch("release.verify", return_value=self.target):
            with self.assertRaises(RuntimeError):
                execute(self.manifest, self.root, runner=lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("pull")))
        self.assertEqual(pending(self.root / "operations", "boosterplus-fixture")["state"], "preflight")

    def test_storage_outage_blocks_upgrade_before_quiescing(self):
        self.run_release()
        write(self.root / "operations", "boosterplus-fixture-backup.json",
              {"project": "boosterplus-fixture", "state": "verified", "commit": "a" * 40, "consistent_at": time.time()})
        self.calls.clear()
        def failing_storage(manifest, args, **kwargs):
            if args[-2:] == ["dependencies", "check"]:
                raise RuntimeError("storage write unavailable")
            return self.runner(manifest, args, **kwargs)
        with patch("release.verify", return_value=self.target):
            with self.assertRaisesRegex(RuntimeError, "storage write"):
                execute(self.manifest, self.root, runner=failing_storage, smoke=lambda _: None)
        self.assertFalse(any(call[0] in ("stop", "up") for call in self.calls))
        self.assertEqual(pending(self.root / "operations", "boosterplus-fixture")["state"], "preflight")

    def test_dependency_probe_precedes_first_traffic_after_migration(self):
        self.run_release()
        verify = next(i for i, call in enumerate(self.calls) if call[-3:] == ["db", "migrate", "verify"])
        probe = next(i for i, call in enumerate(self.calls) if call[-2:] == ["dependencies", "check"])
        serving = next(i for i, call in enumerate(self.calls) if call[-4:] == ["api", "storefront", "admin", "gateway"])
        self.assertLess(verify, probe)
        self.assertLess(probe, serving)

    def test_recreated_dependencies_become_healthy_before_migration_and_probe(self):
        ready = False
        def starting_dependencies(manifest, args, **kwargs):
            nonlocal ready
            if args[0] == "up" and args[-1] == "scanner":
                self.assertIn("--wait", args)
                self.assertEqual(args[args.index("--wait-timeout") + 1], "180")
                ready = True
            if args[-3:] == ["db", "migrate", "up"] or args[-2:] == ["dependencies", "check"]:
                self.assertTrue(ready, "Do not race a scanner that is still starting")
            return self.runner(manifest, args, **kwargs)
        with patch("release.verify", return_value=self.target):
            execute(self.manifest, self.root, runner=starting_dependencies, smoke=lambda _: None)
        self.assertIsNone(pending(self.root / "operations", "boosterplus-fixture"))

    def test_dependency_health_timeout_blocks_migration_and_can_resume(self):
        def unhealthy_dependencies(manifest, args, **kwargs):
            result = self.runner(manifest, args, **kwargs)
            if args[0] == "up" and args[-1] == "scanner":
                raise RuntimeError("dependency health timeout")
            return result
        with patch("release.verify", return_value=self.target):
            with self.assertRaisesRegex(RuntimeError, "dependency health timeout"):
                execute(self.manifest, self.root, runner=unhealthy_dependencies, smoke=lambda _: None)
        self.assertEqual(self.schema, 0)
        self.assertFalse(any(call[-3:] == ["db", "migrate", "up"] for call in self.calls))
        self.assertFalse(any(call[0] == "up" and call[-1] in ("gateway", "worker") for call in self.calls))
        self.assertEqual(pending(self.root / "operations", "boosterplus-fixture")["state"], "migrating")
        self.assertFalse((self.root / "operations/boosterplus-fixture-current.json").exists())
        self.run_release(resume=True)
        self.assertIsNone(pending(self.root / "operations", "boosterplus-fixture"))

    def test_rollback_refuses_newer_schema_without_running_ddl(self):
        self.run_release()
        write(self.root / "operations", "boosterplus-fixture-backup.json",
              {"project": "boosterplus-fixture", "state": "verified", "commit": "a" * 40, "consistent_at": time.time()})
        self.schema = 40
        self.calls.clear()
        with self.assertRaisesRegex(ValueError, "incompatible"):
            self.run_release(rollback=True)
        self.assertFalse(any(call[-3:] == ["db", "migrate", "up"] for call in self.calls))
        self.assertEqual(self.calls[-1][0], "stop")

    def test_backups_schema_and_adoption_fail_closed(self):
        for value in ("39\nwarning", "-1", "secret", "", "1" * 21):
            with self.assertRaises(ValueError):
                checked_schema(value)
        self.schema = 39
        with self.assertRaisesRegex(ValueError, "existing database"):
            self.run_release()
        for age in (-30, 901):
            write(self.root / "operations", "boosterplus-fixture-backup.json",
                  {"project": "boosterplus-fixture", "state": "verified", "commit": "a" * 40, "consistent_at": time.time() - age})
            with self.assertRaises(ValueError):
                require_backup(self.root / "operations", "boosterplus-fixture", "a" * 40)


if __name__ == "__main__":
    unittest.main()
