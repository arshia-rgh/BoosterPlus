"""Exercise the independent production image with a read-only filesystem."""
import json
import subprocess
import time
import urllib.request

def smoke(image, path, excluded):
    container = subprocess.check_output([
        "docker", "run", "-d", "--rm", "--read-only", "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true", "--tmpfs", "/tmp:size=16m,noexec,nosuid",
        "-p", "127.0.0.1::3000", image
    ], text=True).strip()
    try:
        details = json.loads(subprocess.check_output(["docker", "inspect", container], text=True))[0]
        assert details["Config"]["User"] == "node", "frontend must not run as root"
        port = details["NetworkSettings"]["Ports"]["3000/tcp"][0]["HostPort"]
        for attempt in range(60):
            try:
                with urllib.request.urlopen("http://127.0.0.1:" + port + path, timeout=2) as response:
                    assert response.status == 200
                    assert "BOOSTER" in response.read().decode()
                break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError("Frontend container did not become ready")
        version = subprocess.check_output(["docker", "exec", container, "node", "--version"], text=True).strip()
        assert version == "v24.21.0", version
        absent = subprocess.check_output(["docker", "exec", container, "node", "--input-type=module", "-e", "import {existsSync} from 'node:fs'; process.stdout.write(String(existsSync(process.argv[1])))", "build/" + excluded], text=True)
        assert absent == "false", "Other application must not be included in image"
        print(image + ": Node LTS, isolated SSR build, non-root, read-only smoke passed")
    finally:
        subprocess.run(["docker", "stop", "--timeout", "10", container], check=True, stdout=subprocess.DEVNULL)

smoke("boosterplus-frontend:local", "/", "admin")
smoke("boosterplus-admin:local", "/admin", "storefront")
