"""Keep staged-change scope conservative, including deleted/renamed old paths."""
import unittest
from commit_gate import commands, scope


class GateScopeTest(unittest.TestCase):
    def test_docs(self):
        self.assertEqual(scope(["docs/ux/review.md", "README.md"]), "repository")

    def test_ui(self):
        self.assertEqual(scope(["frontend/app/orders/detail.tsx", "frontend/public/art.webp", "frontend/tests/e2e/orders.spec.ts", "docs/progress.md"]), "frontend")

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


if __name__ == "__main__":
    unittest.main()
