import json
from pathlib import Path
import tempfile
import unittest
from state import locked, pending, write


class OperationsState(unittest.TestCase):
    def test_lock_contention_and_exception_release(self):
        with tempfile.TemporaryDirectory() as name:
            with locked(name, "boosterplus-fixture"):
                with self.assertRaisesRegex(ValueError, "Another"):
                    with locked(name, "boosterplus-fixture"):
                        self.fail("Concurrent operation entered")
            with self.assertRaisesRegex(RuntimeError, "interruption"):
                with locked(name, "boosterplus-fixture"):
                    raise RuntimeError("interruption")
            with locked(name, "boosterplus-fixture"):
                pass

    def test_receipts_preserve_interrupted_release(self):
        with tempfile.TemporaryDirectory() as name:
            receipt = {"project": "boosterplus-fixture", "state": "migration_started", "commit": "a" * 40}
            write(name, "boosterplus-fixture-release.json", receipt)
            self.assertEqual(pending(name, "boosterplus-fixture"), receipt)
            path = Path(name) / "boosterplus-fixture-release.json"
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            write(name, path.name, dict(receipt, state="complete"))
            self.assertIsNone(pending(name, "boosterplus-fixture"))
            self.assertEqual(json.loads(path.read_text())["state"], "complete")

    def test_unsafe_paths_and_lock_aliases(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            (root / "target").write_text("preserved")
            (root / "boosterplus-fixture.lock").symlink_to(root / "target")
            with self.assertRaises(OSError):
                with locked(root, "boosterplus-fixture"):
                    self.fail("Symlink lock accepted")
            (root / "receipt.json").symlink_to(root / "target")
            with self.assertRaises(ValueError):
                write(root, "receipt.json", {})
            with self.assertRaises(ValueError):
                write(root, "../escape.json", {})
            self.assertEqual((root / "target").read_text(), "preserved")


if __name__ == "__main__":
    unittest.main()
