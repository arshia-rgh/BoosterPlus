"""Private media archives with explicit SQL coverage; no full-recovery claim."""
import hashlib
import json
from pathlib import Path
import tempfile
import time
import shutil
from capacity import budget, selected

from artifacts import bounded
from backup import policy, restic, snapshot_id
from manage import read_env, run
from pitr import checkpoint, command, location, validate
from provision import private_write
from release import current
import state


def covered(media, base, log, commit, schema, at):
    if not isinstance(media, dict) or type(media.get('version')) is not int or media.get('version') != 1 or type(media.get('schema')) is not int or media.get('schema') != schema or not isinstance(media.get('entries'), list) or len(media['entries']) > 100000:
        raise ValueError('Unexpected bounded media manifest')
    if base.get('state') != 'sql_only' or base.get('commit') != commit or not isinstance(base.get('end_tso'), str):
        raise ValueError('A full SQL snapshot from the current release is required')
    values = [log.get('start_tso'), base.get('end_tso'), media.get('tso'), log.get('checkpoint_tso')]
    if any(not isinstance(v, str) or not v.isascii() or not v.isdigit() or not 0 < int(v) < 2 ** 64 for v in values):
        raise ValueError('Missing exact SQL recovery checkpoints')
    start, full, point, end = map(int, values)
    if not start <= full <= point <= end:
        raise ValueError('Full snapshot and continuous logs do not cover this media checkpoint')
    if not 0 <= at - (point >> 18) / 1000 <= 900:
        raise ValueError('Media recovery checkpoint is stale or in the future')
    return point


def main(manifest):
    validate(manifest)
    policy(manifest)
    project = manifest['DEPLOY_PROJECT']
    with state.locked(Path(manifest['DATA_DIRECTORY']) / 'operations', project) as root:
        if state.pending(root, project):
            raise ValueError('Resolve the interrupted release before media capture')
        release = current(manifest)
        if not release:
            raise ValueError('Media capture requires a recorded signed release')
        base = json.loads(bounded(root / (project + '-sql-snapshot.json')))
        if base.get('project') != project:
            raise ValueError('SQL base belongs to another project')
        if shutil.disk_usage(root).free < budget(selected(manifest))["capture_free"]:
            raise ValueError('Media capture needs the selected profile free-space reserve; scratch remains bounded to 32 GiB')
        # Scratch is private on the persistent filesystem: never consume tiny /tmp
        # or remove user-selected paths. TemporaryDirectory owns only this new tree.
        with tempfile.TemporaryDirectory(prefix='.media-capture-', dir=root) as name:
            scratch = Path(name)
            run(manifest, ['run', '--rm', '--no-deps', '--user', '1000:1000',
                           '--volume', str(scratch) + ':/capture', '--entrypoint', '/app/boosterplus',
                           'api', 'recovery-capture', '/capture/media'])
            raw = bounded(scratch / 'media/manifest.json', 64 << 20)
            media = json.loads(raw)
            # Log upload normally trails a new transaction. Wait for this exact
            # immutable point; never recapture a moving target on every poll.
            deadline = time.monotonic() + 180
            while True:
                log = checkpoint(run(manifest, command(['log', 'status', '--task-name=playora', '--json']), capture=True), location(manifest, 'logs'), time.time())
                if int(log['checkpoint_tso']) >= int(media['tso']):
                    break
                if time.monotonic() >= deadline:
                    raise ValueError('SQL log upload did not reach the captured media point')
                time.sleep(2)
            point = covered(media, base, log, release['release']['commit'], release['release']['schema'], time.time())
            runtime = scratch / 'runtime'
            runtime.mkdir(mode=0o700)
            runtime_hashes = {}
            for key, filename in (('BACKEND_ENV_FILE', 'backend.env'), ('FRONTEND_ENV_FILE', 'frontend.env'), ('MIGRATION_ENV_FILE', 'migration.env')):
                read_env(manifest[key])
                data = bounded(manifest[key], 65536)
                private_write(runtime / filename, data.decode())
                runtime_hashes[filename] = hashlib.sha256(data).hexdigest()
            private_write(scratch / 'coverage.json', json.dumps({'project': project, 'commit': release['release']['commit'],
                'sql_base': base, 'log': log, 'runtime_sha256': runtime_hashes,
                'media_manifest_sha256': hashlib.sha256(raw).hexdigest(), 'tso': str(point)}))
            mounts = [(scratch, '/capture', False)]
            paths = ['/capture']
            for name in ('mail', 'pki'):
                mounts.append((Path(manifest['DATA_DIRECTORY']) / name, '/' + name, False))
                paths.append('/' + name)
            output = restic(manifest, ['backup', '--json', '--host', project, '--tag', 'playora-point-v1', *paths], mounts)
            for key, filename in (('BACKEND_ENV_FILE', 'backend.env'), ('FRONTEND_ENV_FILE', 'frontend.env'), ('MIGRATION_ENV_FILE', 'migration.env')):
                if hashlib.sha256(bounded(manifest[key], 65536)).hexdigest() != runtime_hashes[filename]:
                    raise ValueError('Runtime configuration changed during recovery capture; retry')
            identifier = snapshot_id(output)
            state.write(root, project + '-media-backup.json', {'state': 'media_sql_candidate', 'project': project,
                'commit': release['release']['commit'], 'snapshot': identifier, 'tso': str(point),
                'uploaded_at': time.time(), 'objects': len(media['entries']), 'restore_qualified': False})
    print('Encrypted SQL-covered media archive uploaded; independent integrity/privacy and isolated restore remain required')
