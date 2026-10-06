"""Reject missing, replaced or broadened mobile continuation evidence."""
import unittest
from unittest.mock import patch
import mobile_resume as gate


class MobileContinuationTest(unittest.TestCase):
    def test_source_and_log_are_both_bound(self):
        raw = b'{"frontend/app/example.css":"value"}'
        with patch.object(gate, "MANIFEST_SHA", gate.digest(raw)), patch.object(gate, "LOG_SHA", gate.digest(b"passed")):
            self.assertEqual(gate.validate_evidence(raw, b"passed"), {"frontend/app/example.css": "value"})
            for source, log in ((raw + b" ", b"passed"), (raw, b"failed")):
                with self.assertRaises(ValueError):
                    gate.validate_evidence(source, log)

    def test_scope_and_runtime_bytes_must_match(self):
        qualified = {"frontend/app/example.css": gate.digest(b"reviewed"), "docs/progress.md": "old"}
        changed = set(qualified) | gate.EXTRA
        gate.validate_changes(qualified, changed, lambda _: b"reviewed")
        for altered in (changed | {"backend/internal/app/server.go"}, changed - {"frontend/app/example.css"}):
            with self.assertRaises(ValueError):
                gate.validate_changes(qualified, altered, lambda _: b"reviewed")
        with self.assertRaises(ValueError):
            gate.validate_changes(qualified, changed, lambda _: b"changed")


if __name__ == "__main__":
    unittest.main()
