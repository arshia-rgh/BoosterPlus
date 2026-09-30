"""Explicit cold recovery snapshots and quarantined restores using pinned restic.

Cold snapshots are the baseline consistency/recovery primitive, not a claim that
frequent maintenance outages satisfy the 15-minute continuous-service RPO.
"""
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
from urllib.parse import urlsplit

from artifacts import bounded
from manage import ROOT, compose, read_env, run
from provision import private_write
from release import current
import state

IMAGE = "restic/restic:0.19.1@sha256:136600b6ff6843d61d355f7f71f460a166429f35de6fd11b568fece3c9a4d510"
SNAPSHOT = re.compile(r"[a-f0-9]{64}")


def policy(manifest, resolve=True):
    path = Path(manifest["BACKUP_ENV_FILE"])
    settings = read_env(path)
    allowed = {"RESTIC_REPOSITORY", "RESTIC_PASSWORD_FILE", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_REGION"}
    if set(settings) - allowed or not all(settings.get(k) for k in allowed - {"AWS_DEFAULT_REGION"}):
        raise ValueError("Backup config requires only the documented restic/S3 settings")
    repository = settings["RESTIC_REPOSITORY"]
    url = urlsplit(repository.removeprefix("s3:"))
    if not repository.startswith("s3:https://") or not url.hostname or url.username or url.password or url.query or url.fragment or len(url.path.strip("/").split("/")) < 2:
        raise ValueError("Use a dedicated off-host HTTPS S3 bucket/prefix without credentials in the URL")
    primary = ipaddress.ip_address(manifest["PRIMARY_PUBLIC_IP"])
    if not primary.is_global:
        raise ValueError("Configure the actual primary public IP for off-host validation")
    if resolve:
        addresses = {ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(url.hostname, url.port or 443)}
        if not addresses or primary in addresses or any(ip.is_loopback or ip.is_link_local or ip.is_unspecified for ip in addresses):
            raise ValueError("Backup destination resolves to the primary/local host; use independent storage")
    if manifest.get("BACKUP_OFFHOST_CONFIRMED") != "true":
        raise ValueError("Confirm that the backup destination is on an independent host/failure domain")
    password = Path(settings["RESTIC_PASSWORD_FILE"])
    if not password.is_absolute() or password.resolve().is_relative_to(Path(manifest["DATA_DIRECTORY"]).resolve()):
        raise ValueError("Keep the backup recovery password outside the backed-up installation")
    if password.stat().st_mode & 0o077 or len(bounded(password, 4096).strip()) < 32:
        raise ValueError("Use a private recovery password file with at least32bytes, independently escrowed")
    settings["RESTIC_PASSWORD_FILE"] = "/recovery/password"
    return path, password, settings


def restic(manifest, arguments, mounts=(), *, runner=subprocess.run):
    _, password, settings = policy(manifest)
    with tempfile.TemporaryDirectory(prefix="playora-restic-config-") as name:
        environment = Path(name) / "restic.env"
        private_write(environment, "".join(k + "=" + v + "\n" for k, v in settings.items()))
        command = ["docker", "run", "--rm", "--platform", "linux/amd64", "--read-only", "--cap-drop=ALL",
                   "--cap-add=DAC_READ_SEARCH", "--security-opt=no-new-privileges:true", "--memory=1g", "--cpus=2",
                   "--pids-limit=64", "--tmpfs=/tmp:rw,noexec,nosuid,size=64m", "--env-file", str(environment),
                   "--mount", "type=bind,src=" + str(password) + ",dst=/recovery/password,readonly"]
        if any(writable for _, _, writable in mounts):
            command += ["--cap-add=CHOWN", "--cap-add=FOWNER"]
        for source, target, writable in mounts:
            source = Path(source)
            if not source.is_absolute() or source.is_symlink() or "," in str(source):
                raise ValueError("Backup mounts require real absolute paths without commas")
            command += ["--mount", "type=bind,src=" + str(source) + ",dst=" + target + ("" if writable else ",readonly")]
        result = runner(command + [IMAGE, "--no-cache", *arguments], capture_output=True, text=True, timeout=7200, check=False)
        if result.returncode:
            # Any nonzero status, including restic's incomplete-source status3, fails.
            raise RuntimeError("Encrypted backup operation failed; no success receipt was recorded (private tool output withheld)")
        return result.stdout


def snapshot_id(output):
    summaries = [item for line in output.splitlines() if (item := json.loads(line)).get("message_type") == "summary"]
    if len(summaries) != 1 or not SNAPSHOT.fullmatch(summaries[0].get("snapshot_id", "")):
        raise ValueError("Backup did not return one exact complete snapshot ID")
    return summaries[0]["snapshot_id"]


def running_services(manifest):
    output = run(manifest, ["ps", "--services", "--filter", "status=running"], capture=True)
    names = set(output.splitlines())
    allowed = {"gateway", "worker", "storefront", "admin", "api", "scanner", "mailserver", "pd", "tikv", "tidb", "storage", "object-gateway"}
    if not names or names - allowed:
        raise ValueError("Unexpected deployment services; inspect before taking a snapshot")
    return sorted(names)


def cold_backup(manifest, acknowledgement):
    project = manifest["DEPLOY_PROJECT"]
    if acknowledgement != project:
        raise ValueError("Cold backup pauses the entire site/mail: set BACKUP_DOWNTIME_ACK to the exact project")
    policy(manifest)
    installation = Path(manifest["DATA_DIRECTORY"])
    with state.locked(installation / "operations", project) as root:
        if state.pending(root, project):
            raise ValueError("Resolve the pending release before taking a release recovery snapshot")
        release = current(manifest)
        if not release:
            raise ValueError("Backups require a recorded completed release")
        pending_path = root / (project + "-backup-operation.json")
        if pending_path.exists() and json.loads(bounded(pending_path)).get("state") != "complete":
            raise ValueError("Interrupted backup: inspect saved service states and recover before another attempt")
        services = running_services(manifest)
        receipt = {"project": project, "state": "quiescing", "services": services, "started_at": time.time()}
        state.write(root, pending_path.name, receipt)
        try:
            run(manifest, ["stop", "--timeout", "120", *services])
            if run(manifest, ["ps", "--services", "--filter", "status=running"], capture=True).strip():
                raise RuntimeError("A service remains running; refusing inconsistent filesystem backup")
            consistent_at = time.time()
            receipt.update(state="copying", consistent_at=consistent_at)
            state.write(root, pending_path.name, receipt)
            with tempfile.TemporaryDirectory(prefix="playora-backup-runtime-") as name:
                runtime = Path(name)
                for key, filename in (("BACKEND_ENV_FILE", "backend.env"), ("FRONTEND_ENV_FILE", "frontend.env"), ("MIGRATION_ENV_FILE", "migration.env")):
                    read_env(manifest[key])
                    private_write(runtime / filename, bounded(manifest[key], 65536).decode())
                private_write(runtime / "deployment.json", json.dumps(manifest))
                output = restic(manifest, ["backup", "--json", "--host", project, "--tag", "playora-cold-v1",
                                          "--exclude", "/installation/operations/*.lock", "/installation", "/runtime"],
                                [(installation, "/installation", False), (runtime, "/runtime", False)])
            identifier = snapshot_id(output)
            state.write(root, project + "-backup.json", {"project": project, "state": "uploaded", "snapshot": identifier,
                        "commit": release["release"]["commit"], "consistent_at": consistent_at, "uploaded_at": time.time(),
                        "repository_sha256": hashlib.sha256(read_env(manifest["BACKUP_ENV_FILE"])["RESTIC_REPOSITORY"].encode()).hexdigest()})
            receipt.update(state="copied", snapshot=identifier)
            state.write(root, pending_path.name, receipt)
        finally:
            # Restore precisely the prior running set, even on upload failure. No
            # service that was intentionally stopped is enabled by this command.
            run(manifest, ["up", "-d", "--no-deps", *services])
            receipt.update(state="complete", finished_at=time.time())
            state.write(root, pending_path.name, receipt)
    print("Consistent encrypted cold snapshot uploaded; run backup-verify and an isolated restore before relying on it")


def verify_backup(manifest):
    project = manifest["DEPLOY_PROJECT"]
    with state.locked(Path(manifest["DATA_DIRECTORY"]) / "operations", project) as root:
        receipt = json.loads(bounded(root / (project + "-backup.json")))
        expected = hashlib.sha256(read_env(manifest["BACKUP_ENV_FILE"])["RESTIC_REPOSITORY"].encode()).hexdigest()
        if receipt.get("project") != project or not SNAPSHOT.fullmatch(receipt.get("snapshot", "")) or receipt.get("repository_sha256") != expected:
            raise ValueError("Backup receipt/destination mismatch")
        matches = json.loads(restic(manifest, ["snapshots", "--json", receipt["snapshot"]]))
        if len(matches) != 1 or matches[0].get("id") != receipt["snapshot"] or matches[0].get("hostname") != project or "playora-cold-v1" not in matches[0].get("tags", []):
            raise ValueError("Backup snapshot identity mismatch")
        restic(manifest, ["check", "--read-data"])
        receipt.update(state="verified", verified_at=time.time())
        state.write(root, project + "-backup.json", receipt)
    print("Off-host encrypted repository integrity passed; actual application restoration is separate")


def restore_files(manifest, identifier, target, acknowledgement):
    target = Path(target)
    primary = Path(manifest["DATA_DIRECTORY"]).resolve()
    if not SNAPSHOT.fullmatch(identifier) or not target.is_absolute() or target.exists() or target.is_symlink() or target.parent.resolve().is_relative_to(primary):
        raise ValueError("Restore requires an exact snapshot and a new absolute target outside the primary installation")
    if acknowledgement != str(target):
        raise ValueError("Set RESTORE_TARGET_ACK to the exact new restore directory")
    snapshots = json.loads(restic(manifest, ["snapshots", "--json", identifier]))
    if len(snapshots) != 1 or snapshots[0].get("id") != identifier or snapshots[0].get("hostname") != manifest["DEPLOY_PROJECT"] or "playora-cold-v1" not in snapshots[0].get("tags", []):
        raise ValueError("Restore snapshot does not belong to this project's cold recovery archive")
    started = time.time()
    target.mkdir(mode=0o700)
    private_write(target / "RESTORE_QUARANTINED", "No traffic, workers, email or financial outbound operations. Privacy replay and reconciliation required.\n")
    # Never remove failed restore data; a partial tree remains quarantined for diagnosis.
    restic(manifest, ["restore", identifier, "--target", "/restore", "--verify"], [(target, "/restore", True)])
    state.write(target, "restore-files.json", {"snapshot": identifier, "started_at": started, "finished_at": time.time(),
                "state": "files_verified_only", "application_qualified": False})
    return target


def recover_backup(manifest, acknowledgement):
    project = manifest["DEPLOY_PROJECT"]
    if acknowledgement != project:
        raise ValueError("Set BACKUP_RECOVER_ACK to the exact interrupted project after reviewing its receipt")
    with state.locked(Path(manifest["DATA_DIRECTORY"]) / "operations", project) as root:
        receipt = json.loads(bounded(root / (project + "-backup-operation.json")))
        allowed = {"gateway", "worker", "storefront", "admin", "api", "scanner", "mailserver", "pd", "tikv", "tidb", "storage", "object-gateway"}
        services = receipt.get("services", [])
        if receipt.get("project") != project or receipt.get("state") == "complete" or not services or set(services) - allowed or state.pending(root, project):
            raise ValueError("No safe interrupted backup state is available for recovery")
        run(manifest, ["up", "-d", "--no-deps", *services])
        receipt.update(state="complete", recovered_at=time.time())
        state.write(root, project + "-backup-operation.json", receipt)
    print("Previously running services restarted; interrupted backup is not marked successful")


def main(action, manifest):
    if manifest.get("DATA_TOPOLOGY") != "self-hosted-single":
        raise ValueError("Backup commands require the selected self-hosted topology")
    if action == "backup":
        cold_backup(manifest, os.environ.get("BACKUP_DOWNTIME_ACK", ""))
    elif action == "backup-verify":
        verify_backup(manifest)
    elif action == "backup-recover":
        recover_backup(manifest, os.environ.get("BACKUP_RECOVER_ACK", ""))
    elif action == "backup-init":
        if os.environ.get("BACKUP_INITIALIZE_ACK") != manifest["DEPLOY_PROJECT"]:
            raise ValueError("Explicit project acknowledgement is required to initialize the dedicated repository")
        restic(manifest, ["init"])
        print("Encrypted repository initialized; make an independent recovery-password copy")
    elif action == "restore-drill":
        target = restore_files(manifest, os.environ["BACKUP_SNAPSHOT"], os.environ["RESTORE_TARGET"], os.environ.get("RESTORE_TARGET_ACK", ""))
        from restore import qualify
        qualify(manifest, target)
