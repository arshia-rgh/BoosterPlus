# PLAYORA — accepted design implementation roadmap

25 September 2026 · **Implementation authorized by the owner; DI00 contracts/addenda, DI01 foundations and DI02 portal isolation delivered; DI03 in progress. R10/R11 held.**

The owner accepted the current design as complete for now and requested this implementation plan before development resumes. This is the next application roadmap, replacing the execution order in the historical UI/UX and homepage-refinement roadmaps. R00–R09 and earlier UX deliveries remain existing code to preserve and improve. R10/R11 remain separately held in [final-launch.md](../../final-launch.md).

## 1. Target and source of truth

Implement the accepted [design package](README.md), including its connected journeys, exception states and cross-role behavior—not just its screenshots. The audited baseline is commit `29238851367d949070bfc9a900cc0e3b0e6d255b`: **115 designed views, 31 journeys, 573 named state treatments and 55 existing application routes mapped**. Several designed views share one runtime route; these counts are not promises of 115 separate pages or 573 unique layouts.

Use these sources in order:

1. Current owner decisions and repository rules, including manual staff fulfillment for the initial shop and staff-managed articles only, confirmed on 25 September.
2. The current [atlas](design/index.html), [screen data](design/screens.json), [journey data](design/flows.json), and latest [separate-login/full-review corrections](reviews/2026-09-24-separate-logins-full-review.md).
3. [Portal sign-in](SEPARATE_PORTAL_SIGN_IN.md), [panel navigation](PANEL_UX_REVISION.md), [homepage/game hubs](HOMEPAGE_GAME_HUB_REVISION.md), design system and interaction specifications, interpreted with the later accepted revisions.
4. Existing product specification and shipped domain invariants. The 13 Stitch exports are historical visual suggestions, not executable requirements.

Later accepted behavior wins over older notes: wide game artwork has overlaid headings; the narrow activity sheet uses the current modal/focus behavior; local order tabs never replace their parent record; separate portal sign-in is required. Atlas IDs and fictional sample amounts, names, metrics and record statuses are not production data or API contracts.

Shop and news discovery were accepted, but their detailed product/delivery and editorial screens are not fully drawn in the 115-view atlas. DI00 adds the necessary bounded screen/flow specifications before those features are implemented. It does not reopen the accepted website wholesale. This document includes those additions in the implementation scope and clearly separates their commercial inputs from engineering work.

## 2. Runtime audit: reuse versus new work

This inventory comes from route, schema, handler and component inspection at the baseline commit. Existing code is an implementation asset, not proof that it already matches the design or needs no regression testing.

| Area | Present in code | Required change |
| --- | --- | --- |
| Project/build structure | Go backend, SQL/Cobra migrations, Ent queries; React storefront and independently built admin in one frontend project | Keep independent backend/frontend dependencies and Makefiles; implement isolated portal layouts and routes without relocating source into `production/` |
| Identity | Google/email, staff MFA/enrollment/recovery, role checks, session revocation, recent verification | Customer/admin/booster entry routes, server-enforced portal session/challenge isolation, safe callbacks and return paths; existing shared login and cookie are insufficient |
| Booster | `/booster`, assigned orders, assignment detail, calendar and conversations already exist inside storefront routes | Complete dedicated booster navigation and identity boundary; persistent assignment sections, audience-safe messages and designed responsive flows |
| Catalog | Published game configuration, dynamic fields/rules, estimates, packages, package capacity, FAQs and coupons | Service capability discovery, improved per-game content/art framing, cross-service promotions, public metric projections and accepted game-shell UX |
| Boost orders | Custom/package contracts, quotes, acceptance, favorites/reorder, fulfillment, bookings, evidence and reviews | Connect these real contracts to the accepted configuration, checkout and persistent record sections; preserve draft and return context |
| Payments | Production NOWPayments, durable reconciliation, cases/refunds/outgoing records and fixture tests | Reuse verified settlement across new UI and shop; no new provider stack, wallet or success bypass |
| Support/media | Conversations, messages/read/SSE, internal notes, separate fulfillment coordination, uploads/scanning/grants | Coherent role inboxes and record-local chat; reconnect, focus, attachments, explicit audiences, revocation and draft continuity |
| Resale | Seller submissions/offers, both arrangements, inventory/reservations, delivery, disputes and direct payouts | Complete accepted seller, buyer and admin flows without losing contract/record context |
| Account/operations | Profile/security/preferences, notifications, privacy, moderation, reports, jobs and alerts | Apply accepted layouts and action semantics; retain all existing capabilities, not only the main order screens |
| Content | Versioned `home`, `legal`, `retention`, `notifications` site content | New homepage schema; explicit policy presentation/version handling; full staff article publishing is new work |
| Shop | No dedicated shop domain/routes; order kinds are currently `custom`, `package`, `account` | Product/options/eligibility/availability, explicit shop order contract and manual fulfillment, customer/admin screens, finance/notification/report/privacy integration |
| News | No article/editorial domain or reader routes | Staff drafts, revisions, preview, publication, per-game news/patches/guides and reader/search/related-content flows |
| Global activity | `/me/overview` already aggregates attention, active orders, bookings and unread conversations | Extend a bounded, private projection for current milestone/progress/update time; authenticated customer corner panel across eligible pages |

Audit entry points: [storefront routes](../../frontend/app/routes.ts), [admin routes](../../frontend/admin-app/routes.ts), [build configuration](../../frontend/react-router.config.ts), [API contract](../../backend/api/openapi.json), [identity HTTP](../../backend/internal/identity/http.go), [session model](../../backend/ent/schema/auth_session.go), [challenge model](../../backend/ent/schema/auth_flow.go), [role checks](../../backend/internal/identity/service.go), [catalog model](../../backend/internal/catalog/model.go), [order schema](../../backend/ent/schema/order.go), [overview](../../backend/internal/orders/overview.go), [site content](../../backend/internal/sitecontent/model.go), [coordination audience](../../backend/internal/conversations/fulfillment.go), and [chat state](../../frontend/app/support/chat-state.ts).

## 3. Non-negotiable implementation contracts

- Keep Go, TiDB-compatible SQL, Ent query generation, `cmd/server`, worker and Cobra CLI. Every schema change has reviewed SQL in `backend/migration/`; no Ent/Atlas or startup migrations. Preserve existing rows and migration history.
- Server-owned prices, eligibility, permissions, capacity and state transitions remain authoritative. Use integer minor units and explicit currency, immutable purchased terms and version checks. UI summaries never create contractual truth.
- Custom estimate → staff quote → explicit acceptance → verified payment → fulfillment. Fixed packages and shop items use published purchase terms without per-order boost quote approval. Neither browser redirects nor delayed provider responses prove payment.
- `PAYMENTS_ENABLED=false` blocks new checkout without marking anything paid; existing reconciliation continues. Refund/payout activation stays separate. No runtime success simulation. Automated tests use isolated fixtures; real funds qualification remains explicitly controlled under R11.
- Customer/seller sign-in is Google/email passwordless. Every staff sign-in requires both first-factor verification and authenticator verification; single-use recovery substitutes only for MFA. Recent verification of both factors protects sensitive staff actions.
- Separate portal sign-in is a backend boundary as well as a visual change. A customer cookie must never silently become a booster/admin session. A single identity can remain shared; authorized role membership does not imply a session in another portal.
- No spendable balance, wallet, escrow, tournaments, automatic booster payouts, supplier integration or unsolicited top-up products. The approved shop sells explicitly approved in-game goods with manual fulfillment; exact products and delivery requirements must be agreed before publication.
- Consignment and buy-first remain selected per seller offer, with explicit accepted terms and individual payout obligations. Do not infer amounts, timing, commissions or guaranteed transfer safety.
- Equal visual prominence does not mean every game/service is commercially enabled. Missing, paused and unavailable capabilities remain honest; no invented stock, countdowns, reviews, win-rate guarantees or live statistics.
- Design fixtures, draft secrets, provider credentials and private chat content never enter public bundles, logs, analytics or unauthorized SSE payloads. Session isolation includes cache, optimistic state, downloads and notifications.
- Owner-entered enabled retention policy remains required before deletion. Active order/dispute holds, audit/finance evidence, file purge and backup limitations remain visible and enforced.
- Preserve the accepted green theme, typography, background direction and current game framing. The old fighting-spirit, cameo/audio and Iori-overlay implementation queue stays superseded; preserve untracked experiments without shipping them.

## 4. Phase sequence

DI00 contracts/addenda, DI01 shared foundations and DI02 portal isolation are **delivered**; DI03 is in progress; DI04–DI15 are planned. The owner authorized this implementation sequence on 25 September. Implement in this order unless a later owner decision changes it. Dependencies identify required contracts; a phase can prepare components earlier, but cannot claim complete user journeys until its dependencies are real. Do not expose incomplete feature entry points publicly. One phase may use several verified commits; each commit follows the applicable gate. A phase exit verifies its owned screens/contracts and relevant journey segments against working existing counterparts. It does not certify later redesigned screens as delivered. Complete design-matched cross-phase journey acceptance is scheduled in DI14, followed by independent requalification in DI15.

| Phase | Deliverable | Requires |
| --- | --- | --- |
| DI00 | Implementation contracts, route/state map and shop/news design addenda | This roadmap authorized for implementation |
| DI01 | Shared design system, responsive shells and navigation primitives | DI00 |
| DI02 | Customer/admin/booster authentication and portal isolation | DI00–01 |
| DI03 | Catalog presentation, promotions, content and truthful public metrics | DI00, DI02 for staff editing |
| DI04 | Multi-game homepage and persistent game hubs | DI01–03 |
| DI05 | Boost configuration, request, quote and direct checkout experience | DI02–04 |
| DI06 | Customer order/account shell and global activity | DI02, DI05 |
| DI07 | Shared chat, attachments and audience-safe support | DI02, DI06 |
| DI08 | Complete dedicated booster experience | DI02, DI06–07 |
| DI09 | Admin order operations, catalog editors and staff governance | DI02–08 |
| DI10 | Account marketplace, seller workflows and financial operations | DI03–09 |
| DI11 | Shop catalog, purchase and manual fulfillment end to end | DI00 shop addendum, DI03–10 |
| DI12 | Staff-managed news, patch notes and guides end to end | DI00 news addendum, DI03–04, DI09 |
| DI13 | Remaining account, trust, policy, privacy and operations screens | DI06–12 |
| DI14 | Data/route transition and complete cross-feature integration | DI01–13 |
| DI15 | Complete design-match qualification and owner review | DI14 |

### DI00 — freeze contracts and fill the new-feature design gaps

**Deliver:** a screen → runtime route → API → permission → state/test matrix using Appendix A/B, with each entry marked reuse, adapt or new. Record the accepted atlas commit and any subsequently approved amendment. Enumerate all 55 existing routes and preserve or intentionally redirect each; old URLs in emails/bookmarks must remain meaningful.

- Specify portal routes, per-portal callback/return rules, customer versus staff session handling, route-level errors, list query parameters, local record sections and draft ownership. Atlas fragments are design notation, not runtime URL requirements.
- Default engineering packaging: retain the existing two frontend builds. Put an independently routed/layout-isolated booster portal under `/booster` in the storefront build and admin under its existing admin build. Separate login, cookies, server audience and data loading are mandatory regardless of bundles. A third booster build is optional future packaging, not a dependency or a promised existing feature. Confirm both builds' local development commands and cross-build deep links in the contract.
- Add complete shop screens and journeys listed in Appendix C: listing/product/options, recipient requirements, review/payment, delivery/evidence/help/refund, and admin product/stock/fulfillment. Define which fields are sensitive and avoid collecting account credentials unless an approved delivery method truly requires them.
- Add news index/article/search, authoring/revision/preview/publication/unpublication and failure states. Reuse the accepted game shell and design system; staff-only creation, no community posting or automatic feeds.
- Model service capabilities, promotion eligibility/time/quantity, public metric definitions, policy types and article availability. Decide inventory reservation expiry, manual-delivery transitions, completion/review eligibility, support/cancellation remedies and publication semantics before their schemas are coded.
- Record contract-compatible component/API reuse, schema/backfill needs, draft retention and URLs. Scope field additions to real product requirements rather than cloning fictional atlas data.

**Exit:** complete, reviewed new-feature screen/flow addenda; deterministic state/permission tables; explicit owner commercial inputs tracked below; no missing route owner. Senior designer reviews changed addenda and repeats fixes to PASS; owner review is required for material new flows or commercial choices. Unresolved publication terms block publication of the relevant feature, not the rest of the roadmap.

### DI01 — shared visual system and persistent shells

**Delivered:** shared chrome, role-aware navigation, footer/background/motion controls, persistent game identity and framing, local RecordShell, field/action/status/loading/list/table components and shared error recovery. Senior reviews passed after scoped fixes; the complete tracked hook passed backend, frontend/browser and isolated deployment regressions. Implementation commits: `57ec5e2` and `677907da5eafd31b103d1e43a2faf380838b0924`. [Qualification and limits](DI01_QUALIFICATION.md). Real feature-screen integration and final whole-product acceptance remain in their later phases.

**Reuse:** existing React/TypeScript, accessibility components, accepted fonts/artwork and build tooling. **Adapt:** implement the actual product UI from the atlas rather than embedding the static atlas or its workspace controls.

- Build consistent tokens, typography, spacing, buttons, fields, validation, badges, cards, skeletons, empty/error states, tables, pagination, dialogs, drawers and toasts. Avoid broad CSS that leaks between customer, booster and admin layouts.
- Introduce public, persistent game, customer/seller, booster and admin shells, with explicit workspace/record identity, breadcrumbs and contextual Back. Hide global marketing service navigation everywhere. Sell an account lives inside game Accounts and the customer's sales area.
- Local record sections retain ID/status, query/filter return context and drafts. URLs support refresh/deep linking and browser Back/Forward; loading and access loss recover within the correct workspace. A deliberate jump to another record is labeled, not disguised as a local tab.
- Shared footer exposes contact/help and actual published policies. Motion preferences persist safely, honor reduced motion, and work before sign-in. Separate desktop popovers from accessible narrow modal sheets; trap focus/inert background only when modal.
- Responsive artwork uses per-game focal positioning, text contrast, reserved geometry and safe fallbacks. Shared non-game background matches homepage art; game background matches that game's hero. Motion must not obstruct reading or controls.

**Exit/tests:** representative public, game, customer, booster and admin shells render at narrow, tablet, desktop and short heights; no overlap or unintentional horizontal page scrolling. Keyboard order, focus restoration, landmarks, error announcements and reduced motion work. Component stories/fixtures stay outside production data paths. No feature behavior is lost behind a cosmetic rewrite.

### DI02 — three independent portal sign-ins and secure sessions

**Delivered:** separate customer/admin/booster entry, audience-bound cookies/challenges/sessions, mandatory staff MFA and scoped private state. Senior reviews and the complete tracked gate passed. Implementation `23c2bd2585de5983682256fab6cb774e832d257c`; [qualification and limits](DI02_QUALIFICATION.md). Complete downstream journeys and final acceptance remain DI14–DI15.

**Reuse:** current passwordless, MFA, recovery, revocation and reauthentication logic. **New:** authoritative portal isolation; current auth session/flow schemas and shared `bp-session` cookie do not provide it.

- Implement `/login`, `/admin/login`, `/booster/login` with correct role identity, invitation/access guidance, Google/email states and bounded same-portal returns. No public staff registration. Staff invitations/provisioning keep existing administrative controls.
- Add server-validated portal/audience to challenges and sessions, bind Google state/nonce/PKCE and email verification to that context, and use distinct secure cookies. Define endpoint audience checks and reject tokens at the wrong portal even if the user has an eligible role. Choose cookie paths/origins with the actual local and eventual gateway topology; cookie naming alone is not isolation.
- Preserve existing role semantics deliberately: customer access does not grant staff; booster allows the currently authorized booster/admin/owner roles; admin allows admin/owner; owner-only actions remain owner-only. A permitted person still signs into that portal explicitly. Do not silently replace the current single-role model with invented multi-role grants.
- Every staff sign-in completes MFA/enrollment or single-use recovery. Handle pending verification, resend/rate limit, bad/expired/replayed code, denied role, suspension, revoked session and required recent verification. No sensitive operation auto-submits after reauthentication.
- Scope client caches, drafts, CSRF/Origin enforcement, API clients, logout, SSE and SSR data to portal plus user. Support concurrent customer and staff sessions without cross-login overwrite. “Sign out here” and “revoke all” have different explicit effects.
- SQL migration and compatibility plan must invalidate ambiguous legacy staff sessions safely, require fresh sign-in and preserve existing users/MFA enrollment. Never upgrade a customer session into staff access. Old callbacks fail safely with a restart path; refresh/deep links preserve safe intent.

**Exit/tests:** cross-portal session/token/challenge replay, open redirects, CSRF, first-factor-only access, MFA bypass, recovery replay/concurrency, suspension, role change and revoked sessions fail closed. Test simultaneous portals, email/Google success/failure, logout isolation, global revocation and migration of existing fixtures. Fresh identity can reach only allowed workspaces; staff enrollment cannot be used to create unauthorized staff. Update OpenAPI/generated clients and auth documentation.

### DI03 — catalog, content, promotion and metric contracts

**In progress:** released service availability, truthful promotion/metric projections, compatible content contracts and staff editors. No DI03 qualification or delivery is claimed yet.

- Extend published game configuration for capabilities (Boost, Accounts, Shop, News), service-specific unavailable states, hero/background assets and focal data, game introduction/stat definitions and FAQs. An unavailable capability must fail closed on direct access as well as hide/disable its card.
- Reuse current package capacity and coupon validity; add a coherent promotion projection across packages, listings and shop items. Model target, approved price/discount, valid interval/time zone, quantity/capacity basis, priority and publication state. Eligibility is checked again on purchase; expired or exhausted offers disappear truthfully. News can promote an article; never present it as purchasable inventory.
- Extend versioned homepage content to the accepted section order. Keep admin previews explicitly scoped and protected; preview data is not publicly cacheable. Add typed policy presentation/version references without losing existing accepted legal snapshots.
- Create bounded public metric projections with explicit definitions, sample sizes, period, refresh time and unavailable/stale behavior. Active means qualifying paid fulfillment, completions exclude cancellations, win rate uses eligible matches and an explicit period; other games can use appropriate objective metrics. Do not expose staff reports or customer identities. Editorial overrides cannot fabricate a live count.
- Extend staff editors/API with validation, publication history, safe archive/pause and concurrent edit handling; old published versions remain readable until replacement is explicitly published. Asset uploads use existing validated media controls and provenance records.

**Exit/tests:** published versus draft access, pause/direct access, time boundaries, stock/coupon race conditions, stale metrics, cache invalidation, unauthorized publication and historic-order snapshot preservation. Existing published catalogs/site content survive backfill. Public pages have usable loading/unavailable states without sample numbers.

### DI04 — multi-game homepage and game hubs

- Homepage: quiet illustrated hero; honest activity; Boost, Accounts, Shop, crypto payment and News introductions with suitable small icons/entry motion; each service CTA scrolls to bottom game selection; FAQ and manually controlled horizontal review cards. Remove old MLBB-specific fighting-spirit/rank promotion hierarchy and hero service buttons.
- Game cards have equal prominence, accurate capability tags and clearly non-clickable paused state. Disabled games still communicate availability; never rely only on reduced color.
- Game hub retains a wide game-specific illustrated introduction, overlaid name/copy, useful statistics and background. Pinned limited/discounted offers follow stats before large service choices. Selected service replaces only the local content and filters its pinned offers; small Back to choose service restores choices. No duplicate final service section or All services feed.
- Boost configuration/package and account discovery/detail/review flows remain inside that game shell; shop/news follow the same rule when delivered. Customer order pages intentionally move into My account and explain the destination. Retain service/query/draft context across authentication and refresh where safe.
- Per-game FAQ, public reviews, availability/favorites and all page footers follow accepted design. Hide unavailable services until their implementations and publication settings are ready; a prototype-only shop/news card must not masquerade as a live feature.

**Exit/tests:** six current game templates plus a newly configured fixture game; paused/missing services, unavailable images, no reviews/metrics, long names, mobile focal framing, scroll targets and motion preferences. Direct links and history preserve game context. Stats and promotions remain correct when service changes.

### DI05 — boost request, package and checkout flows

- Connect dynamic custom forms and package eligibility to real catalog versions. Support both playing on the customer's account and together; rank/hero/role/region and other fields come from the published configuration. Invalid combinations have local explanations. Manual estimate paths may submit without a numeric promise.
- Review summaries show selected scope, estimate versus final quote, delivery prerequisites and terms. Preserve safe drafts through sign-in and return to exact game/service; private credentials do not belong in general draft storage.
- Custom request confirmation leads to its named order. Quote revisions/expiry/decline/acceptance stay inside that record; changed terms require fresh explicit acceptance. Fixed package purchase bypasses quote approval while preserving eligibility, capacity and payment guards.
- Real invoice UI covers supported network/asset, payable amount, network warning, address/QR, expiry, confirmation, under/over/late/duplicate payment, provider error and paused checkout. Existing invoices remain inspectable/reconcilable when new checkout is paused. Avoid duplicate orders/invoices on refresh, retry or multiple tabs.
- Add clear polling/reconnect/stale status; client success cannot start work. Notify customers of relevant quote/payment events through existing delivery infrastructure and restore the correct portal/order from links.

**Exit/tests:** the request/quote/checkout segments of F01/F02/F04 and each game-config template with real local APIs plus isolated provider fixtures; stale version, sold out, invalid code/field, concurrent acceptance, repeated checkout, declined/expired quote and provider timeout. Historical orders keep purchased prices/terms. Payment copy never claims zero fees, instant finality or guaranteed outcomes.

### DI06 — customer records, settings shell and activity panel

- Implement account overview, order list/search/filter and persistent order detail. Overview, Messages, Progress, Payment and Help are local sections in the same order shell; sections preserve identity/status, browser history and in-progress non-sensitive drafts. Lists use actions such as “View order PL-…” and retain filters/position on return.
- Show quote attention, prerequisite handoff, scheduling, verified payment, progress/evidence, case and delivery appropriate to order kind/state. Do not send account purchases into boost progress or show fulfillment as available while unpaid.
- Extend `/me/overview` or an equivalent bounded projection for the signed-in corner activity panel: current status, milestone/rank where applicable, last update and support action. Handle no active orders, several orders, stale/unavailable data and permission loss. No fabricated progress percentage or timer.
- Customer activity appears in customer/public/game contexts when that customer is authenticated; never leaks into staff login or another workspace. Desktop is a restrained nonmodal corner surface; narrow expansion follows the accepted modal sheet with focus trap/restoration, inert background, safe areas and accessible close. Collapsed state does not intercept page scrolling.
- Wire core profile/settings/security/preferences navigation now; DI13 completes its specialist flows. Existing portal endpoints and order APIs remain the source of truth, with intentional account-page transitions from game flows.

**Exit/tests:** record sections never navigate to unrelated global pages, wrong IDs/access loss fail safely, payment and fulfillment states agree, activity links open the exact authorized order, sign-out/account-switch clears data. Keyboard, mobile scrolling/keyboard, refresh/back and retained filters/drafts work with asynchronous loads.

### DI07 — complete support and chat experience

- One consistent conversation system across customer/seller, booster and admin, styled within each workspace. Global inboxes are clearly labeled; record-local Messages retain their record shell. Search, unread state, pagination and related-record links have correct audience and origin.
- Distinguish customer support, private seller discussions, explicitly shared assigned-booster coordination and admin internal notes. Reuse the existing separate coordination conversation; never expose historical private support by changing a label or assignment. Compose mode visibly identifies recipients; keep public/internal drafts separate.
- Implement delivery/pending/retry states, duplicate-safe sends, SSE reconnect/cursor gap recovery, ordering, read markers, load older, new-message indicator, bottom-follow only when appropriate and draft continuity without storing secrets. Prevent double sends and reconcile optimistic state with authoritative IDs.
- Attachments show upload/scan/ready/rejected/retry states, access-controlled previews/downloads and expiration. Untrusted filenames/content, removed media and wrong-audience grants are handled safely. Announcements do not read every streaming event or move keyboard focus unexpectedly.
- Reassignment, revoked sharing, suspension and logout close streams and revoke access. Support initiation creates/selects the correct conversation and preserves context; retry cannot create duplicate support records.

**Exit/tests:** send/retry/reconnect and out-of-order events; private-note isolation in API, SSE, notifications and exports; unauthorized conversation/media IDs; removed/reassigned booster; attachment failure and malicious content; keyboard and real narrow layout/composer behavior. Fixtures cover both messages and internal-note drafts with visibly distinct recipients.

### DI08 — dedicated booster panel

- Build booster home, assignment queue, persistent assignment detail, calendar and coordination messages under the isolated booster login/shell. It already has backend functionality; this phase completes the accepted experience rather than claiming to invent the portal.
- Show only authorized assignments, mode/scope, prerequisite status and next action. Detail keeps assignment ID/status visible through Overview, Progress, Messages and scheduling sections. No customer support history or unrelated finance/seller data.
- Support start, hold/resume, evidence/progress, approved credential reveal when required, booking/rescheduling, no-show and completion submission. Customer completion and admin review are different states; a booster cannot self-approve an order.
- Calendar handles configured time zones, availability, booking conflicts, cancellations and keyboard navigation. Reassignment/revocation clears stale sensitive detail and gives a useful return path.

**Exit/tests:** assignment ownership/role boundaries, recent-auth secret access, overlap/race booking checks, stale transition/version, failed upload, revoked assignment mid-session and admin return-for-correction. Verify both fulfillment modes and the DI08 segments of F12/F13 with working customer/admin counterparts; their redesigned admin segments arrive in DI09 and full design-matched journey acceptance is in DI14.

### DI09 — admin workspaces, editors and access governance

- Persistent admin identity, operations overview, triage queue, order detail/local sections, quote editing/preview/issue, scheduling, assignment, holds and completion review. Named actions explain which record and consequence; previews stay labeled within admin and return to the originating draft.
- Finish real catalog/game/form/rule/package/intake editors from DI03 contracts: field dependencies, safe validation, estimate explanation, version preview, publication/pause/archive/history and correction. Preserve draft on recoverable failure; never issue a quote or publish just by previewing.
- Customer/staff directory, roles, suspension, session revocation, recovery and audit actions use correct permissions and required recent factors. Dangerous actions have specific confirmation and server state guards. Actor/action filters match their labels.
- Support queue integrates DI07 with ownership, linkage, explicit internal notes and audited sharing. Route links/email/notifications land at correct admin record, not the customer's page. Pagination, search/filter, no-match and stale update errors work at realistic data sizes.

**Exit/tests:** quote currency/amount validation, concurrent edits and duplicate submit, unpaid fulfillment block, assignment/completion permissions, catalog publish/restore, staff escalation/recovery attempts and session revocation. Editors survive failed save/reauth without exposing private drafts. A newly published fixture game can run a custom and package flow without code changes.

### DI10 — resale and financial workspaces

- Within game Accounts, implement browse/filter/detail and purchase review/reservation. Show actual supported region/transfer terms, availability and limitations. Sell an account entry is inside Accounts; signed-in sales management stays in the customer/seller workspace.
- Submission, clarification, private messages, offer review, secure handover and payout are one identifiable sale record with local sections. Consignment and buy-first use their accepted per-offer obligations; expose payout status/receipt without a wallet balance.
- Staff submission review, intake rules, listing editor/publication, inventory release, reservation conflicts and buyer account delivery keep exact source/return context. Secure credentials remain in the vault, revealed only with permitted recent verification and auditable access; not in ordinary chat attachments or serialized page data.
- Buyer acknowledgment, delivery problem, dispute/cancellation/refund and seller payout records use existing finance state machines. Complete finance policy, evidence reconciliation, payment exceptions, refund and payout review screens with independent activation settings and explicit amounts/fees/approvals.
- Reuse idempotency and provider evidence; staff cannot mark a payment settled solely to move a UI forward. Changed payout details/terms require the relevant verification and approval before outgoing action.

**Exit/tests:** exclusive reservation races, expired reservation, post-reservation price/version change, delivery/secret authorization, both seller arrangements, payout eligibility, duplicate refund/payout/reconcile, partial/failed outgoing transfers and case holds. Test F03/F05/F06/F07/F17 across buyer/seller/admin with isolated financial fixtures. Actual transfer qualification remains R11.

### DI11 — shop with manual staff fulfillment

**New domain integrated into the existing order/payment system, not a cosmetic catalog page.** Implement only products and delivery methods approved under DI00; no provider/supplier API or automatic fulfillment at launch.

- Catalog: game, product, variant/options, region/server/platform compatibility, quantity limits, approved price/currency, availability/capacity, imagery, delivery requirements, expected timing and refund/cancellation terms. Draft/published/paused/archived lifecycle, safe concurrent edits and promotion linkage.
- Purchase: game-local browse/search/filter, product detail/options, minimal recipient details, eligibility validation, review with exact accepted terms, idempotent order creation, reservation/capacity and existing direct crypto checkout. Server recomputes totals and rejects changed/unsupported choices. Reservation expiry and late settlement have an explicit exception path, never oversell or silently abandon paid orders.
- Extend the order-kind and contract schema with a deliberate `shop` kind (or equivalent explicitly reviewed domain model); do not disguise it as a boost package. Add SQL migration, Ent regeneration, OpenAPI/frontend contracts, historical readers and permission/state tests. Include every order-kind switch in customer/admin lists, activity, notifications, finance, reports, privacy and support.
- Fulfillment: paid eligible order → staff queue → claimed/assigned processing → required delivery evidence → defined completion/review state. Include inability to fulfill, hold, correction, cancellation eligibility, dispute and approved refund. Manual means staff performs delivery; it does not mean manual payment success or untracked completion.
- Customer order local sections show recipient summary, delivery status/evidence, messages, payment and help. Sensitive recipient fields are masked/access-controlled and covered by retention. Admin product management and fulfillment queue show actionable next steps, audit changes and prevent concurrent double delivery.

**Exit/tests:** published availability, invalid recipient/region/options, tampered price, stock and simultaneous claim races, duplicate checkout, unpaid/paused checkout, provider late payment, delivery failure, evidence permissions and refund recovery. Customer → payment fixture → staff delivery → receipt/help is a complete journey. Approved commercial terms are required for public activation; no seeded sample product is a live offer.

### DI12 — staff-managed news, updates, patches and guides

- Add article domain with title/slug, game, type, summary, structured content, hero/alt/provenance, author attribution, draft/revision/version, publication state/time, update time and optional game-version/patch metadata. Define unique slugs, redirects after slug change and game association in DI00. Scheduled publishing is included with durable job/idempotency behavior; no external feed ingestion or community editor.
- Admin listing/search/filter, editor, autosave or explicit save state, preview, revision history, publish/schedule/unpublish/archive and permission/audit controls. Draft preview is authorized and non-indexable; scheduling failure is visible to operators. Sanitize structured/rich content and outbound links; no arbitrary scripts/iframes from an editor.
- Reader experience stays inside the game shell: type/search/filter, article, clear published/updated metadata, table of contents where useful, related articles and contextual game-service return. Handle long patch notes, code/tables/images, missing/deleted article, unpublished content, empty search, failed image and stale links accessibly.
- Use SSR metadata/canonical URLs, crawlable published article links and sitemap entries, social previews, accessible headings and image loading. Unpublished material/private previews must never leak through public cache, search index or metadata. Invalidate caches on publication/unpublication; redirect changes only to known allowed destinations.
- Promotions may pin editorial updates in the game's relevant discovery area without inventing purchase prices. Staff manages all content at launch; source attribution/rights and truthful excerpts are part of publication requirements.

**Exit/tests:** authoring validation, concurrent revisions, XSS/unsafe URL/media attempts, unauthorized draft access, publish/schedule retry/unpublish, stale cache/search, slug collisions/redirects, long-form narrow layouts and game-context history. Complete author → preview → publish → discover/read → correction/unpublish journey, including recoverable failures.

### DI13 — finish all secondary screens and operational coverage

- Customer profile, email change/identity linking, session review/revocation, preferences, notification delivery/read settings, favorites/reorder, availability subscriptions/unsubscribe, verified reviews/edit/history and privacy export/deletion. Keep support and recovery available when an action is blocked.
- Policy/help/contact pages and staff content editor use actual published versions. Preserve consent/contract history. Contact channels/hours are configurable, not fabricated; footer destinations all work. Review cards use permitted moderated verified reviews, with accessible manual carousel controls.
- Admin moderation, reports/export, job recovery, media directory, availability suppression and privacy review/retention policy complete the accepted screens. Failed-job filters operate on status and show attempt history; safe retries do not duplicate messages/payments/delivery. Media actions link to the correct source record and explain removal restrictions.
- Privacy requests retain active-order/dispute holds; no deletion until enabled owner policy. Exports include newly added shop/news personal data where applicable without other users' secrets. Live cleanup, pending files and retained evidence/backups have distinct truthful statuses.
- Extend reports and notifications for shop/manual delivery and article publication jobs where appropriate, not unrestricted customer advertising. Saved preferences apply consistently; article marketing subscriptions are not silently added.

**Exit/tests:** F10/F18–F24 plus identity I06–I08, all supported no-data/error/access-denied states, unlink-last-identity protection, unsubscribe privacy, review eligibility/moderation, duplicate notification/retry, scoped report export, retention disabled/holds/cleanup and correct policy versions. Every current route/capability has a tested destination, not a placeholder.

### DI14 — transition existing data and integrate the complete application

- Run reviewed SQL migrations/backfills on isolated representative old databases. Verify old users, published catalogs, sessions/challenges, orders of every existing kind, invoices, seller terms, conversations/files and policies. Expand/contract changes preserve historical reads and fail closed; rehearsal documents recovery when old binaries cannot read new schema. Do not assume a SQL down migration can safely erase new commercial records.
- Integrate every service with sessions, current catalog publication, global activity, notifications, support, privacy, reports and admin operations. Reconcile service-specific promotions and status descriptions; remove obsolete dead UI only after replacement paths are verified.
- Implement tested old-route/deep-link aliases or redirects, retaining allowed game/record/list context. Validate email action links across both builds and all portals; return validation must not become an open redirect. No sensitive query strings, drafts or tokens in analytics/referrers.
- Update frontend/backend README, route/permission matrix, environment examples without secrets, independent Makefiles, Docker build smoke tests and API/worker/CLI documentation. Keep backend and frontend dependency graphs separate. App-build changes remain here; actual production gateway/TLS/release orchestration is queued to R10 rather than silently implemented.
- Audit public SSR/cache boundaries, not-found/forbidden handling, game/article canonical/metadata/indexing, no-index staff/private views, and any obsolete brand strings. Current acceptance targets all new UI to PLAYORA while historical migration/tool names need not be destructively renamed.

**Exit/tests:** complete all 31 accepted journeys and approved Appendix C journeys across the now-implemented role screens, including every exception branch and done guard. Also verify upgrade rehearsal, contract/generated-code consistency, old/new route matrix, concurrent portal use, cross-user access isolation, new-order-kind enumeration and notification/report/retention coverage. No enabled path depends on atlas fixtures. Existing R09 functionality remains operational and documented.

### DI15 — final design match, regression qualification and owner review

- Independently compare all Appendix A screens and Appendix B/C journeys against accepted atlas/addenda using running frontend plus isolated backend fixtures. Complete desktop/tablet/phone and narrow/short-height review, keyboard/screen-reader tasks and realistic loading/error/empty/access-loss cases. Record images, routes, states and reproducible scenarios; similarity screenshots alone do not prove working flows.
- Spawn senior UI/UX review for changed scopes throughout implementation; at this phase review the entire integrated design. Fix and repeat until no actionable scoped findings remain, with explicit verdicts and limitations. Never claim that a review or linter proves there are no undiscovered defects.
- Run the complete root `make pre-commit` with backend/frontend/production regression suites and CI checks. Include isolated provider evidence for all financial branches; never perform destructive tests against live accounts. Measure public-page and portal interaction performance, transfer/render cost of background motion, API/query scaling and slow-network/reconnect behavior against agreed budgets from DI00. Record results, not invented performance guarantees.
- Review actual mobile keyboard, pointer/touch, reduced motion and assistive technology. Tool/device restrictions remain explicit qualification gaps and cannot be called a pass. Final owner walkthrough covers every role and new shop/news flow using nonproduction records.
- Deliver a qualification report, traceability completion matrix, remaining launch-only prerequisites and exact commit/artifact versions. Stop for owner review. **No automatic progression to R10/R11 and no public sales activation.**

**Exit:** implemented runtime matches the accepted design and approved addenda; all scoped defects resolved or explicitly returned for owner decision without marking the affected requirement complete; checks and limits honestly recorded. Owner acceptance and separate R10/R11 authorization remain distinct.

## 5. Definition of done and gates for every phase

Each stage includes its database/API/UI/configuration/docs changes where applicable. A front-end-only mock, hidden unimplemented route, fake success or a design screenshot is not a working feature. Track screen IDs, named states, API permissions and flow coverage in a living implementation matrix created in DI00; mark reuse as verified only after exercising the real path.

| Change scope | Required gate before commit |
| --- | --- |
| Documentation only | `make check-repository`; relevant link/coverage checks; senior scoped review when changing design contracts |
| UI only, unchanged backend/deployment/dependencies/tooling | Root repository checks and `make -C frontend pre-commit`, plus scoped rendered design review |
| Backend, migrations, deployment, dependencies/tooling, mixed/unclassified | Complete `make pre-commit`, plus affected design review |
| Final integrated design qualification | Complete `make pre-commit`, cross-role journeys, independent full rendered review and recorded human/device limits |

The tracked Git hook chooses scope; never bypass it. Backend gates retain format, vet, golangci-lint (including gosec), standalone gosec, govulncheck, dependency verification, race tests, applicable TiDB integration, migration/generated-code checks and builds. Frontend retains formatting, strict types, lint/security/accessibility, component/unit and browser/accessibility tests, audit/contracts and builds. Root/production regressions stay in the complete gate even while launch work is held. Dependency unavailability is a blocked check, not a pass.

Test each changed flow's normal path, invalid inputs, authorization, loading/empty/error, retry, concurrency/idempotency and relevant attack surface. In particular: cross-portal/user/record access; message audience/media leakage; payment/webhook replay; immutable price/version; inventory/reservation and booking races; staff MFA/recovery; XSS/upload/editor handling; session loss during sensitive action; private SSR/cache and export boundaries.

Visual acceptance uses representative 320px and 390px phones, 768px tablet, 1440px desktop and short landscape heights, plus actual browser viewport resizing (not only atlas width controls). Cover 200% zoom, long names/translations, keyboard/focus/announcements, reduced motion, touch, image failure and virtual keyboard. Preserve readable contrast and stable geometry; never solve overflow by hiding essential content.

For each completed stage: senior designer reviews only changed UI/affected shared behavior, fixes are independently rechecked, verdict is recorded under `docs/redesign/reviews/`, and evidence/limits go into [docs/progress.md](../progress.md). Review the actual staged diff for secrets/unrelated work and run `git diff --check`; commit/push directly to `origin/main`, verify the pushed commit, and preserve user/untracked work. Material design changes return for owner review. [DESIGN_CHANGE_GATE.md](DESIGN_CHANGE_GATE.md) remains the review method during this implementation; it does not authorize development by itself.

## 6. Decisions and publication checkpoints

| Topic | Current decision / required input | When it matters |
| --- | --- | --- |
| Shop fulfillment | **Confirmed:** staff manually fulfill after verified payment; no supplier API at launch | DI00/DI11 |
| News authorship | **Confirmed:** staff-managed articles only | DI00/DI12 |
| Portal access | **Confirmed:** separate customer/admin/booster login; staff MFA every sign-in | DI02; no further permission needed to plan this |
| Shop products | Owner-approved product families, games/regions/platforms, recipient data, quantities, price/currency, availability basis and delivery methods | Before the relevant DI11 product publication; catalog/schema work can use clearly isolated test fixtures |
| Shop commercial contract | Reservation duration, late paid/unavailable handling, delivery promise, cancellation/refund, completion/acknowledgment and review eligibility | DI00 state contract before dependent DI11 behavior; no invented auto-completion deadlines |
| News publication | Staff permissions, editorial attribution/media rights and content; scheduled publish is planned, no automatic feed or comments | DI00/DI12; unapproved content remains draft |
| Games/boosting | Current seasons/ranks, all published prices/options, fulfillment conditions, win-rate meaning and remedies | Before actual game/service publication; equal visual prominence does not enable unpublished services |
| Seller offers | Both arrangements supported; exact per-offer amounts/fees/timing/transfer obligations remain explicit accepted terms | DI10 and activation; do not invent defaults from examples |
| Metrics/promotions | Definitions, aggregate eligibility, sample thresholds, freshness budget and real offer limits | DI03 before public display; unavailable state is valid when insufficient evidence exists |
| Policies/contact/locales | Owner contact/hours, Terms/Privacy/refund and retention content; selected languages/RTL | DI03/DI13; no fabricated guarantees or legal policy defaults |
| Assets/performance | Verify source/provenance/use rights, responsive focal points, motion and transfer/interaction budgets | DI00/DI04/DI15; no assumption that prototype art is qualified for public commercial launch |
| Domains/live infrastructure/funds | Actual origins, OAuth/email, provider settings, controlled transaction budget, production services and operational owners | Retained R10/R11, not authorization by this roadmap |

Missing business input blocks only dependent behavior/publication. Continue unrelated approved work; use clearly labeled isolated fixtures for tests. A planning default is never a published seller, refund, win-rate or delivery promise.

## 7. Handoff to held final launch

After DI15 and owner acceptance, rebase the retained R10/R11 checklist on the exact implemented commit. Add portal callback/cookie routing, public game/article URLs and assets, shop workers/notifications/retention/reporting, migration/backfill duration, cache invalidation and any changed image/build configuration to its qualification inputs. Keep all original release/rollback, real TiDB, backup/restore/erasure replay, TLS, monitoring/alerts, remote CI/artifact provenance, real identity/email and controlled live financial qualification requirements.

Application development does not place source under `production/`. Existing deployment regression checks continue, but completing this roadmap neither deploys production nor completes launch-readiness work. R10/R11 require separate explicit authorization.

## Appendix A — complete accepted screen coverage

The phase listed owns primary implementation acceptance; shared identity, shell, chat, finance and final qualification phases also apply. IDs refer to the current atlas. Proposed runtime routes are finalized in DI00; repeated route values are intentional local views.

| Screen | Accepted view | Primary phase |
| --- | --- | --- |
| P01 | Your next level starts here. | DI04 |
| P02 | Find your game. | DI04 |
| G01 | Mobile Legends | DI04 |
| G02 | World of Warcraft | DI04 |
| G03 | League of Legends | DI04 |
| G04 | VALORANT | DI04 |
| G05 | Dota 2 | DI04 |
| G06 | Wild Rift | DI04 |
| P04 | Build your Mobile Legends boost. | DI05 |
| P05 | Review your request. | DI05 |
| P06 | Your request is with our team. | DI05 |
| P07 | Rank progress package. | DI05 |
| P08 | Check your package details. | DI05 |
| P09 | Choose how to pay. | DI05 |
| P10 | Complete your payment. | DI05 |
| P11 | We’re confirming your payment. | DI05 |
| P12 | Find your next account. | DI10 |
| P13 | Mythic account · Mobile Legends | DI10 |
| P14 | Review your account purchase. | DI10 |
| P15 | What customers say. | DI13 |
| P16 | How PLAYORA works. | DI13 |
| P17 | Service terms & privacy. | DI13 |
| I01 | Welcome to PLAYORA. | DI02 |
| I02 | Check your email. | DI02 |
| I03 | Verify your staff sign-in. | DI02 |
| I04 | Set up your authenticator. | DI02 |
| I05 | Recover staff access. | DI02 |
| I06 | Confirm it’s you. | DI13 |
| I09 | Admin sign-in. | DI02 |
| I10 | Booster sign-in. | DI02 |
| C01 | Good to see you, Player. | DI06 |
| C02 | Your orders. | DI06 |
| C03 | Your quote is ready. | DI05 |
| C04 | Let’s get your order ready. | DI06 |
| C05 | Your boost is in progress. | DI06 |
| C06 | Plan your play session. | DI06 |
| C07 | Payment & receipts. | DI06 |
| C08 | Get help with your order. | DI06 |
| C09 | Your case is under review. | DI06 |
| C10 | Saved for later. | DI13 |
| C11 | Messages. | DI07 |
| C12 | Order PL-1042 · Messages | DI07 |
| C13 | How can we help? | DI07 |
| C14 | Notifications. | DI13 |
| C15 | Your reviews. | DI13 |
| C16 | Review your experience. | DI13 |
| C17 | Security & sign-in. | DI13 |
| I07 | Update your sign-in email. | DI13 |
| C18 | Your data & privacy. | DI13 |
| C19 | Preferences. | DI13 |
| C20 | Availability alerts. | DI13 |
| C21 | Availability email preference. | DI13 |
| C22 | Profile settings. | DI13 |
| S01 | Your account sales. | DI10 |
| S02 | Tell us about your account. | DI10 |
| S03 | Submission SA-204. | DI10 |
| S04 | Review your sale offer. | DI10 |
| S05 | Secure account handover. | DI10 |
| S06 | Your direct payout. | DI10 |
| B01 | Your next session. | DI08 |
| B02 | Assigned orders. | DI08 |
| B03 | PL-1038 · Your assignment | DI08 |
| B04 | Availability & sessions. | DI08 |
| B05 | Assignment messages. | DI08 |
| A01 | Operations overview. | DI09 |
| A02 | Order queue. | DI09 |
| A03 | Review order PL-1042. | DI09 |
| A04 | Issue a final quote. | DI09 |
| A05 | Support inbox. | DI07 |
| A06 | PL-1042 · Customer conversation | DI07 |
| A07 | Staff calendars. | DI09 |
| A08 | Customers & staff. | DI09 |
| A09 | Audit & recovery review. | DI09 |
| A10 | Game catalog. | DI09 |
| A11 | Mobile Legends · Game settings | DI09 |
| A12 | Build the order form. | DI09 |
| A13 | Price estimation rules. | DI09 |
| A14 | Preview & publish a release. | DI09 |
| A24 | Fixed packages editor. | DI09 |
| A25 | Seller intake & transfer rules. | DI09 |
| A15 | Payments & exceptions. | DI10 |
| A16 | Service case & refund review. | DI10 |
| A17 | Seller payout review. | DI10 |
| A18 | Payment policy. | DI10 |
| A19 | Reconcile provider evidence. | DI10 |
| A20 | Account submissions. | DI10 |
| A21 | Review submission SA-204. | DI10 |
| A22 | Account inventory. | DI10 |
| A23 | Edit account listing AC-208. | DI10 |
| A26 | Buyer account delivery. | DI10 |
| C23 | Your purchased account. | DI10 |
| A27 | Coupons. | DI13 |
| A28 | Review moderation. | DI13 |
| A29 | Review REV-12. | DI13 |
| A30 | Reports. | DI13 |
| A31 | Background task recovery. | DI13 |
| A32 | Media directory. | DI13 |
| A33 | Availability alert management. | DI13 |
| A34 | Content & policies. | DI13 |
| A35 | Privacy request review. | DI13 |
| A36 | Retention policy. | DI13 |
| X01 | This page isn’t available. | DI01 |
| I08 | Open your private handoff. | DI13 |
| S07 | SA-204 · Private seller messages | DI07 |
| A37 | SA-204 · Seller conversation | DI07 |
| G07 | Build your World of Warcraft request. | DI05 |
| G12 | Review your World of Warcraft request. | DI05 |
| G08 | Build your League of Legends request. | DI05 |
| G13 | Review your League of Legends request. | DI05 |
| G09 | Build your VALORANT request. | DI05 |
| G14 | Review your VALORANT request. | DI05 |
| G10 | Build your Dota 2 request. | DI05 |
| G15 | Review your Dota 2 request. | DI05 |
| G11 | Build your Wild Rift request. | DI05 |
| G16 | Review your Wild Rift request. | DI05 |

## Appendix B — complete accepted journey coverage

Each journey must retain all its exception branches and done guard from `flows.json`, not only the happy-path IDs. The listed phase owns the primary feature and its phase-local regression tests, not early acceptance of the entire redesigned journey. **DI14 owns complete integrated acceptance of every journey below**, after all dependent screens in Appendix A exist; DI15 independently rechecks the complete set. For example, F01 begins with DI05 checkout but also needs DI06 customer records, DI08 fulfillment, DI09 staff operations and DI13 reviews. Existing counterpart screens can support interim tests without being falsely marked design-complete.

| Journey | Accepted flow | Primary implementation phase |
| --- | --- | --- |
| F01 | Custom boost: browse to completion | DI05 |
| F02 | Fixed package purchase | DI05 |
| F03 | Account purchase & secure receipt | DI10 |
| F04 | Invoice recovery & exceptions | DI05 |
| F05 | Cancellation, dispute & refund | DI10 |
| F06 | Seller consignment | DI10 |
| F07 | Buy-first acquisition | DI10 |
| F08 | Passwordless return to draft | DI02 |
| F09 | Separate admin sign-in, enrollment & recovery | DI02 |
| F10 | Profile, identity linking & session revocation | DI13 |
| F11 | Pre-sales and order support | DI07 |
| F12 | Booster fulfillment & admin completion | DI08 |
| F13 | Scheduling & rescheduling | DI08 |
| F14 | Catalog, forms, rules & packages | DI09 |
| F15 | Staff triage, quotes and holds | DI09 |
| F16 | Staff message vs internal note | DI07 |
| F17 | Payment and seller-payout operations | DI10 |
| F18 | Favorites, reorder & availability | DI13 |
| F19 | Reviews & moderation | DI13 |
| F20 | Notifications & preferences | DI13 |
| F21 | Privacy export and deletion | DI13 |
| F22 | Role, suspension and recovery governance | DI09 |
| F23 | Policy/coupon publication | DI13 |
| F24 | Reports, media, alerts and job recovery | DI13 |
| F25 | Global recovery | DI14 |
| F26 | World of Warcraft configurable-service template | DI05 |
| F27 | League of Legends configurable-service template | DI05 |
| F28 | VALORANT configurable-service template | DI05 |
| F29 | Dota 2 configurable-service template | DI05 |
| F30 | Wild Rift configurable-service template | DI05 |
| F31 | Separate booster sign-in, enrollment & recovery | DI02 |

## Appendix C — new shop/news specifications to finish in DI00

These are planned additions, **not screens already present in the accepted 115-view inventory**. Assign stable IDs in the atlas/addendum before coding. Use existing identity/payment/support designs rather than duplicating those mechanisms.

| Planned view/flow | Required details and recovery | Delivery |
| --- | --- | --- |
| Shop discovery and product detail | Per-game filter/search, variants, region/server, stock/limits, promotion expiry, disabled/missing product, accurate delivery terms | DI11 |
| Shop recipient, review and checkout | Field validation/privacy, draft return, immutable contract, price/stock changed, reservation expired, paused/error/repeated payment | DI11 + DI05 |
| Shop order/delivery/help | Order-local sections, status/evidence, delay/hold, failed fulfillment, dispute/refund, authorized receipt and support | DI11 + DI06–07 |
| Shop product/editor/preview | Draft/save errors, published versions, stock/capacity changes, permissions and audit | DI11 + DI09 |
| Shop fulfillment queue/detail | Paid prerequisites, assignment/claim conflict, delivery evidence, correction, completion and finance handoff | DI11 + DI09–10 |
| Shop end-to-end journeys | Buy → pay → manual deliver; sold-out/late-pay exception; cannot fulfill → case/refund; duplicate submit/retry; pause product without losing paid work | DI11 |
| News index/search/article | Game-local type/filter/search, long-form content, metadata/TOC/related articles, unavailable/draft/deleted states and return context | DI12 |
| Staff article list/editor/history/preview | Required fields, media/attribution, concurrent edit/save failure, sanitized content, private preview | DI12 |
| Publication/schedule/unpublish | Confirmation, permission/audit, failed job/retry, corrected revision, slug redirect and cache/search invalidation | DI12 |
| Editorial end-to-end journeys | Draft → review/preview → publish or schedule → reader discovery; correction; unpublish without draft leakage | DI12 |

**Completion tracking:** DI00 contracts/addenda, DI01 foundations and DI02 portal isolation are delivered; DI03 is in progress; DI04–DI15 are planned. See [DI00 review evidence](reviews/2026-09-25-di00-contracts-addendum.md). Runtime screen rows remain planned until their implementation phases; final owner review includes the bounded shop/news additions. Do not update them to delivered on the basis of this document, the accepted static design, or historical UX/R-phase test results.
