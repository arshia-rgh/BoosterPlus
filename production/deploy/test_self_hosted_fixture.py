import copy
import contextlib
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from self_hosted_test import fixture_cpu_limit, fixture_ddl_initialization, host_test_access, integration_arguments, run_integration


class FixtureDDL(unittest.TestCase):
    def test_small_fixture_uses_standard_backfill_without_editing_production_sql(self):
        with tempfile.TemporaryDirectory() as directory:
            installation = Path(directory).resolve()
            (installation / "secrets").mkdir()
            source = installation / "secrets/initialize.sql"
            original = "SET GLOBAL tidb_redact_log = ON;\nCREATE DATABASE playora;\n"
            source.write_text(original)
            model = {"services": {"tidb": {"volumes": [
                {"source": str(source), "target": "/secrets/initialize.sql", "read_only": True},
                {"source": "/unchanged", "target": "/data"},
            ]}}}
            fixture_ddl_initialization(model, installation)
            mounted = Path(model["services"]["tidb"]["volumes"][0]["source"])
            self.assertEqual(source.read_text(), original)
            self.assertEqual(mounted.read_text(), original
                             + "SET GLOBAL tidb_enable_dist_task = OFF;\n"
                             + "SET GLOBAL tidb_ddl_enable_fast_reorg = OFF;\n")
            self.assertEqual(mounted.stat().st_mode & 0o777, 0o600)
            self.assertTrue(model["services"]["tidb"]["volumes"][0]["read_only"])
            self.assertEqual(model["services"]["tidb"]["volumes"][1], {"source": "/unchanged", "target": "/data"})
            with self.assertRaises(ValueError):
                fixture_ddl_initialization(model, installation)

    def test_unexpected_mount_or_symlink_cannot_rewrite_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            installation = Path(directory).resolve()
            (installation / "secrets").mkdir()
            source = installation / "secrets/initialize.sql"
            original = installation / "original.sql"
            original.write_text("unchanged")
            source.symlink_to(original)
            mount = {"source": str(source), "target": "/secrets/initialize.sql"}
            for mounts in ([], [mount, mount], [dict(mount, source=str(original))], [mount]):
                model = {"services": {"tidb": {"volumes": mounts}}}
                before = copy.deepcopy(model)
                with self.subTest(mounts=mounts), self.assertRaises(ValueError):
                    fixture_ddl_initialization(model, installation)
                self.assertEqual(model, before)
                self.assertEqual(original.read_text(), "unchanged")
                self.assertFalse((installation / "secrets/initialize-fixture.sql").exists())


class FixturePorts(unittest.TestCase):
    def test_fixture_cpu_quotas_never_exceed_runner_capacity(self):
        for available in (None, 1, 2, 8):
            for service, ceiling in (('tidb', 2), ('tikv', 3), ('storage', 1)):
                self.assertEqual(fixture_cpu_limit(service, available), min(available or 1, ceiling))

    def setUp(self):
        self.model = {"networks": {"data-client": {"internal": True}, "data-cluster": {"internal": True}},
                      "services": {"pd": {"networks": {"data-cluster": {}}}}}
        for name, target, published in (("tidb", 4000, "14001"), ("scanner", 3310, "13310"),
                                        ("integration-storage", 8333, "8333")):
            self.model["services"][name] = {"networks": {"data-client": {}},
                                           "ports": [{"target": target, "published": published, "host_ip": "127.0.0.1"}]}

    def test_only_fixture_endpoints_gain_host_access(self):
        prior = copy.deepcopy(self.model)
        host_test_access(self.model)
        self.assertEqual(self.model["services"]["pd"], prior["services"]["pd"])
        for name in ("data-client", "data-cluster"):
            self.assertEqual(self.model["networks"][name], {"internal": True})
        for name in ("tidb", "scanner", "integration-storage"):
            self.assertEqual(self.model["services"][name]["ports"], prior["services"][name]["ports"])
            self.assertIn("qualification-access", self.model["services"][name]["networks"])

    def test_public_or_unexpected_port_and_existing_network_fail_without_mutation(self):
        for field, value in (("host_ip", "0.0.0.0"), ("host_ip", "::"),
                             ("published", "4000"), ("target", 22)):
            changed = copy.deepcopy(self.model)
            changed["services"]["tidb"]["ports"][0][field] = value
            prior = copy.deepcopy(changed)
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                host_test_access(changed)
            self.assertEqual(changed, prior)
        self.model["networks"]["qualification-access"] = {"internal": False}
        with self.assertRaises(ValueError):
            host_test_access(self.model)


class PrivateIntegrationEvidence(unittest.TestCase):
    def test_full_suite_and_protocol_keep_distinct_scope_and_bounded_deadlines(self):
        with tempfile.TemporaryDirectory() as directory:
            for protocol_only, minutes in ((False, 360), (True, 5)):
                with self.subTest(protocol_only=protocol_only):
                    arguments = integration_arguments(protocol_only=protocol_only)
                    self.assertEqual(arguments[:2], ["go", "test"])
                    self.assertEqual(arguments[-1], "./internal/integration/...")
                    for flag in ("-race", "-count=1", "-failfast", "-tags=integration", f"-timeout={minutes}m"):
                        self.assertIn(flag, arguments)
                    if protocol_only:
                        index = arguments.index("-run")
                        self.assertEqual(arguments[index + 1], "^TestPrivateMediaRealStorageScannerAndAudience$")
                    else:
                        self.assertNotIn("-run", arguments)
                    with patch("self_hosted_test.ROOT", Path(directory)), \
                         patch("self_hosted_test.subprocess.run", return_value=subprocess.CompletedProcess(arguments, 0)) as execute, \
                         contextlib.redirect_stdout(io.StringIO()):
                        run_integration(arguments, {}, "protocol" if protocol_only else "business")
                    self.assertEqual(execute.call_args.args[0], arguments)
                    self.assertEqual(execute.call_args.kwargs["timeout"], 21900)
                    if not protocol_only:
                        self.assertEqual(execute.call_args.kwargs["timeout"] - minutes * 60, 300)

    def test_evidence_is_private_preserved_and_never_turns_failure_into_success(self):
        for outcome in ("success", "failure", "timeout"):
            with self.subTest(outcome=outcome), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                def execute(arguments, **kwargs):
                    kwargs["stdout"].write("fixture-private-output\n")
                    if outcome == "timeout":
                        raise subprocess.TimeoutExpired(arguments, 1)
                    return subprocess.CompletedProcess(arguments, 0 if outcome == "success" else 1)
                public_output = io.StringIO()
                with patch("self_hosted_test.ROOT", root), patch("self_hosted_test.subprocess.run", side_effect=execute), contextlib.redirect_stdout(public_output):
                    if outcome == "success":
                        run_integration(["fixture"], {}, "fixture")
                    else:
                        error = RuntimeError if outcome == "failure" else subprocess.TimeoutExpired
                        with self.assertRaises(error):
                            run_integration(["fixture"], {}, "fixture")
                    with self.assertRaises(FileExistsError):
                        run_integration(["fixture"], {}, "fixture")
                evidence = root / ".cache/fixture-integration.log"
                self.assertEqual(evidence.read_text(), "fixture-private-output\n")
                self.assertEqual(evidence.stat().st_mode & 0o777, 0o600)
                self.assertNotIn("fixture-private-output", public_output.getvalue())


if __name__ == '__main__':
    unittest.main()
