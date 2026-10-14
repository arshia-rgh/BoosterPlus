# Seller-offer payout route and error feedback

15 October 2026. Repository base `ab41f831da014b1e8a579ef4618159e1ccde2749`; live application remains signed `84b10e3`, schema 42. The owner reported an invisible `resale_invalid` / HTTP 422 response when proposing exact seller terms, then confirmed entering `usdt` / `bsc`. The published route requires `usdtbsc` / `bsc`.

## Correction

- Replace the two free-text provider codes with one explicit choice from the **published** payment policy, using its readable asset/network label. Unpublished draft routes are excluded. No route is silently substituted or selected by applying approved wording.
- Show the complete selected label as wrapping text so small native selects cannot hide the network suffix.
- If a route changes, clear the crypto conversion quote and computed payout while preserving the account base price and written terms. Preserve all entries through route refresh, provider-policy load failures and rejected proposals.
- Return a field-specific 422 for unsupported route pairs. Bring that field into view through existing inline validation. Display and focus generic failures beside the proposal button; keep proposal-specific wording out of seller acceptance and other agreement actions.
- Explain absent/unavailable policy data and provide an in-place route refresh. Keep submission disabled until published routes can be checked. Checkout/outgoing-transfer switches do not prevent manual seller terms from using valid published routes.

Exact route matching, owner/recent-verification requirements, idempotency, seller acceptance, commissions and existing financial contracts are unchanged. There is no migration or dependency change. The existing corrected-route workaround is to enter `usdtbsc` and `bsc` in the live form.

## Verification

- Focused backend resale race tests passed, including the user's BSC mismatch, wrong/unpublished/missing routes and serialized field-specific 422 responses.
- Focused frontend offer/commission tests: 11 passed before the final display-only wrapping-label adjustment; the normal focused hook will check the final source.
- Eight final scoped Chromium/WebKit cases passed at 320, 390, 768 and 1280 pixels. Coverage includes field/generic errors, repeated attempts, focus/in-viewport behavior, preserved payload/idempotency key, unpublished draft exclusion, failed/empty policy recovery, successful synthetic proposal, axe and overflow assertions.
- Separate senior UI review: PASS after two findings were fixed; see `redesign/reviews/SELLER152_2026-10-15.md` for scope and access limits.
- The single race-enabled isolated TiDB regression passed (12.858 seconds): an unsupported route creates no offer, correcting it succeeds, and replay preserves the same offer and agreed amount. Source-overlay manifest SHA256: `dcbf66e9e8514beb1a8e779d108fc4f60a4008a88cd76872dc6e005f25ff1823`. The disposable database was removed afterward.
- The first normal focused hook passed backend static/security/race/build checks, then stopped at a frontend test-only ESLint finding (a void assertion callback needed braces). The assertion was corrected; the original failed log is retained. Final hook completion is pending.
- Full application/database/browser/production suite: not requested, not run.

Private evidence: `.cache/seller152` and `/srv/playora-qualification/seller152/db1`. The disposable database uses synthetic identities and no worker/sender. Its source overlay is hash checked and never targets the live database. The first large source transfer was stopped and replaced by a small incremental bundle before the test runner started; no failed test was hidden.

## Delivery boundaries

No live offer, invoice, crypto transfer, external email, policy publication or production change is part of verification. Source commit/push follows the normal focused hook. Signed release/deployment and a new exact recovery decision, if deployment is requested before off-host backup, are separate; no earlier one-use exception is reused. Preserve manual payout recording, checkout enabled, outgoing automatic transfers/deletion disabled, policies/catalog edits, independent identities/MFA and private webmail.
