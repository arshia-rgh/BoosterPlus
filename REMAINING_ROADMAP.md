# Booster Plus — visual redesign, complete product, and production roadmap

Updated: 10 September 2026. Status: R00–R01 delivered; R02 dedicated admin applications and workspace implemented, with delivery subject to the mandatory commit gate recorded in progress. R03–R11 remain outstanding. Listing a requirement is not evidence of completion.

This is the execution roadmap for the work remaining after commit `f20abed6cb4f1909ffde9fe8fa789b7f74fea2de`, including the owner's new visual and deployment requirements. It takes priority over the earlier phase order. [The specification](BOOSTER_PLUS_SPEC.md) continues to define business/security requirements, and [the original phases](IMPLEMENTATION_PHASES.md) remain the detailed P00–P12 reference. This roadmap carries forward every unfinished requirement and all seven approved additions. Delivered foundations are extended and redesigned, not treated as missing or discarded.

**The immediate implementation priority is a polished animated storefront and a dedicated admin frontend.** The homepage must include the requested scroll-driven Mobile Legends profile transformation. Production delivery must include an operational stack under the existing root `production/` directory, including its owner-created `deploy/` subdirectory. Writing this document does not start feature implementation or deploy any service.

## Current implementation update

R01 now provides the cinematic homepage, scoped visual system, responsive artwork, continuous MLBB profile transformation, smaller section reveals, accessible motion preferences and enforced asset budgets. See [visual implementation](docs/visual-design.md) and [verification evidence](docs/progress.md). The homepage is visibly upgraded; the dedicated staff shell is implemented in R02; remaining customer/booster redesign is R03. Admin-managed homepage content and real featured offering/review feeds remain in their later stages, without fabricated launch data. The following baseline inventory describes the starting point before R01.

## 1. What existed at the baseline, and why the site looked basic

At the roadmap baseline, the homepage was a deliberately small prelaunch page. Functional customer and staff screens exist, but share a simple account layout and mostly utilitarian forms. This does not meet the requested finished visual experience.

| Area | Existing implementation | Work still required |
| --- | --- | --- |
| Project foundations | Separate Go backend and React frontend dependency/build graphs; Dockerfiles, Makefiles, CI and enforced pre-commit hook | Preserve them while adding separate storefront/admin build targets and production orchestration |
| Identity | Google/email passwordless flows, sessions, roles, mandatory staff MFA, recent-factor checks, recovery and audit foundations | Polished customer/staff onboarding, clear admin entry, final live email/Google qualification and recovery UX |
| Game catalog and prices | Admin-declared games, typed forms/reference data, conditional rules, releases, estimates, packages and coupons | Visual editors and storefront renderer; actual approved MLBB catalog, ranks, prices, availability and win-rate meaning |
| Orders | Custom requests, quotes/acceptance, fixed-package contracts, reservations, timelines, favorites/reordering | Finished customer/admin journeys, live checkout, finance-linked reservation/coupon behavior and exception handling |
| Communication and fulfillment | Private support/order chat, notifications, scanned proof images, encrypted game credentials, booster assignments, scheduling and forecasts | Finished inbox/portal UX, policy-dependent cancellations/disputes/no-shows, lifecycle/retention qualification |
| Account commerce | Private seller drafts/submissions, admin review and seller–staff conversation | Accepted seller terms, listings, unique inventory, buyer checkout, secure transfer, disputes and real seller payouts |
| Reviews and alerts | Verified boosting reviews/moderation/responses; limited-package availability subscriptions and safe unsubscribe | Account-purchase reviews, account favorites/criteria alerts, finance-linked eligibility and inventory events |
| Admin operations | Overview, jobs/retry, catalog/coupons/orders/submissions/reviews/calendar/support, staff controls and operational JSON reports | Dedicated admin shell, complete search/detail workflows, finance/inventory/privacy/content controls and financial reports |
| Crypto | NOWPayments transport and verified callback-reference parser, tested against local fixtures | Durable attempts/inbox/receipts, checkout UI, reconciliation, exceptions/refunds, real sandbox and controlled live verification |
| Production | Development Compose and container smoke/scanning; `production/deploy/` currently empty | Production Compose/gateway, data-service configuration, secrets, observability, releases, backup/restore and actual deployment qualification |

Current local admin entry: `http://127.0.0.1:5173/admin`. Related screens include `/admin/orders`, `/admin/catalog`, `/admin/support`, `/admin/submissions`, `/admin/reviews`, `/admin/calendar`, `/admin/jobs`, `/admin/reports`, and `/admin/coupons`. A customer login does not grant admin access. The first owner must be explicitly bootstrapped, then sign in with both factors; see [local owner setup](docs/identity-design.md#running-locally). This roadmap makes that entry and onboarding discoverable without granting privileges automatically.

## 2. Non-negotiable delivery rules

- Work on `main`; commit and push each completed, verified stage to `origin/main`. Never force-push, create an extra branch, bypass the hook, discard user changes or commit secrets.
- Before every commit, root `make pre-commit` runs repository checks plus **both** `make -C backend pre-commit` and `make -C frontend pre-commit`. New admin/build/deployment checks join those gates. Review the staged diff and record evidence and limitations in `docs/progress.md`.
- Continue broad golangci-lint, its gosec rules, standalone gosec, govulncheck, module verification, race tests, real isolated TiDB tests, generation/migration/build checks and container scans. Continue strict frontend types, formatting, security/accessibility lint, component/browser tests, dependency audit, contract checks and production builds.
- Keep Go/Ent queries and explicit SQL migrations in `backend/migration/`, driven by `cmd/cli` Cobra commands. Keep `cmd/server` and `cmd/worker`. Never introduce Ent/Atlas migrations or automatic application-startup migrations.
- Google/email login only; authenticator verification at every staff sign-in. Sensitive operations need recent verification of both factors. UI visibility never replaces backend authorization.
- No customer/seller wallet, fake payment success, invented prices, fabricated reviews/stats, or implied win-rate guarantees. Provider selection does not imply unrestricted service or live payment qualification.
- Every feature needs happy/empty/loading/error/conflict paths, invalid-input checks, role/ownership boundaries and relevant retry/concurrency/security cases. No finite test suite proves that every possible scenario is safe.
- Separate **implemented**, **locally verified**, **staging verified**, and **production qualified** status. Unavailable required dependencies fail checks; missing business decisions block their dependent launch behavior, not unrelated work.

## 3. Visual direction and homepage motion

### 3.1 Proposed art direction

Use a premium competitive-gaming presentation: deep graphite/navy surfaces, sharp readable typography, generous spacing, layered cards, controlled light/glow, emerald accents and restrained gold for high-rank moments. Give the storefront distinctive composition and imagery rather than repeating identical panels. This is a starting direction that can be changed after the first visual milestone; exact branding is not an unresolved blocker to building it.

Create a shared design system for typography, colors, spacing, borders, shadows, icons, controls and motion. Produce polished desktop/mobile layouts, loading and empty states, error notices, dialogs, toast notifications and form feedback. Use original or appropriately licensed assets with recorded provenance. Rank/profile artwork must be credible for the approved MLBB season; illustrative concepts may be built first and labeled clearly. Do not copy another boosting site's design or imply official game affiliation.

### 3.2 Required MLBB scroll transformation

A prominent homepage section tells one continuous story: a low-rank MLBB profile appears, becomes the visual focus, then smoothly transforms into a high-rank version as the user scrolls a little farther. Keep the same illustrative profile/avatar so the viewer perceives an upgrade to the same account. Rank names/badges and optional sample values come from approved content; visual progress is a demonstration, not a promised win rate or a customer's private profile.

| Scroll progress within the scene | Visual behavior | Interaction/content requirement |
| --- | --- | --- |
| 0–20%: reveal | Low-rank card rises gently into view, scales into position, resolves from subtle blur, and gains a soft rim light; background layers move slightly at different speeds | The low-rank identity is readable before the transition begins; avoid an abrupt popup or modal |
| 20–45%: focus | Card settles in a sticky scene; selected rank details become prominent, a progression trail begins, and lighting grows warmer | Heading explains the journey; normal scrolling and controls remain usable |
| 45–80%: transformation | Rank emblem and frame morph/crossfade with aligned anchors, stars/progress animate, surfaces gain richer detail, and a brief light sweep/limited particle burst completes the upgrade | Smooth continuous mapping to scroll position, not two unrelated static images or a video that only autoplays once |
| 80–100%: high-rank finish | High-rank profile settles with a restrained gold treatment; particles fade and the scene releases back into the page | A real CTA opens custom boosting or fixed packages; explanatory copy avoids guarantees |
| Reverse scroll | All stages follow the user's scroll back naturally | No duplicated listeners, stuck pinning, accumulated particles, or forced replay |

Implementation acceptance:

- Prototype approximately two viewport heights of scroll travel on desktop, with shorter travel and a simpler composition on mobile; tune against actual usability. The upgrade should become apparent after a modest additional scroll.
- Use ordinary document scrolling and a contained sticky region. No scroll hijacking, wheel interception, forced snapping, mandatory animation wait or navigation lock.
- Derive progress from the scene's actual position. Handle fast scrolling, reverse scrolling, resizing, device rotation, browser back/forward restoration, deep links and partial scene entry without jumps or hydration errors.
- Provide deterministic scene states for visual testing at 0%, 25%, 50%, 75% and 100%, plus real continuous-scroll testing. Inspect badge alignment, avatar continuity, text legibility and layout on desktop and touch devices.
- Support `prefers-reduced-motion` and an accessible site motion preference. Reduced motion shows readable before/after profiles with a direct CTA, without pinning, parallax, zoom or particle effects. Essential content remains available if JavaScript or an asset fails.
- Keep text as accessible HTML where possible. Decorative layers are hidden from assistive technology; changing decorative stars are not repeatedly announced. No flashing, autoplay audio, rapidly changing contrast, or motion-dependent information.
- Prefer transforms/opacity and efficient SVG/CSS composition; add a pinned motion dependency only when needed. Avoid stacking multiple animation engines or making WebGL a prerequisite. Cap particles, pause offscreen/background animation and clean up all listeners/observers.

### 3.3 Additional effects and public page structure

The homepage includes an animated hero, featured games/services, the rank journey, a polished custom-vs-package explanation, featured fixed packs, how ordering/payment/work/proof operates, eligible published reviews, FAQs and a final conversion section. Account marketplace teasers become actionable when real listings exist. Before launch, use clearly labeled preview/coming-soon states rather than fake stock or checkout.

Motion includes subtle hero atmosphere, staggered section/card reveals, hover/focus button feedback, restrained card depth on fine-pointer devices, smooth menu/dialog transitions, filter/list transitions, loading feedback, timeline progress and route transitions where they preserve focus and scroll. Touch users get equally usable controls without needing hover. The admin panel uses quicker, quieter motion suited to repeated work; decorative effects must not slow data entry or obscure status.

Initial performance targets: LCP ≤2.5 seconds, INP ≤200 ms and CLS ≤0.1 at the 75th percentile once field data exists. Before launch, use a recorded mobile device/network lab profile and representative devices; record animation traces and aim for steady frames without sustained stutter. Set and enforce concrete image/font/JavaScript budgets during the visual prototype. Lazy-load below-fold motion/assets, reserve dimensions, use responsive compressed artwork, subset fonts and avoid turning the hero into a large blocking download. These are acceptance targets, not current measured results. See [Web Vitals](https://web.dev/articles/vitals) and [reduced-motion behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

## 4. Dedicated admin frontend and application structure

Keep two independent top-level projects: `backend/` and `frontend/`. The proposed frontend structure has separate storefront and admin React applications/build targets within the frontend project, with shared UI tokens, accessible components and generated API types. Produce independently runnable storefront/admin images from that project. The booster portal remains a distinct role-specific experience; it can live in the storefront application under `/booster` without exposing admin bundles to customers.

Default deployment uses one public origin: `/admin` and `/admin/*` reach the admin app; ordinary public/account/booster routes reach the storefront. This preserves straightforward cookie/OAuth/CSRF behavior. A later separate admin hostname is possible, but requires explicit origin/session/redirect qualification. Both app asset namespaces, SSR builds, base paths, deep links and 404s must work independently. Moving files does not change existing URLs or authorization boundaries.

Local `make -C frontend dev` must start the storefront, admin and required development routing together and print their URLs. Add targeted `dev-storefront`/`dev-admin` and build/test commands for convenience. The default build and pre-commit gates cover both applications. Preserve existing customer routes during extraction and test every moved admin deep link. Add clear staff access from an appropriate account/staff entry point, and an owner onboarding guide that explains MFA and bootstrap rather than displaying a broken or empty admin page.

The admin UI needs a proper responsive application shell: sidebar with grouped modules, top bar, breadcrumbs, search, useful badges, dense but readable tables, filters, pagination, detail drawers, split-view conversations, reusable confirmation/reason dialogs, notifications, conflict recovery and keyboard navigation. Mobile navigation collapses into an accessible drawer. Show only authorized modules and recheck access on every API operation. Dashboard metrics must use actual state with labeled time/currency bases; no invented revenue or customers.

Required modules and final screens:

| Module | Complete experience |
| --- | --- |
| Dashboard | Action queues, orders awaiting review/payment, active/on-hold work, unread support, expiring actions, failed tasks and finance exceptions; drill-through links and permission-aware metrics |
| Orders and quotes | Search/filter by game/type/customer/status/date/assignee; request detail, quote builder/revisions/expiry, acceptance history, immutable total/scope, payment tab, timeline, assignment, chat, internal notes, scanned proof and allowed transitions |
| Games/forms/rules | Visual game/reference/form builders, conditional fields, validation, rank dependencies, estimate-rule editor, scenario preview, draft/publish/history/pause/archive and stale-update handling; no need to author raw JSON for ordinary administration |
| Fixed packs | Variants, real price/currency/scope, required details, capacity/availability, delivery ranges, scheduling eligibility and publication |
| Customers | Bounded directory/search, verified identity summary, order/support history, suspension/session controls and auditable role-appropriate access; no casual exposure of credentials |
| Staff and boosters | Roles, aliases, enrollment/access status, manual assignment/reassignment, availability calendars, workload, scheduling conflicts, handoff access and completion review |
| Conversations | Pre-sales/order/seller inboxes, waiting/unread/resolved states, attachments, retries/reconnect and clear separation of customer-visible messages from internal notes |
| Account commerce | Seller intake/review, commercial offer/acceptance, private inventory, public listing preview, reservation/checkout, transfer/delivery acknowledgement, disputes and payout obligations/evidence |
| Finance | Attempts, confirmations, receipts, under/over/late/wrong-route/duplicate-payment exceptions, authoritative reconciliation, refund requests/approval/execution and seller payouts; no arbitrary mark-paid control |
| Reviews/promotions/alerts | Coupon eligibility/redemption, fair review moderation/responses, account and package subscriptions, delivery/rate/consent visibility and authorized suppression |
| Content and settings | Homepage sections, featured offerings, rank-scene content/assets, FAQs, business contact/support hours, legal/policy versions, notification content, approved currencies/routes and configurable timers; secrets stay outside the browser |
| Operations and privacy | Background job inspection/retry, media processing/removal, sessions, owner audit search, operational/financial exports, user data export/deletion requests, retention/holds and approved actions |

## 5. Root production deployment package

Use the existing `production/` directory and preserve `production/deploy/`. As explicitly clarified by the owner, this directory is **deployment-only**: Compose definitions, gateway and service configuration, environment templates, operational scripts and runbooks. It is not a third application project. All application source, including the admin frontend, stays in `backend/` or `frontend/`; project Dockerfiles and SQL migrations remain owned by those projects. Including the storefront, admin and backend in production means orchestrating their release images here, not moving or copying their application code into this directory.

Planned layout (files listed here are deliverables, not currently implemented commands/configuration):

```text
production/
  README.md
  Makefile
  compose.production.yaml
  compose.staging.yaml
  .env.example                    # names/placeholders only
  gateway/
    Caddyfile
  config/
    app.example.env
    data-services.md
  secrets/
    README.md                     # actual secrets ignored/provisioned externally
  monitoring/
    prometheus.yml
    alerts.yml
    dashboards/
  backup/
    README.md
  deploy/                         # owner-created directory
    preflight.sh
    release.sh
    verify.sh
    rollback.sh
    backup.sh
    restore.sh
  runbooks/
    first-deployment.md
    upgrades-and-migrations.md
    restore-and-disaster-recovery.md
    incidents-and-key-rotation.md
```

### 5.1 Services, routing and persistence

| Component | Production responsibility |
| --- | --- |
| Gateway | Proposed Caddy reverse proxy with automatic TLS/renewal, HTTP redirect, compression, routing, body/time limits, trusted proxy handling and security headers; expose public 80/443 only |
| Storefront | Versioned React SSR production image serving public/customer/booster experiences; no development server or runtime source mounts |
| Admin | Separately built React admin production image under `/admin`, with its own asset namespace, health check and role-aware UI |
| API | Go `cmd/server` on a private application network with readiness checks, bounded requests and graceful shutdown |
| Worker | Go `cmd/worker`, durable SQL-backed jobs, leases/retries, media processing, notifications and payment reconciliation as implemented |
| Migration job | Explicit one-shot Cobra CLI release step using a dedicated DDL account; schema validation before starting a compatible release; no migrations in API/worker startup |
| TiDB | Production TiDB connection configuration with TLS and separate runtime/migration/backup credentials. Prefer managed production TiDB; document a self-managed TiDB/PD/TiKV option and its actual host/storage requirements if chosen |
| Private object storage | S3-compatible private buckets, quarantine/clean separation, restricted credentials, lifecycle/versioning and restore procedures; optional self-hosted topology must have explicit durability/capacity limits |
| Malware scanner | Private ClamAV service or qualified equivalent, signature freshness, resource limits, failure-closed quarantine and health/alert integration |
| Observability | Private metrics, dashboards, alert routing, structured redacted logs, uptime/readiness and payment/job/backup/scanner-specific signals |
| External integrations | Real SMTP/email delivery, Google OAuth and NOWPayments; keys and callback settings provisioned privately and tested in staging |
| Optional NATS | Include only if a demonstrated workflow needs broker fanout/scale. Existing SQL jobs/outbox remain valid; if introduced, JetStream must have persistence, access control, replay/recovery and backup qualification |

All necessary application services—including admin, storefront, API, worker and gateway—must be described in the production Compose stack. Managed database/storage/email services are explicit dependencies with validated endpoints and runbooks, not silently assumed local containers. A self-contained staging profile supports reproducible stack tests. A single-host application Compose deployment is a supported initial shape, **not** a claim of high availability. Do not ship the current development TiDB `unistore` configuration as a production database or call three data replicas on one host disaster-tolerant.

Proposed routing: gateway → storefront/admin, with a shared trusted API ingress for `/api/*`, then private API/worker/data networks. Choose the ingress implementation during the deployment spike to preserve the existing proxy-key/client-IP trust contract. Do not route around that protection by simply forwarding public `/api` traffic to an unqualified backend path. Strip spoofed forwarding/internal-auth headers at the public boundary, pass only verified client addressing, test CSRF/OAuth/cookies through the actual gateway, and keep backend ports private. Payment callbacks need signature verification, their own request limits and durable acceptance; they must not be blocked by customer-session CSRF middleware or rely on a spoofable client IP.

[Caddy HTTPS documentation](https://caddyserver.com/docs/automatic-https) describes certificate persistence and domain/port prerequisites. [Docker production guidance](https://docs.docker.com/compose/how-tos/production/) informs the separate production configuration. Final gateway choice/version and data-service topology are recorded during implementation and pinned after validation.

### 5.2 Security and operating requirements

- Immutable release tags/digests, pinned dependencies, non-root application processes, read-only filesystems where applicable, dropped capabilities, bounded writable mounts and explicit resource/restart/graceful-stop policies.
- Separate public/application/data networks and credentials. No public database, object console, scanner, metrics, broker or admin-only management port. No Docker socket mount into application containers.
- No Mailpit, debug endpoints, test accounts, placeholder security keys, development proxy fallbacks or `latest` application images in production.
- Secrets injected from protected host files or a selected secret manager, with documented access/rotation. Compose secrets mounted from files are not automatically an encrypted secret-management service. Vault/auth/proxy/provider keys and encrypted backups require separate recoverable key management.
- HTTPS, secure host-only cookies, nonce CSP, frame/content-type protections, controlled cross-origin behavior and caching rules. Private pages/API/media must not be cached by a CDN or service worker; public content can use explicitly safe cache policies.
- Database and object backups encrypted off-host, retention configured, recovery keys available separately, restores rehearsed in an isolated environment. A backup command succeeding does not prove restoration works.
- Recovery covers SQL migration/version history, auth/session invalidation, encrypted game credentials, private media, certificates and integration secrets. Restored workers must not resend historical payments, payouts or notifications before reconciliation.
- Monitoring covers latency/error rates, DB connectivity/pool pressure, worker leases/backlog/dead jobs, webhook/reconciliation lag, finance exceptions, SMTP delivery, scanner freshness, storage/disk capacity, TLS expiry and backup/restore freshness. Audit trails stay separate from operational logs.
- Release procedure: preflight → verified image retrieval → backup/compatibility checks → explicit SQL migration → app rollout → readiness and business smoke checks → recorded outcome. Use backward-compatible schema changes and documented application rollback. Destructive down migrations are never an automatic rollback strategy.
- State expected application downtime for the chosen Compose rollout. Claim zero-downtime or high availability only after implementing and testing a topology that delivers it.

### 5.3 Production Makefile contract

Implement `make -C production help`, `validate`, `preflight`, `config-check`, `pull`, `up`, `status`, `logs`, `smoke`, `migrate-status`, `migrate-plan`, `migrate-up`, `release`, `rollback`, `backup`, `backup-verify`, `restore-drill`, and `pre-commit`. Commands explain required environment/host context, fail on incomplete configuration, preserve data volumes and report actionable failures without printing secrets. Real restore/destructive operations require an explicit target and acknowledgement; test targets must reject production databases/buckets.

The root gate will include `production pre-commit` once these artifacts exist. It validates rendered Compose/gateway/monitoring configuration, secret/port/image policy, release script behavior, dependency scans and a real isolated stack smoke. Release commands do not bypass backend/frontend pre-commit. A documented first-deploy procedure must work from a clean supported host with operator-provided domain and credentials.

## 6. Ordered implementation stages

Each stage ships in small verified commits when needed. The table shows the revised order; stage completion requires both functional and visual evidence where relevant. Existing P-number references keep earlier requirements traceable.

| Stage | Scope | Dependencies and completion evidence |
| --- | --- | --- |
| R00 — This roadmap | Record current gaps, visual storyboard, admin structure, deployment shape, all remaining functions and launch gates | Documentation review, cross-links and full required pre-commit before the roadmap commit; no product implementation in this stage |
| R01 — Visual system and animated homepage | Design tokens/components, artwork direction, complete homepage composition, required low-to-high MLBB profile scene, responsive motion and static/reduced-motion versions | First tangible visual milestone. Real local `make dev` shows the new experience. Desktop/mobile screenshots, scroll-state tests, keyboard/axe checks, failure fallbacks and recorded performance budget |
| R02 — Dedicated admin app and shell | Extract/admin build target, sidebar/top bar/search, staff entry/onboarding, redesigned dashboard/order queue/order detail/chat, shared design system and complete local dev launcher | R01 components; preserve every existing admin route and backend authority. Separate production builds, auth/MFA/deep-link tests, role restrictions, mobile/desktop visual review |
| R03 — Complete storefront and customer/booster UX | Game/service/package pages, visual dynamic estimator, request/quote acceptance, order dashboard/detail/timeline/chat/proof/scheduling, favorites/reorder, reviews/alerts, seller intake, support, profile/security, booster workspace and sensible motion throughout | R01–R02 conventions; retain immutable contracts and generic game configuration. Complete current journeys with real APIs, readable empty/error/conflict states and accessibility/performance evidence |
| R04 — Production deployment foundation | `production/` Compose, gateway, storefront/admin/API/worker/CLI services, secrets examples, staging profile, private dependency wiring, preflight/smoke and Makefile | R02 build targets. Bring up a representative isolated stack and verify routing, auth, public/private boundaries, shutdown/readiness, failed dependencies and explicit migrations. This is deployment scaffolding, not public-launch approval |
| R05 — Real crypto checkout and finance records | Durable attempts, one active attempt/reuse, single-call invoice creation, verified inbox, authoritative reconciliation, receipt allocation, customer checkout/progress/receipts, admin finance queue and operational jobs | Existing NOWPayments adapter, contracts and R02/R03 screens. Atomic order/coupon/capacity changes; forged/duplicate/missed/reordered events, unknown invoice, ambiguous timeout, wrong route, under/over/late/double payment and cancellation races tested. Real provider sandbox qualification remains mandatory |
| R06 — Refunds, cancellation and disputes | Versioned policy display/acceptance, case creation/evidence, review/appeals as policy allows, partial-work/no-show/missed-target rules, hold/resume, full/partial refund requests, verified recipients, approval/execution/reconciliation and histories | R05 receipts. Exact refund caps and concurrency, changed recipient/recent factors, ambiguous execution, failures/replays and confirmed outgoing evidence. No wallet credits or staff-only paid toggles; approved policy needed before publishing promises |
| R07 — Complete account resale and seller payouts | Seller commercial offer/acceptance, accepted settlement model, private inventory, listing editor/public marketplace/detail/search/filter, unique reservations, direct buyer payment, secure account handoff/acknowledgement, disputes, payout obligations/attempts/evidence | R05–R06; seller settlement/ownership terms configured before commercial activation. Concurrent buyers cannot buy the same stock; no secret/identity leakage; late payments and refund/relist decisions safe; real payout qualification |
| R08 — Finish all approved additions | Account favorites/availability criteria alerts and account-purchase reviews; finance-linked boosting/account review eligibility, coupon redemption/release, reorder compatibility, scheduling/delivery exceptions and notification preferences | R05–R07 where needed. See the seven-feature matrix below; extend existing implementations rather than recreating them |
| R09 — Complete admin operations, content and privacy | All admin modules from section 4, customer/media directories, full quote/form/rule/package editors, content/FAQ/scene configuration, audited financial reports, policy/settings management, user export/deletion/retention and audit/operations UX | Existing modules plus R05–R08 data. Finance exports separate currencies/recognition basis; deletion respects holds/financial history; retention removes eligible secrets/files; sensitive exports audited. Customer/support actions work without database edits |
| R10 — Production operations and release automation | Complete deploy scripts/runbooks, signed/versioned images and provenance, CI release artifacts, monitoring/alerts, backups/restore drills, rollback/upgrade rehearsal, key rotation and environment validation | R04 infrastructure plus finished workflows. CI success verified through authenticated access; restore actual data and media into isolation; simulate crashes/outages/worker redelivery and release failures |
| R11 — Final launch qualification | Final licensed/approved MLBB content and prices, selected languages/RTL, full visual audit, SEO/legal/contact copy, real email/Google/payment/refund/payout tests, load/security/restore/operational acceptance and deployed smoke | All previous stages. Publish evidence, real domain/service settings, remaining risks and launch checklist; do not call the product production-ready with unfinished paid flows or untested recovery |

R01 and R02 happen before more backend-only feature stages so the next visible progress addresses the owner's concern. R04 establishes deployment early; R10/R11 qualify it against the complete product. Independent work can progress while a business decision is pending, without creating new branches or delegating to agents unless separately authorized.

## 7. Remaining business and lifecycle requirements

These details are part of the stages above, not optional follow-up features.

### 7.1 Boosting and catalog completion — R03/R05/R06/R09/R11

- Launch with MLBB but keep every game, service, form field, reference/rank relationship, estimate rule and package admin-declared. Support both playing on the customer's account and playing together.
- Finish a guided current-rank → target-rank experience, requested win-rate selection with approved meaning, hero-only/role-only restrictions and all other configured options/conditions. Explain invalid combinations and show a legible estimate breakdown.
- Custom totals remain estimates until an admin issues a quote and the customer accepts it. Fixed published packs are directly payable without per-order admin acceptance. Clearly distinguish quote expiry from provider payment validity.
- Preserve snapshots of scope, price, discounts, delivery terms and policy versions. Later catalog edits never silently rewrite accepted orders.
- Complete end-to-end boosters' assignment, consented communication, secret access, dated availability, bookings/rescheduling, proof review/publication, forecasts, holds and completion. Cancellation/no-show/win-rate remedies follow explicit terms, without surprise fees.

### 7.2 Crypto and commerce completion — R05/R06/R07

- NOWPayments is selected; the adapter alone cannot settle orders. Persist evidence before acknowledging callbacks and reconcile through the authenticated API. Callback amounts/statuses and browser redirects never directly activate fulfillment.
- Reserve/redeliver/release coupons and package capacity transactionally with financial state. Reconcile every uncertain write before retrying; retain late-payment handling after local expiry. Extra funds create exception/refund records, not another order or spendable credit.
- Handle pending confirmations, insufficient/extra amounts, wrong asset/network, repeated deposits, failed/expired/unknown invoices, provider outage, payment reversal and multiple paid attempts with understandable customer/admin states.
- Seller intake approval is not a commercial agreement. Record offer version, acceptance, ownership proof, settlement trigger, commission/proceeds, payout asset/network and fees before resale activation.
- Complete public account listings with safe metadata/media, draft/published/reserved/sold/archived states, exact stock, filters/favorites, buyer checkout and a private credential handoff. Reverify control before relisting a refunded account.
- Refunds and seller payouts have separate records, recipient verification, approvals, exact cumulative limits, idempotency/reconciliation and confirmed evidence. Keep buyer/seller conversations, identities and game secrets isolated.

### 7.3 All seven approved additions — carried forward in full

| Addition | Already present | Remaining completion and stage |
| --- | --- | --- |
| Booster role and portal | Assigned work, aliases, protected handoff, proof and scheduling foundations | Finished responsive workspace, policy-dependent exceptions and real paid-order journeys — R03/R06/R11 |
| Coupons | Rules, eligibility, immutable discount snapshots and reservations | Real settlement redemption, safe release, late-payment and refund treatment, finished admin editor — R05/R06/R08/R09 |
| Verified-purchase reviews | Boosting eligibility, revisions, fair moderation, responses and public aggregates | Account purchase eligibility, seller self-review prevention, actual refund/dispute labels/history and polished UI — R07/R08 |
| Favorites and reordering | Boost offerings and current-config reorder behavior | Account listing favorites, sold/archived states, edited-field compatibility and explicit fresh price acceptance — R03/R07/R08 |
| Availability email alerts | Limited-package opt-in/reconcile/deduplicate/unsubscribe | Account inventory/criteria subscriptions, payment/inventory event hooks, consent/preferences and staff management — R05/R07/R08/R09 |
| Delivery estimates and scheduling | Calendars, timezone-aware booking, forecasts, reminders and delay updates | Finished customer/booster/admin calendars, policy-based no-show/cancellation/hold behavior, actual paid-work qualification — R03/R06/R08 |
| Pre-sales support | Authenticated threads, unread/reconnect, order linking and staff access boundaries | Complete split-view inbox, routing/assignment/resolution UX, final mail delivery and permissions through both app builds — R02/R03/R09/R11 |

### 7.4 Content, privacy, reporting and technical debt — R09/R10/R11

- Approved legal/service/privacy/refund/account-sale terms, policy revision presentation and recorded customer acceptance; support/contact hours and honest availability/delivery copy.
- Selected languages, date/time/currency localization and RTL if selected; animation direction and layouts work in those locales. English remains the initial implementation language unless changed.
- Public SEO: route titles/descriptions, canonical URLs, sitemap/robots, share images, crawlable public content and structured data only for genuine published offerings/reviews. Private/admin/staging pages stay out of indexing; `noindex` is not authorization.
- User export/deletion request workflow with recent verification, ownership checks, audit evidence, retention/legal-hold rules, delayed deletion where required, and secret/file lifecycle cleanup. Do not cascade-delete financial or audit history.
- Financial reporting for receipts/refunds/payouts with explicit currency/date basis, conversion assumptions, access checks, bounded export and audit. Operational JSON page export already exists; spreadsheet formats require their own injection-safe qualification.
- Upgrade dependencies when compatible maintained versions are available; retain security/accessibility tooling and document narrow exceptions. Resolve actual new advisories instead of suppressing tools to get a green gate.
- Requalify production TiDB/TiKV query plans, concurrency and migrations; local unistore results do not prove clustered production behavior. Preserve compatibility with previously applied SQL1–20 and historical catalog/order records.

## 8. Evidence required before calling a stage or launch complete

| Track | Required evidence |
| --- | --- |
| Visual quality | Reviewed desktop/mobile screenshots and interactive walkthroughs; consistent design system; all public/customer/booster/admin screens covered, including error/empty states |
| Required animation | Before/midpoint/after snapshots plus real forward/reverse scroll, fast scroll, resize/orientation, back navigation, reduced-motion and failed-asset/no-JS behavior; no layout shifts or blocked CTA |
| Frontend behavior | Both app build targets pass strict types/lint/unit/component/contract/build checks; real browser/axe tests through production SSR and gateway; focus, dialogs, tables and keyboard interaction verified |
| Backend/security | Existing full gates plus feature-specific authorization, CSRF/session/proxy, upload, secrets, injection, rate/quota, concurrency, idempotency, audit rollback and recovery tests against isolated dependencies |
| Finance | Synthetic fault coverage plus real provider sandbox flows, signed/missed/replayed callbacks, reconciliation and exact receipts; controlled live payment/refund/payout qualification before public paid launch |
| Deployment | Clean-host instructions, rendered production config, private service boundaries, health/readiness, TLS, first-owner bootstrap, explicit migrations, shutdown/restart and failed dependency tests |
| Operations | Measured backup restoration and application rollback, key recovery/rotation, monitoring/alert delivery, release failure handling, restored outbox safety and actual deployed business smoke checks |
| Performance | Recorded hardware/network profile, concrete asset/bundle budgets, homepage motion traces, Core Web Vitals lab results and eventual field measurement; realistic multi-user API/job/chat/checkout load |

Retain the earlier initial load target of 100 concurrent active sessions and 20 API requests/second, with p95 ordinary API latency under 500 ms and estimates under 750 ms excluding external-provider latency, until actual traffic/budget requirements revise it. Test race conditions and failures rather than only screenshots or mocked success paths. These remain targets until measured. Neither a Docker image build nor a successful `docker compose up` alone qualifies production readiness.

## 9. Owner inputs and reasonable defaults

No further answer is required to begin R01/R02 after the roadmap is reviewed. Use the proposed dark/emerald/gold direction, illustrative profile assets and same-origin `/admin` routing initially. Keep changing branding/content straightforward.

| Decision still needed | Blocks | Work that can continue |
| --- | --- | --- |
| Final brand/art references and approved MLBB rank assets/season | Final artwork/content sign-off | Layout, original illustrative motion prototype, design system and all app UX |
| Real progression/option/pricing tables and win-rate meaning/remedy | Live MLBB publication and commercial guarantees | Generic editors/forms/estimation and clearly labeled draft/demo visuals |
| Crypto assets/networks, settlement preference, processing/network fee treatment and private merchant setup | Live checkout configuration and provider qualification | Durable payment workflow, adapter tests, checkout/error screens and finance tooling |
| Cancellation/refund/dispute/partial-work/no-show terms | Published paid-service policies and related automated decisions | Case workflows and policy-version management |
| Seller settlement timing, proceeds/commission, ownership/delivery requirements and payout/dispute terms | Commercial account activation and real payouts | Listing/inventory/intake/delivery foundations and configurable offer workflows |
| Domain/DNS, host resources, database/storage/email services, backup RPO/RTO, traffic/budget and alert recipients | Real production provisioning and recovery acceptance | Compose/gateway/staging stack, scripts, validation and representative isolated drills |
| Languages, business/support contact, hours and final legal text | Final localized/public launch content | English-first implementation and localization-ready layouts |

Provider checks stay with the provider; no extra country/document form is added merely for NOWPayments integration. No secrets are requested in chat or committed. Previously confirmed decisions—both boosting modes, staff MFA every sign-in, monorepo, direct verified main pushes and all seven additions—remain confirmed.

## 10. Definition of the complete outcome

The work is complete when the local developer commands show the polished animated storefront and a discoverable, dedicated admin app; the requested MLBB rank transformation works smoothly and accessibly; every approved customer/booster/admin/seller workflow works through real APIs; paid orders and outgoing payments rely on verified financial evidence; and `production/` contains the tested deployable stack, commands and operational runbooks for the chosen environment.

Public launch additionally requires approved commercial content, actual integration credentials/settings, successful staging and controlled live qualification, measured recovery/security/performance evidence, and a documented production handover. Future feature changes remain supported by versioned configuration, immutable accepted contracts, explicit migrations and small verified stage commits.

R02 implementation and operator entry are documented in [the staff workspace guide](docs/admin-workspace.md); actual stage verification and limitations are recorded in [progress](docs/progress.md). `production/` remains deployment-only and awaits R04.
