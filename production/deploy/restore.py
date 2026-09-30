"""Run restored SQL/object data in private, isolated containers without workers."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

from artifacts import bounded, verify
from manage import compose, read_env
from provision import private_write
from release import checked_schema, images
import state


def isolated_model(model, project, source_project):
    keep = {"pd", "tikv", "tidb", "storage", "object-gateway", "api", "migrate"}
    model["name"] = project
    model["services"] = {key: value for key, value in model["services"].items() if key in keep}
    for name, service in model["services"].items():
        service.pop("ports", None)
        service.pop("depends_on", None)
        service.pop("container_name", None)
        service["restart"] = "no"
        service["networks"] = {key: {} for key in service["networks"] if key in {"data-client", "data-cluster", "object-internal"}}
        if name in ("api", "migrate"):
            service["profiles"] = ["probe"]
    model["networks"] = {key: {"internal": True, "name": project + "_" + key} for key in ("data-client", "data-cluster", "object-internal")}
    # The scanner receives only the dependency command's fixed harmless probe.
    # No production SQL/media volume is ever mounted into the restored cluster.
    model["volumes"] = {"scanner-socket": {"external": True, "name": source_project + "_scanner-socket"}}
    return model


def call(command, environment):
    result = subprocess.run(command, env=environment, capture_output=True, text=True, timeout=300, check=False)
    if result.returncode:
        raise RuntimeError("Isolated restoration probe failed; target remains quarantined (private output withheld)")
    return result.stdout


def qualify(manifest, target):
    started = time.time()
    target = Path(target)
    if not (target / "RESTORE_QUARANTINED").is_file():
        raise ValueError("Restoration must stay explicitly quarantined")
    restored = target / "installation"
    receipt = json.loads(bounded(restored / "operations" / (manifest["DEPLOY_PROJECT"] + "-current.json")))
    signed = verify(os.environ["RELEASE_DIRECTORY"], manifest["RELEASE_TRUST_KEY"], manifest["RELEASE_TRUST_KEY_SHA256"])
    if receipt["release"] != signed:
        raise ValueError("Restore requires the independently verified signed bundle of the backed-up release")
    candidate = images(manifest, signed)
    project = "boosterplus-restore-" + secrets.token_hex(8)
    candidate.update(DEPLOY_PROJECT=project, DATA_DIRECTORY=str(restored), MAIL_MODE="external")
    for key, filename in (("BACKEND_ENV_FILE", "backend.env"), ("FRONTEND_ENV_FILE", "frontend.env"), ("MIGRATION_ENV_FILE", "migration.env")):
        path = target / "runtime" / filename
        read_env(path)
        candidate[key] = str(path)
    environment = dict(os.environ, **candidate)
    model = json.loads(call(compose(candidate) + ["--profile", "tools", "config", "--format", "json"], environment))
    isolated_model(model, project, manifest["DEPLOY_PROJECT"])
    for service in model["services"].values():
        for mount in service.get("volumes", []):
            if mount["type"] == "bind" and Path(mount["source"]).resolve().is_relative_to(Path(manifest["DATA_DIRECTORY"]).resolve()):
                raise ValueError("Restoration must never mount primary installation data")
    configuration = target / "restore-compose.json"
    private_write(configuration, json.dumps(model))
    command = ["docker", "compose", "--project-name", project, "-f", str(configuration)]
    report = {"project": project, "commit": signed["commit"], "started_at": started, "state": "running", "quarantined": True}
    state.write(target, "restore-application.json", report)
    try:
        call(command + ["up", "-d", "pd", "tikv", "tidb", "storage", "object-gateway"], environment)
        migration = command + ["run", "--rm", "--no-deps", "migrate", "db", "migrate"]
        for attempt in range(30):
            try:
                version = checked_schema(call(migration + ["version"], environment))
                break
            except RuntimeError:
                if attempt == 29:
                    raise
                time.sleep(2)
        if version != signed["schema"]:
            raise ValueError("Restored database schema differs from the backed-up release")
        call(migration + ["verify"], environment)
        call(command + ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "dependencies", "check"], environment)
        report.update(state="data_probe_passed", finished_at=time.time(), duration_seconds=time.time() - started,
                      limits=["Business/erasure/reconciliation review and full measured RTO remain required", "No worker/mail/public traffic activated"])
        state.write(target, "restore-application.json", report)
    finally:
        # Remove only this unique drill's containers/networks. All restored files
        # and the external scanner socket are preserved; never use --volumes.
        call(command + ["down"], environment)
    print("Isolated restored SQL/history and private media/scanner probes passed; data stays quarantined for privacy and finance review")
