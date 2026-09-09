"""Exercise the independent production image with a read-only filesystem."""
import json
import subprocess
import time
import urllib.request

container = subprocess.check_output([
    "docker", "run", "-d", "--rm", "--read-only", "--cap-drop=ALL",
    "--security-opt=no-new-privileges:true", "--tmpfs", "/tmp:size=16m,noexec,nosuid",
    "-p", "127.0.0.1::3000", "boosterplus-frontend:local"
], text=True).strip()
try:
    details = json.loads(subprocess.check_output(["docker", "inspect", container], text=True))[0]
    assert details["Config"]["User"] == "node", "frontend must not run as root"
    port = details["NetworkSettings"]["Ports"]["3000/tcp"][0]["HostPort"]
    for attempt in range(60):
        try:
            with urllib.request.urlopen("http://127.0.0.1:" + port, timeout=2) as response:
                assert response.status == 200
                assert "BOOSTER" in response.read().decode()
            break
        except OSError:
            time.sleep(1)
    else:
        raise RuntimeError("Frontend container did not become ready")
    version = subprocess.check_output(["docker", "exec", container, "node", "--version"], text=True).strip()
    assert version == "v24.21.0", version
    print("Frontend production container: Node LTS, SSR, non-root, read-only smoke passed")
finally:
    subprocess.run(["docker", "stop", "--timeout", "10", container], check=True, stdout=subprocess.DEVNULL)
