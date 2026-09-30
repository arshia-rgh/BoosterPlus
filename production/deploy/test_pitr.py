import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from pitr import checkpoint, command, location, main, validate
from provision import private_write


class EncryptedSQLRecovery(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        (root / 'installation').mkdir(mode=0o700)
        private_write(root / 'master.key', 'b' * 64 + '\n')
        private_write(root / 'snapshot.key', 'a' * 64)
        private_write(root / 'pitr.env', 'AWS_ACCESS_KEY_ID=fixture\nAWS_SECRET_ACCESS_KEY=fixture\n')
        private_write(root / 'backup.env', 'RESTIC_REPOSITORY=s3:https://backup.operator.org/archive/primary\n')
        self.manifest = dict(PITR_ENABLED='true', DATA_TOPOLOGY='self-hosted-single',
            DATA_DIRECTORY=str(root / 'installation'), DEPLOY_PROJECT='boosterplus-fixture',
            BR_MASTER_KEY_FILE=str(root / 'master.key'), BR_SNAPSHOT_KEY_FILE=str(root / 'snapshot.key'),
            PITR_ENV_FILE=str(root / 'pitr.env'), BACKUP_ENV_FILE=str(root / 'backup.env'),
            BR_STORAGE_URL='s3://sql-backups/primary?endpoint=https%3A%2F%2Fbackup.operator.org')

    def test_keys_destination_and_runtime_settings(self):
        validate(self.manifest)
        for changes in (
            dict(PITR_ENABLED='false'), dict(DATA_TOPOLOGY='managed'),
            dict(BR_STORAGE_URL='s3://sql-backups/primary?endpoint=http://backup.operator.org'),
            dict(BR_STORAGE_URL='s3://sql-backups/primary?endpoint=https://elsewhere.operator.org'),
            dict(BR_STORAGE_URL='s3://archive/primary/sql?endpoint=https://backup.operator.org'),
            dict(BR_STORAGE_URL='s3://sql-backups/primary?endpoint=https://backup.operator.org&secret=abc'),
            dict(BR_MASTER_KEY_FILE=self.manifest['BR_SNAPSHOT_KEY_FILE']),
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate(dict(self.manifest, **changes))
        path = Path(self.manifest['BR_MASTER_KEY_FILE'])
        for invalid in (b'x' * 32, b'b' * 64, b'g' * 64 + b'\n', b'a' * 64 + b'\n'):
            path.write_bytes(invalid)
            with self.assertRaises(ValueError):
                validate(self.manifest)
        path.write_bytes(b'b' * 64 + b'\n')
        path.chmod(0o644)
        with self.assertRaises(ValueError):
            validate(self.manifest)
        path.chmod(0o600)
        Path(self.manifest['PITR_ENV_FILE']).write_text('AWS_ACCESS_KEY_ID=fixture\nAWS_SECRET_ACCESS_KEY=fixture\nAWS_ENDPOINT_URL=http://insecure\n')
        with self.assertRaises(ValueError):
            validate(self.manifest)

    def test_global_checkpoint_and_no_private_status_in_receipt(self):
        at = 1800000000
        tso = (int(at * 1000) - 60000) << 18
        row = dict(name='playora', status='NORMAL', last_errors=[], start_ts=tso - 1,
                   checkpoint=tso, storage='s3://sql-backups/primary/logs', arbitrary='private')
        expected = location(self.manifest, 'logs')
        result = checkpoint(json.dumps([row]), expected, at)
        self.assertEqual(result, dict(checkpoint_tso=str(tso), start_tso=str(tso - 1), age_seconds=60))
        for changes in (dict(status='PAUSE'), dict(last_errors=[{'private': 'error'}]),
                        dict(checkpoint=True), dict(checkpoint=0), dict(start_ts=tso + 1),
                        dict(checkpoint=(int(at * 1000) + 1) << 18),
                        dict(checkpoint=(int(at * 1000) - 901000) << 18, start_ts=1),
                        dict(storage='s3://foreign/primary/logs'), dict(name='foreign')):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                checkpoint(json.dumps([dict(row, **changes)]), expected, at)
        for invalid in ('[]', '{}', 'null', '[null]', json.dumps([row, row]), 'x' * (1 << 20 | 1)):
            with self.assertRaises(ValueError):
                checkpoint(invalid, expected, at)

    def test_start_requires_explicit_ack_without_sending_command(self):
        with patch('pitr.backup_policy'), patch('pitr.run') as run, patch.dict('os.environ', {}, clear=True):
            with self.assertRaisesRegex(ValueError, 'PITR_START_ACK'):
                main(self.manifest, 'pitr-start')
            run.assert_not_called()
        with patch('pitr.backup_policy'), patch('pitr.run') as run, patch.dict('os.environ', {'PITR_START_ACK': 'boosterplus-fixture'}):
            main(self.manifest, 'pitr-start')
            args = run.call_args.args[1]
            self.assertIn('--master-key=local:///backup/master.key', args)
            self.assertFalse(any('crypter.key=' in arg for arg in args))

    def test_failed_snapshot_never_records_success(self):
        with patch('pitr.backup_policy'), patch('pitr.current', return_value={'release': {'commit': 'a' * 40}}):
            for replies in ([RuntimeError('upload interrupted')], ['', 'field not found']):
                with patch('pitr.run', side_effect=replies), self.assertRaises((ValueError, RuntimeError)):
                    main(self.manifest, 'pitr-snapshot')
                self.assertFalse((Path(self.manifest['DATA_DIRECTORY']) / 'operations/boosterplus-fixture-sql-snapshot.json').exists())
        args = command(['backup', 'full'])
        self.assertIn('--ca=/certs/ca.crt', args)
        self.assertNotIn('--skip-check-path', args)


if __name__ == '__main__':
    unittest.main()
