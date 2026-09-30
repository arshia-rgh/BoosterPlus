"""Forced SSH command: emit only fresh allowlisted primary monitor fields."""
from datetime import datetime, timezone
import json
import sys
import time

from artifacts import bounded
from watchdog import heartbeat


def main():
    if len(sys.argv) != 2:
        raise ValueError('Configure one fixed primary monitor path in the forced command')
    raw = bounded(sys.argv[1], 65536).decode()
    alerts = heartbeat(raw, time.time())
    # Preserve source time: fetching a stale file never becomes a fresh heartbeat.
    stamp = datetime.fromisoformat(json.loads(raw)['observed_at'].replace('Z', '+00:00')).astimezone(timezone.utc)
    print(json.dumps({'observed_at': stamp.isoformat(), 'alerts': alerts}, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError):
        raise SystemExit('Primary monitor heartbeat unavailable') from None
