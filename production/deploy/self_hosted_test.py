"""Disposable real-TiKV/TLS/data-identity regression, never a production restore.

The compact fixture has explicitly reduced memory/disk limits. It qualifies
protocol/security behavior only, not production capacity, availability or RPO.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import secrets

from manage import ROOT, check_model, compose, read_env
from provision import prepare, private_write
from staging import envfile, prepare as app_fixture

BUSINESS_TEST_TIMEOUT_MINUTES = 360
TEST_PROCESS_GRACE_SECONDS = 300
BUSINESS_TEST_OUTER_TIMEOUT_SECONDS = BUSINESS_TEST_TIMEOUT_MINUTES * 60 + TEST_PROCESS_GRACE_SECONDS


def call(arguments, environment, input_text=None, must_succeed=True, timeout=300, cwd=None):
    result = subprocess.run(arguments, env=environment, input=input_text, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, cwd=cwd, check=False)
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


def host_test_access(model):
    """Publish only loopback fixture endpoints, including on Docker 29.

    Docker does not publish ports for containers attached exclusively to
    internal networks. This bridge is ONLY for synthetic qualification data;
    production configuration is validated before fixture adaptations and keeps
    its internal networks. No production/provider credentials enter this model.
    """
    endpoints = {"tidb": (4000, "14001"), "scanner": (3310, "13310"),
                 "integration-storage": (8333, "8333")}
    if "qualification-access" in model["networks"]:
        raise ValueError("Qualification access network must be created by the fixture")
    for name, (target, published) in endpoints.items():
        expected = [{"target": target, "published": published, "host_ip": "127.0.0.1"}]
        if model["services"][name].get("ports") != expected:
            raise ValueError("Qualification endpoints must bind only the documented loopback ports")
    model["networks"]["qualification-access"] = {"internal": False}
    for name in endpoints:
        model["services"][name]["networks"]["qualification-access"] = {}


def run_integration(arguments, environment, project):
    """Retain private per-scenario evidence on success, failure or timeout."""
    evidence = ROOT / ".cache" / (project + "-integration.log")
    evidence.parent.mkdir(exist_ok=True)
    descriptor = os.open(evidence, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    print("Running real-TiKV business checks; private per-scenario evidence: " + evidence.name, flush=True)
    with os.fdopen(descriptor, "w") as output:
        result = subprocess.run(arguments, env=environment, cwd=ROOT.parent / "backend",
                                stdout=output, stderr=subprocess.STDOUT,
                                timeout=BUSINESS_TEST_OUTER_TIMEOUT_SECONDS, check=False)
    if result.returncode:
        raise RuntimeError("Real-TiKV business checks failed; inspect the private per-scenario evidence")


def fixture_cpu_limit(service, available):
    """Hosted private-repository runners can have fewer CPUs than the VPS."""
    return min({"tidb": 2, "tikv": 3}.get(service, 1), max(1, available or 1))


def integration_arguments(*, protocol_only=False):
    minutes = 5 if protocol_only else BUSINESS_TEST_TIMEOUT_MINUTES
    arguments = ["go", "test", "-race", "-count=1", f"-timeout={minutes}m", "-v", "-failfast", "-tags=integration"]
    if protocol_only:
        arguments += ["-run", "^TestPrivateMediaRealStorageScannerAndAudience$"]
    return arguments + ["./internal/integration/..."]


def main(*, protocol_only=False):
    with tempfile.TemporaryDirectory(prefix="playora-tikv-qualification-") as name:
        directory = Path(name)
        manifest = app_fixture(directory)
        call(["docker", "volume", "create", "--label", "boosterplus.purpose=qualification-signatures",
              manifest["STAGING_SIGNATURE_VOLUME"]], dict(os.environ))
        installation = prepare(directory / "installation", qualification=True)
        credentials = read_env(installation / "secrets/provisioned.env")
        backend = read_env(manifest["BACKEND_ENV_FILE"])
        backend.update({key: credentials[key] for key in ("DATABASE_DSN", "MEDIA_S3_ENDPOINT", "MEDIA_S3_BUCKET", "MEDIA_S3_ACCESS_KEY", "MEDIA_S3_SECRET_KEY")})
        envfile(Path(manifest["BACKEND_ENV_FILE"]), backend)
        envfile(Path(manifest["MIGRATION_ENV_FILE"]), {"APP_ENV": "staging", "MIGRATION_DATABASE_DSN": credentials["MIGRATION_DATABASE_DSN"]})
        manifest.update(DATA_TOPOLOGY="self-hosted-single", DATA_DIRECTORY=str(installation))
        environment = dict(os.environ, **manifest)
        model = json.loads(call(compose(manifest) + ["--profile", "tools", "config", "--format", "json"], environment).stdout)
        check_model(model, self_hosted=True)
        # The generated private files belong to the invoking non-root operator.
        # UID 0 with all capabilities dropped cannot read another UID's 0700
        # directories, and upstream storage initialization must not run as root.
        # CI may use UID 1001; deployment uses the production UID 1000.
        if os.getuid() == 0:
            raise ValueError("Run isolated data qualification as a non-root operator")
        fixture_user = f"{os.getuid()}:{os.getgid()}"
        for service, memory in (("pd", 384 << 20), ("tikv", 4 << 30), ("tidb", 2 << 30), ("storage", 384 << 20), ("object-gateway", 128 << 20)):
            # Match the selected small-host SQL/KV CPU ceilings; the full
            # domain suite is not a one-CPU database capacity benchmark.
            cpus = fixture_cpu_limit(service, os.cpu_count())
            model["services"][service].update(user=fixture_user, mem_limit=memory, cpus=cpus)
        tidb_config = directory / "tidb.toml"
        tidb_config.write_text((ROOT / "config/tidb.toml").read_text().replace("6442450944", "1073741824"))
        tikv_config = directory / "tikv.toml"
        # Use the actual small-host TiKV memory budget. A 1536 MiB test cap
        # repeatedly killed upstream startup even with reduced cache targets.
        tikv_config.write_text((ROOT / "config/tikv.small.toml").read_text()
                               .replace('"10GB"', '"64MB"'))
        for service, path in (("tidb", tidb_config), ("tikv", tikv_config)):
            for volume in model["services"][service]["volumes"]:
                if volume["target"] == "/config/" + service + ".toml":
                    volume["source"] = str(path)
        # A small test disk must not cause preallocation of hundreds of empty volumes.
        storage_command = model["services"]["storage"]["command"]
        # The bucket and the filer's own metadata log use separate collections.
        # Upstream grows seven volumes per collection; a two-volume ceiling
        # let the S3 probe pass while starving the internal log collection.
        storage_command[storage_command.index("-volume.max=0")] = "-volume.max=16"
        storage_command[storage_command.index("-master.volumeSizeLimitMB=1024")] = "-master.volumeSizeLimitMB=64"
        storage_command[storage_command.index("-volume.minFreeSpace=20")] = "-volume.minFreeSpace=1"
        model["volumes"]["scanner-data"] = {"external": True, "name": "boosterplus-qualification-signatures"}
        # These listeners exist only in this random disposable fixture. The full
        # business suite uses dedicated loopback test endpoints, never production.
        model["services"]["tidb"]["ports"] = [{"target": 4000, "published": "14001", "host_ip": "127.0.0.1"}]
        model["services"]["scanner"]["environment"]["CLAMD_CONF_TCPAddr"] = "0.0.0.0"
        model["services"]["scanner"]["ports"] = [{"target": 3310, "published": "13310", "host_ip": "127.0.0.1"}]
        integration_secret = secrets.token_hex(32)
        model["services"]["integration-storage"] = {
            "image": model["services"]["storage"]["image"], "command": ["mini", "-dir=/data"],
            "ports": [{"target": 8333, "published": "8333", "host_ip": "127.0.0.1"}],
            "environment": {"AWS_ACCESS_KEY_ID": "boosterplus-local", "AWS_SECRET_ACCESS_KEY": integration_secret, "S3_BUCKET": "boosterplus-private"},
            "volumes": [{"type": "volume", "source": "integration-objects", "target": "/data"}],
            "mem_limit": 1 << 30, "cpus": 1, "security_opt": ["no-new-privileges:true"],
            "networks": {"data-client": {}},
        }
        model["volumes"]["integration-objects"] = {}
        host_test_access(model)
        fixture = directory / "compose.json"
        private_write(fixture, json.dumps(model))
        command = ["docker", "compose", "--project-name", manifest["DEPLOY_PROJECT"], "-f", str(fixture)]
        try:
            call(command + ["up", "-d", "pd", "tikv", "tidb", "storage", "object-gateway", "scanner", "integration-storage"], environment)
            migrations = command + ["run", "--rm", "--no-deps", "migrate", "db", "migrate"]
            wait(migrations + ["up"], environment)
            call(migrations + ["verify"], environment)
            call(command + ["exec", "-T", "storage", "weed", "shell", "-filer=localhost:8888"], environment,
                 input_text="s3.bucket.create -name playora\n")
            dependencies = command + ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "dependencies"]
            wait(dependencies + ["check"], environment, seconds=240)
            snapshot = call(command + ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "operations-snapshot"], environment)
            from monitor import evaluate
            if evaluate(json.loads(snapshot.stdout), time.time()):
                raise RuntimeError("Empty real-TiKV fixture returned unhealthy operational metrics")
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
            print("Real TiKV migration/history, verified TLS, private S3/scanner round trip and restart regression passed", flush=True)
            test_environment = dict(os.environ, GOSUMDB="sum.golang.org",
                                    TEST_DATABASE_DSN=credentials["ADMIN_DATABASE_DSN"].replace("tidb:4000", "127.0.0.1:14001"),
                                    TEST_MEDIA_S3_SECRET_KEY=integration_secret, SSL_CERT_FILE=str(installation / "pki/ca.crt"))
            # Run the SAME complete domain/concurrency suite against actual TiKV;
            # fixture storage/scanner keep its existing deterministic boundaries.
            # The prior 251-case suite took 213.98 minutes; 268 cases plus
            # schema41 leave little margin under the former 240-minute budget.
            # Reserve bounded aggregate headroom without changing individual
            # SQL/network deadlines or assertions. Protocol smoke stays at 5 minutes.
            run_integration(integration_arguments(protocol_only=protocol_only),
                            test_environment, manifest["DEPLOY_PROJECT"])
            if protocol_only:
                print("Focused protocol smoke passed; complete business integration qualification remains REQUIRED")
            else:
                print("Complete race-enabled business integration suite passed against the disposable real-TiKV cluster")
        except BaseException:
            # Preserve failure diagnostics BEFORE disposable containers vanish.
            # Vendor output can contain generated credentials: never print it.
            diagnostics = call(command + ["logs", "--no-color", "--tail", "100"], environment, must_succeed=False)
            private_write(ROOT / ".cache" / (manifest["DEPLOY_PROJECT"] + "-services.log"),
                          diagnostics.stdout + diagnostics.stderr)
            raise
        finally:
            call(command + ["down", "--volumes", "--remove-orphans"], environment)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol-only", action="store_true", help="Run focused protocol diagnostics, never full qualification")
    main(protocol_only=parser.parse_args().protocol_only)
