# DI10D scoped senior UI/UX review

Final verdict: **PASS — no remaining actionable findings in the scoped finance and affected customer/seller contexts.** Three finance rounds plus the shared-context follow-up are recorded below.

Reviewer: `/root/di10_finance_completion_review`

Scope: Prepared A16 case explanation/private rationale and exact refundable evidence; A17 accepted seller terms, explicit owner review and bounded transfer history; A19 incoming/outgoing inspection, queue status and linked-record navigation. Base is the actual repository's staged DI10C source. No whole-site, DI10 completion or launch qualification is implied.

Preview: `http://127.0.0.1:4187`, isolated synthetic data from `/tmp/playora-di10d-preview.py`, source under `/tmp/playora-di10d-prepared/frontend`. No repository edits, Docker operations, private runtime configuration or real merchant calls performed.

## Round 1 — FAIL, two actionable findings

### D01 — P2 — Refund evidence cannot recover from a read failure

- Screen/component: A16, `payments/refunds.tsx` `Proposal`, “Propose a refund from received funds”.
- Reproduction: At 768×1000, open `/admin/orders/22222222-2222-4222-8222-222222222222?section=payment`. Return an isolated fixture HTTP 503 for Proposal's own second `/admin/orders/:id/payments` request while allowing checkout's first read. Proposal displays the generic service-unavailable error and all controls are disabled. Click “Refresh refunds”, then “Refresh payment”. Proposal remains disabled; those buttons reload different resources.
- Impact: Staff cannot recover the refund source/remaining-cap read without reloading the entire page and losing local work. The new unavailable-cap copy asks staff to refresh evidence without providing a matching action. After a successful proposal the locally retained cap also has no independent refresh.
- Required outcome: Provide a named evidence refresh/retry outside the disabled proposal fields. It must reload this source, retain draft values and the locked uncertain request identity, and refresh the cap after successful creation. A failed refresh must not permit a new proposal from inaccessible/unavailable evidence.
- Evidence: `/tmp/playora-di10d-review/proposal-read-failure.png`, `failures.json` (two initial payments reads, then three after existing refresh controls; source still disabled).

### D02 — P2 — Reconciliation-linked records lose finance return context

- Screen/component: A19, `payments/reconciliation.tsx` inspection's linked-order and linked-seller-agreement links.
- Reproduction: At 768×1000 inspect incoming reference 123, follow “Review linked order 22222222”. Result remains an identifiable order shell but exposes only “← Order queue”, not the originating finance inspection. New Links omit the established `state.financeSearch` context. Seller link has the same omission.
- Impact: Staff leave the inspected evidence and must reconstruct the finance reference or use browser history; this conflicts with the accepted persistent workspace/record-return UX.
- Required outcome: Pass a safe finance return query including `view=reconcile` and the actual inspected direction/reference, preserving other applicable finance filters. Do not rely only on URL params because manually entered references are not necessarily encoded in the current URL. Named return must reopen that reference in the finance workspace.
- Evidence: `/tmp/playora-di10d-review/linked-order-return.png`, `failures.json` return-link inventory.

## Checks completed in round 1

- Rendered base reconciliation, payouts and order payment/case pages at 1440×1000, 768×1000 and genuine 320×700 browser viewport. No horizontal document overflow at any of these nine combinations.
- Screenshots inspected: desktop payout, tablet case and narrow payout; page/record identity, readable wrapping and green hierarchy remained coherent.
- Narrow inspected incoming evidence: distinct provider-state/issue, latest-check vs recorded-observation timestamps, linked IDs; unknown-reference guidance, pending lock and failed-job retry state all rendered honestly.
- Failed reconciliation write retained the typed reason. Outgoing history link opened reference 71 with correct direction and prefill and focused the reconciliation section.
- Transfer history distinguishes a missing historical snapshot from a saved exact amount/destination revision; uncertain provider attempt remains explicit, no settlement-success claim.
- Exact refund amount `8.340000009999999999` stayed unrounded and locked after uncertain 503; the named exact retry remained enabled.
- Failed case decision retained separate customer explanation and private rationale. Successful synthetic submission displayed customer text and a separately labeled “Staff-only rationale”.
- Scoped axe scans of rendered narrow reconciliation/error, expanded payout history and uncertain refund/case states returned zero violations. Axe injection required bypassCSP in the test browser context only; application CSP was not changed.
- Capture scripts and JSON results live in `/tmp/playora-di10d-review/`.

## Limits

This is a desktop Chromium synthetic UI review. It does not certify backend authorization, financial correctness, provider reconciliation, actual funds movement, physical devices or other engines. Fixture outgoing transfer terms/state combinations are synthetic; the preview does not enforce full commercial transitions. Automated security/integration gates remain the implementing agent's responsibility. No real provider interaction was attempted.

Round 2 pending implementing-agent fixes and fresh rendered verification. A missing round 2 is not a pass.

## Round 2 — partial fix verified; D02 incoming-order link still open

D01 is resolved. At 1440×1000 and 320×700, an isolated initial 503 recovered through the new “Refresh refund source evidence” action. Receipt selection, exact amount and terms survived successful refresh. After an uncertain write, evidence refresh retained the locked fields and both retries sent the same request key and exact payload. Successful proposal creation caused a new payment-evidence read and cleared the successfully submitted amount/terms. No scoped axe findings or horizontal overflow. Evidence: `round2-results.json`, `round2-proposal-*.png` and `round2.cjs`.

D02 seller-agreement path is resolved. Manually entering outgoing reference 71 from a URL with no reference, then opening the seller agreement and selecting “Finance workspace”, restored `view=reconcile&filter=all&direction=outgoing&reference=71` and automatically displayed its inspection at both sizes. Evidence: `round2-seller-return-*.png`.

The adjacent incoming-order Link still omitted `state.financeSearch` in this reviewed build. Implementing agent notified. Overall scoped gate remains FAIL pending this last path and regression verification. The cropped proposal screenshots include the persistent order header at the current viewport scroll position; this element-capture artifact is not a new overlap finding.

## Round 3 — PASS — no remaining actionable findings in this scope

D02 incoming-order path is now resolved. Rendered round trips at 1440×1000, 768×1000 and 320×700 started with a manually entered incoming reference 123, opened the linked order, used its named “Finance workspace” return, and restored the exact incoming reference, `filter=all`, and automatically loaded inspection. The outgoing seller-agreement path was repeated at all three sizes and preserved reference 71, outgoing direction and the same filter. Reopened inspections were rendered and visually checked; no horizontal overflow or scoped axe violations were found. Evidence: `/tmp/playora-di10d-review/round3-results.json`, `round3.cjs`, `round3-return-*.png`.

D01 remains verified by round 2; the final change only adds the omitted incoming-order return state. Both findings are resolved. **Final scoped verdict: PASS — no remaining actionable findings in the changed A16/A17/A19 finance UX and affected local navigation reviewed here.**

The synthetic/browser/provider/backend/device limitations above remain. This verdict does not complete all DI10 requirements, substitute for application/security test gates, authorize production launch or replace owner review.

## Shared customer and seller follow-up — PASS

The implementing agent requested explicit review of the changed shared components in customer/seller contexts before delivery. Scope expanded only to customer `Refunds`, `TransferRecord`, `TransferHistory`, and S06 seller agreement/payout presentation. Reviewed customer order `/orders/22222222-2222-4222-8222-222222222222?section=payment`, its **Help** tab (`?section=help`, where cases/refunds actually live), and seller submission `/sell/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?section=payout`.

At 1440×1000 and 320×700:

- Customer/seller identity and record shell remain visible. No staff authorization actions, reconciliation links or internal-rationale form fields appear.
- Refund amount `4.000000000000000001` and seller payout `25.00` render without numeric rounding. Seller agreement model, fees, ownership/dispute conditions and payout timing remain readable.
- Recipient confirmation starts disabled until explicit consent. Changing either address or memo clears consent and disables confirmation again.
- Expanded transfer history shows exact revision amounts and destination snapshots, distinguishes missing historical snapshots, and retains the uncertain provider-state wording without success claims.
- An isolated transfer-history HTTP 503 recovers through “Refresh transfer evidence”; edited recipient fields survive. No staff-only outgoing inspection links are rendered in customer history.
- Scoped axe checks returned zero violations and there was no horizontal document overflow in these contexts.

Additional narrow interaction checks used explicit browser response fixtures for recipient POST success/failure because the preview server does not implement these customer mutations. Both refund and payout requests used customer endpoints, preserved the edited destination/consent on a synthetic 503, and reset consent after a simulated successful version update. An intentionally injected private-rationale sentinel in the customer case response was not rendered. This demonstrates component behavior only, not backend data filtering or real recipient acceptance.

Evidence: `/tmp/playora-di10d-review/customer-results.json`, `customer-shared-results.json`, `customer-confirm-results.json`, corresponding scripts and `customer-refund-expanded-*` / `seller-shared-expanded-*` captures. The unrelated customer purchase-review panel lacks a preview fixture and displays an unavailable state; it is outside this changed shared-component scope and is not classified as a product defect.

**Final verdict remains PASS — no remaining actionable findings in the reviewed DI10D admin, customer refund and S06 seller shared contexts.** Backend authorization, actual payment transitions, live provider funds movement, physical-device qualification and owner acceptance remain separate requirements.
