"""Offline private operator report; no server, public route or remote assets."""
from datetime import datetime, timezone
import html
import json
from pathlib import Path

from artifacts import bounded
from provision import private_write


def render(snapshot):
    # Only numeric allowlisted aggregates and alert codes are rendered. Never
    # embed arbitrary service logs or runtime configuration in a dashboard.
    codes = snapshot.get('alerts', [])
    observed = snapshot.get('observed_at', '')
    rows = []
    details = snapshot
    for group in ('values', 'requests'):
        for key, value in details.get(group, {}).items():
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                rows.append('<tr><td>' + html.escape(str(key)) + '</td><td>' + html.escape(str(value)) + '</td></tr>')
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PLAYORA operations</title><style>body{font:17px system-ui;background:#10231b;color:#ecfff4;max-width:60rem;margin:2rem auto;padding:1rem}td{padding:.6rem;border-bottom:1px solid #547665}table{width:100%;border-collapse:collapse}p{overflow-wrap:anywhere}a{color:#9eecc0}</style><h1>PLAYORA operations</h1><p>Private snapshot: ' + html.escape(str(observed)) + '</p><p>' + html.escape(', '.join(str(code) for code in codes) or 'No collected alerts') + '</p><table><caption>Collected numeric samples; missing signals are not healthy evidence</caption><thead><tr><th scope="col">Signal</th><th scope="col">Value</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table><p>HTTP values cover a bounded five-minute log tail. This is not load acceptance. Refresh by running monitor and generating a new report.</p></html>'


def write(manifest, destination):
    target = Path(destination)
    if not target.is_absolute() or not target.parent.is_dir():
        raise ValueError('Choose a new absolute private dashboard file')
    snapshot = json.loads(bounded(Path(manifest['DATA_DIRECTORY']) / 'operations' / (manifest['DEPLOY_PROJECT'] + '-monitor.json')))
    stamp = datetime.fromisoformat(snapshot['observed_at'].replace('Z', '+00:00'))
    if stamp.tzinfo is None or not 0 <= (datetime.now(timezone.utc) - stamp).total_seconds() <= 180:
        raise ValueError('Generate a fresh monitor snapshot before the dashboard')
    private_write(target, render(snapshot))
    print('Private offline dashboard written; no public port or remote asset enabled')
