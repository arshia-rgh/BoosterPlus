"""Encrypted SQL snapshots/logs; never silently equate a SQL checkpoint with full recovery."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import secrets
import time
from urllib.parse import parse_qs, urlsplit, urlunsplit

from artifacts import bounded
from backup import policy as backup_policy
from manage import read_env, run
from release import current
import state

TLS = ["--pd=https://pd:2379", "--ca=/certs/ca.crt", "--cert=/certs/server.crt", "--key=/certs/server.key"]
SNAPSHOT_CRYPTO = ["--crypter.method=aes256-ctr", "--crypter.key-file=/backup/snapshot.key"]
LOG_CRYPTO = ["--master-key-crypter-method=aes256-ctr", "--master-key=local:///backup/master.key"]


def validate(manifest):
    if manifest.get("PITR_ENABLED") != "true" or manifest.get("DATA_TOPOLOGY") != "self-hosted-single":
        raise ValueError("Encrypted PITR requires the selected self-hosted topology and explicit activation")
    settings = read_env(manifest["PITR_ENV_FILE"])
    if set(settings) - {"AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_REGION"} or not settings.get("AWS_ACCESS_KEY_ID") or not settings.get("AWS_SECRET_ACCESS_KEY"):
        raise ValueError("PITR runtime file requires only the dedicated S3 identity")
    uri = urlsplit(manifest["BR_STORAGE_URL"])
    params = parse_qs(uri.query, keep_blank_values=True)
    if uri.scheme != "s3" or not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", uri.netloc) or not re.fullmatch(r"/[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)*", uri.path) or uri.fragment or set(params) != {"endpoint"} or len(params["endpoint"]) != 1:
        raise ValueError("Use a dedicated SQL S3 bucket/prefix with only its HTTPS endpoint parameter; no URL credentials")
    endpoint = urlsplit(params["endpoint"][0])
    if endpoint.scheme != "https" or not endpoint.hostname or endpoint.username or endpoint.password or endpoint.path not in ("", "/") or endpoint.query or endpoint.fragment:
        raise ValueError("PITR storage endpoint requires verified HTTPS")
    restic = read_env(manifest["BACKUP_ENV_FILE"])
    if endpoint.netloc != urlsplit(restic["RESTIC_REPOSITORY"].removeprefix("s3:")).netloc:
        raise ValueError("SQL and recovery archives must use the independently verified off-host endpoint")
    archive = urlsplit(restic["RESTIC_REPOSITORY"].removeprefix("s3:"))
    sql_prefix = "/" + uri.netloc + uri.path
    if sql_prefix == archive.path or sql_prefix.startswith(archive.path.rstrip("/") + "/") or archive.path.startswith(sql_prefix + "/"):
        raise ValueError("SQL and archive backups require separate non-overlapping prefixes")
    root = Path(manifest["DATA_DIRECTORY"]).resolve()
    values = []
    for key in ("BR_MASTER_KEY_FILE", "BR_SNAPSHOT_KEY_FILE"):
        path = Path(manifest[key])
        if not path.is_absolute() or path.resolve().is_relative_to(root) or path.stat().st_mode & 0o077 or path.stat().st_uid != os.getuid():
            raise ValueError("Keep independently escrowed SQL recovery keys private and outside the backed-up installation")
        value = bounded(path, 4096)
        if key == "BR_MASTER_KEY_FILE" and not re.fullmatch(rb"[a-fA-F0-9]{64}\n", value):
            raise ValueError("Log master key requires 64 hexadecimal characters followed by a newline")
        if key == "BR_SNAPSHOT_KEY_FILE" and not re.fullmatch(rb"[a-f0-9]{64}\n?", value):
            raise ValueError("Snapshot encryption key requires 64 hexadecimal characters")
        values.append(value.strip().lower())
    if values[0] == values[1]:
        raise ValueError("Log and snapshot recovery keys must be separate")


def location(manifest, suffix):
    uri = urlsplit(manifest["BR_STORAGE_URL"])
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", suffix):
        raise ValueError("Invalid backup path suffix")
    return urlunsplit((uri.scheme, uri.netloc, uri.path + "/" + suffix, uri.query, ""))


def command(arguments):
    return ["run", "--rm", "--no-deps", "br", *arguments, *TLS, "--log-level=warn"]


def checkpoint(raw, expected_storage, at):
    """Pinned BR8.5.7 global storage checkpoint, not a per-store optimistic TSO."""
    if len(raw) > (1 << 20):
        raise ValueError("PITR status exceeded its bounded output")
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict):
        raise ValueError("Expected exactly one SQL log task")
    task = rows[0]
    # Upstream FormatBackendURL omits the endpoint query; never retain errors or
    # arbitrary provider fields in the operational receipt.
    expected = urlsplit(expected_storage)
    actual = urlsplit(task.get("storage", ""))
    if task.get("name") != "playora" or (actual.scheme, actual.netloc, actual.path) != (expected.scheme, expected.netloc, expected.path) or actual.username or actual.password:
        raise ValueError("SQL log task belongs to another recovery destination")
    if task.get("status") != "NORMAL" or task.get("last_errors") != []:
        raise ValueError("SQL log task is paused, failed or reports store errors")
    tso = task.get("checkpoint")
    start = task.get("start_ts")
    if type(tso) is not int or type(start) is not int or not 0 < start <= tso < 2 ** 64:
        raise ValueError("SQL log task has no valid global storage checkpoint")
    age = at - (tso >> 18) / 1000
    if not 0 <= age <= 900:
        raise ValueError("SQL log checkpoint is stale or in the future")
    return {"checkpoint_tso": str(tso), "start_tso": str(start), "age_seconds": age}


def main(manifest, action):
    validate(manifest)
    backup_policy(manifest)  # DNS/off-host/key check; never sends a backup by itself.
    project = manifest["DEPLOY_PROJECT"]
    with state.locked(Path(manifest["DATA_DIRECTORY"]) / "operations", project) as root:
        if state.pending(root, project):
            raise ValueError("Resolve the interrupted release before changing backup state")
        if action == "pitr-start":
            if os.environ.get("PITR_START_ACK") != project:
                raise ValueError("Set PITR_START_ACK to this exact project after independently preserving both recovery keys")
            run(manifest, command(["log", "start", "--task-name=playora", "--storage=" + location(manifest, "logs"), *LOG_CRYPTO]))
            print("Encrypted SQL log task started; checkpoint, media and actual recovery qualification remain required")
        elif action == "pitr-status":
            raw = run(manifest, command(["log", "status", "--task-name=playora", "--json"]), capture=True)
            value = checkpoint(raw, location(manifest, "logs"), time.time())
            state.write(root, project + "-pitr-status.json", {"observed_at": datetime.now(timezone.utc).isoformat(), **value})
            print("Private SQL log status recorded; this alone does not qualify the combined SQL/media recovery point")
        elif action == "pitr-snapshot":
            release = current(manifest)
            if not release:
                raise ValueError("SQL snapshots require a recorded signed release")
            suffix = "snapshot-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + secrets.token_hex(6)
            uri = location(manifest, suffix)
            run(manifest, command(["backup", "full", "--storage=" + uri, *SNAPSHOT_CRYPTO]))
            raw = run(manifest, command(["validate", "decode", "--field=end-version", "--storage=" + uri, *SNAPSHOT_CRYPTO]), capture=True)
            last = raw.strip().splitlines()[-1] if raw.strip() else ""
            if not re.fullmatch(r"[0-9]{15,20}", last):
                raise ValueError("Could not independently read the exact SQL snapshot checkpoint")
            state.write(root, project + "-sql-snapshot.json", {"state": "sql_only", "project": project,
                        "commit": release["release"]["commit"], "storage": uri, "end_tso": last,
                        "completed_at": datetime.now(timezone.utc).isoformat()})
            print("Encrypted full SQL snapshot completed; media/keys/mail/erasure coverage must be verified separately")
