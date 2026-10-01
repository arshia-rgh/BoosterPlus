"""Bounded numeric aggregates from existing redacted API completion logs."""
from datetime import datetime, timezone
import json
import math
import os
import subprocess
import tempfile
import time

from manage import compose


METHODS = {'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'}


def aggregate(raw, at, window=300):
    if len(raw) > 16 << 20:
        raise ValueError('Request metric input limit exceeded')
    durations = []
    server_errors = client_errors = malformed = 0
    for line in raw.splitlines():
        try:
            row = json.loads(line)
            if row.get('msg') != 'request completed':
                continue
            stamp = datetime.fromisoformat(row['time'].replace('Z', '+00:00'))
            if stamp.tzinfo is None or not 0 <= at - stamp.timestamp() <= window:
                continue
            status, duration = row['status'], row['duration_ms']
            if type(status) is not int or not 100 <= status <= 599 or type(duration) not in (int, float) or not math.isfinite(duration) or not 0 <= duration <= 3600000 or row.get('method') not in METHODS:
                raise ValueError('Invalid numeric request sample')
            durations.append(duration)
            server_errors += status >= 500
            client_errors += 400 <= status < 500
        except (ValueError, KeyError, TypeError, AttributeError):
            malformed += 1
    durations.sort()
    count = len(durations)
    return {'window_seconds': window, 'requests': count, 'requests_per_second': round(count / window, 3),
            'server_errors': server_errors, 'client_errors': client_errors, 'malformed_lines': malformed,
            'p95_ms': durations[max(0, math.ceil(count * .95) - 1)] if count else None,
            'sampled': True, 'tail_limit': 40000}


def collect(manifest):
    # Bound disk and memory before reading subprocess output. A truncated tail is
    # labelled a sample, never presented as a full traffic counter.
    with tempfile.TemporaryFile() as output:
        process = subprocess.Popen(compose(manifest) + ['logs', '--no-color', '--no-log-prefix', '--since', '5m', '--tail', '40000', 'api'],
                                   env=dict(os.environ, **manifest), stdout=output, stderr=subprocess.DEVNULL)
        try:
            deadline = time.monotonic() + 20
            while process.poll() is None:
                if time.monotonic() > deadline or os.fstat(output.fileno()).st_size > 16 << 20:
                    raise RuntimeError('Request metric collection exceeded limits')
                time.sleep(.05)
            if process.returncode:
                raise RuntimeError('Request metric collection unavailable')
            output.seek(0)
            return aggregate(output.read((16 << 20) + 1), time.time())
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
