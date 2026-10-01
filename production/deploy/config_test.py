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


def main(runtime=False):
    with tempfile.TemporaryDirectory(prefix="playora-configuration-") as name:
        directory = Path(name)
        manifest = {"DEPLOY_PROJECT":"boosterplus-config-fixture", "SITE_ADDRESS":"operator.test", "ACME_EMAIL":"fixture@operator.test",
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
        configs = directory / "config"
        configs.mkdir()
        (configs / "application.Caddyfile").write_text((ROOT / "gateway/Caddyfile").read_text())
        (configs / "Caddyfile").write_text((ROOT / "gateway/Caddyfile.mail").read_text())
        for filename in ("objects.Caddyfile", "tidb.toml", "tidb.small.toml", "tikv.small.toml"):
            (configs / filename).write_text((ROOT / "config" / filename).read_text())
        validators = (
            ("mail", manifest["GATEWAY_IMAGE"], ["caddy", "validate", "--config", "/etc/caddy/Caddyfile"], "object-gateway"),
            ("objects", manifest["GATEWAY_IMAGE"], ["caddy", "validate", "--config", "/etc/caddy/objects.Caddyfile"], "object-gateway"),
            ("tidb", model["services"]["tidb"]["image"], ["--config=/etc/caddy/tidb.toml", "--config-check", "--config-strict"], "tidb"),
            ("tidb-small", model["services"]["tidb"]["image"], ["--config=/etc/caddy/tidb.small.toml", "--config-check", "--config-strict"], "tidb"),
            ("tikv-small", model["services"]["tikv"]["image"], ["--config=/etc/caddy/tikv.small.toml", "--config-check"], "tikv"),
        )
        for config, image, arguments, cert in validators if runtime else ():
            run(["docker", "run", "--rm", "--network", "none", "--user", "0",
                 "--mount", "type=bind,src=" + str(configs) + ",dst=/etc/caddy,readonly",
                 "--mount", "type=bind,src=" + str(installation / "pki" / cert) + ",dst=/certs,readonly",
                 "-e", "SITE_ADDRESS=operator.test", "-e", "MAIL_HOST=mail.operator.test",
                 "-e", "ACME_EMAIL=fixture@operator.test", image, *arguments], environment)
            print(config + " configuration parsed by the pinned runtime")
        print("Merged self-hosted/mail policy and unsafe mutation checks passed; no services started")
        if not runtime:
            print("Runtime binary parsing is separate: make runtime-config-test (required in server/full gate)")


if __name__ == "__main__":
    main(runtime="--runtime" in sys.argv[1:])
