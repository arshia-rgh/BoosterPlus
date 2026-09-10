"""Wait for a MySQL greeting, not just Docker's forwarding socket, on the local port."""
import socket
import time


def greeting(connection, deadline):
    """Validate the bounded MySQL packet header and protocol version without credentials."""
    prefix = bytearray()
    while len(prefix) < 5:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return False
        connection.settimeout(min(1, remaining))
        chunk = connection.recv(5 - len(prefix))
        if not chunk:
            return False
        prefix.extend(chunk)
    length = int.from_bytes(prefix[:3], "little")
    return 1 <= length <= 4096 and prefix[3] == 0 and prefix[4] == 10


def wait():
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", 14000), timeout=1) as connection:
                if greeting(connection, deadline):
                    return
        except OSError:
            pass
        time.sleep(min(1, max(0, deadline - time.monotonic())))
    raise SystemExit("Local TiDB did not send a MySQL greeting within 60 seconds")


if __name__ == "__main__":
    wait()
