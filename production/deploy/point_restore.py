"""Exact-TSO restore into a new cluster; never promotes the quarantined result."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import time
from urllib.parse import urlsplit

from artifacts import bounded, verify
from backup import SNAPSHOT, restic
from manage import compose, read_env
from media_backup import covered
from pitr import LOG_CRYPTO, SNAPSHOT_CRYPTO, TLS, location, validate
from provision import prepare, private_write
from release import checked_schema, images
import state


def model_for_restore(model, project, primary):
    keep = {'pd', 'tikv', 'tidb', 'storage', 'object-gateway', 'api', 'migrate', 'br'}
    model['name'] = project
    model['services'] = {k: v for k, v in model['services'].items() if k in keep}
    networks = {'data-client', 'data-cluster', 'object-internal', 'backup-egress'}
    for name, service in model['services'].items():
        for key in ('ports', 'depends_on', 'container_name'):
            service.pop(key, None)
        service['restart'] = 'no'
        service['healthcheck'] = {'disable': True}
        allowed = networks if name in ('br', 'tikv') else networks - {'backup-egress'}
        service['networks'] = {key: {} for key in service.get('networks', {}) if key in allowed}
        if name in ('api', 'migrate', 'br'):
            service['profiles'] = ['tools']
        for mount in service.get('volumes', []):
            if mount['type'] == 'bind' and Path(mount['source']).resolve().is_relative_to(Path(primary).resolve()):
                raise ValueError('A restore must never mount primary installation data')
    model['networks'] = {name: {'name': project + '_' + name, 'internal': name != 'backup-egress'} for name in networks}
    model['volumes'] = {'scanner-socket': {'name': project + '_unused-scanner-socket'}}
    return model


def evidence(manifest, target, signed):
    capture = target / 'capture'
    coverage = json.loads(bounded(capture / 'coverage.json'))
    raw = bounded(capture / 'media/manifest.json', 64 << 20)
    media = json.loads(raw)
    if coverage.get('project') != manifest['DEPLOY_PROJECT'] or coverage.get('commit') != signed['commit'] or hashlib.sha256(raw).hexdigest() != coverage.get('media_manifest_sha256'):
        raise ValueError('Recovery archive does not match the signed release and project')
    # Recheck original coverage at its capture time, not the later drill time.
    from datetime import datetime
    completed = datetime.fromisoformat(media['completed_at'].replace('Z', '+00:00'))
    if completed.tzinfo is None:
        raise ValueError('Recovery capture requires a UTC timestamp')
    tso = covered(media, coverage['sql_base'], coverage['log'], signed['commit'], signed['schema'], completed.timestamp())
    if str(tso) != coverage.get('tso'):
        raise ValueError('Recovery timestamp was changed')
    base = coverage['sql_base']['storage']
    source = urlsplit(manifest['BR_STORAGE_URL'])
    candidate = urlsplit(base)
    suffix = candidate.path.removeprefix(source.path + '/')
    if (candidate.scheme, candidate.netloc, candidate.query, candidate.fragment) != (source.scheme, source.netloc, source.query, '') or not re.fullmatch(r'snapshot-[0-9]{8}T[0-9]{6}-[a-f0-9]{12}', suffix):
        raise ValueError('SQL base is outside the configured recovery namespace')
    for filename in ('backend.env', 'frontend.env', 'migration.env'):
        path = capture / 'runtime' / filename
        read_env(path)
        if hashlib.sha256(bounded(path, 65536)).hexdigest() != coverage.get('runtime_sha256', {}).get(filename):
            raise ValueError('Archived runtime key/configuration integrity failed')
    return base, str(tso)


def call(arguments, environment, *, input_text=None, timeout=300):
    result = subprocess.run(arguments, env=environment, input=input_text, capture_output=True, text=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError('Isolated point recovery failed; target remains quarantined; private output withheld')
    return result.stdout


def execute(manifest, target, identifier, acknowledgement, bundle):
    with state.locked(Path(manifest['DATA_DIRECTORY']) / 'operations', manifest['DEPLOY_PROJECT']) as root:
        if state.pending(root, manifest['DEPLOY_PROJECT']):
            raise ValueError('Resolve the interrupted primary release before recovery')
        restore_locked(manifest, target, identifier, acknowledgement, bundle)


def require_operator():
    if os.getuid() != 1000:
        raise ValueError('Run point recovery as the dedicated UID1000 deployment operator')


def restore_locked(manifest, target, identifier, acknowledgement, bundle):
    validate(manifest)
    target = Path(target)
    require_operator()
    if not target.is_absolute() or target.exists() or target.is_symlink() or not target.parent.is_dir() or target.parent.resolve().is_relative_to(Path(manifest['DATA_DIRECTORY']).resolve()) or acknowledgement != str(target) or not SNAPSHOT.fullmatch(identifier):
        raise ValueError('Choose and acknowledge a new absolute restore target outside the primary')
    signed = verify(bundle, manifest['RELEASE_TRUST_KEY'], manifest['RELEASE_TRUST_KEY_SHA256'])
    snapshots = json.loads(restic(manifest, ['snapshots', '--json', identifier]))
    if len(snapshots) != 1 or snapshots[0].get('id') != identifier or snapshots[0].get('hostname') != manifest['DEPLOY_PROJECT'] or 'playora-point-v1' not in snapshots[0].get('tags', []):
        raise ValueError('Choose this project\'s complete point-recovery archive')
    started = time.time()
    target.mkdir(mode=0o700)
    private_write(target / 'RESTORE_QUARANTINED', 'No traffic, workers, mail or financial outbound operations.\n')
    restic(manifest, ['restore', identifier, '--target', '/restore', '--verify'], [(target, '/restore', True)])
    base, tso = evidence(manifest, target, signed)
    installation = prepare(target / 'installation')
    # Filtered PITR requires the application schema not to exist in its target.
    init = installation / 'secrets/initialize.sql'
    init.write_text(init.read_text().replace('CREATE DATABASE playora CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;\n', ''))
    credentials = read_env(installation / 'secrets/provisioned.env')
    backend = read_env(target / 'capture/runtime/backend.env')
    backend.update({key: credentials[key] for key in ('DATABASE_DSN', 'MEDIA_S3_ENDPOINT', 'MEDIA_S3_BUCKET', 'MEDIA_S3_ACCESS_KEY', 'MEDIA_S3_SECRET_KEY')})
    privacy_settings = None
    privacy_config = os.environ.get('PRIVACY_RECOVERY_ENV_FILE', '')
    if privacy_config:
        privacy_settings = read_env(privacy_config)
        if any(not key.startswith('PRIVACY_RECOVERY_') for key in privacy_settings) or privacy_settings.get('PRIVACY_RECOVERY_PROJECT') != manifest['DEPLOY_PROJECT'] or privacy_settings.get('PRIVACY_RECOVERY_ENABLED') != 'true':
            raise ValueError('Recovery journal requires dedicated current project configuration')
        backend.update(privacy_settings)
    if backend.get('PRIVACY_RECOVERY_ENABLED') == 'true' and privacy_settings is None:
        raise ValueError('Supply current independent read/list journal credentials for privacy replay')
    backend.update(PAYMENTS_ENABLED='false', PAYOUTS_ENABLED='false', RECOVERY_ISOLATED_ACK='isolated-no-egress-no-workers', RECOVERY_QUARANTINE_MARKER='/recovery/RESTORE_QUARANTINED')
    runtime = target / 'runtime'
    runtime.mkdir(mode=0o700)
    private_write(runtime / 'backend.env', ''.join(k + '=' + v + '\n' for k, v in backend.items()))
    private_write(runtime / 'migration.env', 'APP_ENV=production\nMIGRATION_DATABASE_DSN=' + credentials['MIGRATION_DATABASE_DSN'] + '\n')
    private_write(runtime / 'frontend.env', bounded(target / 'capture/runtime/frontend.env', 65536).decode())
    project = 'boosterplus-point-' + secrets.token_hex(8)
    restore_credentials = read_env(os.environ['PITR_RESTORE_ENV_FILE'])
    source_credentials = read_env(manifest['PITR_ENV_FILE'])
    if set(restore_credentials) - {'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION'} or not restore_credentials.get('AWS_ACCESS_KEY_ID') or not restore_credentials.get('AWS_SECRET_ACCESS_KEY') or restore_credentials['AWS_ACCESS_KEY_ID'] == source_credentials['AWS_ACCESS_KEY_ID']:
        raise ValueError('Use a separate read-only SQL recovery identity; never the primary backup writer')
    candidate = images(manifest, signed)
    candidate.update(DEPLOY_PROJECT=project, DATA_DIRECTORY=str(installation), MAIL_MODE='external', PITR_ENV_FILE=os.environ['PITR_RESTORE_ENV_FILE'],
        BACKEND_ENV_FILE=str(runtime / 'backend.env'), MIGRATION_ENV_FILE=str(runtime / 'migration.env'), FRONTEND_ENV_FILE=str(runtime / 'frontend.env'))
    environment = dict(os.environ, **candidate)
    model = json.loads(call(compose(candidate) + ['--profile', 'tools', 'config', '--format', 'json'], environment))
    model_for_restore(model, project, manifest['DATA_DIRECTORY'])
    model['services']['api']['volumes'].append({'type': 'bind', 'source': str(target), 'target': '/recovery', 'read_only': True})
    if privacy_settings is not None:
        journal_dir = target / 'journal'
        journal_dir.mkdir(mode=0o700)
        exporter = copy.deepcopy(model['services']['api'])
        exporter.pop('env_file', None)
        exporter.update(environment=dict(privacy_settings, MEDIA_S3_ENDPOINT=backend['MEDIA_S3_ENDPOINT']),
                        networks={'backup-egress': {}}, volumes=[{'type': 'bind', 'source': str(journal_dir), 'target': '/journal'}],
                        user='1000:1000', entrypoint='/app/boosterplus', profiles=['tools'])
        model['services']['privacy-export'] = exporter
    # Checkpoints belong to this drill, never to the source backup/log namespace.
    checkpoint_dir = target / 'br-checkpoints'
    checkpoint_dir.mkdir(mode=0o700)
    model['services']['br']['volumes'].append({'type': 'bind', 'source': str(checkpoint_dir), 'target': '/checkpoints'})
    configuration = target / 'point-compose.json'
    private_write(configuration, json.dumps(model))
    command = ['docker', 'compose', '--project-name', project, '-f', str(configuration), '--profile', 'tools']
    report = {'state': 'restoring', 'project': project, 'source_project': manifest['DEPLOY_PROJECT'], 'commit': signed['commit'], 'snapshot': identifier, 'tso': tso, 'started_at': started, 'quarantined': True}
    state.write(target, 'point-restore.json', report)
    try:
        if privacy_settings is not None:
            call(command + ['run', '--rm', '--no-deps', 'privacy-export', 'recovery-privacy-export', '/journal/privacy.json'], environment, timeout=600)
        call(command + ['up', '-d', 'pd', 'tikv', 'tidb', 'storage', 'object-gateway'], environment)
        cli = command + ['run', '--rm', '--no-deps', '--user', '1000:1000', '--entrypoint', '/app/boosterplus', 'api']
        for attempt in range(30):
            try:
                call(cli + ['recovery-ready'], environment, timeout=75)
                break
            except RuntimeError:
                if attempt == 29:
                    raise
                time.sleep(2)
        # SQL initialization is ready before BR; never apply application migrations.
        call(command + ['run', '--rm', '--no-deps', 'br', 'restore', 'point', '--storage=' + location(manifest, 'logs'),
            '--full-backup-storage=' + base, '--restored-ts=' + tso, '--filter=playora.*', '--checkpoint-storage=local:///checkpoints',
            *TLS, *SNAPSHOT_CRYPTO, *LOG_CRYPTO, '--log-level=warn'], environment, timeout=7200)
        migration = command + ['run', '--rm', '--no-deps', 'migrate', 'db', 'migrate']
        if checked_schema(call(migration + ['version'], environment)) != signed['schema']:
            raise ValueError('Point-restored schema does not match its signed release')
        call(migration + ['verify'], environment)
        call(command + ['exec', '-T', 'storage', 'weed', 'shell', '-filer=localhost:8888'], environment, input_text='s3.bucket.create -name playora\n')
        cli = command + ['run', '--rm', '--no-deps', '--user', '1000:1000', '--entrypoint', '/app/boosterplus', 'api']
        call(cli + ['recovery-import-media', '/recovery/capture/media'], environment, timeout=600)
        call(cli + ['recovery-seal-sessions'], environment)
        if privacy_settings is not None:
            call(cli + ['recovery-privacy-replay', '/recovery/journal/privacy.json'], environment, timeout=600)
        report['privacy_replayed'] = privacy_settings is not None
        report.update(state='data_restored_quarantined', finished_at=time.time(), elapsed_seconds=time.time() - started,
            limits=['Review journal freshness, conservative holds, media purges and finance/job state before promotion', 'Mail archive is retained offline; outbound queues are never replayed', 'No sales activation or measured RPO/RTO acceptance'])
        state.write(target, 'point-restore.json', report)
    finally:
        call(command + ['down'], environment)  # Keep all recovered files for review; no --volumes.
    print('Exact SQL/media restore and session invalidation completed; target remains quarantined for privacy and finance review')
