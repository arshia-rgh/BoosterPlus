"""Disposable real-TiKV/TLS/data-identity regression, never a production restore.

The compact fixture has explicitly reduced memory/disk limits. It qualifies
protocol/security behavior only, not production capacity, availability or RPO.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

from manage import ROOT, check_model, compose, read_env
from provision import prepare, private_write
from staging import envfile, prepare as app_fixture


def call(arguments, environment, input_text=None, must_succeed=True):
    result = subprocess.run(arguments, env=environment, input=input_text, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300, check=False)
    if must_succeed and result.returncode:
        # Output may contain generated fixture credentials; keep it private.
        log = ROOT / ".cache/self-hosted-failure.log"
        log.parent.mkdir(exist_ok=True)
        descriptor = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            stream.write(result.stdout + result.stderr)
        raise RuntimeError("Self-hosted fixture failed; inspect production/.cache/self-hosted-failure.log privately")
    return result


def wait(arguments, environment, seconds=180):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        result = call(arguments, environment, must_succeed=False)
        if result.returncode == 0:
            return result
        time.sleep(2)
    return call(arguments, environment)


def main():
    with tempfile.TemporaryDirectory(prefix="playora-tikv-qualification-") as name:
        directory = Path(name)
        manifest = app_fixture(directory)
        installation = prepare(directory / "installation")
        credentials = read_env(installation / "secrets/provisioned.env")
        backend = read_env(manifest["BACKEND_ENV_FILE"])
        backend.update({key: credentials[key] for key in ("DATABASE_DSN", "MEDIA_S3_ENDPOINT", "MEDIA_S3_BUCKET", "MEDIA_S3_ACCESS_KEY", "MEDIA_S3_SECRET_KEY")})
        envfile(Path(manifest["BACKEND_ENV_FILE"]), backend)
        envfile(Path(manifest["MIGRATION_ENV_FILE"]), {"APP_ENV": "staging", "MIGRATION_DATABASE_DSN": credentials["MIGRATION_DATABASE_DSN"]})
        manifest.update(DATA_TOPOLOGY="self-hosted-single", DATA_DIRECTORY=str(installation))
        environment = dict(os.environ, **manifest)
        model = json.loads(call(compose(manifest) + ["--profile", "tools", "config", "--format", "json"], environment).stdout)
        check_model(model, self_hosted=True)
        # Adapt only isolated fixture ownership and sizing; production policy was checked above.
        for service, memory in (("pd", 384 << 20), ("tikv", 1536 << 20), ("tidb", 2 << 30), ("storage", 384 << 20), ("object-gateway", 128 << 20)):
            model["services"][service].update(user="0:0", mem_limit=memory, cpus=1)
        tidb_config = directory / "tidb.toml"
        tidb_config.write_text((ROOT / "config/tidb.toml").read_text().replace("6442450944", "1073741824"))
        tikv_config = directory / "tikv.toml"
        tikv_config.write_text((ROOT / "config/tikv.toml").read_text().replace('"10GB"', '"64MB"'))
        for service, path in (("tidb", tidb_config), ("tikv", tikv_config)):
            for volume in model["services"][service]["volumes"]:
                if volume["target"] == "/config/" + service + ".toml":
                    volume["source"] = str(path)
        # A small test disk must not cause preallocation of hundreds of empty volumes.
        storage_command = model["services"]["storage"]["command"]
        storage_command[storage_command.index("-volume.max=0")] = "-volume.max=2"
        storage_command[storage_command.index("-volume.minFreeSpace=20")] = "-volume.minFreeSpace=1"
        model["volumes"]["scanner-data"] = {"external": True, "name": "boosterplus-qualification-signatures"}
        fixture = directory / "compose.json"
        private_write(fixture, json.dumps(model))
        command = ["docker", "compose", "--project-name", manifest["DEPLOY_PROJECT"], "-f", str(fixture)]
        try:
            call(command + ["up", "-d", "pd", "tikv", "tidb", "storage", "object-gateway", "scanner"], environment)
            migrations = command + ["run", "--rm", "--no-deps", "migrate", "db", "migrate"]
            wait(migrations + ["up"], environment)
            call(migrations + ["verify"], environment)
            call(command + ["exec", "-T", "storage", "weed", "shell", "-filer=localhost:8888"], environment,
                 input_text="s3.bucket.create -name playora\n")
            dependencies = command + ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "dependencies"]
            wait(dependencies + ["check"], environment, seconds=240)
            # A DML-only runtime account cannot become a migration account.
            forbidden_file = directory / "forbidden.env"
            envfile(forbidden_file, {"MIGRATION_DATABASE_DSN": credentials["DATABASE_DSN"]})
            forbidden = command + ["run", "--rm", "--no-deps", "--env-from-file", str(forbidden_file), "migrate", "db", "migrate", "up"]
            if call(forbidden, environment, must_succeed=False).returncode == 0:
                raise RuntimeError("Runtime identity unexpectedly accepted migration initialization")
            # Stop/restart retains real TiKV and object data, including migration checksums.
            call(command + ["stop", "tidb", "tikv", "pd", "storage"], environment)
            call(command + ["up", "-d", "pd", "tikv", "tidb", "storage"], environment)
            wait(migrations + ["verify"], environment)
            wait(dependencies + ["check"], environment)
            print("Real TiKV migration/history, verified TLS, private S3/scanner round trip and restart regression passed")
        finally:
            call(command + ["down", "--volumes", "--remove-orphans"], environment)


if __name__ == "__main__":
    main()
