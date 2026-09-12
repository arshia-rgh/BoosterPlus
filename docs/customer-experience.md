# R03 — Storefront, customer account and booster workspace

The storefront now extends the homepage's pine/emerald visual language across the catalog and signed-in routes. It keeps the separate admin application and all existing API authority boundaries. Start the backend with `make -C backend dev-up`, then run `make -C frontend dev`; open the shared development origin at `http://127.0.0.1:5173`.

## Entry points

| Route | Experience |
| --- | --- |
| `/games`, `/games/:slug` | Published game cards, custom/fixed pathways, game artwork or a generic fallback, availability and reviews |
| `/games/:slug/services/:service` | Configured fields, conditional choices, live selection summary, authoritative provisional estimate and explicit order-information step |
| `/games/:slug/packages/:pack` | Variant, published scope/price, capacity and delivery information, required selections and explicit price acceptance |
| `/orders`, `/orders/:id` | Search/status filters, page-scoped counts, next-step guidance, immutable agreement, timeline, revisions, chat/proof, fulfillment and scheduling |
| `/support`, `/support/:id` | Private inbox and recent-conversation sidebar, unread/state labels, reconnect/retry, customer/staff message distinction and scanned attachments |
| `/favorites`, `/availability`, `/notifications`, `/reviews` | Saved offers, package alerts, activity and purchase feedback, with real empty/error states |
| `/sell`, `/sell/new`, `/sell/:id` | Private game-specific account intake, drafts, review and clarification; no invented resale agreement |
| `/account`, `/login` | Passwordless entry, profile, sessions, notification settings, MFA and sensitive-change verification |
| `/booster`, `/booster/orders`, `/booster/calendar` | Assigned-work entry points, reported progress, shared coordination, protected handoff and time-zone-aware availability/session tools |

The customer layout decorates the existing identity boundary; it does not grant capabilities. Staff still need an authenticator check on every sign-in. The recent-thread sidebar uses the customer conversation endpoint; boosters retain assigned-work navigation. Administrator-only notes, participants and controls remain governed by the existing server checks.

## Estimation and order behavior

The selection summary reads the current administrator-declared configuration. It supports arbitrary game fields and reference labels, counts visible answers, and distinguishes that count from server validation. Hidden conditional fields and later-stage inputs do not appear; free text, attachments and private order details are not repeated in the sidebar. False and zero remain valid answered values. Validation focuses the first invalid input, including radio/multiselect choices. Changing a selection invalidates the prior estimate; advancing to order information retains selections but requires fresh validation.

At submission, sign-in opens a separate tab. Returning to the original tab refreshes the session and preserves its in-memory form. Out-of-order session responses cannot overwrite the latest result, failed refreshes conceal submission controls, and terms acceptance is reset on refreshed identity. Leaving or reloading the original tab discards the form; private drafts are not persisted in browser storage. Retried submissions preserve their idempotency key.

Order progress comes from the actual order, quote and contract. An unpaid agreement stays before paid fulfillment. Cancelled, rejected and expired orders show their own guidance instead of a misleading completed progress strip. List counts explicitly apply to the current page and filters. Backend transitions, commercial snapshots, coupon/capacity validation and fulfillment authorization are unchanged.

## Motion, accessibility and performance

Only the decorative route glow animates on navigation, once for 650 ms; text and controls remain opaque and immediately usable. Hover effects are restrained. The homepage and these routes share the System/Reduced setting, honor operating-system reduction and support blocked storage/unsupported animation. Mobile layouts collapse the estimator and conversation columns; fields, long IDs and messages wrap without page overflow.

The new CSS and layout modules are route assets, not additions to the homepage stylesheet. `make -C frontend budget-experience` checks compressed sizes (CSS 6 KiB, motion surface 2 KiB, workspace 2 KiB, browse wrapper 1 KiB). Existing homepage budgets remain unchanged. These are incremental asset budgets, not whole-page/slow-device performance guarantees.

## Reproducible verification

- `make -C frontend test-experience` builds both apps and runs the complete desktop/mobile suite against isolated TiDB plus local SMTP, object storage and scanner services. Both customer and staff behavior are needed to exercise full journeys.
- `make -C frontend test` covers route wrappers, selection privacy, all order-state guidance, session response ordering, retries and motion fallback/cancellation alongside existing unit/component checks. The 100% coverage threshold applies to route wrappers only.
- Root `make pre-commit` remains mandatory: repository checks, the full backend security/race/TiDB/build gate, frontend contracts/format/types/lint/tests/audit/build/server/browser/axe, and image builds/scans/smoke.

Synthetic screenshots and full logs remain ignored in `frontend/.cache/`, `frontend/test-results/` and root `.cache/`. See [progress](progress.md) for observed results and resolved findings.

R03 redesigns the implemented workflows. Live crypto checkout/receipts remain R05, policy-dependent fulfillment exceptions R06, resale commerce R07, additional administration/content work R08–R09, and launch qualification R10–R11. Generic pre-order attachment fields remain unavailable; working private chat/proof/intake media flows use their dedicated upload controls. No live prices, win-rate guarantee, payout terms or published reviews have been invented. Root `production/` is deployment-only and remains the next stage, R04.
