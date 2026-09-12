# Booster Plus — Implementation Phases

Version: 1.0 · Date: 9 September 2026 · Status: approved scope organized for implementation

This roadmap turns the [product and technical specification](BOOSTER_PLUS_SPEC.md) into deliverable phases. The owner accepted the specification and requested that all seven features previously listed as worth considering be included. Those features are now part of the complete first release described here.

Implementation has started. P00–P03 are committed and pushed. P04 pricing and coupon administration are committed and pushed. P05 order/quote flows, reservations, favorites, and reorder are committed and pushed. P06 private conversations, notifications, and private image uploads are implemented and verified, with delivery recorded in their stage commits; the encrypted credential foundation is also implemented and locally verified. P08 execution and credential handoff are committed and pushed; dated staff availability, timezone-aware booking and reminders are committed and pushed; explicit booster coordination and proof publication are committed and pushed. Configurable operational delivery forecasts are committed and pushed. P09 private account intake and review is implemented, with final stage-gate delivery recorded in the progress document; P10 verified boosting reviews are implemented and locally qualified, with final commit-gate delivery recorded in the progress document. Commercial resale, P07, policy-dependent P08 work, remaining P10 alerts/account-commerce features, and P11–P12 remain outstanding. P11 operational overview and audited background-task recovery are committed and pushed. Limited-package availability alerts are implemented and locally qualified, with final commit-gate delivery recorded in the progress document. P11 operational reports (orders/catalog/staff and owner-only audits), audited page downloads and compact account navigation are implemented and locally qualified; final commit-gate delivery is recorded in the progress document. Finance reports and the remaining P11/P12 work are outstanding. Remote GitHub Actions status still requires authenticated verification. [Implementation progress](docs/progress.md) records executed checks, limitations, and delivery status. Phase order expresses dependencies, not delivery dates. Development milestones may be demonstrated in staging, but the complete release includes all phases and their production checks.

The specification remains the detailed product and architecture reference. This document records the original phases, added feature requirements and phase completion criteria; the current roadmap linked below owns the order of remaining work. Keep these documents consistent when scope changes. Unresolved commercial choices stay open; selecting a payment transport does not establish live merchant settings, a seller payout arrangement or a win-rate guarantee.

## Current execution roadmap — 10 September 2026

[REMAINING_ROADMAP.md](REMAINING_ROADMAP.md) now owns the order of remaining work after the owner's visual/admin/production request. It prioritizes the animated storefront and dedicated admin frontend, details the required MLBB rank transformation, and specifies the stack under `production/`, preserving the existing `production/deploy/` directory. This document remains the P00–P12 requirements reference; no unfinished feature or approved addition is removed.

R01 now implements the animated homepage and MLBB rank scene, with visual/accessibility/performance evidence recorded in `docs/progress.md`. R02 now implements separate storefront/admin build graphs, staff navigation and queue/chat layouts, with its final gate recorded in the progress document. R03 extends that visual system across the catalog, estimator, customer account and booster workspace; see `docs/customer-experience.md` and its verification record. R04 adds the deployment-only production foundation and isolated TLS staging drill; its delivery gate is recorded in progress. R05–R09 are authorized next, while R10/R11 wait for owner review. The product phase completion criteria remain unchanged.

## 1. Working rules

- Maintain independent `backend/` and `frontend/` projects with separate builds, Dockerfiles, Makefiles, configuration examples, and setup documentation. Backend owns development Docker Compose. Root `production/` contains deployment orchestration and configuration only; application code, including the admin frontend, stays in the two projects.
- The projects share one Git monorepo. Commit and push verified stages directly to `main`. Before every commit, run the repository checks and each project's own `pre-commit` Makefile target; the tracked hook enforces the root gate. See `AGENTS.md`.
- Backend uses Go and Ent for queries, with `cmd/server`, a Cobra CLI under `cmd/cli`, and a background worker. Hand-authored SQL in `backend/migration/` owns schema changes. Never use Ent migrations, including in tests.
- Frontend uses React and TypeScript for public, customer, booster, and admin experiences. All authoritative pricing, authorization, payment, and inventory decisions happen in Go.
- Mobile Legends is the first editable game configuration. New games, supported field types, rules, and packages must be publishable through the admin panel.
- Customer login stays Google/email only with no site passwords. Customers and sellers have no wallet. Buyer payments and seller payouts remain individual crypto transactions.
- Custom orders require admin-issued final quotes and customer acceptance before checkout. Fixed packages bypass per-order quote approval.
- Both playing on the customer's account and playing together are required. Credential collection depends on fulfillment mode.
- Each phase includes its backend/API work, frontend integration, migrations, relevant tests, and documentation. Security and accessibility are implemented throughout, then verified as a whole before launch.
- Mark a phase complete only after its acceptance evidence exists. Disabled screens, mock successful payments, or unimplemented API responses do not satisfy a deliverable.

## 2. Phase map

| ID | Phase | Main outcome | Depends on |
| --- | --- | --- | --- |
| P00 | Decisions and compatibility | Validated database/migration approach and tracked business decisions. | — |
| P01 | Project foundations | Independent projects run locally and pass baseline CI. | P00 technical checks |
| P02 | Identity and permissions | Passwordless accounts and protected customer, booster, and admin areas. | P01 |
| P03 | Game catalog and form builder | Admin can publish games, dynamic forms, reference catalogs, and packages. | P02 |
| P04 | Pricing and coupons | Versioned estimates, transparent breakdowns, and bounded discount rules. | P03 |
| P05 | Orders, quotes, and customer area | Complete unpaid purchase/request flows, favorites, and reordering. | P04 |
| P06 | Conversations, files, and notifications | Order and pre-sales support, proof infrastructure, and reliable email. | P05 |
| P07 | Crypto payments and refunds | Verified direct checkout, reconciliation, exceptions, and refund handling. | P05–P06; payment decisions |
| P08 | Booster portal and fulfillment | Assigned work, both fulfillment modes, scheduling, delivery estimates, and completion. | P06–P07 |
| P09 | Account submissions and resale | Seller review, exclusive inventory, buyer delivery, and direct seller payouts. | P06–P08; seller arrangement |
| P10 | Reviews and availability alerts | Verified reviews, moderated publication, restock alerts, and completed favorites coverage. | P08–P09 |
| P11 | Complete administration and user experience | Reporting, operational screens, selected languages, and polished full journeys. | P02–P10 |
| P12 | Production qualification and launch | Tested recovery, release automation, live integration verification, and monitored deployment. | P00–P11 |

No deployment depends on building every backend module before starting frontend work. Each phase delivers the applicable customer/staff screens alongside the API that powers them. Independent work can proceed when a commercial decision blocks only another phase.

## 3. Added features and where they ship

All seven additions are included in release scope. Their exact policies follow the safe defaults below unless the owner changes them.

| Added feature | Delivery phase | Included behavior |
| --- | --- | --- |
| Separate booster role and portal | Role foundations P02; full portal P08 | Assigned-order access, staff aliases, progress, proof, scheduling, and controlled game access. |
| Discounts and coupon codes | Rules P04; order/payment enforcement P05–P07 | Fixed/percentage discounts, eligibility, validity windows, usage limits, and immutable accepted totals. |
| Verified-purchase reviews | P10 | Reviews tied to eligible completed purchases, moderation, public aggregates, and admin responses. |
| Favorites and reordering | P05; account coverage P10 | Save offerings, reuse compatible nonsensitive prior selections, and recalculate with current configuration. |
| Account/package availability email alerts | P10 | Explicit subscriptions, unsubscribe, deduplicated stock/capacity notifications, and no guaranteed reservation. |
| Detailed delivery estimates and scheduling | P03/P05 data foundations; full workflow P08 | Admin-managed delivery ranges, availability, timezone-aware slots, rescheduling, and delay updates. |
| Pre-sales support outside an order | P06 | Private authenticated customer–staff threads, staff inbox, and linking to a later order with preserved access boundaries. |

A separate booster payroll/commission system, automatic booster matching, a public self-service seller marketplace, customer wallet, fiat payments, subscriptions, and native mobile apps remain outside this roadmap. Account-seller payout and commission terms are part of the required resale arrangement; they are separate from booster compensation.

## 4. P00 — Decisions and compatibility

**Outcome:** establish a tested technical baseline and identify which business answers block specific features.

Deliverables:

- Record accepted scope and the outstanding decisions from specification section 20, with the phase that needs each answer.
- Choose and pin compatible Go, Ent, TiDB, migration-library, frontend, and build-tool versions during implementation.
- Prove Ent runtime queries work against the chosen TiDB version using SQL-created schemas. Cover JSON fields, indexes, unique conflicts, transaction failure handling, and concurrent inventory claims.
- Prove the Cobra-facing SQL migration runner can install/upgrade a database, detect changed/interrupted migrations, prevent simultaneous execution, and expose an actionable partial-DDL failure.
- Record the query-driver and migration-lock choices. SQL remains authoritative; do not use Ent/Atlas migration generation as a shortcut.
- Resolve repository organization and draft deployment assumptions. Evaluate payment and payout integrations once the operating country and target regions are supplied.

Completion evidence:

- A small repeatable integration exercise runs against real TiDB and produces documented results for the version matrix and concurrency cases.
- Each unresolved decision has an explicit dependent phase; unrelated foundations can proceed.

**Decision gate:** the technical compatibility results are needed before committing the persistence architecture. Payment and seller choices do not need to block all of P01–P06.

## 5. P01 — Independent project foundations

**Outcome:** a new developer can run and verify both projects from their own documented roots.

Deliverables:

- Backend module/package structure, `cmd/server`, `cmd/cli`, `cmd/worker`, configuration validation, dependency wiring, structured logging, health/readiness endpoints, and graceful shutdown.
- Complete initial migration CLI: create, validate, plan, up, supported down, status, version, and verify; execution journal/checksums; explicit migration job and runtime schema compatibility check.
- React/TypeScript application structure, routing, public/customer/admin/booster shells, accessible UI primitives, and shared loading/error patterns.
- OpenAPI contract pipeline and generated frontend client. Frontend builds from a pinned contract without importing backend source.
- Backend and frontend multi-stage Dockerfiles, non-root production runtimes, `.dockerignore`, complete Makefiles per the specification, and `.env.example` files without secrets.
- Backend Compose for API, worker, TiDB, private object storage, email catcher, and explicit migration service. Optional NATS profile stays disabled unless selected.
- CI, pinned developer tools/dependencies, formatting/lint/type checks, test commands, build checks, dependency/security checks, and setup documentation.
- Durable job/outbox infrastructure with conditional claims, leases, retry/backoff, idempotency support, and a failed-job inspection path.

Completion evidence:

- Clean setup, migrations, API health, frontend page rendering, worker execution, and both image builds work through documented commands.
- Each project builds independently. Normal application startup does not modify schema, and stopping local Compose preserves data volumes.
- The initial CI gate passes; production-specific checks are added as their features are implemented.

## 6. P02 — Passwordless identity and permissions

**Outcome:** customers and authorized staff can sign in and reach only their permitted resources.

Deliverables:

- Google login and email-code signup/login, verified identity linking, code expiry/replay protection, shared throttling, and account-enumeration-resistant responses.
- Secure server-side sessions, CSRF controls, logout/session revocation, suspension, profile settings, and verified-email change/recovery handling.
- Customer, booster, administrator, and owner permissions; optional support role if staffing requires it. Privileged identities are granted explicitly through admin controls or audited owner bootstrap.
- Login/profile screens and protected route shells. Booster accounts use the same permitted Google/email methods and have no public role self-selection.
- Staff alias field separate from legal/contact identity, plus audit entries that preserve the real internal actor.
- Audit foundation and recent-authentication checks for sensitive actions. Staff must complete an authenticator check at every sign-in; sensitive actions require recent verification of both factors (D11 resolved).

Completion evidence:

- Signup, repeat login, linking conflicts, expired/reused codes, session revocation, and staff suspension behave correctly.
- An authorization matrix verifies role boundaries and object ownership on backend endpoints, including direct API calls that bypass the UI.
- A booster cannot read another booster's work or customer commerce records. Assignment-specific access is completed in P08.

## 7. P03 — Configurable game catalog and forms

**Outcome:** staff can define offerings through the admin panel and customers can browse their published versions.

Deliverables:

- Admin game/service CRUD, draft/preview/publish/archive, ordering pause, FAQs, public assets, and reference catalogs for ranks, heroes, roles, regions, and servers.
- Dynamic form builder with typed fields, stable keys, conditional visibility/requirements, validation, collection stages, and dependency/reference checks.
- Atomic service-configuration publication with immutable versions and historical snapshots. Keep secret handoff separate from ordinary fields.
- Fixed packages and explicitly priced variants, eligibility, required information, optional stock/capacity, and editable delivery-window metadata.
- Mobile Legends draft configuration covering from/to ranks, applicable stars/points, requested win rate, hero/role restrictions, both fulfillment modes, and supported scheduling inputs.
- Public home/catalog/game/package pages and responsive dynamic form rendering, ready to consume P04 estimates.

Completion evidence:

- Admin publishes a second sample game, form, and package through the UI without a game-specific code branch.
- Invalid/cyclic configurations cannot publish; old versions remain available to historical records.
- Placeholder prices and unverified season data remain draft-only. Publication of real offerings waits for the owner's rank, price, availability, and win-rate definitions.

## 8. P04 — Price estimation and coupons

**Outcome:** the server calculates explainable estimates and valid discounts from published rules.

Deliverables:

- Admin rule builder and saved preview cases for rank intervals, per-unit amounts, fixed surcharges, percentage adjustments, explicit multipliers, bounds, and manual-review outcomes.
- Deterministic arithmetic, rounding, input normalization, version references, expiry, and customer-safe line items.
- Clear estimated-price UI for custom services; package prices remain exact for an eligible published variant.
- Coupon administration: fixed or percentage discount, currency for fixed amounts, game/service/package/category eligibility, start/end times, minimum subtotal, maximum discount, global usage limit, per-customer limit, and enabled state.
- Stable coupon IDs, audit/version history, rate-limited code checking, and backend validation. Coupons never yield site credit or a negative/zero payable total under the launch pricing policy.

Coupon contract:

- Default to one code per order, without stacking. Apply after ordinary service pricing adjustments and before the final currency rounding; enforce the payable minimum and show the final breakdown. An incompatible offer returns a clear error.
- Anonymous checks are indicative. Customer-specific eligibility and limits are checked after login and again when the discount is reserved for a payable order.
- For custom requests, show a provisional discount on the estimate. The admin quote records the eligible pre-discount final price and the resulting discount. Revalidate eligibility when the customer accepts; a changed/invalid discount requires an updated quote and fresh acceptance.
- Reserve limited redemptions transactionally when creating the payable order contract. Convert to redeemed only when payment settles; release only after the linked invoice/contract can no longer settle normally. P05–P07 implement these lifecycle hooks and late-payment exceptions.
- Preserve accepted discounted totals through a valid invoice window. Refunds use the actual amount paid and do not automatically restore coupon usage or create customer credit.
- By default coupons apply to boosting, not account resale. If enabled for resale, the platform funds the discount without silently reducing accepted seller proceeds. Any alternative needs explicit seller terms.

Completion evidence:

- Saved rank/option cases, rounding boundaries, stale versions, invalid inputs, and coupon eligibility cases produce the expected totals.
- No client amount or admin-supplied executable expression can control server pricing.
- Concurrent-redemption tests are specified here and pass with actual order/payment integration in P07; a UI-only usage counter is insufficient.

## 9. P05 — Orders, quotes, favorites, and reordering

**Outcome:** customers can submit requests, accept quotes, create unpaid package orders, and manage their order history.

Deliverables:

- Idempotent custom submissions and package order creation, immutable configuration/terms/price snapshots, ownership checks, and bounded history/search pagination.
- Admin review, clarification, rejection, quote revision/expiry, customer acceptance, and guarded state transitions with concurrency checks and timeline events.
- Customer dashboard/order detail, quote comparison, accepted scope, amount due, and action prompts. Checkout becomes live in P07.
- Coupon reservation integrated with contract acceptance and package checkout, with reacceptance on any material price change.
- Favorites for games, services, and packages; account-listing favorites are completed in P10 after account commerce exists. Favorites are private, unique per user/item, removable, and safe when an offer is archived.
- Reorder action that copies compatible nonsensitive choices into a new draft, validates against the current form, and recalculates current prices. Removed fields/options require customer correction.
- Reordering never copies credentials, private attachments, a previous payment, accepted quote, inventory reservation, or coupon entitlement. A custom reorder still requires review; a fixed package still requires current eligibility/stock.

Completion evidence:

- The full custom request-to-accepted-quote flow works with revision, expiry, and simultaneous-admin-change cases.
- No custom request can obtain a payment route from an estimate alone; packages require no quote review.
- Editing a published offer leaves existing order snapshots intact. Reordering an archived or incompatible offer fails clearly instead of reviving it.

## 10. P06 — Conversations, secure files, and notifications

**Outcome:** customers can reach staff before buying and throughout the order, with private durable communication.

Deliverables:

- Persisted order messaging, staff-only notes, unread counts, pagination, idempotent sends, SSE updates/reconnect/backfill, and polling fallback.
- Pre-sales support entry point with sign-in before opening a private conversation, subject/game context, open/waiting/resolved states, staff inbox, assignment, and abuse limits.
- Link a pre-sales thread to a later order only after checking the same customer's ownership. Preserve the original thread and audit the link; do not merge unrelated participants or expose internal notes.
- Booster aliases on customer-visible messages; internal actor identity remains available to authorized admins. Booster access is limited to explicitly shared assigned-order communication, not general pre-sales threads.
- Private uploads, intent/finalization flow, validation/quarantine/scanning, safe image processing, signed access, quotas, orphan cleanup, and proof metadata.
- Encrypted secret-storage foundation with recent-authentication checks, access audit, lifecycle deletion, and no secrets in chat or logs. Fulfillment/reveal screens arrive in P08/P09.
- In-app and transactional email templates, durable delivery jobs, deduplication, preferences, retry, and failure inspection. Availability-alert opt-in is separate and arrives in P10.
- Reusable conversation scopes for orders, pre-sales, and future seller submissions, each with explicit membership and permission checks.

Completion evidence:

- Reconnecting clients recover persisted messages, duplicate sends are deduplicated, and notification jobs recover from delivery outages.
- Pre-sales works without an order; linking a conversation cannot grant unauthorized access.
- Internal notes, uploaded files, and secrets remain inaccessible to unauthorized users. Quarantined files cannot be publicly served.

## 11. P07 — Cryptocurrency checkout, refunds, and reconciliation

**Outcome:** real financial evidence governs payment state and fulfillment eligibility.

Deliverables:

- Chosen provider adapter, secure configuration, authenticated checkout, invoice creation/reuse/expiry, exact asset/network instructions, and payment progress screens.
- Custom checkout for a valid accepted quote and immediate fixed-package checkout without per-order approval.
- Durable verified webhook inbox, idempotent processing, authoritative API reconciliation, scheduled recovery, and atomic payment/order/inventory/outbox updates.
- Underpayment, overpayment, late payment, wrong-network support cases, duplicate paid attempts, ambiguous provider timeouts, and payment-after-cancellation handling.
- Full/partial refund requests, policy-based staff decisions, recipient verification, cumulative amount limits, idempotent execution, and confirmed refund records.
- Capacity reservations for limited packages, coupon reservation/redemption/release, and payment-exception handling when funds arrive after a reservation has expired. A normal valid invoice honors its snapshotted total; exceptions never silently change the customer obligation.
- Admin finance screens, customer receipts, job failure visibility, and ledger-like records of individual receipts/refunds without spendable user balances.

Completion evidence:

- Duplicate, forged, missed, and out-of-order webhooks, pending confirmations, provider outages, and replayed checkout requests are tested.
- Concurrent payment attempts activate fulfillment once; concurrent coupon redemptions cannot exceed limits; limited package capacity cannot be oversold.
- Browser redirects, screenshots, and manually entered transaction hashes cannot independently mark payments/refunds confirmed.
- Payment and refund fixture journeys pass; sandbox is unavailable. A controlled live smoke test occurs in P12 before public sales.

**Implementation update:** NOWPayments is selected for the first hosted crypto adapter after the owner requested minimal-onboarding third-party processing. [Provider decision](docs/crypto-provider-decision.md) records the evidence and limitations. Transport implementation does not enable checkout or complete P07.

**Decision gate:** live merchant eligibility/settings, assets/networks, settlement currency, fees, and refund policy must be settled before live activation. Booster Plus does not add a country/document form solely for this adapter; provider-required checks remain provider-controlled. Direct-address handling requires a revised chain-monitoring/key-custody work package before P07 can be considered complete.

## 12. P08 — Booster portal, scheduling, and fulfillment

**Outcome:** staff can assign and complete paid boosting orders through either supported mode.

Deliverables:

- Admin staff/booster directory, availability, manual assignment/reassignment, capability/region tags, and assignment audit. Automatic matching is outside scope.
- Dedicated booster portal with assigned-order queue/detail, permitted scope, customer-facing alias, progress updates, chat, proof upload, scheduling, and completion submission.
- Narrow booster permissions: no pricing, quote approval, refunds, seller payouts, staff grants, other customers' orders, or unrestricted customer identity/payment details.
- Explicit assignment ownership/version checks. Reassignment/suspension stops new reads, message actions, and secret reveals by the old booster and closes unauthorized live subscriptions; previously accessed information cannot be retroactively erased.
- Play-on-account workflow: encrypted game access after payment, recent-authentication reveal only for permitted assigned staff, logged access, revocation, and cleanup. Never request the customer's Google/email password.
- Play-together workflow: player identifiers, availability, coordination messages, and booked sessions without collecting game credentials.
- Queued/in-progress/on-hold/resume flows, delay reasons, progress evidence, customer-visible timeline, cancellation/dispute handling, and admin-approved completion. Boosters submit completion; admins make the final completion decision by default.

Delivery estimates and scheduling:

- Admin configures indicative start/completion ranges by service, fulfillment mode, region, priority, workload, and declared operating calendar. Use transparent rules and staff overrides with reasons, not an unsupported precision claim.
- Snapshot the quoted delivery expectation. Show current estimates and explain changes when assignments, holds, or customer availability change. Clearly distinguish an estimate from any explicitly agreed deadline.
- Store booking instants in UTC and retain the intended IANA timezone for interpretation/display. Handle daylight-saving gaps/overlaps and show both parties their local date/time.
- Customers propose/select available sessions for play-together orders. Confirm only with an assigned available booster and a valid paid order; do not imply that quote acceptance alone books a slot.
- Prevent overlapping staff bookings with transactionally enforced slot/resource claims. Record rescheduling/cancellation history, reminders, no-show states, and the next required action.
- Hold/no-show behavior and any additional fees follow the agreed service terms. Never automatically increase an accepted order total after a missed session.

Completion evidence:

- An assigned booster completes both fulfillment modes using only the permitted screens; an unassigned booster cannot retrieve their data or files.
- Reassignment, proof publication, admin completion, holds, schedule conflicts, timezone edge cases, and notification reminders are tested.
- Customer pages show current delivery estimates and required actions without changing the original commercial agreement.

**Decision gate:** launch rank/options/prices, win-rate measurement/remedy, secure handoff details, scheduling/no-show terms, and completion/dispute rules must be defined before real service publication.

## 13. P09 — Customer account submissions, resale, and payouts

**Outcome:** customers can sell accounts through admin review, and buyers receive unique verified inventory.

Deliverables:

- Seller submission forms, ownership information, private review conversations, clarification/rejection, commercial offers, seller acceptance, withdrawal rules, and sale history screens.
- Implement the selected settlement model: either Booster Plus buys before resale or seller payment becomes due after resale under an agreed commission/proceeds arrangement. The choice changes payout timing and dispute responsibility.
- Admin listing/inventory screens, public account catalog/detail, filters, redacted screenshots, listing versions, unique inventory units, ordering pause, and single-buyer reservations.
- Direct buyer checkout using P07, reconciliation-aware reservation expiry, late-payment conflicts, secure transfer/delivery, buyer acknowledgement, and dispute handling.
- Separate seller–admin and buyer–admin access. A booster cannot view seller submissions or account-sale secrets through their boosting permissions.
- Direct seller payout obligations and attempts, verified asset/network/address, approval, idempotent initiation, failure/timeout reconciliation, and confirmed receipt history. No seller wallet or arbitrary withdrawal balance.
- Apply the chosen payout/refund ordering rules. Consignment seller payment cannot proceed while relevant buyer funds are being refunded or held under a dispute policy.

Completion evidence:

- Seller submission through accepted terms, listing, buyer payment, secure delivery, and seller payout works at the correct stage for the chosen model.
- Two buyers cannot purchase the same account; late funds cannot steal inventory already transferred to another buyer.
- Duplicate payout attempts cannot create duplicate payment obligations; seller recipient changes require verification; refund/payout races resolve correctly.
- Buyer and seller conversations, identities, and secrets remain isolated. Refunds do not automatically relist inventory without verified control.

**Decision gate:** seller payout timing, commission/proceeds, ownership handoff, payout integration/manual process, transfer criteria, fees, and dispute periods are required. A checkout provider's refund capability is not a substitute for seller payouts.

## 14. P10 — Verified reviews, favorites, and availability alerts

**Outcome:** customers can assess completed purchases, save offerings, and receive requested availability notifications.

Verified-purchase reviews:

- One review per eligible completed order by its actual buyer, with rating, text, optional service-specific attributes, timestamps, and edit history. Boosting and account purchases are supported.
- States include pending moderation, published, and hidden/rejected with an internal reason. Published ratings/counts include eligible published reviews only.
- Moderation is for documented content-policy violations, personal data, spam, and abuse; a low rating alone is not grounds for rejection. Admins may publish a labeled response, but cannot rewrite customer review text.
- Prevent sellers from reviewing their own account listing and staff from fabricating purchase reviews. Customer public display names/aliases must not expose email or game credentials.
- Treat refund/dispute changes explicitly: retain accurate purchase history and label affected reviews where appropriate rather than silently changing the score. Record the final moderation policy before publication.

Favorites and reordering completion:

- Add account listings to saved items, with available/reserved/sold/archived states. Saving never reserves stock.
- A sold unique account cannot be reordered. Route the user to currently available offerings without implying an equivalent account exists.
- Verify favorites and reorder behavior across edited forms, discontinued packages, expired coupons, and changed prices.

Availability alerts:

- Explicit verified-email opt-in for a limited package or account criteria such as game/region/rank/price range; provide a subscriptions page and unsubscribe controls in each email.
- For unique accounts, subscribe to matching future inventory rather than promising that the same sold account will return. Staff may relist the same unit only after verified recovery of control.
- Emit availability events after committed publication/capacity changes. Deduplicate per subscriber and availability cycle, coalesce bursts, and recheck availability before sending.
- A notification grants no reservation, priority, price guarantee, or automatic purchase. Clicking through always checks current price, eligibility, and inventory.
- Protect subscription endpoints against abuse and suppress delivery after unsubscribe, email change, or suspension. Avoid making an availability subscription a general marketing opt-in.

Completion evidence:

- Only actual eligible buyers can review; moderation, edits, admin responses, and aggregates remain consistent.
- Stock/capacity cycles, duplicate events, sold unique accounts, unsubscribe races, and notification failures behave correctly.
- Favorites and reorders retain privacy and always use current purchasing rules.

## 15. P11 — Complete administration and user experience

**Outcome:** the product works as one coherent operational system across all roles.

Deliverables:

- Unified admin dashboard for review queues, active orders, assignments, scheduling conflicts, pre-sales messages, seller reviews, finance exceptions, failed jobs, review moderation, and expiring actions.
- Search/filter/pagination and exports for orders, payments/refunds, seller payouts, catalog, staff, and audits. Reports separate currencies and clearly define date/recognition basis.
- Dedicated controls for coupons, review moderation, availability subscriptions, delivery rules, support hours, staff aliases, and published policies.
- Customer account area with order history, chat, saved items, review history, availability subscriptions, seller submissions/payout records, preferences, and sessions.
- Final branding, catalog copy, SEO/public metadata, selected languages, localized dates/money, and RTL where selected.
- Mobile/desktop review of public, customer, booster, and admin journeys; keyboard operation, focus, contrast, accessible dynamic forms, and loading/empty/error/conflict states.
- Account export/deletion/retention operations and secret/file lifecycle enforcement consistent with financial record retention and adopted policies.

Completion evidence:

- A representative customer, seller, booster, admin, and owner can complete their tasks without database edits or undocumented manual workarounds.
- Full journeys pass browser and accessibility checks with realistic data, including newly added features.
- Required production settings, policy content, operational ownership, support coverage, and user-visible copy are ready for release review.

## 16. P12 — Production qualification and launch

**Outcome:** the selected deployment can operate and recover the complete product with evidence.

Deliverables:

- Staging/production separation, domain/TLS, production TiDB/storage/email/provider configuration, secret management, private network boundaries, resource limits, and immutable images.
- Release pipeline with serialized SQL migration job, schema-compatible application rollout/rollback, frontend/backend contract checks, smoke verification, and controlled feature enablement.
- Monitoring and alerts for API health, payment/payout reconciliation, refunds, worker lag, failed email/media jobs, reservations, scheduling conflicts, abusive auth, and backup freshness.
- Backup/restore rehearsal, partial migration recovery, provider outage recovery, staff compromise/secret rotation handling, and documented runbooks with responsible operators.
- Load testing against agreed traffic and recovery targets, authorization/security testing, dependency/container review, and fixes for unresolved launch-blocking defects.
- Production-equivalent end-to-end verification of all original requirements and all seven added features.
- Controlled live payment/refund and selected seller-payout verification, confirmed sender email delivery, and operational acceptance before opening public sales.

Completion evidence:

- All phases have their evidence recorded; no disabled required feature or production mock is being counted as finished.
- Customer/private data boundaries, financial idempotency, inventory/coupon/booking concurrency, and migrations pass on the deployed version matrix.
- A clean restore and schema-compatible application rollback have been rehearsed, with the measured results meeting agreed objectives.
- Public offerings have real approved prices, valid rank/options, delivery/refund policies, and service availability; unresolved commercial choices are closed for enabled features.
- The production release is deployed, key journeys are verified, alerts reach the responsible operators, and follow-up ownership is documented.

## 17. Decision checkpoints

Existing decision IDs refer to specification section 20. These are implementation inputs, not a request to answer everything before P01.

| Decision | Needed by | Work that can proceed beforehand |
| --- | --- | --- |
| Repository arrangement, validated TiDB/migration setup — D13/P00 | P01 | Scope and local compatibility work. |
| Staff MFA/step-up policy — D11 | P02 sensitive workflows; mandatory before P12 | Ordinary identity/session/role foundations. |
| Win-rate meaning and actual Mobile Legends catalog/prices — D06–D07 | Live rule publication in P03–P04; service validation in P08 | Generic form/rule engine and draft fixtures. |
| Crypto provider/direct addresses, country/regions, currency, networks, fees — D02–D03 | P07 | Orders, adapters' contracts, support, and invoice UI states. |
| Refund/cancellation/dispute and missed-session rules — D08 | P07–P08 | Case records and configurable policy presentation. |
| Seller purchase/consignment model and handoff/payout terms — D01/D09 | P09 settlement | Submission/review/listing data and permission foundations. |
| Languages, branding, infrastructure, traffic/budget, support hours — D04/D12/D14 | P11–P12; infrastructure choices earlier as needed | Localizable layouts, containers, draft content, and metrics. |
| Review moderation and availability notification policy | P10 publication | Review eligibility, subscriptions, audit, and notification infrastructure. |

The booster portal decision D10 is resolved by the owner's request to include the added features. Manual assignment, staff aliases, and scheduling are included. Specific people, shifts, capacity, and delivery promises remain business configuration.

## 18. Completion tracking and future changes

Each phase starts as **not started** and may move to **in progress**, **blocked on a named dependency**, **in review**, and **complete**. Track individual blocked items when other work in the phase can continue.

For every phase, record:

- Delivered backend endpoints, frontend screens, migrations, and operational commands.
- Acceptance results and the relevant build/revision/environment.
- Outstanding defects, external integration blockers, and owner decisions.
- Updated API contract, setup/runbooks, and changes to this roadmap/specification.

A schema/UI scaffold is partial progress, not phase completion. One feature cannot be dropped from release scope simply because its phase comes later. When adding or changing scope, revise dependencies, financial/state rules, permission boundaries, migrations, and acceptance checks before treating the plan as current.

**First implementation action:** start P00's Ent + TiDB + SQL-only migration compatibility checks, then establish the independent project foundations in P01. Resolve the commercial decisions alongside the phases that can proceed without them.
