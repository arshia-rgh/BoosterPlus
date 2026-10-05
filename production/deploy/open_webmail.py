"""Open an isolated Chrome window over SSH, preserving normal HTTPS verification."""
from pathlib import Path
import socket
import subprocess
import tempfile
import time


def main():
    chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    if not chrome.is_file():
        raise SystemExit('This helper requires Google Chrome on macOS; see production/WEBMAIL.md for other clients.')
    # Refuse to attach to a possibly unrelated existing service/tunnel.
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 18443))
    tunnel = subprocess.Popen(['ssh', '-N', '-S', 'none', '-o', 'ExitOnForwardFailure=yes',
                               '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3',
                               '-L', '127.0.0.1:18443:127.0.0.1:18443', '-l', 'playora', 'playora'])
    browser = None
    try:
        for _ in range(100):
            if tunnel.poll() is not None:
                raise RuntimeError('SSH tunnel failed; check the playora alias and key access')
            try:
                with socket.create_connection(('127.0.0.1', 18443), timeout=0.2):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError('SSH tunnel did not become ready')
        with tempfile.TemporaryDirectory(prefix='playora-support-browser-') as profile:
            browser = subprocess.Popen([str(chrome), '--user-data-dir=' + profile,
                                        '--no-first-run', '--no-default-browser-check',
                                        '--host-resolver-rules=MAP mail.playoragames.com 127.0.0.1',
                                        '--new-window', 'https://mail.playoragames.com:18443'],
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print('Private support mail opened. Quit this separate Chrome window/process or press Ctrl-C here to close the tunnel.')
            try:
                browser.wait()
            finally:
                if browser.poll() is None:
                    browser.terminate()
                    browser.wait(timeout=15)
    finally:
        tunnel.terminate()
        tunnel.wait(timeout=15)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
