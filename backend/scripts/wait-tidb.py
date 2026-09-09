"""Wait only for the fixed local development port, with a bounded deadline."""
import socket
import time

for attempt in range(60):
    try:
        with socket.create_connection(("127.0.0.1", 14000), timeout=1):
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit("Local TiDB was not reachable after 60 seconds")
