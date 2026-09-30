"""Private operator snapshot and stateful, credential-free alert payloads."""
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import socket
import smtplib
import ssl
import subprocess
import time
import urllib.request
from urllib.parse import urlsplit

from artifacts import bounded
from manage import read_env, run
import state

# Initial alert thresholds; qualify/tune against measured traffic, never to hide failures.
THRESHOLDS = {"jobs_failed": 0, "jobs_oldest_runnable_seconds": 120, "jobs_expired_leases": 0,
              "auth_mail_oldest_seconds": 60, "notification_mail_oldest_seconds": 300,
              "media_scan_oldest_seconds": 120, "media_purge_oldest_seconds": 7200,
              "payment_exceptions": 0, "payment_reconciliation_oldest_seconds": 300,
              "outgoing_uncertain": 0, "outgoing_reconciliation_oldest_seconds": 300}


def evaluate(snapshot, at):
    alerts = []
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("values"), dict):
        return ["metrics_unavailable"]
    try:
        stamp = datetime.fromisoformat(snapshot.get("observed_at", "").replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            return ["metrics_invalid"]
        age = at - stamp.timestamp()
    except (ValueError, TypeError, OverflowError):
        return ["metrics_invalid"]
    if not 0 <= age <= 120:
        alerts.append("metrics_stale")
    for name, threshold in THRESHOLDS.items():
        value = snapshot["values"].get(name)
        if type(value) is not int or value < 0:
            alerts.append(name + "_unavailable")
        elif value > threshold:
            alerts.append(name)
    return alerts


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def deliver(config_file, event, opener=None):
    settings = read_env(config_file)
    url = settings.get("ALERT_WEBHOOK_URL", "")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Alerts require an explicitly configured HTTPS webhook without URL credentials")
    token = settings.get("ALERT_WEBHOOK_TOKEN", "")
    if not token or any(c in token for c in "\r\n"):
        raise ValueError("Configure the private independent alert bearer token")
    client = opener or urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    request = urllib.request.Request(url, data=json.dumps(event).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    with client.open(request, timeout=10) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError("Alert destination did not acknowledge delivery")


def notify(root, project, alerts, sender, at):
    path = root / (project + "-alert.json")
    previous = json.loads(bounded(path)) if path.exists() else {"alerts": [], "sent_at": 0}
    alerts = sorted(set(alerts))
    if alerts == previous["alerts"] and (not alerts or at - previous["sent_at"] < 3600):
        return
    event = {"project": project, "state": "firing" if alerts else "resolved", "codes": alerts,
             "observed_at": datetime.fromtimestamp(at, timezone.utc).isoformat(), "runbook": "production/OPERATIONS.md"}
    event["event_id"] = hashlib.sha256((project + json.dumps(alerts) + str(previous["sent_at"])).encode()).hexdigest()
    sender(event)  # Do not advance delivery state when the receiver fails.
    state.write(root, path.name, {"alerts": alerts, "sent_at": at, "event_id": event["event_id"]})


def collect(manifest):
    at = time.time()
    alerts = []
    details = {}
    try:
        snapshot = json.loads(run(manifest, ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "operations-snapshot"], capture=True))
        alerts += evaluate(snapshot, time.time())
        # Store only allowlisted numeric fields; never arbitrary CLI output.
        details["values"] = {k: v for k, v in snapshot.get("values", {}).items() if k in THRESHOLDS and type(v) is int}
    except (ValueError, RuntimeError, OSError):
        alerts.append("metrics_unavailable")
    try:
        output = run(manifest, ["ps", "--all", "--format", "json"], capture=True)
        containers = json.loads(output) if output.strip().startswith("[") else [json.loads(line) for line in output.splitlines()]
        expected = {"api", "worker", "storefront", "admin", "gateway", "scanner", "pd", "tikv", "tidb", "storage", "object-gateway"}
        if manifest.get("MAIL_MODE") == "self-hosted":
            expected.add("mailserver")
        by_name = {item.get("Service"): item for item in containers}
        for name in sorted(expected):
            item = by_name.get(name, {})
            if item.get("State") != "running" or item.get("Health") in {"unhealthy", "starting"}:
                alerts.append("service_" + name + "_unready")
    except (ValueError, RuntimeError, OSError):
        alerts.append("container_status_unavailable")
    disk = shutil.disk_usage(manifest["DATA_DIRECTORY"])
    details["disk_free_bytes"] = disk.free
    if disk.free / disk.total < .20 or disk.free < 100 * 1024 ** 3:
        alerts.append("disk_pressure")
    filesystem = os.statvfs(manifest["DATA_DIRECTORY"])
    if filesystem.f_files and filesystem.f_favail / filesystem.f_files < .10:
        alerts.append("inode_pressure")
    for name in ("pd", "tikv", "tidb", "storage", "object-gateway", "operations"):
        cert = Path(manifest["DATA_DIRECTORY"]) / "pki" / name / "server.crt"
        result = subprocess.run(["openssl", "x509", "-in", str(cert), "-checkend", "1209600", "-noout"], capture_output=True, timeout=10, check=False)
        if result.returncode:
            alerts.append("certificate_" + name + "_expires")
    try:
        with socket.create_connection((manifest["SITE_ADDRESS"], 443), timeout=10) as connection:
            with ssl.create_default_context().wrap_socket(connection, server_hostname=manifest["SITE_ADDRESS"]) as tls:
                if ssl.cert_time_to_seconds(tls.getpeercert()["notAfter"]) - at < 14 * 86400:
                    alerts.append("public_certificate_expires")
    except (OSError, ValueError, KeyError):
        alerts.append("public_tls_unavailable")
    try:
        version = run(manifest, ["exec", "-T", "scanner", "clamdscan", "--version"], capture=True).strip()
        stamp = datetime.strptime(version.rsplit("/", 1)[1], "%a %b %d %H:%M:%S %Y").replace(tzinfo=timezone.utc).timestamp()
        if not 0 <= at - stamp <= 3 * 86400:
            alerts.append("scanner_definitions_stale")
    except (OSError, ValueError, RuntimeError, IndexError):
        alerts.append("scanner_freshness_unavailable")
    if manifest.get("MAIL_MODE") == "self-hosted":
        try:
            # Inspect queue counts in memory only; recipients/subjects never enter snapshots.
            queue = run(manifest, ["exec", "-T", "mailserver", "postqueue", "-j"], capture=True)
            entries = [json.loads(line) for line in queue.splitlines()]
            details["smtp_queue_count"] = len(entries)
            if any(at - int(item["arrival_time"]) > 300 for item in entries):
                alerts.append("smtp_queue_delayed")
            # Public transfer TLS probe sends no message and does not authenticate.
            with smtplib.SMTP(manifest["MAIL_HOST"], 25, timeout=10) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                if ssl.cert_time_to_seconds(smtp.sock.getpeercert()["notAfter"]) - at < 14 * 86400:
                    alerts.append("mail_certificate_expires")
        except (OSError, ValueError, RuntimeError, KeyError, smtplib.SMTPException):
            alerts.append("smtp_probe_unavailable")
    try:
        receipt = json.loads(bounded(Path(manifest["DATA_DIRECTORY"]) / "operations" / (manifest["DEPLOY_PROJECT"] + "-backup.json")))
        age = at - float(receipt.get("consistent_at", 0))
        details["backup_age_seconds"] = age if math.isfinite(age) else None
        if receipt.get("state") != "verified" or not 0 <= age <= 900:
            alerts.append("recovery_point_stale")
    except (OSError, ValueError):
        alerts.append("backup_unavailable")
    if manifest.get("PITR_ENABLED") == "true":
        try:
            from pitr import checkpoint, command, location
            raw = run(manifest, command(["log", "status", "--task-name=playora", "--json"]), capture=True)
            details["sql_log_age_seconds"] = checkpoint(raw, location(manifest, "logs"), time.time())["age_seconds"]
        except (OSError, ValueError, RuntimeError):
            alerts.append("sql_log_checkpoint_unavailable")
    return {"observed_at": datetime.fromtimestamp(at, timezone.utc).isoformat(), "alerts": sorted(set(alerts)), **details}


def main(manifest, action):
    project = manifest["DEPLOY_PROJECT"]
    with state.locked(Path(manifest["DATA_DIRECTORY"]) / "operations", project) as root:
        if action == "monitor-status":
            print(bounded(root / (project + "-monitor.json")).decode())
            return
        snapshot = collect(manifest)
        state.write(root, project + "-monitor.json", snapshot)
        if action == "monitor-notify":
            notify(root, project, snapshot["alerts"], lambda event: deliver(manifest["ALERT_ENV_FILE"], event), time.time())
        print(json.dumps(snapshot, sort_keys=True))
        if snapshot["alerts"]:
            raise RuntimeError("Operational alerts are firing; inspect the named runbook codes")
