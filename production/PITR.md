# Encrypted SQL log recovery

This optional layer supplements the consistent cold archive in [BACKUP.md](BACKUP.md). It does **not** qualify the whole application's recovery point: matching private media, keys, mail/configuration, privacy replay and a successful isolated restore are required too. Fifteen-minute RPO remains a target, not a result. Do not enable public sales on a SQL-only receipt.

## Configure on the selected server

Use pinned BR/TiKV8.5.7. Give the SQL backup identity only its own off-host S3 prefix; keep it separate from the restic archive prefix. Required BR backup privileges include ListBucket scoped to the prefix and GetObject/PutObject/DeleteObject/AbortMultipartUpload there. Do not use the app storage identity or a bucket administrator. The current wrapper requires the same independently verified HTTPS storage endpoint as the archive; a different endpoint requires its own reviewed off-host policy first.

Prepare two independent cryptographically random256-bit keys under the operator-owned private recovery directory **outside** `DATA_DIRECTORY` and independently escrow both. Master key format is exactly64hexadecimal characters plus a newline; snapshot key is64hexadecimal characters, optionally newline. Never print them, paste them into command arguments or commit them. For example, from that private directory, `umask 077` then `openssl rand -hex 32 > master.key` and separately `openssl rand -hex 32 > snapshot.key`. Do not overwrite existing keys. Loss of either key can make the corresponding backup unrecoverable.

Set these in the private deployment manifest:

- `PITR_ENABLED=true`
- `PITR_ENV_FILE=/absolute/private/sql-backup.env` containing only the dedicated AWS access/secret identity and optional region, following `pitr.env.example`.
- `BR_STORAGE_URL=s3://<sql-bucket>/<prefix>?endpoint=https%3A%2F%2F<offhost-endpoint>`; never put credentials in this URL.
- `BR_MASTER_KEY_FILE` and `BR_SNAPSHOT_KEY_FILE` absolute private paths readable by the UID1000 operator/backup process.

`make validate config-check` verifies the configuration. The overlay adds outbound backup networking only to TiKV and the explicit BR tools job; PD remains isolated. Enabling the overlay on an existing deployment requires a reviewed rollout so TiKV receives the mount/network before starting logs. No job changes this configuration silently.

## Start and inspect

With `DEPLOY_ENV` set, run `PITR_START_ACK=<exact-project> make -C production pitr-start` once. It starts the encrypted log task with a file-backed master key; raw data keys are not passed in arguments or intentionally stored unwrapped in PD. Repeating start against an existing task is not a reset: inspect its state instead.

`make -C production pitr-status` requires exactly one matching task with status NORMAL, no reported errors and a valid recent **global storage checkpoint**. It stores only allowlisted numeric checkpoint evidence, not arbitrary error payloads or object URLs. Stale/future checkpoints and missing tasks fail. `monitor` independently probes this status when PITR is enabled; log health never clears a stale combined-recovery alert.

`make -C production pitr-snapshot` takes a full encrypted SQL snapshot in a fresh prefix and reads its exact checkpoint back from encrypted metadata. A private `sql_only` receipt records the signed release commit and location. It does not replace the cold-backup receipt or claim successful restore. A failed/interrupted upload leaves no new success receipt; inspect incomplete prefixes before a later cleanup.

BR commands have bounded execution and private error output. Large datasets may exceed the current15-minute Compose command bound; treat that as failure and qualify an explicitly bounded larger backup execution policy on the server, never accept a partial result.

## Recovery and retention boundaries

Use only a newly provisioned isolated target. Never run BR restore against the primary. Restore the compatible full base plus encrypted logs only through the TSO covered by the verified media manifest; keep API/gateway/worker/mail disabled, revoke restored sessions and reconcile finance before traffic. SQL-only restore is not a business restore. Combined online media capture, restore orchestration and independent erasure/hold replay are still implementation requirements, tracked in `LAUNCH_EXECUTION.md`.

No automatic log truncation, snapshot deletion or key retirement is provided. Owner retention must preserve a usable full base, all necessary logs, matching media and key versions. Separately test clean-host recovery with independently escrowed keys, wrong/missing-key failures, log interruption/restart, object-store outage, exact checkpoint continuity and measured RPO/RTO before enabling retention or sales.

## Version-specific references

Checked against the pinned upstream source, not inferred from a generic encryption example:

- [BR master-key file parser](https://github.com/pingcap/tidb/blob/v8.5.7/br/pkg/encryption/master_key/file_backend.go): hexadecimal key and required newline.
- [BR status JSON and global checkpoint](https://github.com/pingcap/tidb/blob/v8.5.7/br/pkg/stream/stream_status.go).
- [BR encryption options](https://github.com/pingcap/tidb/blob/v8.5.7/br/pkg/task/common.go).
- [TiDB PITR guide](https://docs.pingcap.com/tidb/stable/br-pitr-guide/).
