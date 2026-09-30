# Encrypted recovery and quarantine

`backup` currently implements a **cold, consistent recovery snapshot**. It deliberately pauses the site and self-hosted mail while copying SQL, object metadata/volumes, mail, certificates, vault/auth runtime keys and operational state. This is appropriate for pre-release recovery and disaster rehearsal. **It is not the continuous backup strategy, and does not qualify the15-minute RPO by itself.** Do not schedule repeated site outages to conceal that gap. Continuous SQL PITR/media recovery and measured capacity remain launch blockers in `LAUNCH_EXECUTION.md`.

## Destination and recovery keys

Create a dedicated private bucket/prefix on an independent S3-compatible host. Copy `backup.env.example` into a protected file; set `BACKUP_ENV_FILE`, `PRIMARY_PUBLIC_IP` and `BACKUP_OFFHOST_CONFIRMED=true` in the deployment manifest. HTTPS verification is mandatory. The tool rejects local/same-primary destinations and URLs containing credentials. The operator still confirms that a different hostname really is a separate failure domain.

Use a high-entropy recovery password file outside `DATA_DIRECTORY`, mode0600, with an independently held recovery copy. Restic encrypts and authenticates repository contents. The restore machine needs that password, read-only repository access and a trusted signed release bundle. Do not include the password in the same backup it decrypts. Restrict routine credentials to the dedicated repository. Keep independently controlled immutable/offline generations to withstand a compromised primary with repository write access; retention and object-lock compatibility require qualification on the chosen destination.

Initialize once: set `BACKUP_INITIALIZE_ACK` to the exact deployment project and run `make backup-init`. Existing repositories must never be reinitialized, deleted or recreated to fix a failed check.

## Snapshot and verification

Set `BACKUP_DOWNTIME_ACK` to the exact project and run `make backup`. The operation takes the deployment lock, records precisely which services were running, stops them, checks no service remains running, captures the recovery timestamp, and uploads an encrypted snapshot. It restarts only those prior services even if upload fails. Restic partial-source exit3 is a failure, not a successful backup. No production volume is removed.

Run `make backup-verify` to check the snapshot's project/tag/identity and read back **all repository data** for integrity. This can be expensive; measure it. Release preflight rejects a backup whose consistent timestamp is over15minutes old, even when its upload finished recently. Do not relabel timestamps or weaken this requirement. The next required test is an actual isolated restore.

After a machine/process crash, inspect `operations/<project>-backup-operation.json`. Confirm no backup process still runs; kernel locking alone does not prove a remote upload completed. Set `BACKUP_RECOVER_ACK` to the exact project and run `make backup-recover` to restore recorded service states. This does not declare an interrupted upload successful. Inspect the exact snapshot before verification; do not select an ambiguous `latest` snapshot.

## Isolated restore drill

Provide `BACKUP_SNAPSHOT` (full64-character ID), `RESTORE_TARGET` (new absolute directory outside primary data) and identical `RESTORE_TARGET_ACK`. Select the independently verified signed bundle for the backed-up release with `RELEASE_DIRECTORY`. Run `make restore-drill`.

The tool first checks snapshot identity, restores and verifies all file bytes into a new private directory, then runs the restored real PD/TiKV/TiDB and object store in a unique Compose project. All networks are internal; no ports, worker, mailserver or gateway are started. The one-shot application probe checks restored SQL schema/history and performs a temporary private object round trip through the running primary scanner's local socket. No primary SQL/media files are mounted. This scanner dependency is explicit: a replacement-host disaster rehearsal must provision qualified signatures/scanner before this probe.

The drill removes only its temporary containers/networks, retains recovered files/receipts and leaves `RESTORE_QUARANTINED` present. Normal deployment commands refuse any installation beneath this marker. A file-integrity pass or data-probe pass is **not** a full business-recovery pass. Record end-to-end elapsed time starting before download, recovered timestamp, source data sizes and losses; compare against15minutes RPO/fourhours RTO.

## Before any recovered installation can serve users

- Keep all outbound jobs, mail queues, checkout and transfers stopped. Protect restored provider/auth/vault keys as live secrets even inside isolation.
- Reapply the independent completed-erasure and legal-hold ledger; validate eligible media, object versions and retained evidence. A historical backup must not resurrect deleted accounts. Until independent erasure replay/expiry is qualified, leave customer deletion disabled and do not publish unsupported backup-erasure promises.
- Revoke restored customer/staff sessions and outstanding login/recovery challenges. Rotate exposed credentials and require fresh staff MFA; never use restored sessions as access authority.
- Reconcile payments, refunds, seller obligations, reservations and inventory against current external evidence. Review every uncertain outgoing attempt before resuming workers. Do not retry an ambiguous financial operation merely because the old job says pending.
- Suppress expired login mail and review restored mail/outbox queues. Reconfirm policies, holds, schedules and object scanning. Exercise representative customer/admin/booster journeys in isolation.
- Record the reviewed recovery release, ledger checkpoint, operator decisions and measured RPO/RTO. Removing quarantine is an explicitly reviewed disaster cutover, not part of the drill. There is no automatic unsafe unquarantine command.

Backup expiry is an owner policy, not a default script setting. Restic `forget`/`prune`, S3 version expiry and legal holds must be reviewed together and tested against a retained independently restorable generation. No unattended deletion/pruning is enabled by this package.

References: [restic backup and partial-source failures](https://restic.readthedocs.io/en/stable/040_backup.html), [retention and pruning](https://restic.readthedocs.io/en/stable/060_forget.html), [TiDB encrypted log/PITR support](https://docs.pingcap.com/tidb/stable/br-pitr-manual/).
