from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from qualification import initialize, inspect, REQUIREMENTS


class EvidenceGate(unittest.TestCase):
    def test_initial_launch_deferral_is_recovery_only_and_requires_intact_owner_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'packet'
            commit = 'a' * 40
            initialize(commit, root)
            path = root / 'qualification.json'
            packet = json.loads(path.read_text())
            evidence = root / 'owner-decision.txt'
            evidence.write_text('Synthetic fixture: owner defers backups, acknowledges primary data loss.')
            check = packet['checks']['recovery']
            check.update(status='owner_deferred', operator='fixture owner',
                         observed_at=datetime.now(timezone.utc).isoformat(),
                         owner_decision='2026-10-04-defer-backups-until-after-launch',
                         risk='primary-host-loss-may-lose-all-data',
                         evidence=[{'file': evidence.name, 'sha256': hashlib.sha256(evidence.read_bytes()).hexdigest()}])
            path.write_text(json.dumps(packet))
            self.assertEqual(set(inspect(root, commit, initial_launch=True)), set(REQUIREMENTS) - {'recovery'})
            self.assertIn('recovery', inspect(root, commit))
            self.assertIn('rpo_seconds', inspect(root, commit))
            # Identical evidence cannot defer security, payment or any other gate.
            packet['checks']['full_gate'] = dict(check)
            path.write_text(json.dumps(packet))
            self.assertIn('full_gate', inspect(root, commit, initial_launch=True))
            for field in ('owner_decision', 'risk', 'evidence', 'operator', 'observed_at'):
                original = check[field]
                check[field] = ''
                path.write_text(json.dumps(packet))
                failures = inspect(root, commit, initial_launch=True)
                self.assertIn('recovery', failures)
                self.assertIn('rpo_seconds', failures)
                check[field] = original
            evidence.write_text('tampered')
            path.write_text(json.dumps(packet))
            self.assertIn('recovery', inspect(root, commit, initial_launch=True))

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
