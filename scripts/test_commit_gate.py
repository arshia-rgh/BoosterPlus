"""Keep staged-change scope conservative, including deleted/renamed old paths."""
import unittest
import hashlib
from unittest.mock import patch
from commit_gate import commands, launch_preparation_only, preparation_commands, scope
from launch_resume import checked_evidence, remaining_commands, validate_changes


class GateScopeTest(unittest.TestCase):
    def test_launch_window_is_narrow_and_preserves_security(self):
        self.assertTrue(launch_preparation_only(["production/deploy/manage.py", "docs/progress.md", ".github/workflows/release.yml"]))
        for paths in ([], ["backend/internal/orders/store.go"], ["frontend/app/page.tsx"], ["new-tool.sh"], [".githooks/pre-commit"], [".github/workflows/other.yml"]):
            self.assertFalse(launch_preparation_only(paths))
        self.assertIn(["make", "-C", "backend", "lint", "gosec", "vuln"], preparation_commands())
        self.assertIn(["make", "-C", "production", "preparation-check"], preparation_commands())
        self.assertIn(["make", "-C", "backend", "stage-check"], preparation_commands(["backend/internal/opsmetrics/metrics.go"]))

    def test_docs(self):
        self.assertEqual(scope(["docs/ux/review.md", "README.md"]), "repository")

    def test_ui(self):
        self.assertEqual(scope(["frontend/app/orders/detail.tsx", "frontend/public/art.webp", "frontend/tests/e2e/orders.spec.ts", "docs/progress.md"]), "frontend")

    def test_booster_ui_uses_frontend_gate(self):
        self.assertEqual(scope(["frontend/booster-app/root.tsx"]), "frontend")

    def test_mixed_and_unknown(self):
        for path in ["backend/internal/orders/store.go", "backend/migration/026.sql", "production/gateway/Dockerfile", "frontend/package-lock.json", "frontend/server/index.mjs", ".githooks/pre-commit", ".github/workflows/ci.yml", "scripts/commit_gate.py", "new-tool.sh"]:
            with self.subTest(path=path):
                self.assertEqual(scope(["frontend/app/page.tsx", path]), "full")

    def test_deleted_backend_path_still_requires_full(self):
        self.assertEqual(scope(["backend/removed.go", "docs/removed-code.md"]), "full")

    def test_owner_authorized_di15_window_preserves_scoped_checks(self):
        self.assertEqual(commands("full", True), [["make", "stage-check"]])
        self.assertEqual(commands("frontend", True), [["make", "check-repository"], ["make", "-C", "frontend", "stage-check"]])
        self.assertEqual(commands("repository", True), [["make", "check-repository"]])

    def test_full_qualification_remains_available(self):
        self.assertEqual(commands("full", False), [["make", "pre-commit"]])
        self.assertEqual(commands("frontend", False)[1], ["make", "-C", "frontend", "pre-commit"])
        with self.assertRaises(ValueError):
            commands("unrecognized", True)


class LaunchContinuationTest(unittest.TestCase):
    def test_changed_source_or_unknown_path_invalidates_reuse(self):
        files = {"backend/internal/example.go": b"verified", "frontend/Dockerfile": b"reviewed patch"}
        baseline = {"backend/internal/example.go": hashlib.sha256(b"verified").hexdigest()}
        patched = hashlib.sha256(b"reviewed patch").hexdigest()
        with patch("launch_resume.DOCKERFILE_SHA", patched):
            validate_changes(baseline, set(files), files.__getitem__)
            with self.assertRaises(ValueError):
                validate_changes(baseline, set(files) | {"backend/go.mod"}, files.__getitem__)
            with self.assertRaises(ValueError):
                validate_changes(baseline, {"frontend/Dockerfile"}, files.__getitem__)
            files["backend/internal/example.go"] = b"changed"
            with self.assertRaises(ValueError):
                validate_changes(baseline, set(files), files.__getitem__)

    def test_unreviewed_configuration_change_invalidates_reuse(self):
        baseline = {"production/deploy/config_test.py": "previous"}
        files = {"production/deploy/config_test.py": b"unreviewed", "frontend/Dockerfile": b"patched"}
        with patch("launch_resume.DOCKERFILE_SHA", hashlib.sha256(b"patched").hexdigest()):
            with self.assertRaises(ValueError):
                validate_changes(baseline, set(files), files.__getitem__)

    def test_another_container_change_invalidates_reuse(self):
        with self.assertRaises(ValueError):
            validate_changes({}, {"frontend/Dockerfile"}, lambda _: b"unreviewed base or package change")

    def test_failed_or_replaced_evidence_cannot_authorize_reuse(self):
        for manifest, log in [(b"{}", b"success"), (b"", b""), (b'{"passed":true}', b"exit 0")]:
            with self.subTest(manifest=manifest), self.assertRaises(ValueError):
                checked_evidence(manifest, log)

    def test_remaining_security_images_and_full_production_are_required(self):
        commands = remaining_commands()
        self.assertEqual(commands[0], ["make", "check-repository"])
        self.assertEqual(commands[-1], ["make", "-C", "production", "pre-commit"])
        self.assertIn(["make", "-C", "backend", "fmt-check", "vet", "lint", "security"], commands)
        self.assertIn(["npm", "--prefix", "frontend", "run", "security"], commands)
        for project in ("backend", "frontend"):
            self.assertIn(["make", "-C", project, "docker-build", "image-security"], commands)
        self.assertIn(["python3", "frontend/scripts/container-smoke.py"], commands)


if __name__ == "__main__":
    unittest.main()
