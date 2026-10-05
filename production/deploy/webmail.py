"""Offline exact-image support UI preparation; never creates or sends messages."""
import os
from pathlib import Path
import secrets
import subprocess

from manage import ROOT
from provision import private_write

IMAGE = 'roundcube/roundcubemail:1.7.4-fpm-alpine@sha256:cced4c7d40c21ec138b3622be13cadd2bbe7467eacd17029340b8650d7237ecf'


def enabled(manifest):
    value = manifest.get('WEBMAIL_ENABLED', 'false')
    if value not in ('true', 'false'):
        raise ValueError('WEBMAIL_ENABLED must be true or false')
    if value == 'true' and manifest.get('MAIL_MODE') != 'self-hosted':
        raise ValueError('Operator webmail requires self-hosted mail')
    return value == 'true'


def call(arguments):
    result = subprocess.run(arguments, capture_output=True, timeout=180, check=False)
    if result.returncode:
        raise RuntimeError('Webmail preparation failed; preserve incomplete private state for inspection')


def prepare(manifest):
    if not enabled(manifest) or os.getuid() != 1000:
        raise ValueError('Enable webmail and prepare as the deployment operator')
    root = Path(manifest['DATA_DIRECTORY']) / 'mail' / 'webmail'
    if not root.is_absolute() or root.parent.is_symlink() or not root.parent.is_dir():
        raise ValueError('Prepare the installation mail directory first')
    root.mkdir(mode=0o700)  # Exclusive: never silently replace live settings/key/code.
    code = root / 'code'
    code.mkdir(mode=0o755)
    code.chmod(0o755)
    db = root / 'db'
    db.mkdir(mode=0o700)
    private_write(root / 'des-key', secrets.token_hex(12))
    base = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop=ALL',
            '--security-opt=no-new-privileges:true', '--memory=128m', '--cpus=1', '--pids-limit=32']
    call(base + ['--user=1000:1000', '--mount', f'type=bind,src={code},dst=/prepared',
                 '--entrypoint', 'sh', IMAGE, '-c',
                 'cp -R /usr/src/roundcubemail/. /prepared/ && touch /prepared/config/config.inc.php && mkdir /prepared/plugins/playora_support && chmod -R a+rX /prepared'])
    # Exact, narrowly mounted paths: PHP owns settings data, never vendor code.
    call(base + ['--user=0:0', '--cap-add=CHOWN', '--cap-add=FOWNER',
                 '--mount', f'type=bind,src={db},dst=/db',
                 '--mount', f'type=bind,src={root / "des-key"},dst=/key',
                 '--entrypoint', 'sh', IMAGE, '-c', 'chown 82:82 /db /key && chmod 700 /db && chmod 600 /key'])
    args = base + ['--user=82:82', '--workdir=/var/www/html', '--tmpfs=/tmp:size=16m,uid=82,gid=82,mode=700',
                   '--env', 'MAIL_HOST=' + manifest['MAIL_HOST'], '--env', 'WEBMAIL_DOMAIN=' + manifest['SITE_ADDRESS']]
    for source, target, readonly in (
        (code, '/var/www/html', True), (db, '/var/roundcube/db', False),
        (root / 'des-key', '/run/secrets/roundcube_des_key', True),
        (ROOT / 'webmail/config.inc.php', '/var/www/html/config/config.inc.php', True),
    ):
        args += ['--mount', f'type=bind,src={source},dst={target}' + (',readonly' if readonly else '')]
    call(args + ['--entrypoint', 'php', IMAGE, 'bin/initdb.sh', '--dir=/var/www/html/SQL', '--update'])
    private_write(root / 'PREPARED', IMAGE + '\n')
    print('Exact upstream webmail code and private settings prepared; no email sent or public listener opened')


def check_model(model):
    services = model['services']
    service = services.get('webmail', {})
    if (service.get('image') != IMAGE or service.get('user') != '82:82'
            or not service.get('read_only') or service.get('ports')
            or service.get('entrypoint') != ['php-fpm', '--nodaemonize']
            or set(service.get('networks', {})) != {'mail-client', 'webmail-edge'}
            or 'ALL' not in service.get('cap_drop', []) or service.get('cap_add')
            or 'no-new-privileges:true' not in service.get('security_opt', [])):
        raise ValueError('Webmail requires the pinned non-root private immutable runtime')
    if not model['networks'].get('webmail-edge', {}).get('internal'):
        raise ValueError('Webmail network must remain internal')
    ports = [p for p in services['gateway'].get('ports', []) if str(p['published']) == '18443']
    if len(ports) != 1 or ports[0].get('host_ip') != '127.0.0.1' or ports[0].get('target') != 18443:
        raise ValueError('Webmail HTTPS requires exactly one SSH-only loopback listener')
    for target in ('/var/www/html', '/var/www/html/config/config.inc.php', '/run/secrets/roundcube_des_key'):
        mounts = [m for m in service.get('volumes', []) if m.get('target') == target]
        if len(mounts) != 1 or not mounts[0].get('read_only'):
            raise ValueError('Webmail vendor code, configuration and session key must be read-only')


def check_prepared(manifest):
    """Refuse partial/vendor-mismatched preparation before starting a release."""
    if not enabled(manifest):
        return
    root = Path(manifest['DATA_DIRECTORY']) / 'mail' / 'webmail'
    marker = root / 'PREPARED'
    if (root.is_symlink() or marker.is_symlink() or not marker.is_file()
            or marker.stat().st_size > 256 or marker.read_text() != IMAGE + '\n'):
        raise ValueError('Complete the exact-image webmail preparation before deployment')
    for filename in ('code/public_html/index.php', 'code/public_html/static.php',
                     'code/config/config.inc.php', 'des-key'):
        path = root / filename
        if path.is_symlink() or not path.is_file():
            raise ValueError('Webmail preparation is incomplete')
    if (root / 'db').is_symlink() or not (root / 'db').is_dir():
        raise ValueError('Webmail settings directory is missing')
    for filename in ('des-key', 'db'):
        if (root / filename).stat().st_mode & 0o077:
            raise ValueError('Webmail session key and settings must remain private')
