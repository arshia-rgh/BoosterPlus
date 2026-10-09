"""Boot the real deployment images against disposable TLS-enabled local services."""
import http.cookiejar
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import socket
import ssl
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from contextlib import contextmanager

from manage import ROOT, load, run, validate
from smoke import NoRedirect, public_smoke, redirect_smoke


def write(path, data, mode=0o600):
    path.write_text(data)
    path.chmod(mode)


def envfile(path, values):
    write(path, "".join(key + "=" + str(value) + "\n" for key, value in values.items()))


def free_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def image_id(name):
    return subprocess.check_output(["docker", "image", "inspect", "--format", "{{.Id}}", name], text=True).strip()


def fixture_subnets(occupied):
    """Use disjoint explicit fixture networks, outside Docker's usual 172 pool.

    Automatic application/outbound allocation can otherwise consume the fixed
    edge subnet before Compose creates it. Never delete another project's network.
    Concurrent conflicting allocation still fails closed in Docker.
    """
    networks = [ipaddress.ip_network(value) for value in occupied if value]
    selected = []
    for candidate in ipaddress.ip_network("10.253.0.0/16").subnets(new_prefix=24):
        if any(candidate.overlaps(other) for other in networks if other.version == 4):
            continue
        selected.append(candidate)
        if len(selected) == 3:
            return selected
    raise ValueError("No free isolated qualification subnets; release test networks or configure Docker capacity")


def network_settings():
    identifiers = subprocess.check_output(["docker", "network", "ls", "--quiet"], text=True).split()
    models = json.loads(subprocess.check_output(["docker", "network", "inspect", *identifiers], text=True)) if identifiers else []
    occupied = [config.get("Subnet", "") for model in models for config in model.get("IPAM", {}).get("Config", []) or []]
    edge, application, outbound = fixture_subnets(occupied)
    return {
        "EDGE_SUBNET": str(edge),
        "EDGE_DYNAMIC_RANGE": str(list(edge.subnets(new_prefix=25))[1]),
        "GATEWAY_IP": str(edge.network_address + 2),
        "STAGING_APPLICATION_SUBNET": str(application),
        "STAGING_OUTBOUND_SUBNET": str(outbound),
    }


@contextmanager
def fixture_resolution():
    """Resolve only disposable portal names locally, preserving Host and TLS SNI.

    Do not depend on wildcard localhost DNS support or change system host files.
    The staging runner is single-threaded; restore the resolver on every exit.
    """
    original = socket.getaddrinfo
    def resolve(host, *args, **kwargs):
        if host in ("admin.localhost", "booster.localhost"):
            host = "127.0.0.1"
        return original(host, *args, **kwargs)
    socket.getaddrinfo = resolve
    try:
        yield
    finally:
        socket.getaddrinfo = original


def prepare(directory):
    certs = directory / "certs"
    certs.mkdir()
    commands = [
        ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.crt", "-days", "2", "-subj", "/CN=Booster Plus disposable test CA"],
        ["req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", "server.key", "-out", "server.csr", "-subj", "/CN=localhost"],
        ["x509", "-req", "-in", "server.csr", "-CA", "ca.crt", "-CAkey", "ca.key", "-CAcreateserial", "-out", "server.crt", "-days", "2", "-extfile", "extensions"],
    ]
    write(certs / "extensions", "subjectAltName=DNS:localhost,DNS:admin.localhost,DNS:booster.localhost,DNS:tidb,DNS:storage-tls,DNS:mailpit,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n")
    for args in commands:
        subprocess.run(["openssl", *args], cwd=certs, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # Disposable read-only bind mounts must work across host/container UIDs,
    # including an operator's private umask. The enclosing staging directory and
    # CA signing key remain private; none of these identities is used in production.
    certs.chmod(0o755)
    for name in ("ca.crt", "server.crt", "server.key"):
        (certs / name).chmod(0o444)
    (certs / "ca.key").chmod(0o600)
    auth, proxy, vault, database, storage = [secrets.token_hex(32) for _ in range(5)]
    https_port = free_port()
    manifest = {
        "DEPLOY_PROJECT": "boosterplus-stage-" + secrets.token_hex(5),
        "SITE_ADDRESS": "localhost", "ADMIN_SITE_ADDRESS": "admin.localhost", "BOOSTER_SITE_ADDRESS": "booster.localhost", "ACME_EMAIL": "staging@example.test",
        **network_settings(),
        "STAGING_DIRECTORY": str(directory), "STAGING_HTTP_PORT": str(free_port()), "STAGING_HTTPS_PORT": str(https_port),
        "STAGING_SIGNATURE_VOLUME": "boosterplus-qualification-signatures",
        **{key: image_id(name) for key, name in (("BACKEND_IMAGE", "boosterplus-backend:local"), ("STOREFRONT_IMAGE", "boosterplus-frontend:local"), ("ADMIN_IMAGE", "boosterplus-admin:local"), ("SCANNER_IMAGE", "boosterplus-scanner:local"), ("GATEWAY_IMAGE", "boosterplus-gateway:local"))},
    }
    for key, name in (("BACKEND_ENV_FILE", "backend.env"), ("FRONTEND_ENV_FILE", "frontend.env"), ("MIGRATION_ENV_FILE", "migration.env")):
        manifest[key] = str(directory / name)
    origins = {key: "https://" + host + ":" + str(https_port) for key, host in (("PUBLIC_ORIGIN", "localhost"), ("ADMIN_PUBLIC_ORIGIN", "admin.localhost"), ("BOOSTER_PUBLIC_ORIGIN", "booster.localhost"))}
    envfile(directory / "backend.env", {
        "APP_ENV": "staging", "AUTH_KEY": auth, "PROXY_SHARED_KEY": proxy,
        "DATABASE_DSN": f"boosterplus_runtime:{database}@tcp(tidb:4000)/boosterplus?tls=true",
        **origins, "TERMS_VERSION": "isolated-qualification-v1",
        "SMTP_HOST": "mailpit", "SMTP_PORT": "1025", "SMTP_FROM": "test@example.test", "SMTP_TLS": "required",
        "VAULT_ACTIVE_KEY": "v1", "VAULT_KEYS": "v1:" + vault,
        "MEDIA_S3_ENDPOINT": "https://storage-tls:8443", "MEDIA_S3_REGION": "us-east-1", "MEDIA_S3_BUCKET": "boosterplus-stage-private",
        "MEDIA_S3_ACCESS_KEY": "boosterplus-stage", "MEDIA_S3_SECRET_KEY": storage,
        "MEDIA_SCANNER_NETWORK": "unix", "MEDIA_SCANNER_ADDRESS": "/run/clamav/clamd.sock",
    })
    envfile(directory / "frontend.env", {"APP_ENV": "staging", **origins, "PROXY_SHARED_KEY": proxy, "TERMS_VERSION": "isolated-qualification-v1", "ACCOUNT_TERMS_TEXT": "Synthetic local qualification terms. No commercial service or public access."})
    envfile(directory / "migration.env", {"APP_ENV": "staging", "MIGRATION_DATABASE_DSN": f"boosterplus_migration:{database}@tcp(tidb:4000)/boosterplus?tls=true"})
    envfile(directory / "bootstrap.env", {"APP_ENV": "development", "DEV_ADMIN_DATABASE_DSN": "root@tcp(tidb:4000)/mysql?tls=true", "DEV_DATABASE_PASSWORD": database})
    envfile(directory / "storage.env", {"AWS_ACCESS_KEY_ID": "boosterplus-stage", "AWS_SECRET_ACCESS_KEY": storage, "S3_BUCKET": "boosterplus-stage-private"})
    write(directory / "tidb.toml", '[security]\nssl-ca="/certs/ca.crt"\nssl-cert="/certs/server.crt"\nssl-key="/certs/server.key"\n')
    gateway = (ROOT / "gateway/Caddyfile").read_text()
    for key, host in (("SITE_ADDRESS", "localhost"), ("ADMIN_SITE_ADDRESS", "admin.localhost"), ("BOOSTER_SITE_ADDRESS", "booster.localhost")):
        label = "{$" + key + "} {"
        gateway = gateway.replace(label, label + '\n\ttls /certs/server.crt /certs/server.key\n\theader X-Robots-Tag "noindex, nofollow"')
        gateway += f"\nhttp://{host}:8080 {{\n redir https://{host}:{https_port}{{uri}} 308\n}}\n"
    write(directory / "Caddyfile", gateway, 0o644)
    write(directory / "storage.Caddyfile", "{\n admin off\n persist_config off\n auto_https off\n}\nhttps://storage-tls:8443 {\n tls /certs/server.crt /certs/server.key\n reverse_proxy storage:8333\n}\n", 0o644)
    envfile(directory / "deployment.env", manifest)
    return load(directory / "deployment.env", staging=True)


def wait_call(function, timeout=120):
    deadline = time.monotonic() + timeout
    while True:
        try:
            return function()
        except (RuntimeError, OSError, urllib.error.URLError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)


def identity_smoke(manifest, origin, ca):
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)), urllib.request.HTTPCookieProcessor(jar))
    def call(path, body=None, csrf="", other_origin=None, portal=None):
        headers = {"Content-Type": "application/json", "Origin": other_origin or origin, "X-CSRF-Token": csrf}
        if portal is not None:
            headers["X-Playora-Portal"] = portal
        request = urllib.request.Request(origin + "/api/v1" + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
        with opener.open(request, timeout=15) as response:
            return json.loads(response.read())
    session = call("/auth/session")
    email = "gateway-" + secrets.token_hex(4) + "@example.test"
    challenge = call("/auth/email/request", {"purpose": "login", "email": email, "accept_terms": True}, session["csrf_token"])
    def message_code():
        script = "const r=await fetch('http://mailpit:8025/api/v1/search?query='+encodeURIComponent(" + json.dumps("to:" + email) + "));const v=await r.json();const id=v.messages?.[0]?.ID;if(!id)process.exit(1);const m=await (await fetch('http://mailpit:8025/api/v1/message/'+id)).json();process.stdout.write(m.Text.match(/\\b[0-9]{6}\\b/)?.[0]??'');"
        code = run(manifest, ["run", "--rm", "--no-deps", "--entrypoint", "node", "storefront", "--input-type=module", "-e", script], True, capture=True)
        if not re.fullmatch(r"[0-9]{6}", code):
            raise RuntimeError("Local TLS mail verification unavailable")
        return code
    code = wait_call(message_code)
    call("/auth/email/verify", {"challenge_id": challenge["challenge_id"], "code": code}, session["csrf_token"])
    session = call("/auth/session")
    if session.get("user", {}).get("email") != email or not all(cookie.secure for cookie in jar):
        raise RuntimeError("HTTPS identity/session cookie qualification failed")
    for path in ("/admin/orders", "/booster/fulfillment"):
        try:
            call(path)
            raise RuntimeError("Customer crossed a staff authorization boundary")
        except urllib.error.HTTPError as error:
            if error.code != 403:
                raise RuntimeError("Unexpected staff authorization response") from None
        try:
            call(path, portal="customer")
            raise RuntimeError("Explicit customer audience crossed a staff boundary")
        except urllib.error.HTTPError as error:
            if error.code != 403:
                raise RuntimeError("Unexpected audience conflict response") from None
    try:
        call("/me/profile", {"display_name": "forged"}, session["csrf_token"], "https://untrusted.example")
        raise RuntimeError("Foreign-origin mutation was accepted")
    except urllib.error.HTTPError as error:
        if error.code != 403:
            raise RuntimeError("Unexpected CSRF response") from None
    print("Real TLS email sign-in, secure cookies, role boundaries and CSRF passed")


def gateway_boundary_smoke(manifest, origin, ca):
    """Adversarial requests only against this disposable loopback deployment."""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                                        urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)))
    checks = [
        (urllib.request.Request("http://localhost:" + manifest["STAGING_HTTP_PORT"] + "/", headers={"Host": "foreign.invalid"}), 421),
        (urllib.request.Request(origin + "/", headers={"Host": "admin.localhost"}), 421),
    ]
    for portal in ("admin", "booster"):
        checks.extend((
            (urllib.request.Request(origin + "/" + portal, data=b"", method="POST"), 405),
            (urllib.request.Request(origin + "/" + portal + ".data"), 409),
            (urllib.request.Request(origin + "/api/v1/auth/portals/" + portal + "/session", headers={
                "X-Playora-Portal": portal,
                "X-Playora-Request-Origin": "https://" + portal + ".localhost:" + manifest["STAGING_HTTPS_PORT"],
                "X-Forwarded-Host": portal + ".localhost",
                "X-Booster-Proxy-Key": "forged",
            }), 403),
        ))
    for request, expected in checks:
        try:
            opener.open(request, timeout=15)
            raise RuntimeError("Gateway accepted a prohibited host/method/portal request")
        except urllib.error.HTTPError as error:
            if error.code != expected or error.headers.get("Location"):
                raise RuntimeError("Gateway boundary did not fail closed: expected " + str(expected) + ", got " + str(error.code)) from None
    print("Unknown hosts, TLS SNI mismatch, unsafe legacy methods/data and spoofed portal headers rejected")


def main():
    cache = ROOT / ".cache"
    cache.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="staging-", dir=cache) as temporary, fixture_resolution():
        manifest = prepare(Path(temporary))
        subprocess.run(["docker", "volume", "create", "--label", "boosterplus.purpose=qualification-signatures", manifest["STAGING_SIGNATURE_VOLUME"]], check=True, stdout=subprocess.DEVNULL)
        try:
            print("Validating isolated deployment configuration", flush=True)
            validate(manifest, True)
            run(manifest, ["up", "-d", "tidb", "storage", "storage-tls", "mailpit", "scanner"], True)
            wait_call(lambda: run(manifest, ["run", "--rm", "--no-deps", "bootstrap"], True))
            # API/worker never initialize SQL schema. The one-shot CLI is explicit.
            run(manifest, ["run", "--rm", "--no-deps", "migrate", "db", "migrate", "up"], True)
            run(manifest, ["run", "--rm", "--no-deps", "migrate", "db", "migrate", "verify"], True)
            check = ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "dependencies", "check"]
            wait_call(lambda: run(manifest, check, True), timeout=240)
            print("TLS data dependencies and explicit migrations passed; starting applications", flush=True)
            run(manifest, ["up", "-d", "--wait", "--wait-timeout", "120", "api", "worker", "storefront", "admin", "gateway"], True)
            origin = "https://localhost:" + manifest["STAGING_HTTPS_PORT"]
            portals = {"admin_origin": "https://admin.localhost:" + manifest["STAGING_HTTPS_PORT"], "booster_origin": "https://booster.localhost:" + manifest["STAGING_HTTPS_PORT"]}
            ca = str(Path(temporary) / "certs/ca.crt")
            for host in ("localhost", "admin.localhost", "booster.localhost"):
                redirect_smoke("http://" + host + ":" + manifest["STAGING_HTTP_PORT"], "https://" + host + ":" + manifest["STAGING_HTTPS_PORT"])
            public_smoke(origin, ca, **portals)
            gateway_boundary_smoke(manifest, origin, ca)
            identity_smoke(manifest, origin, ca)
            for dependency in ("scanner", "storage-tls"):
                run(manifest, ["stop", dependency], True)
                try:
                    run(manifest, check, True)
                    raise AssertionError("Unavailable data service did not fail dependency checks")
                except RuntimeError:
                    pass
                run(manifest, ["start", dependency], True)
                wait_call(lambda: run(manifest, check, True))
            run(manifest, ["stop", "tidb"], True)
            try:
                run(manifest, ["exec", "-T", "api", "/app/boosterplus", "healthcheck"], True)
                raise AssertionError("Database outage did not fail readiness")
            except RuntimeError:
                pass
            run(manifest, ["start", "tidb"], True)
            wait_call(lambda: run(manifest, ["exec", "-T", "api", "/app/boosterplus", "healthcheck"], True))
            public_smoke(origin, ca, **portals)
            # The API can recover before the worker's restart backoff elapses.
            # Prove the restarted worker delivers a new queued message before
            # separately asserting graceful termination of the recovered process.
            identity_smoke(manifest, origin, ca)
            run(manifest, ["stop", "--timeout", "20", "api", "worker"], True)
            for service in ("api", "worker"):
                container = run(manifest, ["ps", "-a", "-q", service], True, capture=True).strip()
                code = subprocess.check_output(["docker", "inspect", "--format", "{{.State.ExitCode}}", container], text=True).strip()
                if code != "0":
                    raise RuntimeError("Application did not shut down gracefully: " + service + " exit=" + code)
            print("Explicit migrations, TLS storage, Unix scanner, dependency outages/recovery and graceful shutdown passed")
        except Exception:
            # Runtime logs remain private; never emit configuration or secret values.
            try:
                write(cache / "staging-failure.log", run(manifest, ["logs", "--no-color", "--tail", "60"], True, capture=True))
            except RuntimeError:
                pass
            raise
        finally:
            run(manifest, ["down", "--volumes", "--remove-orphans", "--timeout", "20"], True)


if __name__ == "__main__":
    main()
