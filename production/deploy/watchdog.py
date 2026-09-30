"""Independent-host HTTPS/SSH heartbeat checks; no primary runtime secrets."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import time
import urllib.request
from urllib.parse import urlsplit

from artifacts import bounded
from manage import read_env
from monitor import NoRedirect, deliver, notify
import state


def heartbeat(raw, at):
    if len(raw) > 65536:
        raise ValueError('Heartbeat exceeds its size bound')
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError('Heartbeat must be an object')
    if not isinstance(value.get('observed_at'), str):
        raise ValueError('Heartbeat timestamp is invalid')
    stamp = datetime.fromisoformat(value['observed_at'].replace('Z', '+00:00'))
    if stamp.tzinfo is None or not 0 <= at - stamp.timestamp() <= 180:
        raise ValueError('Primary monitor heartbeat is stale or in the future')
    alerts = value.get('alerts')
    if not isinstance(alerts, list) or len(alerts) > 100 or any(not isinstance(v, str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,80}', v) for v in alerts):
        raise ValueError('Heartbeat alert codes are malformed')
    return sorted(set(alerts))


def configuration(path):
    cfg = read_env(path)
    required = {'WATCHDOG_ORIGIN', 'WATCHDOG_SSH_HOST', 'WATCHDOG_SSH_PORT', 'WATCHDOG_SSH_USER',
                'WATCHDOG_IDENTITY_FILE', 'WATCHDOG_KNOWN_HOSTS_FILE', 'WATCHDOG_STATE_DIRECTORY', 'DEPLOY_PROJECT', 'ALERT_ENV_FILE', 'WATCHDOG_OFFHOST_CONFIRMED'}
    if set(cfg) != required or not all(cfg.values()):
        raise ValueError('Configure only the documented independent watchdog settings')
    if cfg['WATCHDOG_OFFHOST_CONFIRMED'] != 'true':
        raise ValueError('Confirm the watchdog runs on an independent host')
    origin = urlsplit(cfg['WATCHDOG_ORIGIN'])
    if origin.scheme != 'https' or not origin.hostname or origin.username or origin.password or origin.path or origin.query or origin.fragment:
        raise ValueError('Watchdog origin must be the actual HTTPS site origin')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}', cfg['WATCHDOG_SSH_HOST']) or not re.fullmatch(r'[a-z_][a-z0-9_-]{0,31}', cfg['WATCHDOG_SSH_USER']):
        raise ValueError('SSH host/user invalid')
    if not re.fullmatch(r'[0-9]{1,5}', cfg['WATCHDOG_SSH_PORT']) or not 1 <= int(cfg['WATCHDOG_SSH_PORT']) <= 65535:
        raise ValueError('SSH port invalid')
    for name in ('WATCHDOG_IDENTITY_FILE', 'WATCHDOG_KNOWN_HOSTS_FILE'):
        path = Path(cfg[name])
        if not path.is_absolute() or path.stat().st_mode & 0o077 or path.stat().st_uid != os.getuid() or not bounded(path, 65536):
            raise ValueError('SSH identity and independently verified known-hosts file must be private')
    return cfg


def probe(origin, opener=None):
    client = opener or urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    started = time.monotonic()
    request = urllib.request.Request(origin + '/login', headers={'User-Agent': 'PLAYORA-independent-monitor/1'})
    with client.open(request, timeout=10) as response:
        if response.status != 200 or 'text/html' not in response.headers.get('Content-Type', ''):
            raise ValueError('Public customer entry is unavailable')
        # Never retain page content, cookies or redirect destinations.
        response.read(4096)
    return round((time.monotonic() - started) * 1000)


def collect(cfg, runner=subprocess.run, probing=probe):
    alerts = []
    latency = None
    try:
        latency = probing(cfg['WATCHDOG_ORIGIN'])
        if latency > 3000:
            alerts.append('independent_public_probe_slow')
    except (OSError, ValueError):
        alerts.append('independent_public_unavailable')
    command = ['ssh', '-F', '/dev/null', '-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
               '-o', 'PasswordAuthentication=no', '-o', 'KbdInteractiveAuthentication=no', '-o', 'IdentitiesOnly=yes',
               '-o', 'ConnectTimeout=10', '-o', 'ClearAllForwardings=yes',
               '-o', 'UserKnownHostsFile=' + cfg['WATCHDOG_KNOWN_HOSTS_FILE'],
               '-i', cfg['WATCHDOG_IDENTITY_FILE'], '-p', cfg['WATCHDOG_SSH_PORT'],
               cfg['WATCHDOG_SSH_USER'] + '@' + cfg['WATCHDOG_SSH_HOST'], 'playora-monitor-heartbeat']
    try:
        result = runner(command, capture_output=True, text=True, timeout=15, check=False)
        if result.returncode:
            raise ValueError('Primary heartbeat connection failed')
        alerts += heartbeat(result.stdout, time.time())
    except (OSError, ValueError, subprocess.SubprocessError):
        alerts.append('independent_heartbeat_unavailable')
    return {'observed_at': datetime.now(timezone.utc).isoformat(), 'alerts': sorted(set(alerts)), 'probe_latency_ms': latency}


def main():
    cfg = configuration(os.environ['WATCHDOG_ENV'])
    project = cfg['DEPLOY_PROJECT']
    with state.locked(Path(cfg['WATCHDOG_STATE_DIRECTORY']), project) as root:
        snapshot = collect(cfg)
        state.write(root, project + '-watchdog.json', snapshot)
        notify(root, project, snapshot['alerts'], lambda event: deliver(cfg['ALERT_ENV_FILE'], event), time.time())
        print(json.dumps(snapshot, sort_keys=True))
        if snapshot['alerts']:
            raise RuntimeError('Independent watchdog alerts are firing')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError):
        raise SystemExit('Independent watchdog failed; inspect private configuration, host state and alert delivery') from None
