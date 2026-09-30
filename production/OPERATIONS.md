# Operator monitoring, incidents and rotation

Owner/operator contacts and escalation destinations are configured at deployment. No recipient is invented. All commands run from the trusted operator checkout with a protected `DEPLOY_ENV`. SSH/Docker membership grants administrative access; do not give it to ordinary boosters or customer-support staff.

## Private monitoring

`make monitor` collects read-only numeric SQL aggregates, service state, disk/inode capacity, private/public certificate expiry, scanner signature age, self-hosted mail queue/TLS and backup freshness. It writes a private `operations/<project>-monitor.json` snapshot. `make monitor-status` reads it without probing. This is the initial private operator status view; it has no public metrics port or customer identifiers/payloads.

`make monitor-notify` also sends firing/changed/recovery notifications to the independently hosted HTTPS endpoint in `ALERT_ENV_FILE`. The receiver accepts JSON `project`, `state`, `codes`, `event_id`, `observed_at`, `runbook` with a bearer token. No amounts, email addresses, order IDs, credentials or message content are sent. Redirects are rejected. Failed delivery does not advance the deduplication state; identical ongoing alerts repeat hourly. Actual delivered firing/recovery evidence remains mandatory.

Install the reviewed systemd service/timer under `/etc/systemd/system` after changing the account/checkout/data paths to the selected host. `/etc/playora/operations.env` contains only `DEPLOY_ENV=/protected/path/deployment.env`, mode0600. Create the private cache path before enabling the unit. Enable only after a manual dry read and an owner-authorized destination test. Check `systemctl list-timers` and service failures. A timer file on disk is not evidence it runs.

**Independent monitoring is still required.** Run HTTPS/mail availability checks and a missing-monitor-heartbeat check from the backup host or another independent host. A primary-host outage cannot alert through its own mail or timer. Establish the independent receiver/watchdog and measured HTTP latency/error dashboards during server qualification; the local snapshot alone does not cover these signals. Do not call basic container health a worker heartbeat: job age/expired leases are separate signals.

Initial operational thresholds are visible in `deploy/monitor.py`: runnable jobs120s, login mail60s, ordinary mail300s, scans120s, purge backlog2h, finance reconciliation300s, any failed job/uncertain outgoing attempt, scanner signatures3days, certificate expiry14days, free disk20%/100GiB and verified recovery point15minutes. These are engineering alert defaults, not customer promises or retention rules. Tune from measured service behavior and record the reason; do not raise thresholds merely to make an unhealthy service appear healthy.

## Incident response by alert family

| Code family | First response | Recovery evidence |
| --- | --- | --- |
| `metrics_*`, `service_*`, `public_tls_*` | Check host clock, exact running images, private service logs and schema readiness; preserve failed release receipts. | Matching-schema ready API, HTTPS smoke and stable process state. |
| `jobs_*`, `notification_mail_*` | Inspect private staff job console; check DB leases and downstream dependencies. Never blindly retry money movement. | Backlog drains; only the reviewed failed generation retried; no duplicate effects. |
| `auth_mail_*`, `smtp_*` | Inspect private Postfix queue, DNS/PTR/TLS, disk and delivery failures. Do not print queued login content. | Real owner-selected recipient receives a fresh login; expired codes remain unusable. |
| `payment_*`, `outgoing_*` | Pause new checkout/outgoing issuance as appropriate. Keep incoming reconciliation running. Match merchant evidence and immutable local obligations. | Independent provider receipts resolve uncertainty; audit/amount caps remain intact. |
| `media_*`, `scanner_*` | Keep uploads quarantined. Repair storage/scanner access and update signatures using the official updater. | Clean/infected fixtures classify correctly; no private media becomes public. |
| `disk_*`, `inode_*` | Reduce new writes, investigate bounded logs/queues/data growth; expand capacity. Do not prune unknown Docker volumes or DB files. | Verified free space, healthy DB/object writes and backup integrity. |
| `certificate_*`, `mail_certificate_*` | Renew the specific leaf and validate its chain/SAN before controlled restart. Confirm the mail daemon serves the renewed Caddy certificate. | Verified client connections, expiry margin, no insecure TLS fallback. |
| `backup_*`, `recovery_point_*` | Check independent destination, recovery credentials, latest complete snapshot and log/media coverage. | Verified consistent recovery point plus current isolated restoration evidence. |

Record UTC times, release/schema, scope, decisions and redacted evidence. Keep audit records separate from bounded operational logs. If the app is unavailable, use an independently accessible copy of these runbooks. Do not move live funds as fault injection. Failures caused by the qualification environment remain failures until repeated successfully.

## Secret and certificate rotation

| Material | Required sequence and recovery boundary |
| --- | --- |
| Private data TLS | Issue unique replacement leaf/SAN certificates with the existing protected CA, stage atomically, validate, restart one dependency at a time, then client probes. Leaf renewal must finish before90-day expiry. CA change needs an overlapping trust bundle and a separately rehearsed migration. Never simply rerun first-install preparation. |
| SQL runtime/migration accounts | Create replacement least-privilege identities privately, verify TLS/grants, update only their corresponding runtime files, restart clients, verify dependencies, then revoke old identities. Preserve the previous account until validation; no password in CLI arguments. |
| Object identities | Stage old/new IAM identities, verify scoped read/write/delete and deny administrative access, rotate app configuration, restart clients, revoke old identity. Backup/admin keys stay separate. |
| Proxy shared key | Maintenance window: update storefront/admin and API together, restart, verify forged-header rejection and legitimate requests. A mismatch fails closed. |
| Auth/session key | Planned global sign-out; rotate secret, invalidate active sessions/challenges, require fresh Google/email plus staff MFA. Review account recovery and notify via the approved channel. |
| Vault encryption keys | Add a new version while retaining all referenced old versions. Rewrap/re-encrypt using reviewed application tooling, count references and verify test decryption before removing an old key. Never delete a key solely because it is no longer the active writer. Tooling/rehearsal remains an explicit qualification item. |
| NOWPayments API/IPN/outgoing credentials | Coordinate merchant-side rotation, pause new issuance where needed, retain/reconcile ambiguous attempts, update protected configuration and test signed callbacks/read-only reconciliation. Do not assume old/new IPN secrets can coexist unless the adapter/provider explicitly supports it. |
| Restic/recovery key | Add a replacement repository key/password, test it from a clean restore host, update independent custody, then remove the retired key. Changing the password does not erase already exposed repository data. |
| Release signing key | Independently distribute the new public-key fingerprint, sign/verify a known bundle, preserve old trusted artifacts for recovery, revoke compromised signing trust. The private signing key never enters CI or the server. |
| Mail account/DKIM | Rotate application submission credentials separately from staff mailboxes. Publish the new DKIM selector, verify aligned delivery before retiring the old selector, account for DNS caches, and update encrypted recovery copies. |

Each rehearsal must use isolated test credentials/data, cover failed/partial rotation and record actual recovery. Written procedures do not count as exercised rotation. Staff compromise uses the audited suspension/session revocation/recovery workflows with both-factor requirements; never promote an owner by direct SQL edits.
