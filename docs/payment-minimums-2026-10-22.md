# MINIMUM176 — payment network eligibility before checkout

**Superseded before deployment by HOSTED177 on 23 October 2026.** This document records the earlier implementation and its retained evidence. Incoming coin selection, minimum checks and the refresher are removed in favor of USD hosted checkout; only reusable outgoing-route mappings/selectors remain. See [HOSTED177](hosted-checkout-2026-10-23.md).

Owner request, 22 October 2026: show the approved payment networks before checkout, disable networks whose NOWPayments minimum exceeds the order total, and keep all networks disabled when none qualifies. Cache minimums in memory with daily refresh. Use focused checks and deploy; do not run the full gate.

## Implementation

- One shared customer checkout for custom/fixed boosting, account and shop purchases. Read eligibility through an authenticated, owned-order endpoint; the server takes amount/currency from the immutable accepted contract and routes/rate/fee settings from the published payment policy. No client-selected minimum or price is trusted.
- Read NOWPayments `GET /v1/min-amount` with the exact route, fiat equivalent, fixed/floating rate and fee-payer settings. Omit `currency_to` to retain the merchant's configured settlement route. Exact decimal comparison; never round a minimum downward, change an order price or add a fee to qualify.
- Per-API-process memory cache, keyed by policy revision/currency/route/rate/fee mode. Successful observations expire after 24 hours; failed reads retry after one minute. A lifecycle-bound refresher warms the current policy on startup and observes policy changes each minute. It refreshes expired entries, not every minimum every minute. Coalesced reads, bounded memory and IO, no credentials or customer data in this cache. Each API replica refreshes its own memory; a separate worker cannot populate that memory.
- Daily cached guidance is not a payment guarantee: preserve the existing uncached final minimum check before creating any payment attempt. Any failed final preflight invalidates the relevant cached observation. Provider failures, missing evidence and expired observations fail closed; existing payment attempts remain usable under their existing rules.
- Readable radio rows show approved asset/network options, disabled reasons, loading/retry and all-unavailable states. No automatic network substitution. Ineligible selection clears consent; agreed price, policy, network safety and existing payment instructions remain unchanged.
- No database migration. No supplier purchasing, product publication, payment-policy edits, live invoice/order/funds/message tests or changes to independent identities, outgoing transfers or deletion.

## Source references

- [NOWPayments API](https://documenter.getpostman.com/view/7907941/2s93JusNJt)
- [Official currency status page](https://nowpayments.io/status-page)
- [Official NOWPayments Node SDK](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs)

The public status page is informational, not scraped as an authorization source. Minimums/conversion values may change before the next daily refresh; the final API check remains authoritative.

## Qualification and release

Server-only focused tests passed; no full-suite result is claimed:

- Race-enabled payment/provider unit tests: exact decimal boundary, invalid provider evidence, daily expiry, failure backoff, key separation, coalesced concurrent reads, cancellation and bounded cache; OpenAPI response validation.
- Four isolated TiDB scenarios: owned-order visibility, server-bound totals/policy, no attempts/reservations/invoices from eligibility reads, daily-cache reuse, fresh final-preflight rejection and invalidation, provider outage, checkout pause, existing attempts, concurrent checkout/allocation/reversal. The exact temporary container and tmpfs data were removed after PASS.
- Strict frontend types and 28 focused component cases; 12 fixture browser cases across390/1440px covering all four order types, unavailable/mixed/all-below/loading/stale observations, consent invalidation, retry, axe and horizontal overflow.
- Independent senior designer: round1 required neutral wording and realistic fixture minimums, and recommended disabled consent; round2 PASS after all corrections, with actual mobile/desktop screenshots.

Retained evidence: focus2 typecheck failed on an unused generated-contract import before its intended parser refinement was applied; focus3/focus4 passed after correction. Initial tooling preparation and non-escalated network failures remain recorded. Only inactive generated `node_modules` in eight completed PLAYORA qualification checkouts were removed to reclaim about2.2GB; source/evidence/live data were preserved. No local tests, full gate, live invoice/order/funds/message or product/policy mutation occurred.

The first normal focused hook passed repository/backend static/security/race/build checks, then failed the frontend's strict lint rules (React timing/state placement, decimal grammar warning and test syntax). These were corrected without suppressions or weakened checks; focus5 types/lint/28 component/12 browser cases passed. The earlier setup-only attempt also refused the test checkout's untracked `.tools` symlink; it is now excluded only in that disposable checkout's private Git info. Both originals are retained. A collection helper initially looked for a backend log that was intentionally not rerun in focus5; only collection was corrected.

A further2.36GB of inactive generated dependencies was removed from nine completed test checkouts, with the same source/evidence/live-data exclusions. The original minimum checkpoint passed the second normal focused commit hook as server-only f469cdd; that checkpoint is retained and the later coin extension is separately qualified before release. Maintain exact prior failures and source-bound receipts under `.cache/minimum176/` and `/srv/playora-qualification/minimum176/`. Independent senior designer decides and reviews the changed checkout states on desktop/mobile. Normal tracked focused hook, exact CI, signed images and current-server preflight precede activation. Off-host recovery is still absent; a fresh exact release recovery decision is required after the candidate is concrete.

Concurrent work in `docs/account-ownership-2026-10-22.md`, `docs/ux/prototypes/` and `frontend/app/home/cameo/` is excluded and preserved.

## Combined release boundary

The qualified parent041ddc0 already includes the separately reviewed ACCOUNTS1756022122 implementation, which is prepared but not deployed. Current production remains0be12a0/schema49. This release therefore inherits migration50 and its SELECT-only zero-failure origin inspector, even though the minimum feature has no migration. Preserve all ACCOUNTS175 qualification and ownership protections. The final preflight must check current production again; do not restart a schema49 binary against schema50 or claim qualified rollback. Fresh recovery approval must name the combined candidate and this migration risk. The other person's uncommitted account-ownership note is excluded.

## Owner extension: thirty reviewed payment routes

The owner requested all 30 Popular Coins / Stablecoins combinations in the supplied dashboard screenshot, plus selectable coin/network lists wherever staff configure them. Authenticated GET-only `full-currencies`, `merchant/coins` and fixed-rate currency evidence confirms the exact codes/networks. The merchant also has three unrelated tokens enabled; those are not imported into PLAYORA. `usdtop` is selected by the merchant but currently not available for payment or fixed-rate exchange, so it remains visible and disabled. No invoice, funds or settings request was sent.

The reviewed mapping lives in `backend/internal/paymentroutes/routes.json` with a checked frontend contract mirror. It distinguishes BNB/BSC, Ethereum/USDC, Avalanche C-Chain ARC20 codes, Arbitrum, Polygon, Optimism, TON, Solana, Celo and Algorand. Provider case is normalized without guessing chains. Forty is the bounded policy maximum (30 selected); the daily minimum cache remains 128 entries. A separate five-minute, coalesced two-key availability cache intersects provider flags, merchant selections and fixed-rate support, with one-minute failure backoff and no stale success. Checkout validity never outlives either source. Fresh final minimum checks remain mandatory.

Canonical searchable admin checkboxes replace typed asset/network fields. Checkout has searchable grouped radios with readable disabled reasons and a persistent selected-route summary. Manual seller payouts still support only the existing BSC/Ethereum/TRON/Solana recording formats: payment acceptance must not silently enable unsupported payout networks. Accepted contracts, receipts and refund currencies remain immutable/read-only. New policy routes will be saved and published through normal owner authentication after deployment; they are not inserted by a migration.

Expanded backend race tests and golangci-lint passed. Four additional/affected isolated TiDB cases passed, including a 30-route policy, no financial writes from availability, unavailable/wrong-network blocks, preservation of historical receipt network casing, and concurrent settlement/reversal. The exact temporary database and tmpfs data were removed. Authenticated GET-only minimum queries returned valid positive USD/crypto minima for29 routes, with USDT Optimism unavailable. Expanded final qualification passed:70 focused component cases;16 desktop/mobile fixture browser cases, then the two affected admin cases rerun after the last guarded-handler correction; strict format, contract, types and lint. The independent senior designer gave expanded round2 PASS. The earlier normal hook is an isolated checkpoint of the original minimum feature, not qualification of this later extension.

Concurrent release update: the separate ACCOUNTS175 task has now deployed signed6022122/schema50 under its own exact owner approval. The old combined migration49→50 plan above is historical and superseded: MINIMUM176 will preflight against the actual signed6022122 parent at unchanged schema50, preserve all ownership changes and the colleague's newer uncommitted release notes, and apply no new migration. Publishing a policy with more than20 routes would exceed the old application's policy limit, so same-schema rollback after that publication is still not qualified; forward-fix recovery may be needed.


## Expanded qualification history

Preserve focus6's two setup failures (the narrowly increased catalog response-size reference and shared-registry test path), focus7's optional fixture typing failure, focus8's outdated role-label/editor tests and missing Node JSON import attribute, and the first isolated database continuation's attempt to use an intentionally absent immutable-field setter. Corrected source retains immutable historical receipt fields; the isolated regression seeds old casing through its own dedicated fixture database only. Focus9 and10 passed strict types/lint,68 component cases and16 desktop/mobile fixture browser cases. Keyboard-focusable bounded scroll regions have narrow documented accessibility-lint exceptions, matching the existing accessible table pattern, so all-disabled lists remain keyboard-scrollable.

Expanded design round1 required full network labels in selected summaries and the network warning, plus exact code/network matching and explicit resolution for a conflicting legacy saved route. All three corrections are implemented and passed their focused component/browser regressions; expanded design round2 is PASS. No security threshold or authorization/financial boundary was weakened.

Final focus12 passed all70 focused component cases and both affected admin picker browser cases. Focus11’s one disabled-input component failure came from a synthetic event dispatch on a disabled input; the regression now uses native click behavior and checks that no conflicting canonical route can be added before explicit removal. The change handler also guards the collision/cap directly. Focus11’s16 browser cases remain passed evidence; no full suite was rerun. Normal tracked focused commit qualification for the combined source is next.
