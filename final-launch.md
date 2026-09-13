# PLAYORA — final launch: R10 and R11

**Status: ON HOLD.** The owner has deferred production-readiness implementation and launch until the [UI/UX roadmap](UI_UX_ROADMAP.md) is completed and reviewed. Neither this document nor completion of a UX phase authorizes resuming R10/R11. Separate explicit owner authorization is required.

Updated: 13 September 2026. R08 is delivered as `6da4bd592e94e4f85ec87b1e2be8ccf2b8d126d6`; R09 is delivered as `7f9b7e00d9f0a6025b46bfb7cb33372bc27f987f`. These are implementation deliveries with local qualification, not production-launch certification.

This is the retained execution plan for **all R10 and R11 work**. It consolidates [REMAINING_ROADMAP.md](REMAINING_ROADMAP.md) sections 5, 6–9, the production requirements of [BOOSTER_PLUS_SPEC.md](BOOSTER_PLUS_SPEC.md) sections 17–18 and 20, and [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md) P11/P12. Existing requirements remain binding; the source documents are retained for traceability. New UX acceptance adds a prerequisite and does not remove a production requirement.

`production/` remains deployment-only: Compose, gateway, runtime configuration, monitoring, release/backup scripts and runbooks. Go application code remains in `backend/`; storefront and separately built admin React code remain in `frontend/`. Preserve the owner-created `production/deploy/` directory. Do not place frontend/admin source or application business logic under `production/`.

## 1. Existing foundation versus unfinished qualification

| Area | Already present at R09 | Work still required |
| --- | --- | --- |
| Application builds and gates | Independent projects, storefront/admin builds, pinned tools, full tracked pre-commit and CI configuration | Requalify the final UX revision and actual release artifacts; verify remote CI through authenticated access |
| Deployment foundation | `production/compose.production.yaml`, isolated staging overlay, Caddy gateway, private API routing, API/worker/migration/scanner services | Select real hosting/data services; complete operational release and recovery automation; qualify the deployed topology |
| Commands | Configuration validation/preflight, pull/up/status/logs/smoke and explicit migration commands; local TLS outage/recovery drill | `release`, `rollback`, `backup`, `backup-verify`, `restore-drill` are reserved/fail closed in `deploy/manage.py`; they are not implemented production automation |
| Finance | Live-only NOWPayments adapter and durable checkout/refund/payout workflows qualified with isolated fixtures | Controlled real invoice funding, signed public callbacks, receipts, refunds and seller payouts with actual provider evidence |
| Privacy | Owner-published retention policy, reviewed requests, atomic live-data cleanup and confirmed eligible-file purge workflow | Operational backup retention, restore-time erasure reapplication, storage replica/version handling and recovery verification |
| Business content | Generic games/forms/rules/packs, versioned legal/content/finance/seller configuration | Owner-approved MLBB season/ranks/prices/options, win-rate meaning/remedies, seller terms, support/contact and launch policies |
| Resilience | Local TiDB unistore tests and isolated dependency failure drills | Real production TiDB/TiKV behavior, measured recovery, load, alerts, key rotation and clean-host release rehearsal |

Keep test services, synthetic users and isolated payment fixtures out of production. Existing local test success is evidence of those tests only. No live funds were moved for R08/R09.

## 2. Preconditions and operator inputs

Before resuming, review this plan against the final accepted UI/UX commit and current source/tool versions. Record the chosen release commit, topology, owners and remaining decisions. Missing inputs block only their dependent work, but every launch-blocking input must be closed before enabling public sales.

| Required decision/input | What it determines |
| --- | --- |
| Real domain/DNS, certificate contact, hosting resources/region and budget | Gateway TLS, OAuth origins, public webhook URL, sizing and first-deploy procedure |
| Managed TiDB or supported self-managed TiDB/PD/TiKV topology | TLS, accounts, capacity, upgrades, backup/PITR tooling, recovery and availability limits |
| Private S3-compatible service and bucket/lifecycle/versioning setup | Quarantine/clean objects, durability, encryption, backup/restore and erasure policy |
| Production email sender/domain/service, Google OAuth project/settings | Sender verification/delivery, callback origins, passwordless login and staff sign-in qualification |
| NOWPayments merchant settings, approved assets/networks and fee treatment | Enabled checkout routes, minimum transaction budget, public IPN and outgoing qualification |
| Refund, cancellation, partial work, missed target, no-show and appeal terms | Published remedy behavior and customer-facing deadlines |
| Both per-offer seller arrangements: proceeds/commission, timing, ownership, delivery and dispute terms | Buy-first and consignment activation, inventory release and payout triggers |
| Current MLBB season/ranks, hero/role options, prices and win-rate interpretation | Actual public catalog, estimates, quotes, packs and lawful/accurate service copy |
| Languages/RTL selection, business/legal/support contact and coverage hours | Final localized layouts, terms and honest support/delivery statements |
| Retention, backup expiry, legal holds, rotation/recovery custodians, alert recipients | Privacy promises, incident response and accountable operational ownership |
| Traffic/load and recovery targets | Capacity acceptance, RPO/RTO and operating costs |

Preserve the proposed targets until revised explicitly: at most **15 minutes data loss (RPO)** and **four hours restoration (RTO)**; initially **100 concurrent active sessions and 20 API requests/second**, ordinary API p95 below **500 ms**, estimates p95 below **750 ms** excluding external provider latency, and persisted chat visible within **two seconds** under normal conditions. These are targets to measure, not guarantees already achieved. Select infrastructure capable of meeting them and record the measurement method.

Private credentials are supplied through protected runtime files or the chosen secret manager, never chat, examples, screenshots or commits. Provider requirements stay with the provider; this plan does not add an unsupported customer country/document form or promise unrestricted provider availability.

## 3. R10 — production operations and release automation

**Outcome:** the chosen deployment can be released, monitored, recovered and maintained using tested procedures and accountable operators. All R10 items below are on hold.

### R10.1 Topology, configuration and clean-host preflight

- Complete the chosen production topology and document host/OS/container/runtime versions, CPU/memory/disk sizing, disk growth and capacity limits. Reuse the R04 stack rather than rebuilding a parallel deployment.
- Gateway exposes 80/443 only, persists ACME state and certificate renewal data, redirects HTTP correctly and enforces qualified request/body/time limits, compression and security headers.
- Storefront and admin use their separate immutable SSR images and asset namespaces; no development server, source mounts or unqualified static-SPA replacement. Admin stays under the qualified `/admin` routing boundary.
- API (`cmd/server`), worker (`cmd/worker`) and explicit one-shot Cobra migration job remain distinct. Runtime accounts have no DDL privilege; migration/backup credentials are separate. Schema compatibility/readiness precedes traffic.
- Use verified TLS for TiDB and private object storage, qualified SMTP TLS and private scanner access. Self-managed database/storage choices need actual durability and host requirements. Development TiDB unistore is never the production database; replicas on one host do not establish disaster tolerance.
- Preserve the trusted gateway → storefront API ingress → private API contract. Strip spoofed forwarded/internal-auth headers, keep backend ports private, verify real client address handling and rate limits. Exercise OAuth, CSRF and secure host-only cookies through the actual gateway.
- Public callbacks require signature verification, bounded requests, durable inbox acceptance and reconciliation. They must remain reachable without customer-session CSRF and must not trust spoofable IP headers for payment authority.
- Non-root application images, read-only filesystems where applicable, dropped capabilities, bounded writable mounts, resource/restart/stop policies and separated public/application/data networks remain required. No Docker socket mounted into app containers.
- No public DB, object console, metrics, broker or scanner management port. No Mailpit, debug/test endpoints, synthetic credentials, placeholder keys, `latest` app images or development proxy fallback in production.
- Keep NATS optional. Introduce it only for a demonstrated workload; if selected, qualify authenticated private JetStream, persistence, ordering/replay, redelivery and backup/recovery. Existing SQL jobs/outbox do not need replacement merely for launch.
- Produce a clean supported-host first-deploy procedure using operator-provided configuration; fail with actionable redacted errors if any mandatory dependency or setting is absent.

### R10.2 Release artifacts and authenticated CI evidence

- Produce versioned immutable images for API/worker/CLI, storefront, admin, scanner and gateway; record commit, digest, architecture, lockfiles/tool versions and compatibility matrix.
- Generate SBOMs, provenance/attestations and signatures with documented verification/trust policy. The release command must verify the intended artifacts rather than trusting a mutable tag.
- CI retains the complete root/backend/frontend/production gates. Verify the actual remote run with authenticated access; a local pass or a workflow YAML file does not establish remote success.
- Configure bounded release permissions, protected secrets and serialized deployments/migrations. A build job must not expose merchant or database runtime secrets to untrusted code.
- Record scan results and handle new advisories with fixes or explicit narrow, reviewed exceptions. Do not lower thresholds or disable gosec/security checks to publish.

### R10.3 Release, explicit migrations and rollback

Release sequence: preflight → verified image retrieval → backup and schema compatibility checks → serialized explicit SQL migration → app rollout → readiness and business smoke → recorded outcome.

- Finish `release` and `rollback` with clear preconditions, locking, interruption/retry behavior and audit/evidence output. Preserve persistent volumes and detect wrong environment/host/project.
- Use only `backend/migration/` through Cobra. Validate history/checksums, dirty/partial migration state and concurrency locks. Never run Ent/Atlas migrations or auto-migrate in API/worker startup.
- Requalify historical SQL migrations and old catalog/order snapshots against the selected production version matrix; cover all migrations through the accepted UX revision, not only SQL1–25.
- Prefer schema-compatible expand/contract changes. Document which older app image can run on the resulting schema. Automatic destructive down migrations are not a rollback strategy.
- Rehearse failed migration, failed image retrieval, unhealthy rollout, interrupted release and worker shutdown. Detect partial completion before retry; do not lose or duplicate financial actions.
- State expected maintenance/downtime for the Compose rollout. Do not claim zero downtime or HA without implementing and measuring it.

### R10.4 Monitoring, logs, dashboards and alert delivery

- Define service health/readiness and black-box public uptime checks; API latency/error rates, DB connectivity/pool pressure and capacity/storage growth.
- Monitor job backlog, oldest runnable job, lease expiry, retry/dead-letter exhaustion, worker liveness and shutdown/recovery.
- Monitor webhook acceptance, signature failures, reconciliation age/lag, uncertain invoices, incoming finance exceptions, refunds and seller payout attempts awaiting evidence. New checkout pause must not stop existing reconciliation.
- Monitor SMTP delivery/failures, media queue/scan failure, scanner signature freshness, quarantine backlog, object cleanup/purge age and storage/disk pressure.
- Monitor reservations, scheduling conflicts, overdue work, session/auth abuse, TLS expiry, backup age and most recent successful restore drill.
- Keep structured redacted operational logs separate from audit evidence. No game credentials, messages, OTPs, provider secrets, tokens or unnecessary personal data in metrics/logs/event labels.
- Add private dashboards and real alert destinations with severity, thresholds, owner, escalation and runbook links. Test an alert reaching the responsible operator and its recovery notification; configuration alone is not acceptance.

### R10.5 Encrypted backup, restore and privacy recovery

- Implement encrypted off-host SQL/object backups with separate least-privilege credentials, retention, integrity verification and recovery keys stored independently. A local volume snapshot alone is not a disaster-recovery plan.
- Record backup consistency across SQL, private media, migration history, encrypted vault material, key versions, auth/session state, certificates and essential integration configuration. Explain snapshot gaps and any PITR dependence.
- Implement `backup`, `backup-verify` and `restore-drill`. A successful upload/checksum does not prove the application can be restored. Restore real representative SQL and media into a clean isolated target and run business checks.
- Measure actual backup age/data loss and full restoration time against the agreed RPO/RTO. Record topology, dataset sizes, timestamps, keys used by identifier only, validation results and failures.
- Restore workers in a safe paused/quarantined state. Reconcile provider evidence and job/outbox state before outbound work resumes; do not replay historical invoices, refunds, payouts or customer emails blindly.
- Revoke/revalidate restored sessions as designed, recheck inventory/coupon/booking constraints and verify protected credentials only in isolation with test secrets.
- Preserve an erasure/hold record independently enough to reapply completed deletions after restoring an older backup. Verify eligible media including versions/replicas follows the published policy; do not resurrect deleted accounts or files unnoticed.
- Owner retention publication is necessary but does not implement backup expiry. Keep deletion disabled if its published operational promises cannot be honored. Financial/dispute/audit evidence and holds remain preserved according to accepted policy; distinguish live cleanup, file purge and backup expiry.
- Restore/destructive commands require an explicit target and acknowledgement, reject production resources in test modes and never overwrite production as part of a drill. Document a separately controlled real disaster-recovery procedure.

### R10.6 Incidents, key rotation and operational handover

- Rehearse API/worker crashes, database/storage/scanner/SMTP/provider failures, delayed/duplicate delivery, missing callbacks, expired leases, disk pressure and graceful shutdown/restart.
- Document and test auth/session, vault, proxy, provider/IPN, database, storage and backup key rotation. Specify coexistence windows, re-encryption where needed, access revocation, recovery custodians and rollback behavior without printing secrets.
- Provide staff compromise/recovery procedures retaining both-factor verification and audit boundaries. Record incident ownership and access to the runbooks when the main app is unavailable.
- Runbooks: first deployment; upgrades/migrations; release/rollback; backup/restore/disaster recovery; finance uncertainty/reconciliation; failed jobs/email/scans; key rotation; deletion/backup restore; incident response and operator handover.

### R10.7 Required commands and completion evidence

Complete and document `make -C production help`, `validate`, `preflight`, `config-check`, `pull`, `up`, `status`, `logs`, `smoke`, `migrate-status`, `migrate-plan`, `migrate-up`, `release`, `rollback`, `backup`, `backup-verify`, `restore-drill`, `pre-commit` and the isolated `staging-test`. Existing targets stay functional. Each command explains host/environment context, fails closed on missing config, preserves volumes and redacts sensitive errors.

Root pre-commit continues to validate Compose/gateway/monitoring config, ports/secrets/image policy, release-script behavior, dependency/container findings and an actual isolated stack drill, alongside both project gates. Never skip the existing production gate because R10 is on hold; running established regression checks is not starting new R10 implementation.

R10 acceptance requires verified remote CI, signed/verified artifacts, clean-host release evidence, successful schema-compatible rollback, measured SQL/media restoration, delivered alerts, exercised outage/rotation runbooks and a documented topology with honest availability limits. Store reproducible commands/results and remaining limitations in `docs/progress.md` and deployment runbooks. No public-launch approval is implied by R10 completion.

## 4. R11 — final launch qualification

**Outcome:** the final approved product works on the intended deployment, with real integrations, approved business content and operational ownership. All R11 items are on hold.

### R11.1 Final product/content and UX sign-off

- Obtain owner acceptance of UX01–UX10 and close all blocking/high defects; recheck the actual release in the production topology so routing/assets/configuration cannot invalidate local screenshots.
- Publish approved, correctly licensed/original branding and MLBB rank/season assets. Use the owner-reviewed PLAYORA identity from the UI/UX roadmap and its approved derivatives, retaining the current overall green theme, fonts and website art direction. Verify the new display name, domains, email sender, Google consent screen, provider merchant identity and public metadata agree; retain historical records accurately. Keep the rank animation and its accessible fallback. This brand update does not resume R10/R11.
- Review every configured rank progression, field/reference/condition, pricing rule, hero/role restriction, win-rate interpretation, supported mode, package scope/capacity and delivery estimate. Synthetic values and illustrative profiles must not masquerade as live offerings or outcomes.
- Approve custom quote, fixed pack, crypto fee, cancellation/dispute/partial-work/no-show/missed-target/refund policies and account ownership/handoff/seller payout terms. Historical accepted versions remain accessible and immutable.
- Approve legal/service/privacy/account-sale/contact text, support coverage/timezone and business identity. Avoid unqualified 24/7 service, “risk-free” or delivery guarantees. Keep private drafts out of public/email copy.
- Select languages and verify localized dates/times/money, input handling, long translations and RTL if selected, including motion/navigation direction. English is the initial language, not an implicit final locale decision.
- Complete public route titles/descriptions, canonical URLs, robots/sitemap, share images and crawlable SSR content. Structured data reflects real published products/reviews only. Keep private/admin/staging out of indexing and public caches; `noindex` is not authorization.

### R11.2 Real email, Google and staff access

- Qualify sender/domain authentication and actual inbox delivery for login, order activity, alerts/unsubscribe and security notifications. Check delay/failure/retry behavior without exposing codes in logs.
- Verify production Google OAuth consent/configuration, exact redirect origins, passwordless email alternatives, linking/conflicts, session expiry/logout and safe return paths on storefront/admin.
- Bootstrap the first owner explicitly and privately. Confirm MFA at every staff sign-in, recent factors for sensitive actions, recovery code handling, hierarchy and audit visibility. No development bootstrap shortcuts in public runtime.

### R11.3 Controlled real NOWPayments qualification

NOWPayments sandbox is retired. Use the fixed **production API only**. `PAYMENTS_ENABLED=false` pauses new checkout and leaves orders unpaid; reconciliation of existing payments continues. Outgoing transfers have a separate activation switch. Missing credentials, redirects, callback payload assertions and provider failures never fabricate success.

Before moving funds, record the exact test merchant, asset/network, purpose, spending/fee cap, receiving/refund/payout destinations and responsible operator through a protected channel. Obtain the specific transaction authorization required at execution. Credentials in `.env` alone do not authorize arbitrary funds movement. Recheck current provider documentation/minimums/fees/settings at that time; do not bake today's assumptions into the release.

- Create and fund a small real invoice above the current route minimum, with approved low-fee asset/network. Match provider invoice/payment identifiers to the local attempt and immutable accepted contract.
- Receive a correctly signed callback at the real HTTPS URL; demonstrate durable acceptance, replay handling and authenticated independent reconciliation. Qualify the provider's actual retry interval/count configuration and missed-callback recovery.
- Verify exact amount/asset/network and receipt allocation, order activation, coupon redemption/capacity, and customer progress. A public callback or HTTP 200 alone does not prove a funded checkout.
- Qualify paused checkout while existing payments reconcile, invoice expiry versus reservation timing and recovery after temporary provider/API failure. Fault injection stays isolated when inducing it live would risk funds.
- Execute a controlled authorized refund through recipient confirmation, recent owner factors, approval, issue, provider evidence and destination receipt. Verify exact cumulative cap and recorded fees/amounts.
- Execute controlled seller payout qualification for the enabled arrangements. Buy-first requires confirmed seller payment before publication; consignment requires buyer settlement, acknowledgement, dispute/hold checks and accepted timing. Match independently confirmed outgoing evidence and actual destination receipt.
- Keep an evidence record with redacted references, timestamps, amounts/routes, contract/receipt/obligation links and observed provider states. Mark scenarios verified only by fixtures separately from those exercised live.

Local fixtures remain mandatory for forged/duplicate/reordered/missed callbacks, ambiguous writes, under/over/late/double payments, wrong route, reversal, caps/concurrency and outage paths. Controlled live checks complement them; neither evidence type substitutes for the other.

### R11.4 End-to-end acceptance across all roles

Exercise the deployed release through real APIs for both boosting modes, custom request → quote/revision → acceptance → payment → assignment/scheduling → proof/review/completion; fixed package direct purchase; service case/appeal/hold/remedy/refund; seller submission/clarification → accepted offer → listing/reservation → buyer payment/handoff/acknowledgement → eligible payout.

Requalify all seven approved additions: booster portal; coupons; verified purchase reviews; favorites/reorder; availability alerts; delivery estimates/scheduling; pre-sales support. Include sold/archived inventory, changed catalog/reorder compatibility, explicit consent/unsubscribe, no-show/delay/cancellation and refund/dispute review labels.

Admin/owner acceptance covers catalog/form/rules/package editors, quotes/orders, inventory/offers, inbox, finance/cases/payouts, reviews, customers/sessions/roles, calendars, media, alerts, content/legal/retention, privacy, jobs, audit and reports. No required task depends on undocumented database edits. Exports are bounded, authorized and audited; currencies/date basis remain explicit.

### R11.5 Security, performance and recovery acceptance

- Re-run full security/dependency/container checks and targeted threat tests on the release/version matrix: ownership/role isolation, CSRF/session/proxy headers, input injection, uploads/scanning, game secret access, rate limits/quotas and personal data leakage.
- Verify inventory/coupon/payment/booking concurrency, financial idempotency, callback replay/reconciliation, stale revisions, audit rollback and explicit migrations against production TiDB/TiKV. Local unistore is not sufficient evidence for clustered transaction/query behavior.
- Run realistic API/job/chat/checkout load with recorded hardware, data size, network and external latency assumptions. Measure the agreed targets and fix bottlenecks rather than reducing the test load to conceal failures.
- Review mobile/desktop, reduced motion, keyboard/screen-reader behavior, asset/bundle budgets, layout stability and lab Core Web Vitals; establish field measurement after launch without collecting unnecessary private content.
- Repeat a clean SQL/media restore and compatible app rollback with the final release. Confirm restored erasure/holds, sessions, worker/outgoing reconciliation and delivered alerts; record measured RPO/RTO.
- Close launch-blocking findings. Record bounded residual risks with operator ownership; do not label unfinished paid flows or untested recovery “production-ready.”

### R11.6 Controlled activation and handover

Deploy the verified release, run domain-level smoke and business checks, and record the outcome. Confirm approved public catalog and policies, real integration settings, operator access, monitoring/alert delivery and recoverable backups before sales activation. Recheck new-checkout and outgoing switches independently. Record the rollback/pause conditions and responsible operator.

Final handover includes release commit/digests, verified CI/evidence, configuration inventory without secrets, approved terms/content, qualified scenarios and limitations, dashboards/runbooks, escalation contacts, recovery/rotation procedures and next maintenance dates. Launch is an explicit owner decision after the evidence review.

## 5. Scope preservation and completion ledger

| Original requirement | Retained here |
| --- | --- |
| Roadmap §5 deployment-only directory, services/routing/persistence | Opening boundary, R10.1 |
| Roadmap §5.2 image/network/secrets/privacy/cache/backup/monitoring/release/availability rules | R10.1–R10.6 |
| Roadmap §5.3 complete production Makefile and clean-host procedure | R10.1, R10.7 |
| R10 row: signed artifacts, authenticated CI, recovery, outages, rotation | R10.2–R10.7 |
| R11 row: final content, locales/RTL, SEO/legal, integrations, load/security/recovery, deployed smoke | R11.1–R11.6 |
| Roadmap §7.1–7.3 unfinished external boosting/payment/resale/addition qualification | R11.1, R11.3–R11.4 |
| Roadmap §7.4 terms, localization, SEO, privacy, reports, dependency upgrades, clustered TiDB/history | R10.3–R10.5, R11.1, R11.4–R11.5 |
| Roadmap §8 all visual/frontend/backend/finance/deployment/operations/performance evidence | R10.7, R11.2–R11.6 plus UI_UX_ROADMAP.md |
| Roadmap §9 owner inputs and product definition of complete outcome | §2, R11.6 |
| Original phases P11 remaining launch copy/operational ownership; full P12 | R10 and R11 above |
| Specification §17 release/CI; §18 acceptance/recovery/performance | R10.2–R10.7, §2, R11 |
| R09 retention and backup limitation | R10.5, R11.5; owner policy remains mandatory |

Completion ledger starts with every R10/R11 item **not started / on hold**, except the explicitly identified R04 foundations. On resumption, record for each item: implementation commit, local evidence, representative staging evidence, real production evidence, operator/owner acceptance and unresolved dependencies. Writing a runbook or defining a Makefile target does not mark the corresponding operation qualified.

Repository delivery rules remain unchanged: `main`, full root/backend/frontend/production pre-commit before every commit, reviewed staged diff, direct verified push, no skipped checks or committed secrets. Preserve the full scope when later decisions revise this document and keep a clear record of approved changes.
