import copy
import contextlib
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from self_hosted_test import fixture_cpu_limit, host_test_access, run_integration


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
