# Booster Plus — Product and Technical Specification

Version: 0.3 · Date: 9 September 2026 · Status: accepted baseline with open business decisions

This document defines the product we will implement, the architecture, the important business rules, and the work required for a production launch. It is a specification, not a production-readiness claim. Implementation is underway; [progress](docs/progress.md) records the verified work and remaining phases.

The owner accepted this specification on 9 September 2026 and included all seven previously suggested additions. The [implementation roadmap](IMPLEMENTATION_PHASES.md) defines the detailed phases, added-feature behavior, dependencies, and completion criteria. Unresolved commercial decisions remain open.

**Confirmed** means explicitly requested by the owner. **Proposed** means a recommended implementation default that can be changed. **Open** means a business decision is still needed. Proposed defaults let development proceed where possible; they do not approve unknown prices, payment arrangements, or customer promises.

Reader shortcuts: [customer journeys](#4-public-site-and-customer-experience), [forms and pricing](#5-administrator-managed-games-and-forms), [payments](#8-cryptocurrency-payments-and-refunds), [account resale](#9-game-account-buying-and-selling), [architecture](#13-technical-architecture), [migrations](#15-sql-migrations-and-cobra-cli), [implementation sequence](#19-implementation-sequence), and [open decisions](#20-open-decisions-and-approved-additions).

## 1. Product and confirmed requirements

Booster Plus sells game boosting services and game accounts. Mobile Legends is the first boosting game. Administrators must be able to add other games, configure their order forms and estimation rules, and publish fixed-price packages through the admin panel.

| Area | Confirmed requirement |
| --- | --- |
| Projects | Separate Go backend and React frontend, with independent builds and Dockerfiles. |
| Backend | Go, Ent ORM, TiDB as the proposed database from the owner's permitted stack; NATS if a queue is needed. |
| Commands | `cmd/server` for the API and a separate Cobra-based command under `cmd/` for database migration operations. |
| Migrations | Versioned SQL files in a migration directory at the backend project root. Do not use Ent migrations. |
| Developer tools | Complete Makefiles for both projects; Docker Compose in the backend project. |
| Custom boosting | Customer selects starting rank, target rank, requested win rate, hero/role restrictions, and other configured options. Show an estimated price. Admin approval determines the final quote. |
| Fulfillment modes | Support both playing on the customer's account and playing together with the customer. The meaning of the win-rate promise remains open. |
| Fixed packages | Admin publishes packages with specific prices. Customers can pay directly without individual admin approval. |
| Accounts | Customers can submit accounts for admin review and resale. Seller payment timing and the commercial arrangement remain open. |
| Payments | Cryptocurrency only initially. Each payment pays for an order directly. |
| No customer wallet | No top-ups, deposits to an internal balance, transferable credit, or spending from a site wallet. |
| Customer account | Order history, order details, and chat with administrators. |
| Administration | Manage orders, communicate with customers, update order status, and upload photo evidence. |
| Authentication | Google or email only; no site passwords. |
| Delivery approach | Write this specification first, implement in stages, verify production readiness, and support later changes. |
| Added features | Booster portal/aliases, coupons, verified reviews, favorites/reordering, availability alerts, delivery estimates/scheduling, and pre-sales support are included in the complete release. |

## 2. Scope and proposed launch defaults

The first complete release includes the public storefront, authentication, customer area, admin panel, configurable game catalog, form builder, estimation engine, quotes, packages, crypto checkout, payment reconciliation, order chat, proof uploads, account sales, notifications, and operational tooling.

It also includes the seven approved additions in section 20.2, delivered through the implementation roadmap before the complete production release.

Proposed defaults:

- One business operating Booster Plus, with one storefront and one admin panel.
- One React project contains the public, customer, booster, and admin routes. The backend remains a separately deployable Go project.
- English first, with translations and right-to-left layouts supported by the design. Launch languages remain open.
- USD as the catalog and quote currency; crypto amounts are supplied by the chosen checkout integration. Currency selection remains open.
- Email login uses a one-time code. Google login uses OpenID Connect.
- One order per checkout. A shopping cart, split payments, installments, and combining multiple orders into one invoice are deferred.
- Customer account submissions, admin review, approved resale listings, and direct seller payouts are launch scope. Payout timing and commission versus outright purchase remain open; section 9 defines both arrangements.
- Admins assign and oversee fulfillment; boosters use a separate portal with assigned-order access and customer-visible aliases. Automatic booster matching and booster compensation/payout accounting remain future work. Account-seller payouts remain launch scope.
- A durable database-backed worker handles email, reconciliation, expiry, and file processing initially. NATS JetStream can be enabled later when operational needs justify it.

The initial release has no fiat checkout, customer wallet, subscriptions, native mobile app, referral system, unmoderated peer-to-peer marketplace, or automatic gameplay integration unless the owner adds them. Account resale goes through Booster Plus admin review and the selected payout arrangement.

## 3. People, permissions, and boundaries

| Actor | Allowed actions |
| --- | --- |
| Visitor | Browse published games, packages, accounts, FAQs, and policies; calculate nonbinding estimates. |
| Customer | Sign in, submit requests, accept quotes, pay, view their orders, chat, upload permitted attachments, request cancellation/refund review, and view delivery evidence. |
| Customer acting as seller | Submit their account for review, answer staff questions, accept documented sale terms, and view their own listing and direct-payout history. This does not grant admin permissions. |
| Booster | Access assigned boosting orders, coordinate sessions, post permitted progress/proof, chat under an alias, and submit completion for admin approval. Game access is separately controlled and audited. No pricing, refund, payout, or staff-administration permissions. |
| Support staff — proposed | View assigned or permitted orders, reply to customers, add internal notes, and record permitted progress updates. |
| Administrator | Manage catalog/forms/pricing, review requests, issue quotes, manage fulfillment, account listings, and payment exceptions. |
| Owner | Administrator rights plus staff permissions, sensitive configuration, refund authorization, and audit access. |
| System worker | Process explicitly scoped jobs without acting as a human administrator. |

Start with customer, booster, administrator, and owner roles; add support staff only if needed. Permissions are named capabilities, so later roles do not require rewriting authorization.

Every API operation checks both permission and object access. Customers cannot view another customer's orders, messages, uploads, or payment records by changing IDs. Hiding a button is not authorization. Sensitive actions are audited, and suspending staff revokes their active sessions.

## 4. Public site and customer experience

### 4.1 Pages

- Home: Booster Plus branding, supported games, featured packages, process explanation, and support entry points.
- Game catalog and game detail: descriptions, availability, configurable custom order form, fixed packages, and FAQs.
- Package detail: exact scope, price, eligibility, required fulfillment information, and estimated delivery window.
- Account catalog and account detail: searchable listing information, availability, screenshots, delivery terms, and price.
- Sell an account: submission form, ownership information, review conversation, proposed commercial terms, and submission status.
- My sales: approved listings, sale/transfer progress, and direct payout records; no spendable balance or withdrawal wallet.
- Sign-in: Google or email code; first successful verification creates an account when needed.
- Customer dashboard: open orders, actions needed, unread messages, and recent history.
- Order detail: scope, price history, accepted quote, invoice state, fulfillment timeline, conversation, and evidence.
- Checkout: order summary, exact asset/network instructions, invoice expiration, and confirmation progress.
- Profile and sessions: display name, verified email, connected sign-in method, notifications, and session revocation.
- Saved items, current-price reordering, verified-purchase reviews, availability subscriptions, and pre-sales support conversations.
- Booster portal: assigned orders, permitted communication/evidence, delivery estimates, availability, and sessions. Admin retains assignment and final completion control.
- Policy pages: terms, privacy, service/refund policy, account-sale delivery policy, and contact information.

Browse and estimate without signing in. Require authentication before submitting an order, purchasing, or opening an order conversation. Preserve nonsensitive form answers through login. Do not store game credentials in browser draft storage.

### 4.2 Custom boosting journey

1. Customer chooses a game and completes its currently published form.
2. Backend validates the answers and returns an estimate with a price breakdown, currency, configuration versions, and expiry.
3. The interface says **“Estimated price — final quote after admin review.”** It does not offer payment for the estimate.
4. Customer signs in and submits the request. Backend revalidates the configuration and saves the submitted answers and estimate snapshot.
5. Admin reviews the request, asks for clarification if needed, or rejects it with a customer-visible explanation.
6. Admin issues a final quote containing scope, price breakdown, delivery expectations, conditions, and expiry.
7. Customer explicitly accepts that quote. An invoice may then be created.
8. Verified, sufficiently confirmed payment makes the order eligible for fulfillment.
9. Staff collect any remaining fulfillment information, update progress, chat, and upload evidence.
10. Admin marks the service complete. Customer sees the completion evidence and the applicable dispute/support window.

**Admin acceptance issues a quote; it does not automatically charge or financially commit the customer.** If the customer changes rank, options, or scope before acceptance, the order returns to review and needs a new quote.

### 4.3 Fixed-package journey

1. Customer selects a published package and sees its exact included scope and price.
2. Customer supplies required information and passes the package's eligibility checks.
3. Checkout snapshots the package version and price and creates an awaiting-payment order.
4. Customer pays directly. No per-order quote approval is required.
5. Confirmed payment queues the order; staff can start once required fulfillment information is present.

Packages can have stock/capacity limits or be unlimited. Any selectable option that changes the price must be an explicitly priced variant; otherwise it belongs in the custom-quote flow. Admins may pause future sales without changing already purchased packages.

## 5. Administrator-managed games and forms

### 5.1 Game catalog

Each game has a stable ID and slug, title, description, images, visibility, supported regions/servers, ordering availability, FAQs, and optional rank/hero/role catalogs. Mobile Legends is seeded as editable data, not a special branch in application code.

Admins can draft, preview, publish, pause ordering, and archive a game. Archiving prevents new purchases while keeping historical orders readable.

### 5.2 Form builder

A game may have multiple custom services, such as rank boosting and another future service. Each service has a versioned form and a compatible pricing rule version, published together as one service configuration release.

Supported initial field types:

| Type | Example | Required behavior |
| --- | --- | --- |
| Select/radio | Region, delivery priority | Stable option IDs, labels, allowed values. |
| Multiselect | Allowed heroes | Min/max selections and compatibility checks. |
| Boolean | Single-hero restriction | Optional dependent fields. |
| Integer/decimal | Stars, requested win rate | Min, max, step, and units. |
| Short/long text | Player identifier, instructions | Length limits and safe rendering. |
| Rank selector | Starting/target rank | References a versioned, ordered rank catalog. |
| Attachment | Current-rank screenshot | References an authorized upload, never an arbitrary object key. |

Every field includes a stable key, label, help text, required/default rules, ordering, validation, conditional visibility, and collection stage. Collection stages distinguish estimate input, order submission, and after-payment fulfillment information.

The initial condition language supports equality, membership, numeric comparisons, and bounded `all`/`any` groups. Rules may require one field when another option is selected or reject incompatible combinations. Cycles, unknown references, excessive nesting, and impossible conditions prevent publication.

Hidden fields have a defined neutral/absent value and cannot silently affect price through stale submitted values. The backend rejects unknown fields and options. Client validation improves usability; server validation is authoritative.

Secrets are not a generic form field. Playing on customer accounts uses the dedicated secure handoff in section 10; playing together collects only the coordination details it needs.

### 5.3 Mobile Legends starter configuration

The initial configuration must cover:

- Region/server and the identifiers necessary to fulfill the service.
- Starting rank, division, and applicable stars/points.
- Target rank, division, and applicable stars/points.
- Requested win rate and a clear explanation of what it measures.
- Single-hero option and selected hero.
- Single-role option and selected role.
- Allowed/excluded heroes if the business supports them.
- Fulfillment mode: play on the customer's account or play together; both supported at launch, with mode-specific required information and pricing.
- Standard/priority delivery and any scheduling requirements.
- Additional instructions and optional rank screenshot.

These are configurable candidate fields, not promises that every service option is available at launch. Actual rank ladders, star rules, hero-role relationships, region coverage, valid combinations, and prices must be supplied and verified before publication. No placeholder prices or assumed current-season rules go live.

Validate target progression against the configured ladder, including transitions between divisions and star-based tiers. Cross-season changes require a new catalog version. An unsupported selection returns a clear validation error or “manual estimate required,” never a fabricated price.

**Win-rate definition is open:** minimum over matches played during the order, target overall account win rate, or a preference. A guaranteed minimum requires a defined measurement window, exceptions, and remedy if missed. Overall account win rate additionally needs starting wins/matches and feasibility rules. We must settle this before implementing its pricing and customer copy.

## 6. Price estimation, quotes, and versioning

### 6.1 Estimation engine

Use deterministic, admin-configured rules. “Predict” means calculate an estimate from the configured inputs and rules; machine learning is not required.

Initial rule primitives:

- Base service amount.
- Rank-interval lookup table: sum the configured cost of progression segments crossed.
- Per-unit rates for a configured numeric quantity.
- Fixed surcharges and percentage adjustments triggered by allowed conditions.
- Named multipliers, minimum/maximum bounds, and unsupported/manual-review conditions.

Admins build rules through structured controls and preview the result against example inputs. Do not execute JavaScript, SQL, Go, shell commands, or unrestricted formulas supplied by an admin. New field data requires no deployment; an entirely new kind of pricing operator or external integration may require code.

The rule evaluation contract specifies order and rounding:

1. Validate and normalize answers against the selected immutable configuration.
2. Calculate base cost, including the rank segment sum or unit-based calculation.
3. Add matching fixed adjustments.
4. Apply percentage adjustments against that subtotal; percentages in the same stage add, rather than compound implicitly.
5. Apply explicit multipliers in declared order.
6. Apply configured bounds and any eligible coupon, enforce the payable minimum, then round once to the currency's minor unit using decimal arithmetic and half-up rounding. Coupon eligibility, reservation, and accepted-total rules are defined in roadmap P04–P07.
7. Return total, customer-safe line items, evaluation version, and estimate expiry.

All calculations use bounded integer/decimal arithmetic; no floating-point money. Define overflow and negative-value rejection. Require positive payable totals at launch. Internal cost/margin notes never appear in customer responses.

Illustrative calculation only, **not a launch price**: base USD 40 + one-hero surcharge USD 5 = USD 45; priority adjustment 20% of USD 45 adds USD 9; estimate USD 54. Final custom-order price still requires an admin quote.

### 6.2 Publication and historical consistency

- Draft form/rule edits do not affect published configurations.
- Publication validates option references, dependencies, rank tables, rule bounds, and administrator-saved example cases.
- A service publication atomically pins the form, catalogs, rules, and evaluator version. Checkout never mixes versions.
- Estimate responses include their configuration version and a proposed 15-minute validity window.
- A stale/unpublished estimate cannot silently create an order under new prices: recalculate and show the changed result before submission.
- Existing submitted requests keep the original estimate for history. Admins may issue a different final quote with an explanation.
- Quotes and orders snapshot field labels, selected values, rules/version references, price lines, currency, terms version, and relevant delivery details.
- Published packages and listings are also versioned. Editing them affects future purchases only.

### 6.3 Quotes

A quote has a sequential revision within an order, final amount, itemized adjustments, scope snapshot, admin, reason for changes, issued time, expiry, and acceptance record. Proposed validity is 48 hours and is configurable.

Quotes can be issued, accepted, superseded, expired, or declined. At most one revision can be accepted for the payable order contract. Publishing a revision supersedes the previous unaccepted quote.

An accepted contract cannot be silently repriced. If an unpaid accepted quote must change, explicitly withdraw its payment route and obtain fresh customer acceptance. Any money arriving on an old invoice enters reconciliation. Paid-order changes need a separately approved change-order/refund process; arbitrary edits to a paid total are forbidden.

Quote validity controls the latest time to accept and create its initial invoice. An invoice created in time retains its own documented payment window, even if the quote would otherwise expire during that window. After invoice expiry, a new invoice requires a still-valid contract or a renewed quote.

## 7. Order, payment, and fulfillment states

Keep order fulfillment state, quote state, payment attempt state, and refund state separate. “Paid” is a financial fact, not proof that boosting is complete.

### 7.1 Order transitions

| From | To | Trigger/guard |
| --- | --- | --- |
| Local draft | `submitted` | Valid custom request submitted by its customer. |
| `submitted` | `needs_information` | Admin asks for required clarification. |
| `needs_information` | `submitted` | Customer supplies revised information. |
| `submitted` | `quoted` | Admin issues a valid final quote. |
| `quoted` | `submitted` | Customer revises scope before acceptance; the old quote is superseded. |
| `quoted` | `quoted` | Admin publishes a new revision, superseding the previous unaccepted quote. |
| `submitted` / `needs_information` / `quoted` | `rejected` | Admin rejects before an accepted/payable contract. |
| `quoted` | `awaiting_payment` | Customer accepts a valid quote. |
| New package/account purchase | `awaiting_payment` | Backend validates and snapshots an available offer. |
| `awaiting_payment` | `queued` | Payment service records qualifying confirmed funds and purchase/reservation checks pass. |
| `queued` | `in_progress` | Authorized staff start; required fulfillment data is present. |
| `queued` / `in_progress` | `on_hold` | Recorded reason, actor, and next action; preserve resume state. |
| `on_hold` | Previous permitted state | Hold resolved; remaining prerequisites pass. |
| `in_progress` | `completed` | Admin records completion and required evidence/delivery record. |
| Unpaid eligible state | `cancelled` | Customer/admin cancellation, with invoice retirement and late-payment handling. |
| Unpaid `quoted` / `awaiting_payment` | `expired` | Applicable quote/invoice lifecycle ends with no detected or unresolved funds. |
| Paid nonterminal state | `cancelled` | Admin resolves cancellation and records the associated refund decision. |

An expired order is historical; reordering creates a fresh validated request/purchase. If another attempt remains valid, expiry of one invoice alone does not expire the order. Detected funds awaiting confirmation prevent normal expiry/release until reconciled. Rejection/cancellation races with incoming payments must resolve through the payment exception workflow.

Customers can request cancellation after payment but cannot force a paid order to cancel or refund. Completion disputes are separate cases, so raising a dispute does not erase completion history. Rework may create an audited transition back to fulfillment under the resolved case.

Every transition checks actor, current state, expected row version, prerequisites, and business reason. The state change and append-only timeline record commit together. Stale concurrent changes return a conflict instead of overwriting another admin's work.

### 7.2 Timeline

Customer-visible entries include request submission, clarification, issued/accepted quote, confirmed payment, start/hold/progress updates, evidence, completion, cancellation, and refund progress. Staff notes and sensitive risk details have separate visibility and never leak through timeline or notification endpoints.

## 8. Cryptocurrency payments and refunds

### 8.1 Integration decision

**Proposed:** use a crypto checkout provider behind a Go interface. Select the provider after the owner supplies the business operating country, target customer regions, preferred assets/networks, and settlement preferences. No provider, supported country, fee, or asset is assumed approved by this document.

Evaluate official provider documentation for supported business activities and regions, asset/network pairs, invoice expiry, signed webhooks, API reconciliation, refunds, test environment, settlement custody, fees, and operational reliability. Record the chosen provider and behavior in an architecture decision before integration.

The initial adapter contract covers create/get invoice, verify/normalize webhook, get authoritative payment state, and refund submission/status where supported. Provider credentials and merchant settlement keys remain server-side.

If direct-address payment is selected, scope expands to unique invoice attribution, chain monitoring, confirmation/reorganization handling, node/API reliability, decimal precision, address/key custody, and refund signing. That is a separate implementation decision, not a UI setting.

### 8.2 Payment records and invariants

Each order has an amount and currency contract; it can have multiple sequential payment attempts. Each attempt stores provider invoice ID, expected fiat reference amount, exact crypto amount, asset identifier, network identifier, destination/reference where applicable, expiry, received/confirmed amounts, and provider status history.

- One active invoice attempt per order; reuse an active attempt on repeated checkout requests.
- Use a provider idempotency key or a persistent merchant reference to reconcile ambiguous creation timeouts before retrying.
- At most one successful fulfillment activation per order, enforced transactionally. Additional successful transfers are payment exceptions, not extra orders or customer balance.
- Preserve exact asset precision using decimal strings or integer base units with defined scale. Network is part of the asset selection; the same symbol on another network is a different payment route.
- Order/accounting amounts use integer minor units plus an explicit currency code and exponent.
- Payment status can change only through verified provider evidence or an audited owner reconciliation action supported by independently checked provider/chain evidence.
- A screenshot, customer transaction hash, browser success redirect, or admin status button alone cannot mark an order paid.

### 8.3 Checkout behavior

Display the accepted order total, selected asset/network, exact amount, address and memo/tag where required, QR code when applicable, expiration, confirmation state, and fee treatment. A proposed default is that customers pay their network transaction fee separately; platform/provider fee treatment must be confirmed and disclosed before payment.

The fiat quote and crypto invoice have separate lifetimes. Lock the crypto amount only for the invoice validity supplied by the integration. Refreshing an expired invoice may produce a different crypto amount while keeping an eligible fiat contract unchanged.

### 8.4 Webhooks and reconciliation

1. Accept a size-limited request and verify the provider's documented signature against the raw body, including timestamp/replay checks where supported.
2. Persist the verified event in a durable inbox with a unique provider/event key before acknowledging it.
3. Worker processes events idempotently and reconciles the authoritative invoice state when event order or trust requires it.
4. Transactionally update payment records, order eligibility, inventory, timeline, and outbox events.
5. A scheduled reconciliation job checks open/stalled invoices to recover missed webhooks or outages.

Do not downgrade confirmed payment because an older pending event arrives. If payment finality is reversed or disputed by the integration, retain the financial history, open an exception, and hold unfulfilled work. Acknowledge only after durable acceptance; processing retries use backoff and surface exhausted jobs for operator replay.

### 8.5 Exception handling

| Situation | Required behavior |
| --- | --- |
| Underpayment | Keep payment pending/manual review; show any provider-supported top-up instructions tied to the same invoice. No automatic fulfillment below the configured accepted amount. |
| Overpayment | Record full receipt, settle the order once, and open a disposition/refund case for excess. Never create site credit. |
| Late payment | Reconcile against the original invoice and availability; accept only when safe and policy permits, otherwise refund review. |
| Wrong asset/network | Explain supported routes before payment; record a support case and never promise recoverability. |
| Duplicate webhook | Return a safe acknowledgement without duplicate fulfillment or email. |
| Multiple paid attempts | Fulfill once; reconcile the additional funds separately. |
| Pending confirmations | Show confirming; do not start fulfillment. |
| Provider outage | Keep order and invoice records, retry/reconcile, and show an actionable payment state. |
| Unknown invoice | Quarantine for investigation; never assign funds by guessing the customer. |
| Payment after cancellation/stock release | Do not revive fulfillment automatically; check current inventory and resolve with the customer. |

### 8.6 Refunds

Refunds are explicit records linked to received payments: requested, approved/rejected, processing, confirmed, or failed. Support full and partial refunds when the business policy allows them. Cumulative refunds cannot exceed the refundable received amount in its asset/scale accounting.

An authorized admin reviews the reason and amount. Sensitive approval requires recent authentication. Confirm the recipient asset/network/address through the authenticated customer flow; an exchange's sending address is not automatically a safe refund address. Record any address change and verify it before execution.

Provider refund APIs use idempotency and reconciliation. If manual merchant transfers are required, record verified transaction evidence and approval before marking complete. The application must not report a refund as paid merely because staff entered a transaction hash.

The owner must define refund eligibility before/after work starts, partial completion treatment, network/provider fees, exchange-rate basis, and dispute windows. Refunds never become a customer wallet balance. Financial receipts/refund records exist solely to account for direct payments.

## 9. Game account buying and selling

### 9.1 Confirmed launch flow: customer submissions and admin-reviewed resale

1. An authenticated customer submits an account with game, region, relevant attributes, screenshots, and ownership/control information.
2. Admin reviews the submission, requests more information, rejects it with a reason, or proposes commercial terms.
3. Seller accepts the exact terms: purchase price or seller proceeds/commission, payout timing, asset/network, fees, transfer obligations, and dispute treatment.
4. Staff verify the required ownership/control handoff. Only then can the approved account become a public listing under the selected model.
5. A buyer purchases the listing through direct crypto checkout and the inventory reservation flow below.
6. Staff complete secure delivery and resolve any required acknowledgement/dispute period.
7. The seller receives a direct crypto payout at the time defined by the accepted arrangement. The seller can see its status and receipt, but has no wallet or top-up balance.

Submissions support draft, submitted, needs-information, approved-pending-terms, accepted, rejected, and withdrawn states. Listing, delivery, and payout states are tracked separately. Any admin change to commercial terms needs fresh seller acceptance. Withdrawal is allowed before acceptance; afterward it follows the agreed contract and cannot silently cancel a buyer's paid order.

Each submission has a private seller–admin conversation. Buyer–admin and seller–admin conversations are separate; buyer identity, seller identity, private notes, and credentials are not exposed to the other party. Secure secret exchange uses section 10, never ordinary messages.

### 9.2 Listings, reservations, and buyer delivery

Admins create listings with game, region/server, rank, account attributes, sanitized screenshots, description, fixed price, delivery instructions, and sale terms. Each unique account is a single inventory unit.

Listing states: `draft`, `published`, `reserved`, `sold`, `withdrawn`. Public listing data is separate from private delivery secrets. Never publish login information, recovery material, or personal identifiers in screenshots.

Checkout atomically reserves an available account for one order before creating an invoice. Another buyer receives an unavailable response. The reservation deadline aligns with invoice validity plus the configured settlement handling window. A worker reconciles invoice status before releasing expired reservations; pending detected payments extend/hold the reservation under a bounded operator-reviewed process.

A payment arriving after a reservation was released must not take an account already sold to another customer. Open a payment exception and arrange an alternative or refund under policy.

After confirmed payment, staff perform the defined secure ownership handoff and add a delivery record. Proposed launch delivery is manual through an authenticated, audited delivery screen. The owner must define what constitutes transferred ownership, buyer acknowledgement, and the dispute window. A refunded account is not automatically relisted until staff verify control and revoke previous access.

### 9.3 Seller payout arrangement — open

Two supported specification options require an owner choice before implementing settlement:

| Arrangement | When seller payment becomes due | Required commercial decisions |
| --- | --- | --- |
| Resale/consignment | After a buyer pays and the defined delivery/dispute conditions are satisfied. | Agreed seller proceeds or commission, hold period, cancellation/refund responsibility, and unsold listing withdrawal. |
| Booster Plus buys first | After staff verify transfer to Booster Plus under the accepted purchase offer, before resale. | Purchase price, transfer criteria, payout deadline, and responsibility for unsold inventory. |

Both require direct crypto payout records with amount, asset/network, verified recipient, accepted-terms reference, approval, provider/transaction reference, and lifecycle: not-due, pending-approval, processing, confirmed, failed, or cancelled. Display a pending contractual payment as an individual record, not a balance the user can spend or withdraw arbitrarily.

Payout authorization is distinct from customer refunds. Enforce one payout obligation per accepted seller contract, idempotent initiation, verified recipient changes, and reconciliation of ambiguous/failed transfers. A seller or support agent cannot mark a payout complete. Buyer refunds must interact with seller payout eligibility according to the selected model; the system must not pay a consignment seller while the related receipt is being refunded.

The checkout provider may not support third-party seller payouts. Select a supported payout integration or an audited manual merchant-transfer process after the operating model and regions are known. Do not treat an outgoing seller payout as a refund of an unrelated customer payment. No seller payout is simulated as successful in production.

### 9.4 Future marketplace expansion

Self-published seller listings, direct buyer–seller chat, and broader marketplace settlement are separate future scope. Do not label Booster Plus an escrow service without an approved actual arrangement. The confirmed launch model keeps review and resale operations under admin control.

## 10. Authentication and sensitive information

### 10.1 Passwordless customer login

**Email — proposed:** request a one-time six-digit code, verify it, and create/reuse the account. Proposed limits: 10-minute expiry, 60-second resend cooldown, five verification attempts per challenge, plus shared per-address/per-IP issuance limits. Tune these through abuse testing.

Store codes as a keyed digest with a server-held secret, associate them with a specific challenge and purpose, and consume them atomically once. A resend invalidates the previous challenge. Use consistent request responses to reduce account enumeration. Never log codes or send them to analytics. First login also requires acceptance of the published terms.

**Google:** use the authorization-code flow with state, nonce, PKCE where supported by the selected library/flow, and verified ID tokens. Validate issuer, audience, expiry, and nonce, and identify the Google identity by its stable `sub`, not by email alone. This follows Google's [OpenID Connect guidance](https://developers.google.com/identity/openid-connect/openid-connect).

Linking Google to an existing email account requires proof of control of the existing account plus the new Google identity. Matching email text alone does not automatically merge accounts. Account recovery and changing a verified email require fresh verification, session revocation options, and an audited support fallback.

### 10.2 Sessions and staff login

Use opaque random server-side sessions stored as digests in TiDB, delivered in Secure, HttpOnly cookies with appropriate SameSite settings. Rotate at login/privilege changes, enforce idle and absolute expiry, support logout/revoke-all, and avoid persistent bearer tokens in browser storage.

Deploy the frontend and `/api` behind one public origin to simplify cookies and CSRF controls while keeping separate projects and containers. Check Origin/CSRF tokens on state-changing requests; allowlist development origins. Apply shared rate limits so adding API replicas does not multiply allowances.

Admins use explicitly granted identities, never public role selection or a hard-coded email suffix. Bootstrap the first owner through an audited CLI command targeting an already verified user. Proposed additional safeguard: staff MFA/step-up for refunds, credential access, and role changes, without introducing site passwords. The owner selected authenticator-app codes at every staff sign-in on 9 September 2026; sensitive actions also require recent verification.

Use [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) when implementing generic failures, throttling, reauthentication, and session protections.

### 10.3 Game credentials and account delivery

For the confirmed play-on-customer-account mode, collect required game access after confirmed payment through a dedicated encrypted secret submission. Keep it out of chat, generic form snapshots, event payloads, logs, notifications, and analytics. Playing-together orders instead collect player identifiers, scheduling, and coordination preferences without requesting game credentials.

Use application-level envelope encryption with keys managed outside the database, tightly scoped reveal permissions, recent staff authentication, audited access, and configurable automatic deletion after completion/dispute retention. Never request the customer's Booster Plus/Google/email password. Define secure temporary access for game login and recovery details only when operationally required.

Account-sale secrets use the same isolated storage but distinct access and retention rules. Ordinary support staff and public catalog APIs cannot retrieve them. Backup retention and encryption-key lifecycle must be included in the deletion policy.

## 11. Chat, uploads, and notifications

### 11.1 Order conversations

Each order gets a conversation from submission/purchase onward, including before custom quote acceptance. Account seller submissions and pre-sales inquiries also get separate authorized conversations, using the same messaging infrastructure with explicit scopes. Pre-sales support requires sign-in but no order; linking it to a later order preserves ownership and participant boundaries. Customers and authorized staff can exchange text and permitted images. System timeline events remain distinct from human messages.

Messages persist before delivery acknowledgement. Use cursor pagination, a client-generated idempotency key for sends, server timestamps, unread markers, and reconnect/backfill support. Proposed transport is REST for sending and server-sent events for updates, with polling fallback. The database remains the source of truth; an event-stream disconnect must not lose messages.

Staff-only notes are a separate visibility class and API permission. Never include them in customer notification previews or customer event streams. Plain text is sufficient initially; any later Markdown must be sanitized and restricted. Add reporting/moderation and bounded sending limits.

### 11.2 Files and proof

Store files in private S3-compatible object storage and metadata in TiDB. Separate public catalog assets from private conversation/proof/delivery files. Access private objects only after order-level authorization, using short-lived signed URLs.

Implemented initial image policy: JPEG, PNG, and WebP, with a 4 MiB limit and at most 4 million pixels (each dimension at most 4096). The earlier 10 MB value was a proposal; the lower initial bound limits decoder memory and request duration. Enforce account and conversation/audience quotas. Original filenames never enter storage: validate declared and decoded types, actual size, and dimensions, then choose the download extension from the sanitized output type. Quarantine uploads until validation/scanning passes, re-encode supported images, strip metadata, and use generated storage keys. These controls follow [OWASP's file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

An upload intent is bound to user, purpose, and its authorized order or seller submission. Completing it checks object metadata and ownership; a customer cannot attach another user's object by ID. Include cleanup for abandoned intents/orphaned objects and a failed-processing state with retry.

Admins can add captioned proof to progress updates and completion. Publishing proof creates a customer timeline entry and notification. Redaction/removal must retain an audit record, with replacement evidence where appropriate. Required completion proof is configurable per service.

### 11.3 Notifications

Initial channels are in-app and transactional email. Notify for verification, request submission, clarification needed, quote issued/expiring, payment confirmed/problem, important status changes, unread chat, completion, refund updates, seller review/offer decisions, sale progress, and payout updates.

Use asynchronous jobs with retry, deduplication, delivery status, and template versions. Chat email can be delayed/coalesced to avoid flooding. Messages contain links to authenticated pages and avoid credentials or sensitive attachments. Essential account/payment notices are distinguished from optional marketing, which is outside initial scope.

## 12. Admin panel

Required modules:

- Dashboard: orders needing action, unpaid/confirming invoices, active work, unread conversations, payment exceptions, and failed jobs.
- Orders: search, filters by game/type/customer/status/date/assignee, quote history, payment view, timeline, chat, internal notes, evidence, and permitted transitions.
- Quotes: issue/revise with explanation, preview customer view, expiry, acceptance history.
- Games/services: game catalog, reference catalogs, form builder, rule builder, preview scenarios, publication history, ordering pause.
- Packages: scope, variants, price, required information, capacity/stock, publication, and archive.
- Accounts: seller submissions and review, commercial offers/acceptance, listings, private inventory, reservations, secure delivery, and payout review/reconciliation.
- Customers: verified identity summary, order history, suspension, and access-limited support tools.
- Payments/refunds: invoice state, reconciliation evidence, exceptions, refund review, and export.
- Media: processing status, order evidence, and authorized removal.
- Staff/audit: role grants, session revocation, and searchable sensitive-action history.
- Boosters/scheduling: aliases, availability, manual assignments/reassignments, session conflicts, delivery estimates, and completion review.
- Coupons/reviews/alerts: bounded promotion rules, review moderation/admin responses, and availability subscription controls.
- Pre-sales support: dedicated inbox, assignment, waiting/resolved states, and authorized links to subsequent orders.
- Settings: business contact, visible assets/networks from the configured integration, configurable timers, notification templates, and policy versions.

Operational reports show paid order totals, refunds, net receipts, order conversion, and fulfillment time with currency and date basis clearly labeled. Do not sum unlike assets/currencies without an explicit conversion basis. CSV exports require permission and audit logging and must neutralize spreadsheet formula injection.

Use optimistic concurrency on quote/catalog/order updates. Confirm destructive operations and show consequences. Archive sold products and historical records instead of deleting referenced rows.

## 13. Technical architecture

### 13.1 Deployment shape

```text
Customer / staff browser
          |
    HTTPS reverse proxy
       /         \
React frontend   Go API (/api/v1, /events)
 public SSR          |        |        |
 customer/admin     TiDB   private   Google / email /
 client routes       |     storage   crypto provider
                  Go worker
                     |
             optional NATS JetStream
```

Use a modular Go application, not an initial fleet of microservices. API and worker share domain code but run as independently scalable processes. Transactions cover related business writes; external side effects run after commit via durable jobs/outbox records.

### 13.2 Backend

Proposed components:

- Supported Go release pinned in `go.mod`, CI, developer setup, and container builds.
- Standard `net/http` with a small router if needed; explicit request limits, timeouts, panic recovery, and graceful shutdown.
- Ent schemas and generated typed queries, using the MySQL SQL driver against TiDB.
- Cobra for `cmd/cli`; Goose as the proposed SQL-only migration execution library.
- REST JSON API with a versioned OpenAPI contract and generated TypeScript client.
- Structured logging, request IDs, metrics, and OpenTelemetry-compatible tracing.
- Dependency injection through constructors; configuration validated at startup, with production secrets supplied externally.

Keep HTTP DTOs, service/business logic, and Ent persistence representations separate. Domain packages own their invariants. Do not return Ent objects directly from public APIs or generate unrestricted CRUD endpoints over sensitive entities. Use explicit transactions for payment/stock/quote state changes.

**TiDB/Ent compatibility decision:** Ent documents TiDB support as preview and describes an Atlas-based migration integration. This project deliberately uses Ent for runtime queries only and hand-authored SQL for migrations. Using the MySQL driver for that combination is our proposed approach, which must pass a real TiDB compatibility spike; it is not assumed certified by Ent. See [Ent dialect documentation](https://entgo.io/docs/dialects/) and [TiDB MySQL compatibility](https://docs.pingcap.com/tidb/stable/mysql-compatibility/).

The spike covers generated queries, JSON fields, indexes/constraints, unique-conflict handling, transactions, concurrent inventory reservation, and the selected migration runner on the exact TiDB version. Avoid relying on unsupported MySQL features such as `SKIP LOCKED` for job claiming; use a tested conditional-update/lease strategy instead. Pin the validated version matrix in the backend README.

### 13.3 Frontend

Proposed stack: React, TypeScript in strict mode, Vite tooling, React Router, TanStack Query for remote state, and an accessible reusable component layer. Pin exact compatible versions and a package manager/lockfile during scaffolding. See the official [Vite guide](https://vite.dev/guide/) and [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview).

Use React Router framework rendering for public catalog pages where SEO matters, with customer/booster/admin interaction handled on the client. The frontend Node runtime renders pages and fetches the Go API; business logic, authentication authority, database access, pricing, and payment decisions stay in Go. React Router supports the relevant [rendering strategies](https://reactrouter.com/start/framework/rendering).

Never cache private pages or session responses as public content. Public rendering caches must invalidate promptly on catalog publication, and checkout always rechecks current backend availability. If initial deployment requires a static SPA instead, explicitly record the SEO tradeoff before changing this default.

Organize by feature, use generated API types plus runtime validation at boundaries, and keep server data in the query cache instead of duplicating it in global state. Every important screen includes loading, empty, validation, permission-denied, offline/retry, and conflict states.

Mobile-first layout, keyboard navigation, readable errors, focus management, contrast, reduced-motion support, and accessible dynamic forms are acceptance requirements. Keep text and date/currency formatting localizable from the start; enable RTL if Persian is selected.

### 13.4 Jobs and optional NATS

Durable jobs are required for payment reconciliation, notifications, expirations, media processing, and cleanup. Initial database jobs use scheduling, a lease/owner token, conditional claims, bounded attempts, backoff, and an operator-visible failed state. Renew leases and prevent a stale worker from committing a second effect.

Write business state and the associated outbox/job row in the same TiDB transaction. For nontransactional external effects, use provider idempotency/reconciliation; database retries alone cannot guarantee a single email/payment API call.

If NATS is enabled, use JetStream durable consumers, explicit acknowledgement after durable processing, publisher acknowledgement, consumer deduplication, and an application-managed failed-message workflow. The SQL outbox bridges database commits to message publication. Design handlers for redelivery, as documented by [NATS JetStream](https://docs.nats.io/learn/jetstream/pull-consumers); do not claim exactly-once business processing from transport settings alone.

Live chat initially reads persisted updates using resumable cursors per API instance. NATS can later provide notification fan-out without replacing durable chat history. Browser clients never connect directly to the private broker.

## 14. Independent project layout

Paths below are the intended structure, not files already implemented. `backend/` is the backend project root; **`backend/migration/` is its required root-level SQL migration directory**. There is one migration source, packaged with the backend image.

```text
boosting/
  BOOSTER_PLUS_SPEC.md
  README.md
  backend/
    cmd/
      server/main.go
      cli/main.go
      worker/main.go
    internal/
      app/                 # dependency wiring and lifecycle
      config/
      identity/
      catalog/
      pricing/
      orders/
      payments/
      accounts/
      chat/
      media/
      notifications/
      audit/
      jobs/
      transport/http/
      platform/            # database, storage, provider adapters
      database/migration/  # Cobra-facing migration service
    ent/
      schema/              # authored ORM mapping
      ...                  # generated query code
    migration/
      000001_identity.sql
      000002_catalog.sql
      ...
    api/openapi.yaml
    docs/                  # operations and architecture decisions
    test/                  # integration fixtures and scenarios
    .env.example
    .dockerignore
    .github/workflows/
    Dockerfile
    compose.yaml
    Makefile
    go.mod
    go.sum
    README.md
  frontend/
    app/
      routes/
      features/
      components/
      api/                 # generated contract client
      lib/
      styles/
      locales/
    public/
    tests/
    api/openapi.snapshot.yaml
    .env.example
    .dockerignore
    .github/workflows/
    Dockerfile
    Makefile
    package.json
    pnpm-lock.yaml
    README.md
```

Each project must build/test independently without importing the other's source directory. The frontend pins an API contract snapshot/release. Whether these become two Git repositories or remain two independent projects in one repository is open; the layout supports either. CI workflow placement follows that choice.

## 15. SQL migrations and Cobra CLI

### 15.1 Rules

- Hand-authored, ordered `.sql` migrations are authoritative for database schema changes.
- Ent schema files map the schema for typed queries. Update Ent mappings and corresponding SQL together.
- Do not call `client.Schema.Create`, use Ent automatic migration, generate migration diffs through Ent/Atlas, or migrate on server/worker startup.
- Proposed runner: the Goose library invoked by the project's Cobra CLI, restricted to SQL migrations. Goose documents SQL migrations and TiDB usage in its [official repository](https://github.com/pressly/goose).
- Use sequential unique filenames and `-- +goose Up` / `-- +goose Down` sections where a meaningful reversal exists. Refuse rollback for explicitly irreversible migrations.
- DDL files use the runner's nontransactional mode. TiDB DDL commits automatically and cannot be transactionally rolled back, as documented in [TiDB transactions](https://docs.pingcap.com/tidb/stable/transaction-overview/). Split risky DDL and backfills into separate resumable steps.
- An applied migration is immutable. Add a new file to change behavior. Reject duplicate numbering and unexpected missing/out-of-order files.
- Add CLI-level checksum verification and an execution journal for applied migration content; do not assume the runner supplies those guarantees automatically. Mark an attempt before execution and surface interrupted/partial failures until explicitly reconciled.
- Execute migrations from one serialized release job using a proven single-runner lock compatible with the chosen TiDB version. Do not blindly depend on MySQL advisory-lock behavior. Validate competing CLI invocations and lock loss in the compatibility spike.
- Use dedicated migration credentials with DDL permission. Runtime API/worker credentials do not have schema modification permission.
- Package SQL files at a deterministic image path, with a CLI flag to select a directory; do not rely on the caller's working directory in production.

### 15.2 Command contract

The binary name is proposed as `boosterplus`. All commands provide help, timeouts, useful exit codes, secret-safe output, and an explicit environment/target indication.

| Command | Purpose |
| --- | --- |
| `boosterplus version` | Print binary/build and supported schema range. |
| `boosterplus config validate` | Validate configuration without printing secrets. |
| `boosterplus db migrate create <name>` | Create a numbered SQL template locally. |
| `boosterplus db migrate validate` | Validate ordering, annotations, file integrity, and the manifest. |
| `boosterplus db migrate status` | Show applied/pending/interrupted migrations. |
| `boosterplus db migrate version` | Show the current schema version. |
| `boosterplus db migrate plan` | Show pending filenames/SQL for review without applying them; not a rollback guarantee. |
| `boosterplus db migrate up [--to VERSION]` | Apply forward migrations under the single-runner lock. |
| `boosterplus db migrate down --steps N` | Apply supported reversals with explicit target and destructive-operation safeguards. |
| `boosterplus db migrate verify` | Compare recorded checksums and schema expectations; report drift. |
| `boosterplus db seed --dataset mobile-legends` | Idempotently create editable starter drafts, with no live invented prices. |
| `boosterplus admin grant --user-id ID --role owner` | Audited, restricted bootstrap/administrative grant to a verified user. |
| `boosterplus jobs list-failed` / `jobs retry ID` | Inspect and replay authorized failed work. |

Production defaults to forward-fix migrations. `down` cannot restore deleted data and must require an explicit environment acknowledgement and a reviewed recovery plan. No casual production `reset` or “mark successful” shortcut. Partial DDL failure gets a documented repair process with inspected schema state, journal correction, and audit history.

CI provisions real TiDB, applies SQL to an empty database, runs Ent queries, upgrades from the previous supported schema, and checks expected columns/indexes/constraints through read-only metadata inspection. No Ent migration is used even in tests. Server readiness checks its supported schema range and reports incompatibility without trying to repair it.

## 16. Data model and API contract

### 16.1 Main records

| Domain | Records |
| --- | --- |
| Identity | Users, verified identities, email challenges, sessions, role grants. |
| Catalog | Games, services, service releases, form versions, reference catalogs, pricing versions, rule test cases. |
| Offers | Package versions, capacities, account listings/versions, unique inventory units, reservations. |
| Promotions | Coupon versions, eligibility rules, usage reservations, and redemptions. |
| Seller commerce | Account submissions, review events, seller agreements/acceptances, payout obligations, payout attempts, and payout events. |
| Orders | Orders, immutable scope snapshots, estimates, quote revisions/acceptances, order events, assignments. |
| Money | Payment attempts, provider event inbox, received transfers, payment allocations, payment exceptions, refunds. |
| Communication | Scoped order/seller/pre-sales conversations, messages, staff notes, read cursors, notification deliveries. |
| Fulfillment | Booster profiles/aliases, assignment history, availability, session bookings, delivery estimates, and completion submissions. |
| Customer engagement | Favorites, verified-purchase reviews/revisions/moderation, availability subscriptions, and notification-cycle deduplication records. |
| Media/secrets | Upload intents, files, proof records, encrypted secret bundles, secret access events, delivery records. |
| Operations | Cancellation/dispute cases, audit records, idempotency records, jobs/outbox, migration journal/checksums. |

Use stable opaque public IDs and UTC timestamps. Use relational columns and indexes for ownership, lifecycle state, money, and common filters; use validated versioned JSON for dynamic schemas/answers/snapshots. Avoid querying unbounded JSON for routine order listings.

Enforce unique identity/provider subjects, invoice IDs, provider event IDs, request idempotency keys, and the successful order activation constraint. Unique account stock reservations must be enforced through a database transaction/conditional state update. Define retention and archive behavior for each record type. Financial and historical records cannot disappear via broad cascading customer deletion.

### 16.2 API surface

Prefix business endpoints with `/api/v1`. Publish precise request/response schemas and error cases in OpenAPI before frontend integration. Representative routes:

| Group | Examples |
| --- | --- |
| Identity | `POST /auth/email/request`, `POST /auth/email/verify`, `GET /auth/google/start`, `GET /auth/google/callback`, `POST /auth/logout`, `GET /me`. |
| Catalog | `GET /games`, `GET /games/{slug}`, `GET /services/{id}/configuration`, `GET /packages`, `GET /accounts`. |
| Estimation | `POST /services/{id}/estimates`. |
| Orders | `POST /orders/custom`, `POST /orders/package`, `POST /orders/account`, `GET /orders`, `GET /orders/{id}`. |
| Quotes/checkout | `POST /orders/{id}/quotes/{quoteId}/accept`, `POST /orders/{id}/payment-attempts`, `GET /orders/{id}/payment`. |
| Conversation/media | `GET/POST /orders/{id}/messages`, `POST /uploads/intents`, `POST /uploads/{id}/complete`, `GET /events`. |
| Requests | `POST /orders/{id}/cancellation-requests`, `POST /orders/{id}/disputes`. |
| Seller area | `POST /seller/submissions`, `GET /seller/submissions`, `GET /seller/submissions/{id}`, submission messages, offer acceptance, permitted withdrawal, and `GET /seller/payouts`. |
| Added features | Dedicated favorites/reorder, coupon validation, review, availability subscription, pre-sales conversation, assigned-booster order, and scheduling routes; detailed contracts are delivered in their roadmap phases. |
| Admin | Dedicated `/admin/...` catalog publishing, quote, status-transition, proof, payment-review, refund, staff, and audit operations. |
| Provider integration | `POST /webhooks/payments/{provider}` with provider verification instead of customer session authentication. |
| Operations | `/health/live`, `/health/ready`, private metrics endpoint. |

Use bounded pagination, allowlisted filtering/sorting, stable machine-readable error codes, field validation errors, and request IDs. Apply idempotency to order creation, quote acceptance, invoice/refund initiation, and message sending. Reusing a key with a different payload returns a conflict. Preserve financial idempotency evidence beyond ordinary short-lived HTTP cache entries.

Use expected version/ETag checks for concurrent admin changes. Return explicit stale-configuration, quote-expired, inventory-unavailable, invalid-transition, and payment-pending errors. Frontend route guards never replace backend access checks.

## 17. Docker, Compose, Makefiles, and CI

### 17.1 Containers

Backend Dockerfile uses reproducible multi-stage builds and produces server, CLI, and worker binaries in a minimal non-root runtime with CA certificates and packaged migrations. Frontend Dockerfile builds pinned dependencies and assets and runs the production React rendering runtime as a non-root user. Both have `.dockerignore`, no embedded secrets, graceful signal handling, image labels, and health checks appropriate to the runtime.

Pin base images/dependencies and update them through a controlled process. The production filesystem is read-only where practical, temporary storage is bounded, and services have CPU/memory limits. Avoid a development server as the production frontend.

### 17.2 Backend Compose

`backend/compose.yaml` defines local API, worker, an explicit one-shot migration service, a pinned TiDB development topology, private object storage, and a local email catcher. An optional profile includes NATS JetStream; another can include the frontend from a built image or sibling directory for local convenience.

Use health-based dependency checks, named volumes, configurable ports, and development-only sample credentials. Keep TiDB/object-store/broker admin ports private by default. `make compose-down` preserves volumes; destructive cleanup is a separately named target requiring explicit acknowledgement.

Compose is a reproducible local/integration environment. Production topology is selected separately and must have tested backups, TLS, monitoring, resource sizing, and restricted networks. A single-node local TiDB deployment is not evidence of production availability.

### 17.3 Backend Makefile contract

| Targets | Behavior |
| --- | --- |
| `help`, `doctor`, `bootstrap` | Explain targets, check prerequisites, install pinned developer tools. |
| `dev`, `run`, `worker` | Start documented local development/runtime commands. |
| `build`, `build-cli`, `build-worker`, `clean` | Reproducible binaries; clean only generated local output. |
| `fmt`, `fmt-check`, `vet`, `lint` | Formatting and static checks. |
| `generate`, `generate-check` | Ent query generation and contract tooling; fail on uncommitted drift, never run schema migration. |
| `test`, `test-race`, `test-integration`, `test-coverage` | Meaningful unit, race, and real-TiDB integration suites. |
| `migrate-create NAME=...`, `migrate-validate`, `migrate-status`, `migrate-plan`, `migrate-up`, `migrate-down STEPS=...`, `migrate-verify` | Delegate to the Cobra CLI; no separate migration implementation in Make. |
| `seed`, `compose-up`, `compose-down`, `compose-logs`, `compose-ps` | Local environment lifecycle and editable draft seed data. |
| `docker-build`, `docker-run`, `security`, `ci` | Container build/smoke run, vulnerability checks, complete noninteractive CI gate. |

### 17.4 Frontend Makefile contract

| Targets | Behavior |
| --- | --- |
| `help`, `doctor`, `install` | Prerequisites and locked dependency installation. |
| `dev`, `build`, `start`, `preview` | Development, production build, production runtime, and documented local preview. |
| `typecheck`, `lint`, `fmt`, `fmt-check` | Type and style checks. |
| `api-generate`, `api-check` | Generate client from pinned contract; detect drift. |
| `test`, `test-watch`, `test-coverage`, `test-e2e`, `test-a11y` | Component/behavior, browser, and accessibility verification. |
| `docker-build`, `docker-run`, `security`, `clean`, `ci` | Reproducible container, dependency audit, bounded cleanup, full CI gate. |

Targets document required variables, fail promptly, use pinned tools, and are usable in CI without interactive prompts. Test fixture creation is explicit and cannot run against production accidentally.

### 17.5 CI and release

Each project runs its own checks and image build. Contract compatibility connects their release pipelines without requiring simultaneous deployments for additive changes. Build artifacts are immutable and traceable to source revision.

Release sequence: run checks, build/scan images, deploy to staging, apply serialized forward-compatible migrations, run smoke/E2E tests, deploy production migration job, roll API/worker and frontend, verify health/business flows, and monitor. Remove obsolete columns only in a later release after old code is gone. Application rollback requires a schema-compatible prior image; it does not imply database rollback.

## 18. Production readiness and acceptance

### 18.1 Launch verification

The release is complete only after all selected launch workflows work end to end against the production-equivalent stack.

| Scenario | Acceptance evidence |
| --- | --- |
| Passwordless identity | Google and email code signup/login; expired/reused/brute-forced codes fail; duplicate/linking cases and session revocation pass. |
| Custom boost | Anonymous estimate → login → submission → clarification → final quote → acceptance → confirmed payment → fulfillment → proof → completion. Payment unavailable before a valid accepted quote. |
| Fixed package | Eligible customer pays the published snapshot price and enters fulfillment without admin quote approval. |
| Configuration | Admin adds a second sample game, fields, rules, and a package entirely through the UI. Existing orders remain unchanged. |
| Pricing | Rank boundaries, option combinations, rounding, unsupported inputs, and stale versions match saved rule cases. Client-supplied totals are ignored. |
| Payments | Duplicate/out-of-order/missed webhooks, invalid signatures, ambiguous API timeouts, under/over/late payments, confirmation delays, and provider outage recover correctly. |
| Concurrency | Two purchases cannot sell one account twice; repeated checkout cannot create duplicate obligations; two admins cannot silently overwrite a quote/status. |
| Refunds | Approved partial/full refund, rejected request, retries, address verification, over-refund prevention, and reconciliation are verified. |
| Account resale | Seller submission → private admin review → accepted terms → verified control → public listing → single-buyer purchase → secure delivery → payout at the agreed stage. Verify rejection, withdrawal, buyer refunds, payout retry/deduplication, and separation of seller/buyer conversations. |
| Fulfillment modes | Both play-on-account and play-together can be ordered and fulfilled; only the mode needing access collects encrypted game credentials. |
| Chat/media | Persisted chat survives reconnect; unauthorized users cannot access messages/files; invalid uploads stay private; evidence appears in the correct order. |
| Authorization | Customer/staff/owner matrix, object-level isolation, internal-note privacy, and secret-reveal audit tests pass. |
| Approved additions | Assigned-booster access/reassignment, session conflicts/timezones, delivery updates, concurrent coupon limits, current-price reordering, verified-review moderation, availability unsubscribe/deduplication, and pre-sales ownership/linking all pass. |
| Migrations | Empty install, previous-release upgrade, drift/interruption detection, concurrent-run prevention, and documented recovery pass on pinned TiDB. |
| Operations | Backup restored into a clean environment; worker failure/retry, graceful shutdown, monitoring alerts, and application rollback rehearsed. |
| User interface | Mobile/desktop checkout, dynamic forms, keyboard operation, accessible errors, loading/empty/failure states, and selected languages pass review. |

Use backend unit tests for price/state rules, integration tests for transactional behavior and adapters, frontend tests for important form/checkout interactions, and browser tests for the journeys above. Prefer provider sandbox and recorded signed webhook fixtures; perform a controlled real payment/refund smoke test before accepting public orders.

### 18.2 Operational requirements

- Separate development, staging, and production configuration, credentials, databases, storage, and payment modes.
- Encrypted database/object backups with restricted access, retention, and tested restoration. Proposed recovery objectives: at most 15 minutes of data loss and restoration within four hours; choose infrastructure that demonstrably meets agreed targets.
- Structured logs omit credentials, email codes, sensitive chat bodies, and payment secrets. Trace API/worker/provider activity by IDs without exposing personal data.
- Metrics/alerts cover error rate, latency, database health, job age/failures, invoice reconciliation lag, stuck payments, reservation anomalies, email delivery, storage processing, and unusual authentication activity.
- Named runbooks for provider outage, late payment, partial migration, compromised staff account, data restore, stuck job, refund failure, and exposed game credentials.
- Security checks cover authorization, CSRF, XSS, injection, SSRF, upload abuse, session fixation, webhook spoofing, and dependency/container vulnerabilities.
- Agreed retention/export/deletion rules cover customer data, conversations, files, credentials, and financial records. Keep required accounting records while removing data according to the adopted policy.
- Final published prices, rank catalogs, service availability, support contacts/hours, refund/delivery terms, payment eligibility, and rights to catalog artwork are supplied and approved by the owner.

Proposed measurable performance targets: p95 ordinary API responses under 500 ms and estimates under 750 ms, excluding external provider latency; persisted chat visible within two seconds under normal conditions. Load-test initially at 100 concurrent active sessions and 20 API requests/second with realistic data. These are test targets, not measured guarantees; revise after the expected launch traffic and budget are known.

## 19. Implementation sequence

The detailed sequence now lives in [Implementation Phases](IMPLEMENTATION_PHASES.md), which replaces the earlier nine-step outline. It contains thirteen phases, P00–P12, with dependencies, backend/frontend deliverables, open-decision gates, and completion evidence.

The sequence covers compatibility, foundations, identity, catalog, pricing/coupons, orders/favorites, communication/pre-sales, payments, booster fulfillment/scheduling, account resale, reviews/alerts, complete administration/UX, and production qualification. All seven additions are part of the complete release. These are work packages, not calendar commitments.

No phase may substitute mock payment success or hard-coded Mobile Legends-only forms for a completed launch feature. Mocks/demo fixtures are clearly development-only. Production readiness is the evidence in section 18, not merely successful compilation.

## 20. Open decisions and approved additions

### 20.1 Decisions to settle

| ID | Question | Proposed/default treatment | Needed before |
| --- | --- | --- | --- |
| D01 | When is the seller paid: after resale with agreed proceeds/commission, or when Booster Plus buys the account before resale? | Customer submissions and admin review/resale are confirmed; settlement timing is open. | Seller settlement implementation. |
| D02 | Crypto provider or direct addresses? Operating country, customer regions, assets/networks, and settlement preference? | NOWPayments hosted checkout selected for implementation after provider research; live settlement assets/networks and merchant settings remain unselected. See [provider decision](docs/crypto-provider-decision.md). | Live payment activation; unrelated implementation continues. |
| D03 | Catalog currency and who pays provider/network fees? | USD reference prices; disclose all fees before acceptance. | Pricing publication/checkout. |
| D04 | English, Persian, or other languages and regions? | English with localization-ready architecture. | Final UX/content. |
| D05 — resolved | Play on customer accounts, play together, or both? | Both confirmed by the owner on 8 September 2026; configure eligibility and data collection by mode. | Included in launch scope. |
| D06 | What exactly does requested win rate promise, and how is it measured/remedied? | No invented guarantee. | Win-rate rules and terms. |
| D07 | Actual Mobile Legends progression tables, option combinations, prices, supported regions, and service durations? | Editable drafts with no live placeholder prices. | Catalog publication. |
| D08 | Cancellation, refund, partial-work, missed-target, and dispute policies? | Admin review workflow; exact policy remains open. | Public paid launch. |
| D09 | Account ownership handoff, proof requirements, guarantees, payout fees/asset/network, and dispute hold periods? | Manual secure delivery proposed. | Account launch. |
| D10 — resolved | Do separate boosters need logins/assignments now? | Yes: booster portal, manual assignment, assigned-order-only access, and aliases approved on 9 September 2026. | Roadmap P02/P08. |
| D11 — resolved | Email code and staff MFA method | Email code; authenticator-app second factor required at every staff sign-in, confirmed 9 September 2026. Sensitive actions require recent verification. | P02/P12. |
| D12 | Hosting provider/region, domain, email service, object storage, budget, traffic, backup objectives? | Container deployment; production services unselected. | Infrastructure provisioning. |
| D13 — resolved | Two Git repositories or one repository with independent projects? | One monorepo with independent frontend/backend projects; direct main commits/pushes after both pre-commit gates, confirmed 9 September 2026. | Enforced through AGENTS.md and the tracked hook. |
| D14 | Brand colors, logo, visual references, support hours, and business policy content? | Use Booster Plus name; visual direction remains open. | Final storefront design. |

Decisions can be answered in stages. Unanswered business questions do not prevent project foundations, contracts, or reusable catalog work; they do prevent publishing unknown commercial promises or integrating an unselected live payment arrangement.

### 20.2 Approved additional features

The owner approved all seven additions on 9 September 2026. They are required in the complete release, with behavior and acceptance criteria in the roadmap.

| Feature | Implementation phases |
| --- | --- |
| Separate booster role/portal with assigned-order-only access and customer-visible staff aliases. | P02/P08 |
| Discounts/coupon codes with explicit eligibility, usage reservations, and limits. | P04–P07 |
| Verified-purchase reviews, moderation, public aggregates, and admin responses. | P10 |
| Favorites and reordering with current configuration/prices and fresh acceptance. | P05/P10 |
| Opt-in email alerts for account inventory or package capacity, with unsubscribe and deduplication. | P10 |
| Detailed delivery estimates and customer/staff scheduling, with timezone and booking-conflict handling. | P03/P05/P08 |
| Authenticated pre-sales support conversations outside an order. | P06 |

Commercial policies for these features remain configurable: no invented delivery guarantee, commission, win-rate remedy, or review policy is treated as an established business fact. Proposed defaults are documented in the roadmap.

## 21. Handling later changes

Maintain this specification as the shared product contract. Record decisions as accepted/proposed/superseded with a date. For each new feature, update scope, user journeys, permissions, state transitions, data/API changes, migration strategy, rollout behavior, and acceptance scenarios before implementation.

Use immutable catalog/quote versions and additive API/database changes so future work preserves existing orders. Gate incomplete features through configuration. Keep an architecture decision log for payment provider, TiDB compatibility, migration runner, frontend rendering, deployment, and seller payout arrangement.

**Next implementation milestone:** establish the two independent project foundations and validate Go + Ent + TiDB + the SQL-only Cobra migration workflow, then build identity and the configurable catalog. The commercial decisions above are resolved alongside that work.


## 22. Visual experience and production delivery update — 10 September 2026

The owner requires a substantially richer, animated storefront and a complete dedicated admin frontend. The homepage must show a low-rank MLBB profile appearing as the user scrolls, then smoothly transforming into a high-rank version with further scrolling. The required storyboard, additional effects, mobile/reduced-motion behavior, visual acceptance criteria and complete remaining feature inventory are defined in [the current remaining roadmap](REMAINING_ROADMAP.md).

The deployment package belongs in the existing root `production/` directory, preserving `production/deploy/`, and must include production Compose, a gateway, storefront and admin services, API/worker/migration orchestration, private dependency configuration, secrets handling, monitoring, release/rollback, backups/restore and launch qualification. The proposed implementation keeps independent `backend/` and `frontend/` projects, with distinct storefront/admin build targets inside the frontend project. No development database or simple container startup is presented as production qualification.

The owner explicitly clarified that `production/` is deployment-only: Compose, gateway/service configuration, operational scripts and related runbooks. All application code, including the admin frontend, remains in `backend/` and `frontend/`; the deployment folder orchestrates their release images.

The new roadmap takes precedence for the order and expanded visual/deployment scope of remaining work. All existing security, passwordless identity, mandatory staff MFA, no-wallet, configurable-game, immutable-contract and explicit SQL migration requirements remain in effect. This update records requirements only; it does not claim that the redesign or production stack already exists.
