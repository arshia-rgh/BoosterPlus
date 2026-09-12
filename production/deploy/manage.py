"""Deployment-only commands. Never print resolved environment/Compose secrets."""
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
IMAGE_KEYS = ("BACKEND_IMAGE", "STOREFRONT_IMAGE", "ADMIN_IMAGE", "SCANNER_IMAGE", "GATEWAY_IMAGE")
FILE_KEYS = ("BACKEND_ENV_FILE", "FRONTEND_ENV_FILE", "MIGRATION_ENV_FILE")


def read_env(path, private=True):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 65536:
        raise ValueError("Configuration must be a bounded regular file")
    if private and path.stat().st_mode & 0o077:
        raise ValueError("Private configuration requires mode 0600")
    values = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key) or key in values or "\x00" in value:
            raise ValueError("Invalid or duplicate configuration entry")
        values[key] = value
    return values


def load(path, staging=False):
    manifest = read_env(path)
    if not re.fullmatch(r"boosterplus-[a-z0-9-]{1,48}", manifest.get("DEPLOY_PROJECT", "")):
        raise ValueError("Set a distinct boosterplus deployment project")
    for key in IMAGE_KEYS:
        pattern = r"(?:[a-zA-Z0-9./:_-]+@sha256:|sha256:)[a-f0-9]{64}" if staging else r"[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}"
        if not re.fullmatch(pattern, manifest.get(key, "")):
            raise ValueError("Every deployment image requires an immutable digest")
    site = manifest.get("SITE_ADDRESS", "")
    if len(site) > 253 or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*", site) or (not staging and (site in ("localhost", "example.com") or site.endswith((".test", ".example", ".example.com")))):
        raise ValueError("Configure the actual DNS hostname")
    if not re.fullmatch(r"[A-Za-z0-9.!#$%&'+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", manifest.get("ACME_EMAIL", "")):
        raise ValueError("Configure a certificate contact email")
    if any(not Path(manifest.get(key, "")).is_absolute() for key in FILE_KEYS):
        raise ValueError("Runtime configuration paths must be absolute")
    subnet = ipaddress.ip_network(manifest.get("EDGE_SUBNET", ""))
    gateway = ipaddress.ip_address(manifest.get("GATEWAY_IP", ""))
    dynamic = ipaddress.ip_network(manifest.get("EDGE_DYNAMIC_RANGE", ""))
    if subnet.version != 4 or not subnet.is_private or subnet.prefixlen != 24 or dynamic.version != 4 or not dynamic.subnet_of(subnet) or dynamic.prefixlen != 25 or gateway in dynamic or gateway not in subnet or gateway in (subnet.network_address, subnet.broadcast_address):
        raise ValueError("Use a private, narrow edge subnet and explicit gateway address")
    configs = [read_env(manifest.get(key, "")) for key in FILE_KEYS]
    backend, frontend, migration = configs
    expected = "staging" if staging else "production"
    if any(config.get("APP_ENV") != expected for config in configs):
        raise ValueError("All runtime files must match the deployment environment")
    if frontend.get("PROXY_SHARED_KEY") != backend.get("PROXY_SHARED_KEY") or not re.fullmatch(r"[a-f0-9]{64}", backend.get("PROXY_SHARED_KEY", "")):
        raise ValueError("Configure matching private proxy keys")
    if not frontend.get("ACCOUNT_TERMS_TEXT", "").strip() or not backend.get("TERMS_VERSION") or backend["TERMS_VERSION"].startswith("development-") or frontend.get("TERMS_VERSION") != backend["TERMS_VERSION"]:
        raise ValueError("Configure matching approved terms and frontend text")
    if backend.get("PUBLIC_ORIGIN") != "https://" + site + (":" + manifest["STAGING_HTTPS_PORT"] if staging else ""):
        raise ValueError("Public origin must match the HTTPS gateway")
    if backend.get("ALLOWED_ORIGINS") or backend.get("SMTP_TLS") != "required" or not backend.get("MEDIA_S3_ENDPOINT", "").startswith("https://") or backend.get("MEDIA_SCANNER_NETWORK") != "unix":
        raise ValueError("Public deployments require exact origins, TLS dependencies and a private scanner socket")
    if any("tls=true" not in cfg.get(key, "") for cfg, key in ((backend, "DATABASE_DSN"), (migration, "MIGRATION_DATABASE_DSN"))):
        raise ValueError("Both database accounts require verified TLS")
    if "MIGRATION_DATABASE_DSN" in backend or "DATABASE_DSN" in migration or any(key in frontend for key in ("AUTH_KEY", "VAULT_KEYS", "DATABASE_DSN", "MEDIA_S3_SECRET_KEY", "NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET", "NOWPAYMENTS_EMAIL", "NOWPAYMENTS_PASSWORD")):
        raise ValueError("Runtime, frontend and migration credentials must remain separate")
    return manifest


def compose(manifest, staging=False):
    args = ["docker", "compose", "--project-name", manifest["DEPLOY_PROJECT"], "-f", str(ROOT / "compose.production.yaml")]
    if staging:
        args += ["-f", str(ROOT / "compose.staging.yaml")]
    return args


def run(manifest, args, staging=False, capture=False):
    result = subprocess.run(compose(manifest, staging) + args, env=dict(os.environ, **manifest), text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        # Compose can echo environment values in errors. Keep its output private.
        diagnostic = ROOT / ".cache" / "command-failure.log"
        diagnostic.parent.mkdir(exist_ok=True)
        descriptor = os.open(diagnostic, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w") as output:
            output.write(result.stderr + result.stdout)
        raise RuntimeError("Deployment command failed; inspect the affected service privately")
    if capture:
        return result.stdout
    return None


def check_model(model, staging=False):
    services = model["services"]
    for name, service in services.items():
        if name != "gateway" and service.get("ports"):
            raise ValueError("Only the HTTPS gateway may publish ports")
        if service.get("privileged") or service.get("network_mode") == "host":
            raise ValueError("Host networking and privileged services are prohibited")
        for mount in service.get("volumes", []):
            if "docker.sock" in mount.get("source", ""):
                raise ValueError("Docker socket mounts are prohibited")
        if name in ("api", "worker", "storefront", "admin", "migrate", "gateway"):
            if not service.get("read_only") or "ALL" not in service.get("cap_drop", []) or not service.get("mem_limit"):
                raise ValueError("Application hardening/resource limits are mandatory")
    if not staging and set(services) - {"api", "worker", "storefront", "admin", "migrate", "gateway", "scanner"}:
        raise ValueError("Test data services cannot enter the production stack")
    if not model["networks"]["edge"].get("internal") or not model["networks"]["application"].get("internal"):
        raise ValueError("Application/edge networks must be private")
    if "application" in services["gateway"]["networks"]:
        raise ValueError("Gateway must reach the API through the trusted storefront proxy")
    if "profiles" not in services.get("migrate", {}):
        raise ValueError("Migrations must remain an explicit one-shot operation")
    for port in services["gateway"].get("ports", []):
        if staging and port.get("host_ip") != "127.0.0.1":
            raise ValueError("Staging listeners must be loopback-only")
        if not staging and str(port["published"]) not in ("80", "443"):
            raise ValueError("Production gateway exposes only 80/443")


def validate(manifest, staging=False):
    model = json.loads(run(manifest, ["--profile", "tools", "config", "--format", "json"], staging, capture=True))
    check_model(model, staging)
    run(manifest, ["run", "--rm", "--no-deps", "gateway", "caddy", "validate", "--config", "/etc/caddy/Caddyfile"], staging)


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "help"
    if action == "help":
        print("validate config-check preflight pull up status logs smoke migrate-status migrate-plan migrate-up; staging-test and pre-commit use disposable resources. Release/backup automation is R10.")
        return
    manifest = load(os.environ.get("DEPLOY_ENV", str(ROOT / ".env")))
    if action in ("validate", "config-check", "preflight"):
        validate(manifest)
        if action == "preflight":
            run(manifest, ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "config", "validate"])
            run(manifest, ["run", "--rm", "--no-deps", "migrate", "db", "migrate", "validate"])
        print("Deployment configuration checks passed")
    elif action in ("migrate-status", "migrate-plan", "migrate-up"):
        validate(manifest)
        output = run(manifest, ["run", "--rm", "--no-deps", "migrate", "db", "migrate", action.removeprefix("migrate-")], capture=True)
        print(output, end="")
    elif action in ("pull", "up", "status", "logs"):
        validate(manifest)
        args = {"pull": ["--profile", "tools", "pull"], "up": ["up", "-d", "--wait", "--wait-timeout", "180"], "status": ["ps"], "logs": ["logs", "--tail", "100"]}[action]
        output = run(manifest, args, capture=True)
        if action in ("status", "logs"):
            print(output, end="")
    elif action == "smoke":
        from smoke import public_smoke, redirect_smoke
        redirect_smoke("http://" + manifest["SITE_ADDRESS"], "https://" + manifest["SITE_ADDRESS"])
        public_smoke("https://" + manifest["SITE_ADDRESS"])
    else:
        raise ValueError("Release/rollback/backup/restore automation is reserved for R10; no operation was performed")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyError) as exc:
        print(str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "Deployment configuration or tool is unavailable", file=sys.stderr)
        raise SystemExit(1) from None
