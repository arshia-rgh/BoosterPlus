"""Keep staged-change scope conservative, including deleted/renamed old paths."""
import unittest
from commit_gate import scope


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


if __name__ == "__main__":
    unittest.main()
