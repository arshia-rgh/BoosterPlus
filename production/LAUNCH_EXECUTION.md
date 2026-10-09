# R10/R11 execution and evidence

Authorized 30 September 2026. Source scope: [final launch](../final-launch.md).
Baseline `aeae62b5980fbf18d0c183af88a6dee67f0698a0`, schema 39. This ledger distinguishes implemented tooling from exercised operations and actual production acceptance.

## Current qualification — 4 October 2026

The owner deferred off-host backups and real recovery/RPO/RTO qualification until
after initial launch. `make initial-launch-check` permits only that recorded
recovery deferral, bound to the release packet and intact owner-decision evidence.
Its status must be `owner_deferred`, decision
`2026-10-04-defer-backups-until-after-launch`, risk
`primary-host-loss-may-lose-all-data`, with operator/time and hashed evidence.
Every other check remains required. The ordinary `qualification-check` still
requires recovery measurements; neither command activates sales. Initial launch
with this deferral is not full R10/R11 completion. Backup tools remain unchanged.

The approved MTU correction restored verified downloads. The owner initially
chose to wait for vendor fixes, then explicitly superseded that hold: use stable
official images and continue despite the reviewed image vulnerabilities.
Select supported releases, pin their digests and retain raw audit reports with
image/finding-scoped owner risk acceptance. Accepted findings are not fixed or
proven unreachable. Unknown findings and scan execution failures remain blocking;
application security and runtime/recovery checks are unchanged. Private custom
vendor prototypes are not adopted. No recurring monitor is set.

See [vendor image policy](VENDOR_IMAGES.md) and [progress](../docs/progress.md).
Public DNS/PTR, trusted maintenance/mail HTTPS and the approved Gmail authentication/Inbox check are verified. Google credentials are installed privately and GitHub CLI access works; deployed identity, alert delivery, bounded live financial qualification and owner activation remain pending. Off-host backups/recovery are explicitly deferred for initial launch, as above.
The complete server qualification passed as gate100 for `8339e7771ee6e47de78507bdcec66e0479606795`, including the real-TiKV race integration suite. The commit was pushed and verified on main. Public application activation remains pending. On5October the owner moved hosted CI to service-free static/security/unit/build/configuration checks; full server qualification remains distinct from CI and release-image security/signature checks.

## Decisions

- Latest sizing/access decision (1 October2026): owner purchased ParsPack Germany with 8 vCPU, 16 GB RAM and 150 GB disk and authorized deployment through `ssh playora`. The separately budgeted `single-16gb` candidate is described in `SMALL_HOST.md`; prior larger sizing below is historical, not a measured minimum. Source clone using the explicitly approved read-only deploy key now succeeds. Domain selected on4October; DNS setup, off-host destination and final qualification remain pending.
- Owner selected one primary server with self-hosted database and storage and a separate backup destination. Primary-host failure causes downtime; no HA claim.
- Provisional compact-host sizing: 16 dedicated CPU cores, 64 GB RAM, 1 TB persistent NVMe, x86-64-v2 or newer, Ubuntu Server 24.04 LTS. This is an engineering starting point for measurement, below PingCAP's full production cluster recommendations. Do not purchase based on an unmeasured capacity guarantee. The scanner currently requires amd64.
- Production SQL uses TiDB + PD + TiKV, never unistore. One-host replicas do not create independent failure domains. No TiFlash or NATS is required by the current workload.
- Reuse the already integrated SeaweedFS S3 implementation, with private access and TLS. Keep object metadata and volume data together in recovery evidence.
- The server is accessible through the authorized `playora` operator. On 4 October the owner selected `playoragames.com`; DNS setup, external alert inbox and public mail qualification remain pending. Do not generate live payment traffic without bounded transaction authorization.
- Owner reports NOWPayments ready; credentials remain private. Provider configuration is not evidence of completed funding/refund/payout tests.
- Owner requests self-hosted email so transactional sending can run without an email relay provider. Select a static-IP host with outbound TCP25 and operator-controlled PTR. DNS/SPF/DKIM/DMARC, TLS, SMTP authentication, open-relay rejection, bounce handling and actual inbox delivery remain qualification requirements. This supersedes the preliminary Postmark recommendation.
- Owner wants services without identity-document KYC. Preserve a provider-neutral SMTP adapter. No provider is represented as guaranteeing exemption from future identity/account checks. Domain/email verification remains necessary. Postmark's mandatory account review is documented; it has not been selected. Resend is a candidate with documented SMTP/domain/API-key setup; owner/provider eligibility and production inbox delivery remain unqualified.
- Keep existing 15-minute RPO / four-hour RTO targets pending actual measurement. Off-host destination, recovery-key custodian and backup expiry require operator configuration. A copy on the primary disk is not off-host backup.

Local host disk fell below 5 GB during preparation. Owner explicitly moved heavy TiKV/load/restore/full launch qualification to the deployment server. Continue local static/security/unit/config checks. No deferred test is marked passed; do not erase CI or final gate requirements.

## Evidence ledger

| Scope | Implementation | Local evidence | Server/owner evidence still required |
| --- | --- | --- | --- |
| R10.1 host/topology/TLS | Deployment topology and preflight implemented | Existing R04 staging is historical; real TiKV qualification pending | Actual host, disk, firewall, DNS, certificate renewal, least-privilege accounts |
| R10.2 signed artifacts/CI | Bundle/build/signature tooling implemented | Existing pinned builds/scans; authenticated remote run pending | Registry access/trust, exact signed digests and successful remote workflow |
| R10.3 release/rollback | Serialized signed release and schema-compatible rollback implemented | Schema 39 readiness is exact, so older-schema app rollback must be rejected | Clean-host rollout, failed/interrupted rollout, compatible rollback |
| R10.4 monitoring/alerts | Private SQL/HTTP samples, offline dashboard, independent watchdog and alert timers implemented | Local unit/security checks; real SQL and alert delivery remain pending | Alert recipient, external primary-host outage detection, delivered firing/recovery messages |
| R10.5 backup/restore/privacy | Cold/exact-TSO SQL/media/runtime/mail restore, session sealing and independent encrypted privacy journal/replay implemented | No real R10 restore claim | Off-host SQL/media/key backups, isolated restore, erasure replay, measured RPO/RTO |
| R10.6 incidents/rotation | Runbooks and rehearsal matrix prepared; actual exercises pending | Existing R04 isolated outage exercises remain scoped historical evidence | New topology outages and secret rotation/recovery custodians |
| R10.7 operations commands | Commands and fail-closed evidence packet implemented | Existing validate/migration/staging commands | Full operations rehearsal and handover |
| R11.1 content/SEO | Pending final inspection | DI15 application evidence retained separately | Domain, public offers/prices, terms/contact/content approval |
| R11.2 identity/email | Pending deployment | Existing fixture-based portal/MFA checks | Actual Google callbacks, sender DNS, inbox delivery, first-owner MFA |
| R11.3 crypto | Adapter delivered previously | Isolated financial fixtures | Approved small-transaction budget/routes/recipients and actual receipts |
| R11.4 role journeys | DI15 baseline delivered | Re-run changed/integrated paths | Deployed owner walkthrough |
| R11.5 security/load/recovery | Fixture HTTP workload and complete acceptance packet prepared; execution pending | Full gate remains required | Real topology load, restoration, device/AT limits recorded honestly |
| R11.6 activation | Not activated | Authorized host preparation and isolated qualification underway; full gate not yet passed | Owner review and explicit sales activation after evidence |

## Input handoff (no secrets in this document)

The owner supplied `playoragames.com` (Server.ir) and an external contact inbox, stored privately. Follow [domain setup](DOMAIN_SETUP.md); DNS management, off-host backup destination, backup/key retention and custodians remain pending. SMTP credentials and Google OAuth client secret go in protected runtime files. The Google web OAuth client must allow these exact HTTPS callback paths, each on its matching configured portal origin (customer, admin and booster); see [the current callback list](GOOGLE_OAUTH_SETUP.md):

- `/api/v1/auth/portals/customer/google/callback`
- `/api/v1/auth/portals/admin/google/callback`
- `/api/v1/auth/portals/booster/google/callback`

No external email is sent by preparation tools. Live email tests require owner-selected recipients; funds tests require specific transaction authorization.

## Primary references checked 30 September 2026

- [TiDB hardware and platform requirements](https://docs.pingcap.com/tidb/stable/hardware-and-software-requirements/): Ubuntu is a compatible platform; the published production matrix is much larger than this compact MVP proposal.
- [TiDB backup/restore](https://docs.pingcap.com/tidb/stable/backup-and-restore-overview/): snapshot and log backup, restore restrictions, isolated target.
- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
- [Resend SMTP](https://resend.com/docs/send-with-smtp), [Postmark account approval](https://postmarkapp.com/support/article/1084-how-does-the-account-approval-process-work).
- [Google web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

## Local preparation evidence — 1 October 2026

- Owner input checklist: [OWNER_REQUIREMENTS.md](OWNER_REQUIREMENTS.md). No SSH/domain/production mail input is required to continue independent preparation.
- Twenty-seven deployment unit tests pass, including actual TLS chain/hostname verification, actual signature/tampering checks, release interruption and incompatible schema rejection, backup failure recovery, restore target boundaries and no-egress restore model. These fixtures do not qualify real Docker/TiKV/restic behavior.
- `preparation-check` previously passed with21 tests and daemon-free merged Compose/mutation checks; re-run after later backup additions before committing. Earlier local TiDB strict config and private object gateway binary parsing passed; current mail/restore/runtime image qualification remains server-pending.
- The Docker daemon became unavailable locally. No heavy service was started, no production email or funds moved, no off-host repository initialized, and no real snapshot restored.
- Tracked hook uses the narrow owner-authorized launch-preparation scope while heavy qualification is deferred. Root/project full gates and CI remain mandatory; reset `LAUNCH_SERVER_QUALIFICATION_PENDING` only after recording the server full-gate result.
- Outstanding implementation: continuous SQL/media recovery meeting the proposed RPO, independent privacy restore replay, monitoring/alert automation, rotation/incident rehearsal and final R11 acceptance tooling. Cold backups alone do not satisfy the online15-minute recovery objective.

### Monitoring and gate coverage stage

- Preparation stage `10e2ce8ea4ebb612455f9f9d988edba67314f0f2` pushed and exact remote SHA verified. Tracked hook passed root checks, broad Go lint, standalone gosec, live vulnerability checks (zero reachable/imported; one unused-module advisory),27 deployment tests and daemon-free merged configuration.
- New private aggregate CLI and observer cover backlog, leases, mail, media, finance uncertainty, service health, capacity, TLS/scanner freshness and backup age. Focused Go race tests and broad lint passed;29 deployment tests/config checks passed. SQL integration is added to the real-TiKV/full gate and remains server-deferred.
- Infrastructure image audits now cover pinned data/mail/restic images in the full production gate. CI retains every root gate component but frees only its disposable development services before production qualification; timeout90minutes accommodates the expanded gate without skipping checks. Authenticated remote execution remains unverified.
- Alert receiver/watchdog, measured HTTP latency/error dashboards, continuous SQL/media recovery, privacy replay and live/server acceptance remain open. No actual alert/email/payment is sent by local tests.

Real-TiKV qualification now also runs the entire race-enabled domain integration suite against a uniquely provisioned TLS cluster on the dedicated loopback14001 endpoint. Storage/scanner test fixtures remain separate from the real private S3/TLS data probe; all namespaces/credentials are disposable. The suite has not been run locally, per owner direction. The reduced test profile is protocol/concurrency qualification, not the64GB production capacity measurement.

### Encrypted SQL log preparation

- Added optional pinned BR8.5.7 tools service, separate outbound backup network, independent master/snapshot keys and least-privilege off-host credential configuration. `pitr-start`, `pitr-status` and `pitr-snapshot` use explicit encryption and private receipts; none grants combined recovery success.
- Matched the master-key file format and global checkpoint JSON against the exact upstream8.5.7 source. Tests reject raw/missing-newline/reused/permissive keys, overlapping/unsafe destinations, paused/error/stale/future/foreign checkpoints, missing acknowledgement and failed snapshots. The initial test run failed because a fixture attempted exclusive recreation; fixed the fixture, then33 deployment tests and daemon-free Compose/mutation validation passed.
- New BR image execution/audit, real encrypted upload, key recovery, task restart and exact-TiKV restore remain server-deferred. Combined online media coverage and independent erasure replay remain open; SQL backup status does not clear those requirements.

### SQL-aligned private media capture

- `recovery-capture` CLI and `media-backup` orchestrator implemented: one repeatable-read TiDB snapshot, exact TSO, bounded immutable file capture, checksums, private files, encrypted off-host archive and full-base/log coverage checks. Candidate receipts do not claim restored application success or clear combined-recovery alerts.
- Focused Go race tests and broad lint passed. Local production34 tests/config checks passed. Initial sandboxed lint could not load compiler-cache packages; rerun with cache access found a shadowed cleanup error, fixed it, and the lint rerun passed. A mistargeted make invocation was corrected; no failed attempt is counted as passing.
- Added real-TiKV integration coverage for101 media records and a concurrent deletion across page boundaries; execution remains server-deferred. Actual capture/upload speed, storage consumption, log continuity, restored media equality, runtime/mail/key recovery and erasure replay remain unqualified.

### Independent-host outage detection

- Implemented separate-host HTTPS/primary-heartbeat watchdog and restricted SSH heartbeat emitter, with systemd templates and explicit host-key/least-privilege installation procedure. Uses no app/provider secrets, preserves source timestamp and sends only allowed alert codes. Black-box probe latency is distinguished from actual API p95.
-37 local deployment tests/config checks passed, including whole-host/SSH failure, stale/future/naive heartbeat and invalid public responses. No real remote probe, timer installation, recipient delivery or independent-host availability claim. Historical HTTP dashboards and actual incident rehearsal remain open.
- Media capture stage8e902ad passed the complete local backend stage gate (format/tidy/generated/vet/lint/gosec/govuln/modules/all unit-race tests/39 migration validation/builds), root checks and34 deployment/config tests, then pushed and exact remote SHA verified. SQL integration/full container qualification remains server-deferred.

### Isolated restored-media verification

- Added bounded `recovery-import-media` with explicit quarantine acknowledgement. It validates the complete SQL/media index before writes, rejects malformed/duplicate/foreign paths and verifies each private-S3 write by readback. It never restores SQL, changes a primary database or clears quarantine.
- Focused Go race tests and configured lint passed. Real SQL/S3 test coverage was expanded for mismatched TSO contents, corrupted archive, exact100-object restoration and idempotent repeated import; execution remains server-deferred. Initial test-file creation used the wrong working directory and created no files; corrected paths before validation.
- Watchdog stage3df4129a749a955bf967f004cffef989c12a3478 passed its tracked root/Go security/37 deployment configuration gate, pushed and exact remote verified. No host/timer/alert qualification is inferred.
- Remaining preparation includes the complete BR/media/runtime/mail restore coordinator, independent erasure/hold replay, request-metric dashboards/load workload and final incident/rotation/acceptance packet. Server/domain/live-provider evidence and owner activation remain separately blocked by deferred inputs. Do not request SSH on the basis that R10/R11 are already complete.


### Coordinated recovery and qualification handoff — 1 October2026

The local deployment package now includes `restore-point-drill`, exact SQL/media/runtime archive verification, fresh target identities, independent read-only BR source credentials, session/challenge/recovery invalidation and optional current off-host privacy evidence export/replay. No public/API server, worker or mail daemon is started; cleanup includes tools-profile containers, retains all data and never clears quarantine. Mail remains an interval archive offline. Failed/interrupted targets require a new target for retry.

The API now fails closed on irreversible erasure unless the independently encrypted/readback-verified journal is configured. Conservative intents/holds cannot silently become automatic deletions; committed erased facts reapply the existing protected-evidence-preserving cleanup. Actual off-host conditional-write policy, durability, historical backfill, current journal completeness, eligible-file/version/replica purge and recovery-key custody require server/operator qualification. Until then deletion remains disabled. See `RECOVERY.md`.

Added bounded five-minute redacted HTTP numeric samples, an offline private dashboard, a fixture-only100-session/20requests-per-second HTTP workload, and a21-item evidence packet that rejects missing/deferred/stale/foreign-commit/tampered evidence and missing/out-of-target RPO/RTO. None sends real email/funds or enables sales. See `QUALIFICATION.md` for the complete server/owner execution sequence; HTTP response latency alone does not measure persisted chat visibility.

Focused Go recovery/config/CLI/journal/app race tests passed and the new real-TiKV integration scenarios compiled. Initial checks caught a fixture principal-name error and unchecked test/config decoding errors; corrected without skipping checks. Local deployment/configuration tests passed before final additions; final tracked-hook receipt is recorded in progress after execution. Heavy real-TiKV/BR/restic/load/image/full-gate tests and authenticated remote CI remain **DEFERRED**, not passed.

Remaining acceptance requires server SSH/host provisioning, independent backup/journal/watchdog configuration, domain/mail DNS and recipients, real Google callbacks, approved content/retention/terms, bounded live financial authorization and owner walkthrough. The monitor conservatively retains recovery alerts until the actual backup/restore policy is qualified; the online archive is still a candidate receipt, not a fabricated recovery PASS. Final R10/R11 completion and sales activation remain open until actual evidence is recorded.


### Public DNS/TLS preparation and qualification — 4 October 2026

Cloudflare DNS and mail forward/PTR alignment are verified. An isolated, scanned
maintenance gateway obtained publicly trusted website/mail certificates. Website
503 and mail404 responses are intentional; the application and public SMTP are
not active. Certificate renewal and real delivery remain open. SPF/DKIM values
are ready in [MAIL_DNS_SETUP.md](MAIL_DNS_SETUP.md) for owner publication.

The normal gate25 passed application/static/browser/staging checks but failed
sustained real-TiKV memory protection; run26 reproduced the failure. Heap evidence
identified a large fixed upstream debugging-symbol cache. A measured mail fixture
supports testing4GiB TiKV/1GiB mail within the same host memory budget. Corrected
run34 passed protocol/security/restart probes and is executing the full database
suite. This is not full-gate, capacity, recovery or launch success.

The owner separately accepted eight newly reported Redis package findings for
the exact existing mail digest. A fresh scan passed the explicit acceptance
policy with474accepted findings, not a clean vulnerability result. See
[the review](security/MAIL_REVIEW_2026-10-04.md). All unaccepted findings and scan
errors still block; original failed reports are retained.
