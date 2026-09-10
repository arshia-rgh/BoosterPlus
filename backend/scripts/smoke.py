"""Exercise the local stack without printing credentials, payloads, or private data."""
import json
import socket
from datetime import datetime, timezone
import subprocess
import time
import urllib.error
import urllib.request
import uuid

for attempt in range(60):
    try:
        with urllib.request.urlopen("http://127.0.0.1:8080/health/ready", timeout=3) as response:
            assert json.load(response) == {"status": "ok"}
        break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit("API readiness timed out")
job_id = subprocess.check_output(["docker", "compose", "exec", "-T", "api", "/app/boosterplus", "jobs", "enqueue-ping", "smoke-" + uuid.uuid4().hex], text=True).strip()
for attempt in range(30):
    logs = subprocess.check_output(["docker", "compose", "logs", "--since=1m", "worker"], text=True)
    if any(job_id in line and '"msg":"system job completed"' in line for line in logs.splitlines()):
        break
    time.sleep(1)
else:
    raise SystemExit("Worker did not process the smoke job")
with urllib.request.urlopen("http://127.0.0.1:8025/livez", timeout=3) as response:
    assert response.status == 200
for attempt in range(60):
    try:
        with urllib.request.urlopen("http://127.0.0.1:8333/boosterplus-private/", timeout=3):
            raise AssertionError("Private storage allowed anonymous listing")
    except urllib.error.HTTPError as error:
        assert error.code in (401, 403), error.code
        break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit("Storage did not become reachable")
deadline = time.monotonic() + 240
while time.monotonic() < deadline:
    try:
        with socket.create_connection(("127.0.0.1", 13310), timeout=3) as scanner:
            scanner.sendall(b"zVERSION\0")
            with scanner.makefile("rb") as stream:
                value = stream.read(512).rstrip(b"\0").decode("ascii").split("/")
        updated = datetime.strptime(value[2], "%a %b %d %H:%M:%S %Y").replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - updated).total_seconds()
        if len(value) == 3 and value[0].startswith("ClamAV ") and -3600 <= age <= 72 * 3600:
            break
    except (OSError, ValueError, IndexError):
        pass
    time.sleep(2)
else:
    raise SystemExit("Scanner readiness or signature freshness timed out")
print("Local API, worker, email catcher, private storage and fresh scanner passed")
