"""Render real Compose/Caddy/TiDB inputs without starting services or sending mail."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from manage import ROOT, IMAGE_KEYS, check_model, compose
from provision import prepare
from staging import envfile, image_id


def run(args, env):
    result = subprocess.run(args, env=env, capture_output=True, text=True, timeout=60, check=False)
    if result.returncode:
        raise RuntimeError("Configuration fixture validation failed (raw output withheld)")
    return result.stdout


def webmail_validation_files(directory):
    """Expose only repository PHP/FPM inputs to the non-root syntax validator.

    Runner umasks and checkout directory modes must not affect bind-mount reads.
    The enclosing temporary directory stays private; no runtime secrets are copied.
    """
    target = directory / "webmail-validation"
    target.mkdir(mode=0o700)
    for filename in ("config.inc.php", "playora_support/playora_support.php", "fpm.conf"):
        destination = target / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes((ROOT / "webmail" / filename).read_bytes())
        destination.chmod(0o444)
    (target / "playora_support").chmod(0o755)
    target.chmod(0o755)
    return target


def main(runtime=False):
    with tempfile.TemporaryDirectory(prefix="playora-configuration-") as name:
        directory = Path(name)
        manifest = {"DEPLOY_PROJECT":"boosterplus-config-fixture", "SITE_ADDRESS":"operator.test", "ADMIN_SITE_ADDRESS":"admin.operator.test", "BOOSTER_SITE_ADDRESS":"booster.operator.test", "ACME_EMAIL":"fixture@operator.test",
                    "EDGE_SUBNET":"172.29.194.0/24", "EDGE_DYNAMIC_RANGE":"172.29.194.128/25", "GATEWAY_IP":"172.29.194.2",
                    **{key:"registry.invalid/config-fixture@sha256:" + "a" * 64 for key in IMAGE_KEYS}}
        for key, name in (("BACKEND_ENV_FILE","backend"), ("FRONTEND_ENV_FILE","frontend"), ("MIGRATION_ENV_FILE","migration")):
            path = directory / (name + ".env")
            envfile(path, {"APP_ENV":"staging"})
            manifest[key] = str(path)
        if runtime:
            manifest["GATEWAY_IMAGE"] = image_id("boosterplus-gateway:local")
        installation = prepare(directory / "installation")
        manifest.update(DATA_TOPOLOGY="self-hosted-single", DATA_DIRECTORY=str(installation),
                        MAIL_MODE="self-hosted", MAIL_HOST="mail.operator.test", MAIL_POSTMASTER="postmaster@operator.test")
        environment = dict(os.environ, **manifest)
        model = json.loads(run(compose(manifest) + ["--profile", "tools", "config", "--format", "json"], environment))
        check_model(model, self_hosted=True, self_mail=True)
        for mutation in (
            lambda m:m["services"]["tidb"].update(command=["--store=unistore"]),
            lambda m:m["services"]["tidb"]["command"].remove("--path=pd:2379"),
            lambda m:m["services"]["tidb"]["command"].remove("--advertise-address=tidb"),
            lambda m:m["services"]["storage"].update(networks={"data-client": {}}),
            lambda m:m["services"]["tikv"].update(user="0:0"),
            lambda m:m["services"]["mailserver"]["environment"].update(PERMIT_DOCKER="connected-networks"),
            lambda m:m["services"]["mailserver"]["ports"].append({"published":"587", "target":587}),
            lambda m:m["services"]["mailserver"].update(cap_add=["NET_ADMIN"]),
            lambda m:m["services"]["mailserver"]["ports"][1].update(host_ip="0.0.0.0"),
        ):
            changed = copy.deepcopy(model)
            mutation(changed)
            try:
                check_model(changed, self_hosted=True, self_mail=True)
            except ValueError:
                pass
            else:
                raise RuntimeError("Unsafe data/mail boundary mutation was accepted")
        from provision import private_write
        private_write(directory / "pitr.env", "AWS_ACCESS_KEY_ID=fixture\nAWS_SECRET_ACCESS_KEY=fixture\n")
        (directory / "master.key").write_bytes(b"b" * 64 + b"\n")
        (directory / "master.key").chmod(0o600)
        private_write(directory / "snapshot.key", "a" * 64)
        pitr = dict(manifest, PITR_ENABLED="true", PITR_ENV_FILE=str(directory / "pitr.env"),
                    BR_MASTER_KEY_FILE=str(directory / "master.key"), BR_SNAPSHOT_KEY_FILE=str(directory / "snapshot.key"))
        backup_model = json.loads(run(compose(pitr) + ["--profile", "tools", "config", "--format", "json"], dict(environment, **pitr)))
        check_model(backup_model, self_hosted=True, self_mail=True, pitr=True)
        from capacity import SMALL, GIB, check_model as check_capacity, memory_limit
        small = dict(pitr, HOST_PROFILE=SMALL)
        small_model = json.loads(run(compose(small) + ["--profile", "tools", "config", "--format", "json"], dict(environment, **small)))
        check_model(small_model, self_hosted=True, self_mail=True, pitr=True)
        check_capacity(small_model, SMALL)
        if sum(memory_limit(s) for s in small_model["services"].values()) != 107 * GIB // 8:
            raise RuntimeError("Small-host peak budget changed; review host headroom before accepting")
        external = dict(small, MAIL_MODE="external")
        external_model = json.loads(run(compose(external) + ["--profile", "tools", "config", "--format", "json"], dict(environment, **external)))
        check_model(external_model, self_hosted=True, pitr=True)
        check_capacity(external_model, SMALL)
        if "mailserver" in external_model["services"]:
            raise RuntimeError("External mail must not create an incomplete self-hosted mail service")
        web = dict(small, WEBMAIL_ENABLED='true')
        web_model = json.loads(run(compose(web) + ['--profile', 'tools', 'config', '--format', 'json'], dict(environment, **web)))
        check_model(web_model, self_hosted=True, self_mail=True, pitr=True, webmail=True)
        check_capacity(web_model, SMALL)
        if sum(memory_limit(s) for s in web_model['services'].values()) != 27 * GIB // 2:
            raise RuntimeError('Optional webmail exceeds its reviewed128MiB addition')
        for mutation in (
            lambda m:m['services']['webmail'].update(user='0:0'),
            lambda m:m['services']['webmail'].update(ports=[{'published':'9000','target':9000}]),
            lambda m:m['services']['webmail'].update(networks={'outbound': {}}),
            lambda m:m['services']['gateway']['ports'][-1].update(host_ip='0.0.0.0'),
            lambda m:m['networks']['webmail-edge'].update(internal=False),
        ):
            changed = copy.deepcopy(web_model)
            mutation(changed)
            try:
                check_model(changed, self_hosted=True, self_mail=True, pitr=True, webmail=True)
            except ValueError:
                pass
            else:
                raise RuntimeError('Unsafe webmail boundary mutation was accepted')
        for mutation in (
            lambda m:m["services"]["tikv"].update(mem_limit=16 * GIB),
            lambda m:m["services"]["scanner"].pop("mem_limit"),
            lambda m:m["services"].pop("worker"),
            lambda m:m["services"]["tidb"].update(volumes=[]),
        ):
            changed = copy.deepcopy(small_model)
            mutation(changed)
            try:
                check_capacity(changed, SMALL)
            except ValueError:
                pass
            else:
                raise RuntimeError("Unsafe small-host budget/configuration mutation was accepted")
        for mutation in (lambda m:m["services"]["br"].update(read_only=False),
                         lambda m:m["services"]["br"].update(profiles=[]),
                         lambda m:m["services"]["pd"].update(networks={"data-cluster": {}, "backup-egress": {}})):
            changed = copy.deepcopy(backup_model)
            mutation(changed)
            try:
                check_model(changed, self_hosted=True, self_mail=True, pitr=True)
            except ValueError:
                pass
            else:
                raise RuntimeError("Unsafe backup-service mutation was accepted")
        bootstrap = json.loads(run(["docker", "compose", "-f", str(ROOT / "compose.bootstrap.yaml"),
                                    "config", "--format", "json"], environment))
        if set(bootstrap["services"]) != {"gateway"} or set(bootstrap["networks"]) != {"bootstrap-egress"}:
            raise RuntimeError("TLS bootstrap must be isolated from application/data services")
        gateway = bootstrap["services"]["gateway"]
        if (gateway["image"] != manifest["GATEWAY_IMAGE"] or gateway.get("user") != "1000:1000"
                or not gateway.get("read_only") or gateway.get("cap_drop") != ["ALL"]
                or gateway.get("cap_add") or gateway.get("privileged")
                or set(gateway.get("networks", {})) != {"bootstrap-egress"}
                or {(str(p["published"]), p["target"]) for p in gateway["ports"]} != {("80", 8080), ("443", 8443)}):
            raise RuntimeError("Unsafe TLS bootstrap exposure or privileges")
        configs = directory / "config"
        configs.mkdir()
        (configs / "application.Caddyfile").write_text((ROOT / "gateway/Caddyfile").read_text())
        (configs / "bootstrap.Caddyfile").write_text((ROOT / "gateway/Caddyfile.bootstrap").read_text())
        (configs / "Caddyfile").write_text((ROOT / "gateway/Caddyfile.mail").read_text())
        for source, target in (("Caddyfile.mail", "mail.Caddyfile"),
                               ("Caddyfile.webmail", "webmail.Caddyfile"),
                               ("Caddyfile.mail-webmail", "webmail-main.Caddyfile")):
            (configs / target).write_text((ROOT / "gateway" / source).read_text())
        for filename in ("objects.Caddyfile", "tidb.toml", "tidb.small.toml", "tikv.small.toml"):
            (configs / filename).write_text((ROOT / "config" / filename).read_text())
        validators = (
            ("bootstrap", manifest["GATEWAY_IMAGE"], ["caddy", "validate", "--config", "/etc/caddy/bootstrap.Caddyfile", "--adapter", "caddyfile"], "object-gateway"),
            ("mail", manifest["GATEWAY_IMAGE"], ["caddy", "validate", "--config", "/etc/caddy/Caddyfile"], "object-gateway"),
            ("webmail", manifest["GATEWAY_IMAGE"], ["caddy", "validate", "--config", "/etc/caddy/webmail-main.Caddyfile", "--adapter", "caddyfile"], "object-gateway"),
            ("objects", manifest["GATEWAY_IMAGE"], ["caddy", "validate", "--config", "/etc/caddy/objects.Caddyfile"], "object-gateway"),
            ("tidb", model["services"]["tidb"]["image"], ["--config=/etc/caddy/tidb.toml", "--config-check", "--config-strict"], "tidb"),
            ("tidb-small", model["services"]["tidb"]["image"], ["--config=/etc/caddy/tidb.small.toml", "--config-check", "--config-strict"], "tidb"),
            ("tikv-small", model["services"]["tikv"]["image"], ["--config=/etc/caddy/tikv.small.toml", "--config-check"], "tikv"),
        )
        for config, image, arguments, cert in validators if runtime else ():
            run(["docker", "run", "--rm", "--network", "none", "--user", "0",
                 "--mount", "type=bind,src=" + str(configs) + ",dst=/etc/caddy,readonly",
                 "--mount", "type=bind,src=" + str(installation / "pki" / cert) + ",dst=/certs,readonly",
                 "-e", "SITE_ADDRESS=operator.test", "-e", "ADMIN_SITE_ADDRESS=admin.operator.test", "-e", "BOOSTER_SITE_ADDRESS=booster.operator.test", "-e", "MAIL_HOST=mail.operator.test",
                 "-e", "ACME_EMAIL=fixture@operator.test", image, *arguments], environment)
            if config == "bootstrap":
                adapted = json.loads(run(["docker", "run", "--rm", "--network", "none",
                    "--mount", "type=bind,src=" + str(configs) + ",dst=/etc/caddy,readonly",
                    "-e", "SITE_ADDRESS=operator.test", "-e", "ADMIN_SITE_ADDRESS=admin.operator.test", "-e", "BOOSTER_SITE_ADDRESS=booster.operator.test", "-e", "MAIL_HOST=mail.operator.test",
                    "-e", "ACME_EMAIL=fixture@operator.test", image, "caddy", "adapt",
                    "--config", "/etc/caddy/bootstrap.Caddyfile", "--adapter", "caddyfile"], environment))
                handlers, responses = [], []
                def inspect(value):
                    if isinstance(value, dict):
                        if "handler" in value:
                            handlers.append(value["handler"])
                        if value.get("handler") == "static_response":
                            responses.append(str(value.get("status_code")))
                        for child in value.values():
                            inspect(child)
                    elif isinstance(value, list):
                        for child in value:
                            inspect(child)
                inspect(adapted)
                if set(handlers) - {"headers", "static_response", "subroute"} or sorted(responses) != ["200", "404", "503"]:
                    raise RuntimeError("TLS bootstrap must not serve files, proxy the app or report it ready")
            print(config + " configuration parsed by the pinned runtime")
        if runtime:
            from webmail import IMAGE
            checked = webmail_validation_files(directory)
            base = ["docker", "run", "--rm", "--network", "none", "--read-only", "--user=82:82",
                    "--cap-drop=ALL", "--security-opt=no-new-privileges:true", "--memory=128m",
                    "--mount", "type=bind,src=" + str(checked) + ",dst=/checked,readonly"]
            for filename in ("config.inc.php", "playora_support/playora_support.php"):
                run(base + ["--entrypoint", "php", IMAGE, "-l", "/checked/" + filename], environment)
            run(base + ["--mount", "type=bind,src=" + str(checked / "fpm.conf") +
                        ",dst=/usr/local/etc/php-fpm.d/zzzz-playora.conf,readonly",
                        "--entrypoint", "php-fpm", IMAGE, "--test"], environment)
            print("Webmail PHP/plugin syntax and FPM configuration parsed by the pinned runtime")
        print("Merged self-hosted/mail policy and unsafe mutation checks passed; no services started")
        if not runtime:
            print("Runtime binary parsing is separate: make runtime-config-test (required in server/full gate)")


if __name__ == "__main__":
    main(runtime="--runtime" in sys.argv[1:])
