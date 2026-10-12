"""Keep the owner's scoped retry bound to actual, unchanged qualification."""
import copy
import json
import unittest
from unittest.mock import patch

import service144_resume as gate


class ServiceContinuationTest(unittest.TestCase):
    def setUp(self):
        self.content = b"qualified source"
        self.baseline = {
            "backend/internal/example%d.go" % index: gate.digest(self.content)
            for index in range(175)
        }
        self.baseline["docs/progress.md"] = gate.digest(self.content)
        self.proof = {
            "base": gate.BASE,
            "result": "passed_remaining_checks",
            "production_modified": False,
            "baseline_manifest_sha256": "manifest",
            "baseline_log_sha256": "log",
            "browser_state": {
                "stage": "focused_browser_passed",
                "retained_from_first_retry": 8,
                "catalog_retry_passes": 2,
                "total": 10,
            },
            "browser_evidence": {name: "hash" for name in gate.BROWSER_ARTIFACTS},
            "interrupted_production_attempt": {name: "hash" for name in gate.INTERRUPTED_ARTIFACTS},
            "failed_database_attempt": gate.FAILED_DATABASE_ARTIFACTS.copy(),
            "retained_production": {
                "proof_sha256": gate.PRODUCTION_PROOF_SHA,
                "completed_before_failure": gate.RETAINED_PRODUCTION_STAGES,
                "failed_before_business_tests": True,
                "failed_step": {"command": ["make", "-C", "production", "pre-commit"],
                                "exit_code": 2, "log": "remaining-3-retry1.log",
                                "log_sha256": gate.PRODUCTION_LOG_SHA},
            },
            "database_retry": {"unit_exit_code": 0, "patch_manifest_sha256": gate.FIXTURE_PATCH_SHA,
                               "original_files": gate.FIXTURE_ORIGINAL},
            "steps": [{"command": command, "exit_code": 0}
                      for command in gate.REMAINING_COMMANDS],
            "application_and_tests": {
                **self.baseline,
                **{path: gate.digest(self.content) for path in gate.BROWSER_PATHS},
                **{path: gate.digest(self.content) for path in gate.FIXTURE_ORIGINAL},
            },
        }

    def validate(self, proof=None):
        result = copy.deepcopy(self.proof if proof is None else proof)
        manifest, log = json.dumps(self.baseline).encode(), b"original failed log"
        result["baseline_manifest_sha256"] = gate.digest(manifest)
        result["baseline_log_sha256"] = gate.digest(log)
        evidence = json.dumps(result).encode()
        with patch.multiple(gate, MANIFEST_SHA=gate.digest(manifest),
                            LOG_SHA=gate.digest(log), PROOF_SHA=gate.digest(evidence)):
            return gate.validate_evidence(manifest, log, evidence)

    def test_complete_scoped_evidence_retains_failed_baseline(self):
        baseline, result = self.validate()
        self.assertEqual(baseline, self.baseline)
        self.assertEqual(result["browser_state"]["total"], 10)

    def test_missing_failed_or_changed_qualification_is_rejected(self):
        for mutate in (
            lambda p: p.update(result="failed"),
            lambda p: p.update(base="other source"),
            lambda p: p.update(production_modified=True),
            lambda p: p["browser_state"].update(catalog_retry_passes=0),
            lambda p: p["browser_evidence"].pop("catalog-retry1/before.json"),
            lambda p: p["interrupted_production_attempt"].pop("timeout-correction.json"),
            lambda p: p["failed_database_attempt"].pop("database-retry1/database.log"),
            lambda p: p["failed_database_attempt"].update({"database-retry1/proof.json": "changed"}),
            lambda p: p["steps"].pop(),
            lambda p: p["steps"][0].update(exit_code=1),
            lambda p: p["steps"][2].update(command=["true"]),
            lambda p: p["steps"][2].update(exit_code=1),
            lambda p: p["retained_production"]["failed_step"].update(exit_code=0),
            lambda p: p["retained_production"].update(completed_before_failure=["staging"]),
            lambda p: p["database_retry"].update(unit_exit_code=1),
            lambda p: p["database_retry"].update(patch_manifest_sha256="different"),
            lambda p: p["database_retry"].update(original_files={}),
            lambda p: p["application_and_tests"].update({"backend/internal/example0.go": "changed"}),
            lambda p: p["application_and_tests"].pop("frontend/tests/e2e/orders.spec.ts"),
        ):
            with self.subTest(mutate=mutate):
                proof = copy.deepcopy(self.proof)
                mutate(proof)
                with self.assertRaises(ValueError):
                    self.validate(proof)

    def test_replaced_bytes_cannot_reuse_pinned_evidence(self):
        manifest, log, proof = b"manifest", b"log", b"proof"
        with patch.multiple(gate, MANIFEST_SHA=gate.digest(manifest),
                            LOG_SHA=gate.digest(log), PROOF_SHA=gate.digest(proof)):
            for parts in ((manifest + b" ", log, proof),
                          (manifest, log + b" ", proof),
                          (manifest, log, proof + b" ")):
                with self.subTest(parts=parts), self.assertRaises(ValueError):
                    gate.validate_evidence(*parts)

    def test_unrelated_or_missing_staged_changes_are_rejected(self):
        changed = set(self.baseline) | gate.EXTRA
        gate.validate_changes(self.baseline, self.proof, changed, lambda _: self.content)
        for paths in (changed | {"backend/go.mod"},
                      changed | {"frontend/app/unqualified.tsx"},
                      changed - {"backend/internal/example0.go"}):
            with self.subTest(paths=paths), self.assertRaises(ValueError):
                gate.validate_changes(self.baseline, self.proof, paths, lambda _: self.content)

    def test_qualified_runtime_and_corrected_test_bytes_are_required(self):
        changed = set(self.baseline) | gate.EXTRA
        for target in ("backend/internal/example0.go", *sorted(gate.BROWSER_PATHS | set(gate.FIXTURE_ORIGINAL))):
            with self.subTest(target=target), self.assertRaises(ValueError):
                gate.validate_changes(self.baseline, self.proof, changed,
                                      lambda path: b"changed" if path == target else self.content)
        gate.validate_changes(self.baseline, self.proof, changed,
                              lambda path: b"updated evidence" if path == "docs/progress.md" else self.content)

    def test_clean_checkout_has_no_reusable_proof(self):
        with patch.object(gate.Path, "exists", return_value=False):
            self.assertFalse(gate.run_if_available())


if __name__ == "__main__":
    unittest.main()
