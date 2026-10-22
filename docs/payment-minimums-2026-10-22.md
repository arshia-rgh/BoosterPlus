# MINIMUM176 — payment network eligibility before checkout

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

A further2.36GB of inactive generated dependencies was removed from nine completed test checkouts, with the same source/evidence/live-data exclusions. Normal focused commit hook retry and signed release remain pending. Maintain exact prior failures and source-bound receipts under `.cache/minimum176/` and `/srv/playora-qualification/minimum176/`. Independent senior designer decides and reviews the changed checkout states on desktop/mobile. Normal tracked focused hook, exact CI, signed images and current-server preflight precede activation. Off-host recovery is still absent; a fresh exact release recovery decision is required after the candidate is concrete.

Concurrent work in `docs/account-ownership-2026-10-22.md`, `docs/ux/prototypes/` and `frontend/app/home/cameo/` is excluded and preserved.

## Combined release boundary

The qualified parent041ddc0 already includes the separately reviewed ACCOUNTS1756022122 implementation, which is prepared but not deployed. Current production remains0be12a0/schema49. This release therefore inherits migration50 and its SELECT-only zero-failure origin inspector, even though the minimum feature has no migration. Preserve all ACCOUNTS175 qualification and ownership protections. The final preflight must check current production again; do not restart a schema49 binary against schema50 or claim qualified rollback. Fresh recovery approval must name the combined candidate and this migration risk. The other person's uncommitted account-ownership note is excluded.
