"""Fail-closed, serialized application releases; never automatic schema rollback."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import time

from artifacts import bounded, compatible_rollback, verify
import state

APPLICATION = ["gateway", "worker", "storefront", "admin", "api"]


def now():
    return datetime.now(timezone.utc).isoformat()


def images(manifest, document):
    return dict(manifest, **{name.upper() + "_IMAGE": item["image"] for name, item in document["images"].items()})


def current(manifest):
    path = Path(manifest["DATA_DIRECTORY"]) / "operations" / (manifest["DEPLOY_PROJECT"] + "-current.json")
    if not path.exists():
        return None
    value = json.loads(bounded(path))
    if value.get("project") != manifest["DEPLOY_PROJECT"] or value.get("state") != "complete":
        raise ValueError("Current-release receipt is invalid")
    from artifacts import validate
    validate(value["release"])
    return value


def checked_schema(output):
    if not re.fullmatch(r"[0-9]+\s*", output) or len(output) > 20:
        raise ValueError("Database returned an invalid schema version")
    return int(output)


def require_backup(root, project, release_commit):
    receipt = json.loads(bounded(root / (project + "-backup.json")))
    if receipt.get("project") != project or receipt.get("state") != "verified" or receipt.get("commit") != release_commit:
        raise ValueError("A verified off-host backup of the current release is required")
    age = time.time() - float(receipt.get("consistent_at", 0))
    if not 0 <= age <= 900:
        raise ValueError("The pre-release recovery point must be no more than 15 minutes old")


def execute(manifest, bundle, *, rollback=False, resume=False, runner=None, smoke=None):
    from manage import run, validate
    from smoke import public_smoke
    runner = runner or run
    smoke = smoke or (lambda origin: public_smoke(origin, admin_origin="https://" + manifest["ADMIN_SITE_ADDRESS"], booster_origin="https://" + manifest["BOOSTER_SITE_ADDRESS"]))
    if manifest.get("DATA_TOPOLOGY") != "self-hosted-single":
        raise ValueError("This release procedure targets the selected self-hosted topology")
    target = verify(bundle, manifest["RELEASE_TRUST_KEY"], manifest["RELEASE_TRUST_KEY_SHA256"])
    candidate = images(manifest, target)
    root = Path(manifest["DATA_DIRECTORY"]) / "operations"
    project = manifest["DEPLOY_PROJECT"]
    with state.locked(root, project):
        backup_operation = root / (project + "-backup-operation.json")
        if backup_operation.exists() and json.loads(bounded(backup_operation)).get("state") != "complete":
            raise ValueError("Recover the interrupted backup before releasing an application")
        old = current(manifest)
        pending = state.pending(root, project)
        if pending and (not resume or pending.get("commit") != target["commit"] or pending.get("rollback") != rollback):
            raise ValueError("An interrupted release exists; inspect its receipt and resume that exact signed bundle")
        if resume and not pending:
            raise ValueError("No interrupted release exists to resume")
        if rollback and not old:
            raise ValueError("Cannot roll back an installation without a completed release")
        if old and not pending:
            require_backup(root, project, old["release"]["commit"])
        receipt = pending or {"project": project, "commit": target["commit"], "rollback": rollback,
                              "started_at": now(), "previous": old, "state": "preflight"}
        receipt_name = project + "-release.json"
        def record(stage):
            receipt.update(state=stage, updated_at=now())
            state.write(root, receipt_name, receipt)
        record(receipt["state"])
        try:
            # Pull and validate BEFORE interrupting a running deployment.
            runner(candidate, ["--profile", "tools", "pull"])
            if runner is run:
                validate(candidate)
            runner(candidate, ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "config", "validate"])
            version = runner(candidate, ["run", "--rm", "--no-deps", "migrate", "version"], capture=True)
            if not re.fullmatch(r"boosterplus [^;\n]+; supported schema: " + str(target["schema"]) + r"\s*", version):
                raise ValueError("Signed schema does not match the packaged binary")
            dependency_check = ["run", "--rm", "--no-deps", "--entrypoint", "/app/boosterplus", "api", "dependencies", "check"]
            if old and receipt["state"] == "preflight":
                # Probe using the currently deployed schema-aware binary before
                # interrupting traffic. Readiness alone cannot detect storage
                # refusing writes at its free-space safety threshold. The probe
                # scans and round-trips only a temporary private object.
                runner(images(manifest, old["release"]), dependency_check)
            record("quiescing")
            runner(candidate, ["stop", "--timeout", "120", *APPLICATION])
            record("migrating")
            # A recreated scanner can be running before its signature database
            # is loaded. Wait for dependency health before migration/probes;
            # keep the application-level scan/storage checks below as well.
            runner(candidate, ["up", "-d", "--wait", "--wait-timeout", "180",
                               "pd", "tikv", "tidb", "storage", "object-gateway", "scanner"])
            migration = ["run", "--rm", "--no-deps", "migrate", "db", "migrate"]
            # Bounded readiness retries are read-only, never blindly retry DDL.
            for attempt in range(30):
                try:
                    before = checked_schema(runner(candidate, migration + ["version"], capture=True))
                    break
                except RuntimeError:
                    if attempt == 29:
                        raise
                    time.sleep(2)
            if rollback:
                compatible_rollback(before, target)
            elif before > 0 and not old and not receipt.get("initial_schema_authorized"):
                raise ValueError("An existing database needs a reviewed release adoption/recovery receipt; refusing first-install migration")
            elif before > target["schema"]:
                raise ValueError("Target release cannot understand the existing schema")
            else:
                receipt["initial_schema_authorized"] = True
                record("migrating")
                runner(candidate, migration + ["up"])
            after = checked_schema(runner(candidate, migration + ["version"], capture=True))
            compatible_rollback(after, target)
            runner(candidate, migration + ["verify"])
            runner(candidate, dependency_check)
            record("starting")
            # Workers stay stopped until the candidate serves correctly.
            runner(candidate, ["up", "-d", "--wait", "--wait-timeout", "240", "api", "storefront", "admin", "gateway"])
            smoke("https://" + candidate["SITE_ADDRESS"])
            if candidate.get("MAIL_MODE") == "self-hosted":
                runner(candidate, ["up", "-d", "--wait", "--wait-timeout", "180", "mailserver"])
            if candidate.get('WEBMAIL_ENABLED') == 'true':
                runner(candidate, ['up', '-d', '--wait', '--wait-timeout', '60', 'webmail'])
            runner(candidate, ["up", "-d", "--wait", "--wait-timeout", "180", "worker"])
            complete = {"project": project, "state": "complete", "completed_at": now(), "release": target,
                        "manifest_sha256": hashlib.sha256(bounded(Path(bundle) / "release.json")).hexdigest()}
            state.write(root, project + "-current.json", complete)
            record("complete")
        except BaseException:
            # Even Ctrl-C leaves the stage receipt intact. A failure after quiescence
            # never restarts old code against a potentially newer/partial schema.
            if receipt["state"] != "preflight":
                try:
                    runner(candidate, ["stop", "--timeout", "120", *APPLICATION])
                except (OSError, RuntimeError):
                    pass
            raise
    print("Application release and HTTPS smoke completed; sales activation and server qualification are separate")
