import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from point_restore import evidence, model_for_restore, restore_locked
from provision import private_write
from test_artifacts import fixture


class PointRecovery(unittest.TestCase):
    def test_isolated_networks_services_mounts(self):
        service = {'networks': {'outbound': {}, 'data-client': {}, 'backup-egress': {}}, 'ports': [123], 'container_name': 'primary', 'volumes': []}
        model = {'services': {name: copy.deepcopy(service) for name in ('api', 'migrate', 'pd', 'tikv', 'tidb', 'storage', 'object-gateway', 'br', 'worker', 'gateway', 'mailserver')}}
        result = model_for_restore(model, 'boosterplus-point-fixture', '/primary')
        self.assertFalse({'worker', 'mailserver', 'gateway'} & set(result['services']))
        for name, item in result['services'].items():
            self.assertNotIn('ports', item)
            self.assertNotIn('container_name', item)
            self.assertNotIn('outbound', item['networks'])
            if name not in ('br', 'tikv'):
                self.assertNotIn('backup-egress', item['networks'])
        self.assertTrue(all(v['internal'] for k, v in result['networks'].items() if k != 'backup-egress'))
        result['services']['tidb']['volumes'] = [{'type': 'bind', 'source': '/primary/data/tidb'}]
        with self.assertRaisesRegex(ValueError, 'primary'):
            model_for_restore(result, 'boosterplus-point-fixture', '/primary')

    def test_rejects_target_before_creating_or_contacting_restore(self):
        with tempfile.TemporaryDirectory() as temp:
            primary = Path(temp) / 'primary'
            primary.mkdir()
            manifest = {'DATA_DIRECTORY': str(primary)}
            with patch('point_restore.validate'), patch('point_restore.require_operator'), patch('point_restore.verify') as verify:
                for target, ack in ((primary, str(primary)), (primary / 'new', str(primary / 'new')), (Path(temp) / 'new', '')):
                    with self.assertRaises(ValueError):
                        restore_locked(manifest, target, 'a' * 64, ack, '/bundle')
                verify.assert_not_called()

    def test_success_and_interruption_never_start_traffic_or_delete_data(self):
        for fail in (False, True):
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                target = root / 'restore'
                primary = root / 'primary'
                primary.mkdir()
                source_config = root / 'writer.env'
                reader_config = root / 'reader.env'
                private_write(source_config, 'AWS_ACCESS_KEY_ID=writer\nAWS_SECRET_ACCESS_KEY=fixture\n')
                private_write(reader_config, 'AWS_ACCESS_KEY_ID=reader\nAWS_SECRET_ACCESS_KEY=fixture\n')
                manifest = {'DATA_DIRECTORY': str(primary), 'DEPLOY_PROJECT': 'boosterplus-fixture', 'PITR_ENV_FILE': str(source_config),
                            'RELEASE_TRUST_KEY': '/trust', 'RELEASE_TRUST_KEY_SHA256': 'a' * 64,
                            'BR_STORAGE_URL': 's3://bucket/sql?endpoint=https%3A%2F%2Fbackup.operator.org'}
                calls = []
                def restic_fake(manifest, args, *mounts):
                    if args[0] == 'snapshots':
                        return json.dumps([{'id': 'a' * 64, 'hostname': 'boosterplus-fixture', 'tags': ['playora-point-v1']}])
                    runtime = target / 'capture/runtime'
                    runtime.mkdir(parents=True)
                    for name in ('backend.env', 'frontend.env', 'migration.env'):
                        private_write(runtime / name, 'APP_ENV=production\n')
                    return ''
                def prepare_fake(installation):
                    (installation / 'secrets').mkdir(parents=True)
                    private_write(installation / 'secrets/initialize.sql', 'CREATE DATABASE playora CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;\n')
                    private_write(installation / 'secrets/provisioned.env', ''.join(k + '=fixture\n' for k in ('DATABASE_DSN', 'MIGRATION_DATABASE_DSN', 'MEDIA_S3_ENDPOINT', 'MEDIA_S3_BUCKET', 'MEDIA_S3_ACCESS_KEY', 'MEDIA_S3_SECRET_KEY')))
                    return installation
                def call_fake(args, environment, **kwargs):
                    calls.append(args)
                    if 'config' in args:
                        return json.dumps({'services': {name: {'volumes': [], 'networks': {'data-client': {}, 'data-cluster': {}, 'backup-egress': {}}} for name in ('api', 'migrate', 'pd', 'tikv', 'tidb', 'br', 'storage', 'object-gateway', 'worker', 'gateway', 'mailserver')}})
                    if 'point' in args and fail: raise RuntimeError('fixture interrupted BR')
                    return '39' if args[-1] == 'version' else ''
                with patch('point_restore.validate'), patch('point_restore.require_operator'), patch('point_restore.verify', return_value=fixture()), patch('point_restore.restic', side_effect=restic_fake), patch('point_restore.evidence', return_value=('s3://fixture/base', '123')), patch('point_restore.prepare', side_effect=prepare_fake), patch('point_restore.compose', return_value=['docker', 'compose']), patch('point_restore.call', side_effect=call_fake), patch.dict(os.environ, {'PITR_RESTORE_ENV_FILE': str(reader_config), 'PRIVACY_RECOVERY_ENV_FILE': ''}):
                    if fail:
                        with self.assertRaises(RuntimeError): restore_locked(manifest, target, 'a' * 64, str(target), '/bundle')
                    else:
                        restore_locked(manifest, target, 'a' * 64, str(target), '/bundle')
                self.assertEqual(calls[-1][-1], 'down')
                self.assertFalse(any('--volumes' in call for call in calls))
                self.assertTrue((target / 'RESTORE_QUARANTINED').exists())
                model = json.loads((target / 'point-compose.json').read_text())
                self.assertFalse({'worker', 'gateway', 'mailserver'} & set(model['services']))
                self.assertIn('PAYMENTS_ENABLED=false', (target / 'runtime/backend.env').read_text())
                if not fail:
                    self.assertTrue(any('recovery-seal-sessions' in call for call in calls))
                    self.assertFalse(json.loads((target / 'point-restore.json').read_text())['privacy_replayed'])

    def test_historical_exact_point_runtime_and_namespace_integrity(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            capture = root / 'capture'
            (capture / 'media').mkdir(parents=True)
            (capture / 'runtime').mkdir()
            at = 1800000000
            point = (int(at * 1000) - 60000) << 18
            media = {'version': 1, 'schema': 39, 'tso': str(point), 'entries': [], 'completed_at': datetime.fromtimestamp(at, timezone.utc).isoformat()}
            raw = json.dumps(media)
            private_write(capture / 'media/manifest.json', raw)
            hashes = {}
            for name in ('backend.env', 'frontend.env', 'migration.env'):
                private_write(capture / 'runtime' / name, 'APP_ENV=production\n')
                hashes[name] = hashlib.sha256(b'APP_ENV=production\n').hexdigest()
            prefix = 's3://bucket/playora?endpoint=https%3A%2F%2Fbackup.operator.org'
            base = 's3://bucket/playora/snapshot-20261001T120000-' + 'a' * 12 + '?endpoint=https%3A%2F%2Fbackup.operator.org'
            coverage = {'project': 'boosterplus-fixture', 'commit': 'a' * 40, 'tso': str(point), 'runtime_sha256': hashes,
                        'media_manifest_sha256': hashlib.sha256(raw.encode()).hexdigest(),
                        'sql_base': {'state': 'sql_only', 'commit': 'a' * 40, 'end_tso': str(point - 1), 'storage': base},
                        'log': {'start_tso': str(point - 2), 'checkpoint_tso': str(point + 1)}}
            receipt = capture / 'coverage.json'
            private_write(receipt, json.dumps(coverage))
            manifest = {'DEPLOY_PROJECT': 'boosterplus-fixture', 'BR_STORAGE_URL': prefix}
            signed = {'commit': 'a' * 40, 'schema': 39}
            self.assertEqual(evidence(manifest, root, signed), (base, str(point)))
            for mutate in ('commit', 'namespace', 'runtime', 'tso'):
                changed = copy.deepcopy(coverage)
                if mutate == 'commit': changed['commit'] = 'b' * 40
                if mutate == 'namespace': changed['sql_base']['storage'] = base.replace('/playora/', '/another/')
                if mutate == 'runtime': changed['runtime_sha256']['backend.env'] = 'b' * 64
                if mutate == 'tso': changed['tso'] = str(point + 1)
                receipt.write_text(json.dumps(changed))
                with self.assertRaises(ValueError): evidence(manifest, root, signed)


if __name__ == '__main__':
    unittest.main()
