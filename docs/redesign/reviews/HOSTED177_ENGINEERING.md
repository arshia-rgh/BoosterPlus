# HOSTED177 independent engineering review

Date: 23 October 2026. Reviewer: independent senior software engineer agent.

Scope: the owner's replacement of MINIMUM176 checkout coin selection and minimum checks with USD-priced NOWPayments hosted checkout. Review is limited to this change and its financial/history compatibility. The reviewer does not run local tests, create invoices, transfer funds, publish policies or deploy. Root owns focused server qualification and signed release evidence.

## Initial architecture decision

Use the existing immutable `payment_attempts.route` JSON for an explicit provider-selection discriminator, with no selected coin or network. A missing discriminator means the historical pinned-route mode; malformed or merely empty legacy data must never imply hosted mode. This avoids a SQL migration while preserving historical attempts and contracts. New attempts must be USD, and `/invoice` must omit `pay_currency`. No checkout minimum, quote, merchant-currency or rate-availability preflight is required.

Keep the one-POST attempt claim, unknown-send reconciliation, callback signature verification, authenticated payment-status read, exact commercial binding, unique contract allocation, late-funds handling and reversal handling. Hosted success/cancel return URLs are navigation only. Current merchant selections must not determine whether an already received payment is valid.

Each provider payment ID remains a separate durable record and receipt; never pin the whole invoice to the first selected asset. An invoice can remain open while the customer changes coins. A failed/expired zero-fund payment must not retire an otherwise open hosted invoice, whereas PLAYORA's local reservation expiry and late-funds review still apply.

Record the actual asset and network only from authenticated evidence. When the payment omits a network, resolve it using verified provider currency metadata without availability filtering; do not infer a chain from a bare symbol. Missing, malformed or conflicting identity must fail closed before creating an immutable receipt. Preserve original provider observations and identify metadata-derived network information. Network/asset changes for an existing positive receipt require review, not historical rewriting.

The current `observe` ordering binds an invoice and detects funds before full matching. Move new hosted reference/USD/route evidence validation ahead of binding and receipt creation so mismatched evidence cannot poison an unbound attempt. Keep relevant unmatched evidence in the finance queue.

Incoming payment coin controls may disappear from the staff UI. Seller payout routes remain explicitly separate, limited to the existing supported manual networks, with accepted agreements unchanged. Refunds use the received asset/network and original receipt; provider-hosted collection does not imply permission to enable outgoing transfers.

Schema 50 can remain unchanged, but an old binary cannot understand the new route discriminator. Application rollback after creating hosted attempts is not qualified; deployment must retain the fresh exact recovery approval and forward-fix limitation.

## Required focused evidence

- New invoice request: exact immutable USD cents, no `pay_currency`, no minimum/availability/estimate calls, no direct-payment creation, exact trusted redirect host.
- Concurrent checkout and invoice timeout: one local active attempt and one create POST, uncertain outcome never blindly retried.
- Current owner/contract/policy guards; no browser-supplied price or asset authority.
- Old native and pinned hosted attempts still reconcile and retain instructions/history; malformed route markers fail closed.
- Multiple payment IDs/coins under one invoice; unpaid expired selection followed by a successful different selection; zero duplicate fulfillment and a distinct duplicate-funds exception.
- Wrong USD total/currency, attempt, invoice, asset/network metadata conflict, missing metadata, altered receipt route, partial/under/overpayment, late payment and refund reversal.
- Signed callbacks are wakeups, GET is authority; forged/reordered/duplicate callbacks and GET failure do not settle an order.
- Incoming coins disabled later still reconcile; unavailable currency metadata does not enable payment or produce an empty-network receipt.
- Seller agreement/manual payout/refund route handling and immutable accepted histories survive the incoming-route UI removal.

## Source references checked

- [Official endpoint reference](https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description): invoice `pay_currency` is optional.
- [Official SDK](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs): omitting the coin skips hosted-checkout estimate/minimum preflight.
- [Official invoices help](https://nowpayments.zendesk.com/hc/en-us/articles/18393446018461-Invoices-and-payments): invoice links have no provider expiry; repeated deposits can produce new payment IDs. PLAYORA must retain its own reservation deadline.

Initial decision: **architecture approved for implementation; implementation review pending**. This is not a deployment or test PASS.

## Implementation round 1

The explicit provider-selection marker, USD-only new attempts, removal of the preflight provider interface, metadata resolution independent of merchant availability, historical pinned-route compatibility and zero-fund abandoned-selection behavior follow the agreed architecture. Three findings require correction and focused persisted regressions before implementation PASS:

1. **P1 — preserve and surface detected funds while network resolution is unavailable.** `Reconcile` currently folds network resolution failure into a failed provider read and discards the otherwise authenticated GET observation. A first payment record can remain unassociated while the customer still receives the existing pay link. Store the raw observation, match its trusted commercial identity, associate the record and hold a paid attempt for explicit evidence review. Do not create an empty-network receipt or allocate; later verified network resolution must recover the same record without another payment.
2. **P2 — validate immutable receipt route on reversal.** `receipt` currently returns early for `refunded` before checking the existing receipt currency/network. Route equality must also precede reversal, preserving historical values and rejecting conflicting evidence.
3. **P2 — distinguish refund of a duplicate receipt from reversal of the allocated receipt.** A hosted invoice may receive a second payment. If that duplicate is held and later refunded, the original allocated payment/order must stay settled; the unallocated receipt's reversed state belongs in finance/history. Do not label the original order as reversed or hold its fulfillment because a different receipt was returned.

Round 1 status: **changes requested**, no test or deployment PASS claimed.

## Implementation round 2

Source rereview confirms all three round-1 findings are corrected:

- An authenticated payment response is now retained independently of the metadata-resolution result. Hosted commercial identity is checked first; a missing network with detected funds associates the evidence with its attempt, sets `network_review`, suppresses the pay link and creates no receipt/allocation. Later verified evidence can settle that same attempt.
- Immutable receipt currency/network is checked before a reversal, including case-insensitive comparison with preserved historical network casing.
- Refunding an unallocated duplicate receipt leaves the already allocated attempt settled; its separate receipt still records the reversal.

The invoice writer also rejects unknown/corrupt selection markers before its one provider POST. The pinned-route fixture split is explicitly isolated: existing scenarios seed their legacy JSON while new hosted scenarios invoke the actual new `Start` path. New adapter coverage asserts a single invoice POST with no coin and no preflight calls; directory coverage checks missing, duplicate and disabled-but-historical metadata plus bounded/coalesced reads.

No further source correctness blocker was found in this round. The reviewer requested removal of a redundant second route-equality check as a small cleanup. Final engineering PASS awaits the corrected hosted transaction tests' server result; no live payment or deployment has been performed by this reviewer.

## Publication and activation decision

The parent verified that live published policy revision 3 still restricts incoming checkout to USDT on BNB Smart Chain. The owner-authenticated private revision 4 changes only the title and two incoming-payment paragraphs to the hosted USD flow and precise PLAYORA window semantics, preserving payout route, fee/refund/remedy settings and prior agreements.

Approved release sequence: after candidate qualification, signature/preflight and the fresh exact recovery decision, publish and verify revision 4 through the normal owner/MFA UI immediately before activating the new application. The old checkout can offer its existing USDTBSC subset during that brief interval; the nonexclusive revised wording remains compatible. Do not activate if publication/verification fails. Bind the verified policy revision/content hash in activation evidence and refresh any earlier policy-preservation assertion honestly. This avoids running the new hosted chooser under a contradictory accepted policy or silently rewriting historical agreements.

## Final boundary check

The empty-payout-route scenario saves a nil Go slice, which can serialize as `routes: null` inside a published policy or attempt snapshot. The frontend's policy schema requires an array. Because incoming hosted checkout no longer requires any payout route, normalize empty payout-route projections to `[]` without rewriting accepted agreements and cover the JSON boundary. Otherwise a valid empty-payout policy could make the entire checkout/history response unreadable despite the Go service test passing. This is the final requested correction before PASS.

The normalization correction has been reread in all relevant boundaries: published policy, draft settings, historical attempt projection and new saves. The unit regression preserves the stored document while asserting array output; the updated persisted scenario checks both published and attempt JSON. No further source finding remains.

## Inspected qualification evidence

The reviewer directly inspected `.cache/hosted177/database1.log`, `database-verified1.json` and `database-cleanup1.json`. Ten actual top-level cases passed in 363.126 seconds, including legacy native instructions, new hosted invoice creation, multiple coin/payment IDs, missing-network evidence/recovery, mismatched commercial binding, duplicate payment/refund handling, late funds, paused checkout, authenticated HTTP/callback boundaries, concurrent allocation/reversal, ambiguous sends/discovery and shop allocation. The launcher requested eleven names, but one historical-casing test was missing from that frozen source; the parent retained the original receipt and accurately enumerated the ten tests instead of claiming the missing case passed. The separate container and its temporary data were removed.

The updated empty-route JSON scenario and the restored historical-network-casing regression are the only pending persisted continuation at this checkpoint. Final engineering PASS remains pending those two results and final focused static/unit evidence.

## Final decision

**PASS — HOSTED177 scoped engineering review.** All requested corrections have been reread and no unresolved correctness or security finding remains within this change's reviewed scope.

Evidence inspected directly:

- `focus5-result.json`: Go formatting, unit/race checks, integration compilation, all configured Go linters/security checks, frontend formatting, contract generation, types, lint and 88 component tests passed.
- `database-verified1.json` / `database1.log`: ten actual top-level persisted scenarios passed; preserve the original launcher count mismatch as described above.
- `database-verified2.json` / `database2.log`: the affected empty-route JSON scenario and restored historical-network-casing test both passed in 59.001 seconds. Together the two runs cover eleven distinct top-level scenarios. The second log SHA-256 is `213fd168a663d832dca105c79036d2a65b21da0af048439867aa525b2f569fb2`.
- Both database cleanup receipts confirm the exact isolated container was removed; data lived only in temporary storage.
- `focus6-result.json`: final mirrored-contract generation, frontend formatting, types and lint all passed. The reviewer verified byte equality of the backend OpenAPI and frontend copy, absence of the removed payment-options endpoint/type, the three-field checkout input with no route, and the generated optional `selection: "provider"` declaration.
- The independent senior designer recorded a separate scoped PASS after 18 updated renders; 20 affected browser scenarios passed. This engineering decision does not replace that design review.

No local application tests, full gate, real provider invoice, funds transfer or customer message was used for this review. Earlier failed check receipts remain retained. The normal focused commit hook, exact signed release/CI/security checks, server preflight, owner-authenticated policy publication and fresh exact recovery approval remain release requirements owned by the parent. This PASS is an engineering acceptance of the reviewed implementation and focused evidence, not a claim that deployment has already occurred.
