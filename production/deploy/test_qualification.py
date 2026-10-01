from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from qualification import initialize, inspect, REQUIREMENTS


class EvidenceGate(unittest.TestCase):
    def test_pending_stale_tampered_foreign_commit_and_bad_rpo_fail(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'packet'
            commit = 'a' * 40
            initialize(commit, root)
            self.assertEqual(set(inspect(root, commit)), set(REQUIREMENTS) | {'rpo_seconds', 'rto_seconds'})
            packet_file = root / 'qualification.json'
            packet = json.loads(packet_file.read_text())
            evidence = root / 'fixture.txt'
            evidence.write_text('synthetic unit-test evidence only')
            stamp = datetime.now(timezone.utc)
            for check in packet['checks'].values():
                check.update(status='passed', operator='fixture reviewer', observed_at=stamp.isoformat(), evidence=[{'file': evidence.name, 'sha256': hashlib.sha256(evidence.read_bytes()).hexdigest()}])
            packet['measurements'] = {'rpo_seconds': 900, 'rto_seconds': 14400}
            packet_file.write_text(json.dumps(packet))
            self.assertEqual(inspect(root, commit, stamp), [])
            with self.assertRaises(ValueError): inspect(root, 'b' * 40)
            packet['measurements']['rpo_seconds'] = 901
            packet['checks']['full_gate']['status'] = 'deferred'
            packet_file.write_text(json.dumps(packet))
            self.assertIn('rpo_seconds', inspect(root, commit, stamp))
            self.assertIn('full_gate', inspect(root, commit, stamp))
            evidence.write_text('changed')
            self.assertIn('recovery', inspect(root, commit, stamp))


if __name__ == '__main__': unittest.main()
