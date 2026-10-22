# HOSTED177 independent senior UI/UX review

## Scope and evidence boundary

Owner decision, 23 October 2026: use NOWPayments hosted checkout with USD pricing; remove PLAYORA's incoming coin selection and minimum checks; preserve asset/network information for seller payouts, refunds and history. Review the changed customer checkout and staff controls, with rendered rounds until PASS. This supersedes the MINIMUM176 checkout design; its historical evidence remains preserved.

Independent reviewer: `hosted177_designer`. This review changes only this document. Application implementation, server-only focused qualification, publication and deployment belong to the implementing agent. No customer data, payment, invoice, publication, message or funds action is performed by the reviewer.

Initial source inspected: checkout, payment policy editor/preview, policy routes, seller route selector, payment model/presentation and manual payout/refund controls. Existing green/champagne direction, consent, refund protections, historical agreements and accessible validation remain required.

## Initial design decisions

1. **One clear checkout action.** Display the agreed USD total first. Follow it with a short handoff explanation, the existing required fees/payment terms and consent, and one primary **Go to payment** action. Do not ask the customer to choose a coin in PLAYORA. Remove the coin list, coin search, minimum results, minimum loading/retry and empty-coin states. Do not add a new preliminary confirmation step.
2. **Honest external handoff.** Suggested copy: “Choose your coin and network on the secure payment page.” Keep a discreet indication that the destination is NOWPayments and the customer returns for the receipt. The handoff should remain the same for fixed boosts, custom boosts, account purchases and shop orders. Avoid guaranteeing that every order can be paid using every enabled coin.
3. **Simple progress and state.** If the existing progress strip is retained, rename its first step **Review order**, then **Complete payment**, then **Verified receipt**. During preparation, disable duplicate actions and keep the customer's position. An interrupted creation or missing link gives a check-status/support route; it must not invite another payment. A provider return alone never reads as successful payment.
4. **No invented asset before selection.** A new hosted invoice may not have an asset or network yet. Omit those facts until known, or use one plain sentence that selection happens on the payment page. Never display blank network labels, an internal placeholder, or a guessed chain. Once verified payment evidence exists, show the actual asset/network with the receipt. Preserve existing native deposit instructions and original historical records.
5. **Remove duplicated incoming coin administration.** The payment policy editor no longer exposes a customer payment-coin list or minimum controls. A short staff-only sentence that accepted checkout currencies are managed in NOWPayments is sufficient. USD pricing is explicit. Keep fee/rate settings and policy remedies where they remain genuine merchant choices.
6. **Separate outgoing choices.** If the same stored route field must remain for seller agreements, present it only as **Seller payout assets and networks**, with a short scope sentence that it does not change hosted checkout currencies. Offer only the networks the manual payout workflow actually supports. Use searchable, fully labelled options when the list is long; show a token and its complete network name together. Existing unsupported/historical routes stay identifiable and are never silently replaced.
7. **Keep payout data out of the customer checkout policy preview.** Seller payout configuration is not an accepted-customer-coin list. Preserve agreed refund/fee protections. Existing financial history remains read-only evidence; refund and manual payout forms retain destination and transaction information where needed.
8. **Error and accessibility behavior.** Existing consent, field-level errors and focus-to-feedback must survive the simplification. On mobile, the price, consent and action stay in the main reading order with no horizontal scroll. Keyboard focus stays visible; ongoing reconciliation must not continually move it. Unavailable service or expired checkout provides a useful next action and preserves the warning not to pay twice.

Cross-review with the independent engineer: the existing `policy.routes` can remain as the published seller payout configuration, ignored by new hosted incoming checkout; refund routes derive from verified receipts. An explicit hosted/provider-selection discriminator must prevent blank or invented payment details. Existing native/pinned attempts retain their original bound route. PLAYORA's local checkout/reservation window must not be described as an expiry of the provider's invoice URL: hide or stop recommending an expired local action while preserving reconciliation and the possibility of late funds.

## Required rendered review

Review actual current-source server-rendered screenshots at 390 px and 1440 px for: ready checkout, creating/interrupted checkout, status unavailable, verified history/receipt, and the revised staff policy/payout-route interface. Exercise the shared checkout through all four purchase families in focused fixtures. Confirm provider URLs retain their safe external navigation behavior, and that changed forms retain their normal keyboard/focus/consent behavior.

Initial decision status: **implementation and rendered review pending**. No PASS is claimed from the design directions alone.

## Rendered round 1 — changes requested

Inspected all sixteen current-source screenshots in `.cache/hosted177/shots-r1`: ready, creating, recovery, waiting, paid, error, paused and payout, each at 390 px and 1440 px. Read the revised checkout, policy editor, payout picker and policy preview sources. The implementing agent reports sixteen layout/accessibility browser cases passed; four submit fixtures failed because session bootstrap was missing and are being corrected. That incomplete behavior qualification is not reported as passed by this reviewer.

The simplified ready checkout is clear, its consent/action remain readable at both widths, and the payout picker correctly separates outgoing configuration from incoming payment selection. The bounded list, complete network names and visible focus work at both sizes. No overflow or overlap was visible in these images. The isolated fixture's large top heading is not the production order-page shell and is outside the changed component.

Required corrections:

1. **Missing-link recovery contradicts its headline.** It says “Ready for your payment” and asks the customer to follow payment-page instructions while reporting that the link is unavailable. Use a recovery-specific title such as “Recovering your payment link” and one concise status/support explanation. Do not promise readiness until a safe usable link exists.
2. **Secondary status action competes with payment.** In the waiting state, “Go to payment” and “Refresh payment” have the same filled green appearance. Keep payment primary; use the secondary action style and label the read action “Check payment status”. This also makes clear that the action does not create another checkout.
3. **Verified state keeps obsolete uncertainty.** Once settlement is verified, omit the local checkout deadline and the warning that returning from the provider does not confirm payment. Keep those safeguards in pending/unverified states. Present the received token and full network name using the canonical mapping when the exact pair is known; retain raw codes/reference in details and keep an honest fallback for unknown historical pairs. Do not modify stored evidence.
4. **Support should be actionable.** Error and paused states instruct the customer to contact support but contain no direct order-support action. Add a quiet link to the existing order support/help section, while retaining the do-not-pay-twice warning.
5. **Complete the staff rendering evidence.** The payout fixture renders the picker rather than the complete policy editor, and its customer preview is collapsed. Include a rendered actual revised policy editor plus expanded preview at both widths so the absence of incoming coin management and accidental payout-policy leakage is directly inspectable.

Round 1 verdict: **CHANGES REQUESTED**. No application source was edited by the reviewer.

## Rendered round 2 — PASS (server fixture run 3)

Inspected all eighteen updated screenshots in `.cache/hosted177/shots-r3`: ready, creating, recovery, waiting, paid, error, paused, complete policy editor and expanded policy preview, each at 390 px and 1440 px. Re-read the changed checkout/state presentation, payment model, Finance summary, actual policy editor/preview and payout selector. Read `.cache/hosted177/browser3.log`, which records **20 passed** cases, including the four purchase families submitting no coin or minimum request. These are the implementing agent's isolated server results; this reviewer did not execute tests or operate live accounts.

All requested revisions are resolved:

- Missing-link recovery has a truthful recovery title, retained USD price, one check-status action and a direct support link. The source-only follow-up also corrects the collapsed history explanation, so expanding history no longer reintroduces the contradictory ready message.
- Waiting checkout retains one primary **Go to payment** action. **Check payment status** is visibly secondary at both widths and does not imply creation of a new payment.
- Verified settlement removes the pending-only local deadline and return warning. The receipt clearly shows the token and full known network name; raw provider codes/reference remain in receipt details with fallback behavior for an unknown pair.
- Error and paused states provide **Contact order support**, retain the warning not to pay twice and preserve a clear reading order without overflow.
- The actual staff editor now distinguishes provider-dashboard incoming currency management from **Seller payout assets and networks**. The actual expanded customer preview shows USD/fees/rate/window and approved terms without leaking or presenting the outgoing payout list as customer checkout choices.

The revised `network_review` message was additionally inspected in source after the independent engineer's request: it says funds were reported, the network still needs verification and **Do not pay again**. The issue exposes support and suppresses the payment-link action; no receipt/asset is invented by the UI. Legacy native instructions and immutable accepted history remain outside the new hosted-selection simplification.

Final scoped design verdict: **PASS — HOSTED177 hosted checkout and payout separation**. No remaining scoped layout, hierarchy, copy or navigation finding was identified in the reviewed source/renderings. Existing green/champagne styling, required consent and field/error focus remain preserved.

Qualification boundary: the current component log still records one obsolete recovery-text assertion failure (87/88 passed); the implementing agent has corrected that assertion and must retain the original failure plus its focused rerun. This design PASS does not claim that pending tests, production deployment, owner policy publication, external-provider behavior or real financial flows have passed. No local tests, production writes, invoices, messages or funds actions were performed by this reviewer.
