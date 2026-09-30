"""Deployment-only commands. Never print resolved environment/Compose secrets."""
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import stat
import tempfile

ROOT = Path(__file__).resolve().parents[1]
IMAGE_KEYS = ("BACKEND_IMAGE", "STOREFRONT_IMAGE", "ADMIN_IMAGE", "SCANNER_IMAGE", "GATEWAY_IMAGE")
FILE_KEYS = ("BACKEND_ENV_FILE", "FRONTEND_ENV_FILE", "MIGRATION_ENV_FILE")


def read_env(path, private=True):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "r") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 65536:
            raise ValueError("Configuration must be a bounded regular file")
        if private and (info.st_mode & 0o077 or info.st_uid != os.getuid()):
            raise ValueError("Private configuration requires mode 0600 and operator ownership")
        content = stream.read(65537)
    if len(content) > 65536:
        raise ValueError("Configuration exceeded its size limit")
    values = {}
    for line in content.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key) or key in values or "\x00" in value:
            raise ValueError("Invalid or duplicate configuration entry")
        values[key] = value
    return values


def load(path, staging=False):
    manifest = read_env(path)
    if manifest.get("PITR_ENABLED", "false") not in ("true", "false"):
        raise ValueError("PITR_ENABLED must be true or false")
    mail_mode = manifest.get("MAIL_MODE", "external")
    if mail_mode not in ("external", "self-hosted"):
        raise ValueError("Unknown mail deployment mode")
    if mail_mode == "self-hosted":
        host = manifest.get("MAIL_HOST", "")
        if staging or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+", host) or host.endswith((".test", ".example", ".example.com")):
            raise ValueError("Self-hosted mail needs the real public mail hostname")
        if not re.fullmatch(r"[A-Za-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}", manifest.get("MAIL_POSTMASTER", "")):
            raise ValueError("Configure the owned postmaster mailbox")
        if manifest.get("DATA_TOPOLOGY") != "self-hosted-single":
            raise ValueError("The selected mail recipe requires the prepared self-hosted installation directory")
    topology = manifest.get("DATA_TOPOLOGY", "external")
    if topology not in ("external", "self-hosted-single"):
        raise ValueError("Unknown data topology")
    if topology == "self-hosted-single":
        directory = Path(manifest.get("DATA_DIRECTORY", ""))
        if staging or not directory.is_absolute() or directory.is_symlink() or not directory.is_dir():
            raise ValueError("Self-hosted data requires a private absolute production installation directory")
        if any((parent / "RESTORE_QUARANTINED").exists() for parent in (directory, *directory.parents)):
            raise ValueError("Restored data is quarantined; ordinary release/start commands cannot activate it")
        if directory.stat().st_mode & 0o077 or (directory / "PREPARED").read_text() != "playora-single-host-v1\n":
            raise ValueError("Complete data-prepare in a private installation directory first")
        for name in ("initialize.sql", "storage.json", "provisioned.env"):
            item = directory / "secrets" / name
            if item.is_symlink() or not item.is_file() or item.stat().st_mode & 0o077:
                raise ValueError("Self-hosted initialization material must remain private")
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
    if topology == "self-hosted-single":
        if "@tcp(tidb:4000)/playora?" not in backend.get("DATABASE_DSN", "") or "@tcp(tidb:4000)/playora?" not in migration.get("MIGRATION_DATABASE_DSN", "") or backend.get("MEDIA_S3_ENDPOINT") != "https://object-gateway:8443" or backend.get("MEDIA_S3_BUCKET") != "playora":
            raise ValueError("Self-hosted clients must use the private provisioned SQL and S3 endpoints")
    if mail_mode == "self-hosted" and (backend.get("SMTP_HOST") != manifest["MAIL_HOST"] or backend.get("SMTP_PORT") != "587" or not backend.get("SMTP_USERNAME") or not backend.get("SMTP_PASSWORD")):
        raise ValueError("Use the mail hostname and authenticated TLS submission on port587")
    if manifest.get("PITR_ENABLED") == "true":
        if staging:
            raise ValueError("Production PITR cannot be combined with staging")
        from pitr import validate as validate_pitr
        validate_pitr(manifest)
    return manifest


def compose(manifest, staging=False):
    args = ["docker", "compose", "--project-name", manifest["DEPLOY_PROJECT"], "-f", str(ROOT / "compose.production.yaml")]
    if manifest.get("DATA_TOPOLOGY") == "self-hosted-single":
        if staging:
            raise ValueError("Production data topology cannot be combined with the staging fixture")
        args += ["-f", str(ROOT / "compose.self-hosted.yaml")]
    if manifest.get("MAIL_MODE") == "self-hosted":
        if staging:
            raise ValueError("Self-hosted mail cannot join disposable staging")
        args += ["-f", str(ROOT / "compose.mail.yaml")]
    if manifest.get("PITR_ENABLED") == "true":
        args += ["-f", str(ROOT / "compose.pitr.yaml")]
    if staging:
        args += ["-f", str(ROOT / "compose.staging.yaml")]
    return args


def run(manifest, args, staging=False, capture=False):
    try:
        result = subprocess.run(compose(manifest, staging) + args, env=dict(os.environ, **manifest), text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=900, check=False)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Deployment command timed out; inspect service and operation receipts before retrying") from None
    if result.returncode:
        # Compose can echo environment values in errors. Keep its output private.
        diagnostic = ROOT / ".cache" / "command-failure.log"
        diagnostic.parent.mkdir(exist_ok=True)
        descriptor, temporary = tempfile.mkstemp(dir=diagnostic.parent, prefix=".failure-")
        with os.fdopen(descriptor, "w") as output:
            output.write(result.stderr + result.stdout)
        os.replace(temporary, diagnostic)
        raise RuntimeError("Deployment command failed; inspect the affected service privately")
    if capture:
        return result.stdout
    return None


def check_model(model, staging=False, self_hosted=False, self_mail=False, pitr=False):
    services = model["services"]
    for name, service in services.items():
        if name != "gateway" and not (self_mail and name == "mailserver") and service.get("ports"):
            raise ValueError("Only the HTTPS gateway may publish ports")
        if service.get("privileged") or service.get("network_mode") == "host":
            raise ValueError("Host networking and privileged services are prohibited")
        for mount in service.get("volumes", []):
            if "docker.sock" in mount.get("source", ""):
                raise ValueError("Docker socket mounts are prohibited")
        if name in ("api", "worker", "storefront", "admin", "migrate", "gateway"):
            if not service.get("read_only") or "ALL" not in service.get("cap_drop", []) or not service.get("mem_limit"):
                raise ValueError("Application hardening/resource limits are mandatory")
    allowed = {"api", "worker", "storefront", "admin", "migrate", "gateway", "scanner"}
    if self_mail:
        allowed.add("mailserver")
        mail = services.get("mailserver", {})
        if not model["networks"].get("mail-client", {}).get("internal") or set(mail.get("networks", {})) != {"mail-client", "outbound"}:
            raise ValueError("Mail submission must use its separate private network")
        if mail.get("environment", {}).get("PERMIT_DOCKER") != "none" or mail.get("environment", {}).get("SSL_TYPE") != "manual":
            raise ValueError("Mail requires authenticated submission and a verified host certificate")
        ports = {(str(p["published"]), int(p["target"]), p.get("host_ip", "")) for p in mail.get("ports", [])}
        if ports != {("25", 25, ""), ("993", 993, "127.0.0.1")}:
            raise ValueError("Only mail transfer25 and loopback IMAPS993 may be published")
        if "ALL" not in mail.get("cap_drop", []) or set(mail.get("cap_add", [])) - {"CHOWN", "DAC_OVERRIDE", "FOWNER", "SETGID", "SETUID", "NET_BIND_SERVICE", "KILL", "SYS_CHROOT"}:
            raise ValueError("Mail service capabilities exceed the reviewed exception")
    if self_hosted:
        allowed |= {"pd", "tikv", "tidb", "storage", "object-gateway"}
        if not all(model["networks"].get(name, {}).get("internal") for name in ("data-client", "data-cluster", "object-internal")):
            raise ValueError("Self-hosted data networks must be private")
        for name in ("pd", "tikv", "tidb", "storage", "object-gateway"):
            service = services.get(name, {})
            if not service.get("read_only") or service.get("user") != "1000:1000" or "ALL" not in service.get("cap_drop", []) or not service.get("mem_limit"):
                raise ValueError("Self-hosted data service hardening is mandatory")
        if "--store=tikv" not in services["tidb"].get("command", []):
            raise ValueError("Production TiDB must use real TiKV storage")
        if set(services["storage"]["networks"]) != {"object-internal"}:
            raise ValueError("Object administration endpoints must stay behind the private S3 gateway")
        tikv_networks = {"data-cluster", "backup-egress"} if pitr else {"data-cluster"}
        if set(services["pd"]["networks"]) != {"data-cluster"} or set(services["tikv"]["networks"]) != tikv_networks:
            raise ValueError("Database internals require a separate cluster network")
    if pitr:
        allowed.add("br")
        br = services.get("br", {})
        if not self_hosted or br.get("profiles") != ["tools"] or set(br.get("networks", {})) != {"data-cluster", "backup-egress"} or not br.get("read_only") or br.get("user") != "1000:1000" or "ALL" not in br.get("cap_drop", []):
            raise ValueError("PITR must use the hardened explicit backup job and cluster/egress networks")
    if not staging and set(services) - allowed:
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
    check_model(model, staging, manifest.get("DATA_TOPOLOGY") == "self-hosted-single", manifest.get("MAIL_MODE") == "self-hosted", manifest.get("PITR_ENABLED") == "true")
    run(manifest, ["run", "--rm", "--no-deps", "gateway", "caddy", "validate", "--config", "/etc/caddy/Caddyfile"], staging)


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "help"
    if action == "help":
        print("host-check data-prepare mail-prepare media-backup pitr-start pitr-status pitr-snapshot artifact-sign artifact-verify validate config-check preflight pull up status logs smoke migrate-status migrate-plan migrate-up release release-resume rollback rollback-resume backup-init backup backup-verify backup-recover restore-drill monitor monitor-notify monitor-status; staging-test and pre-commit use disposable resources. See production/OWNER_REQUIREMENTS.md and LAUNCH_EXECUTION.md for qualification boundaries.")
        return
    if action == "host-check":
        from host import inspect
        inspect(os.environ.get("DATA_DIRECTORY", "/srv/playora/installation"))
        return
    if action == "data-prepare":
        from provision import main as prepare
        prepare(os.environ.get("DATA_DIRECTORY", "/srv/playora/installation"))
        return
    if action in ("artifact-sign", "artifact-verify"):
        from artifacts import sign, verify
        directory = os.environ.get("RELEASE_DIRECTORY", "")
        if not Path(directory).is_absolute():
            raise ValueError("Set RELEASE_DIRECTORY to the absolute downloaded bundle path")
        if action == "artifact-sign":
            sign(directory, os.environ["SIGNING_KEY_FILE"], os.environ["SIGNING_PASSWORD_FILE"])
            print("Authenticated CI bundle signed; server qualification and launch approval remain separate")
        else:
            verify(directory, os.environ["RELEASE_TRUST_KEY"], os.environ["RELEASE_TRUST_KEY_SHA256"])
            print("Release signature, source metadata and SBOM hashes verified")
        return
    manifest = load(os.environ.get("DEPLOY_ENV", str(ROOT / ".env")))
    if action == "mail-prepare":
        if manifest.get("MAIL_MODE") != "self-hosted":
            raise ValueError("Select self-hosted mail before preparing its certificate directory")
        path = Path(manifest["DATA_DIRECTORY"]) / "data/gateway"
        for name in ("caddy", "certificates", "acme-v02.api.letsencrypt.org-directory", manifest["MAIL_HOST"]):
            path = path / name
            if path.is_symlink():
                raise ValueError("Mail certificate path must not follow a symlink")
            path.mkdir(mode=0o700, exist_ok=True)
            if not path.is_dir() or path.stat().st_uid != 1000:
                raise ValueError("Mail certificate directories require the gateway's UID1000 owner")
        print("Mail certificate directories prepared; mailbox, DNS and delivery qualification are still required")
        return
    if action in ("release", "release-resume", "rollback", "rollback-resume"):
        from release import execute
        execute(manifest, os.environ["RELEASE_DIRECTORY"], rollback=action.startswith("rollback"), resume=action.endswith("-resume"))
        return
    if manifest.get("DATA_TOPOLOGY") == "self-hosted-single":
        from release import current, images
        receipt = current(manifest)
        if receipt:
            manifest = images(manifest, receipt["release"])
        if action in ("up", "migrate-up"):
            raise ValueError("Use the signed release command to change a self-hosted installation")
    if action in ("backup", "backup-init", "backup-verify", "backup-recover", "restore-drill"):
        from backup import main as backup
        backup(action, manifest)
        return
    if action in ("monitor", "monitor-notify", "monitor-status"):
        from monitor import main as monitor
        monitor(manifest, action)
        return
    if action == "media-backup":
        from media_backup import main as media_backup
        media_backup(manifest)
        return
    if action in ("pitr-start", "pitr-status", "pitr-snapshot"):
        from pitr import main as pitr
        pitr(manifest, action)
        return
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
        raise ValueError("Unknown deployment operation; run help for the supported commands")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyError, subprocess.SubprocessError) as exc:
        print(str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "Deployment configuration or tool is unavailable", file=sys.stderr)
        raise SystemExit(1) from None
