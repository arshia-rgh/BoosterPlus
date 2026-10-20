# SUPPLIER168 independent scoped review

20 October 2026. Scope: Nexus supplier library and draft preparation, combined shop discovery, fresh-price checkout, and supplier delivery in the existing order workspace. Vendoria and the broader UX165 audit remain paused.

This review is independent of the agent authoring the customer checkout/delivery implementation. No production service, customer data, supplier purchase, credential, deployment, full gate, or SSH check was used.

## Round 1 — changes in progress

Status: **corrections and additional rendered evidence required**.

Reviewed source and actual-component synthetic browser evidence from `.cache/suppliers/qualification/shop-ui-browser-results2/`:

- Chromium checkout at 1440, 768 and 320 px.
- Chromium/WebKit private code delivery, including WebKit 390 px and narrow 320 px.
- WebKit uncertain PLAYORA reservation and authorized verification handoff.
- The browser run's two administration failures remain failures; they are fixture-context failures being corrected, not passed publication journeys.

The narrow layouts wrap without horizontal document overflow. Private codes are contained and selectable. Test delivery is labeled, exact accepted total is visible, and supplier submission uncertainty is distinct from a confirmed failure. These are useful foundations; they do not qualify unfinished routes or backend behavior.

### Findings returned for correction

1. **Preserve unresolved reservation identity across publication changes.** `frontend/app/shop/public.tsx` keys the supplier purchase component by release ID, so a new published revision remounts it and bypasses its internal release-change handling. Use a stable product key and prove an uncertain request retains its exact payload/request key when the release changes.
2. **Do not describe paused purchasing as sold-out stock.** The public card uses “Currently sold out” for any supplier unavailability and “Available variants” for the single bound offer. Distinguish ordering availability from stock and preserve honest manual-product wording.
3. **Finish browsable region/category choices.** Public discovery still asks customers to guess region/category text. Populate usable choices from the public catalog while combining delivery method, search and pagination correctly.
4. **Remove manual-delivery assumptions from supplier orders.** The queue says every order requires a staff claim and renders missing manual delivery/assignment as “Not claimed”/“Unclaimed.” Customer order presentation says “Follow staff delivery” and points completed shop orders to proof. Supplier state and source need accurate next steps in both surfaces.
5. **Make uncertain checkout recovery the focused action.** The current narrow screenshot first focuses a generic “service unavailable, try again” message above disabled fields, while the safe “Check this order” action is much farther below. Present one clear uncertainty/recovery panel, focus it, and retain the exact request.
6. **Strengthen checkout/action hierarchy.** Give the confirmed total an explicit label and stronger type. Make Edit details secondary to Go to payment. Once a verified external action is known, make that action primary; Refresh delivery and Messages should remain secondary. Avoid four equally prominent mint actions.
7. **Render declared constraints and useful code metadata.** Numeric delivery fields must show supported min/max/step where supplied. Render a supplied redemption URL only after explicit destination validation, with a deliberate link rather than automatic navigation. Current code schemas retain that URL but omit it from presentation.
8. **Do not attach every upstream quote failure to quantity.** `backend/internal/shop/supplier_quote.go` converts all fresh-quote failures to a quantity issue, including one-item products with no quantity input. Distinguish unavailable/network/current-requirements failures from locally invalid quantity, with an actionable quote-level retry.
9. **Correct supplier administration copy.** Supplier-bound product details/terms still claim staff delivers and must submit evidence. Preview quantity can display an unlimited maximum as zero. Conditional supplier copy and meaningful range/step formatting are needed.
10. **Match checkout CSS selectors.** The new styles use `.supplier-checkout` while the component root uses `.supplier-purchase`.
11. **Avoid enabled actions that silently refuse review-held deliveries.** Protected reveal/action handlers reject `needs_review`, but the corresponding buttons can remain enabled for a completed order with codes or a pending order with a review issue. Hide or clearly disable these actions with the current support-review reason, including the completed-plus-review case.
12. **Route supplier publication blockers to the relevant section.** The `supplier` issue currently defaults to Product details in `shop/validation.tsx`. It should lead to Supplier offer with its library/refresh action.

Findings were sent to the parent implementation agent and the senior customer-flow author for correction. No source files were edited by this independent reviewer.

### Evidence still required

- Rendered library preparation/refresh through the real product editor and explicit saved-revision preview/publication.
- Combined manual/Nexus discovery with populated filters and preserved Back context.
- Actual customer/staff order workspace and queue: unpaid, pending, unresolved, partial, cancelled/review, completed ID/code and verification.
- One unchanged manual checkout and claim/proof path.
- Current screenshots after corrections, plus focused regressions for stale results, session clearing, quote expiry, first-invalid focus, retained uncertain request, and protected reveal timeout/context change.

Rendered fixtures establish presentation and navigation only. Persisted backend tests must separately establish payment allocation, duplicate prevention, encrypted storage, environment isolation and current merchant binding. Exact webhook URLs are not ready for owner configuration merely because these local routes render.

## Round 2 — rendered correction review

Reviewed `.cache/suppliers/qualification/shop-ui-browser-results4/`, including actual-component private library, prepared/refreshed product editor and preview, customer checkout at 768 px, uncertain reservation at 320 px, and WebKit 390 px verification/partial/unpaid states. The reported browser run passed 14 cases; this reviewer inspected the rendered images independently rather than treating that pass as visual approval.

Confirmed improvements: focused uncertain-result recovery now appears before the locked fields; the total is explicitly labeled and emphasized; verification has an action-needed heading; partial delivery names actual delivered/requested amounts; admin navigation and preview wrap on narrow screens.

Two corrections remained:

- The new `button-secondary` class has no corresponding style. Rendered Edit/Refresh/Messages actions remain filled mint, despite their source claiming secondary hierarchy. Use a style that actually loads in the affected order and checkout surfaces, then inspect again.
- Unpaid supplier delivery tells the customer to complete payment but exposes only Refresh and Messages. Add the existing order's Payment destination as the next action.

The administration fixture deliberately uses synthetic responses and missing-artwork treatment. Its visible publication control is not proof that a real invalid draft can publish, nor does it qualify persisted publication. That remains a separate backend validation requirement.

## Round 3 — customer corrections verified, surrounding surfaces pending

Reviewed current source and `.cache/suppliers/qualification/shop-ui-browser-results6/`: Chromium desktop checkout, WebKit verification at 390 px, private code delivery at 320 px, and unpaid delivery at 390 px.

- Confirmed visible secondary treatments, explicit Total, a primary payment/verification action, validated deliberate redemption link, long-code/card-number wrapping and clear private-code ownership/timeout guidance.
- Confirmed unpaid delivery now links to the same order's Payment section.
- Confirmed source uses a stable product key, populated public region/category options, honest supplier availability wording, supplier publication navigation and conditional supplier evidence copy.
- Confirmed quote failures now distinguish invalid quantity from upstream unavailability.
- Confirmed protected actions are withheld during review, and the support-review title takes priority over code availability.
- One final spacing correction was requested because adjacent delivery action borders still touched after secondary styling. The final privacy regression additionally needs to cover changes to the parent order state/version independently of the supplier version.

The staff queue/source work is in progress. The staff product list still needs source-aware copy and availability: Nexus products intentionally have no manual stock rows, so the existing stock-only filter cannot establish their ordering availability. Combined storefront, staff product list and queue renders plus the unchanged manual path remain pending for complete scoped approval.

## Round 4 — surrounding surfaces and independent backend inspection

Reviewed round-7 rendered WebKit evidence for the staff product list/queue at 390 px, verification at 390 px and protected codes at 320 px. The delivery actions now have real spacing; source-aware product-list copy and supplier/manual labels are clear. The round-7 log retains four failures in the new recent-verification and browse-return fixtures; the author is correcting those fixtures and rerunning the affected cases. They are not counted as passes here.

Further findings were sent to the implementation agent:

1. **Apply supplier visibility before public pagination.** `backend/internal/shop/public.go` currently limits/slices published products before removing bindings from an unconfigured or different merchant. Fifty hidden supplier releases before a valid current/manual product can produce an empty page and misleading “No products available yet,” even though visible products follow. Apply the merchant/environment visibility predicate before the limit/cursor calculation and retain a defensive per-record check. A mixed page regression must include more than 50 hidden records.
2. **Expose the queue’s primary action on narrow screens.** In the 390 px staff queue screenshot, only Order/Status/Delivery are visible. The sole review link is the last of seven table columns, without a visible horizontal affordance. Make the first-column order identity an accessible link to the same payment/fulfillment destination, preserving queue context, or expose an equivalent mobile action.
3. **Resolve service cases through the supplier path.** `backend/internal/shopevents/delivery.go` still loads a manual `ShopReservation` unconditionally in `HoldDeliveryAfterCase`. Supplier orders have no such reservation, so actual case outcomes `continue`, `rework` and `retain` returning to queued fail with a conflict. Add a supplier-aware branch without weakening the permanent purchase claim or pretending partial/cancelled delivery can be bought again. Test the actual service-case resolution API, rather than simulating it by changing the order state directly.
4. **Reflect parent-order blockers in delivery actions.** `backend/internal/shop/delivery_reads.go` derives review/code availability only from the supplier state. A completed supplier purchase whose parent order is now held or cancelled can still say “Codes ready” and offer Reveal, although the protected endpoint correctly refuses it. An unpaid cancelled/expired parent can similarly offer Go to payment. Preserve authoritative supplier status, but expose the current order blocker and withhold inapplicable actions. Cover parent-only transitions in the backend projection and rendered fixtures.
5. **Expire proven-unfunded supplier checkouts.** Payment maintenance expires abandoned unissued manual shop purchases through `ShopReservation`; supplier checkouts intentionally have no such record. Three abandoned expired supplier agreements can remain `awaiting_payment` indefinitely and exhaust the three-pending-order guard. Add bounded supplier expiry using the accepted contract deadline and the existing proof that no funds/uncertain invoice can remain. Never retire a claimed purchase or potentially funded invoice based only on a local timer. Exercise expired unissued, ambiguous and funded cases.

Independent backend source inspection covered supplier preparation/publication, quote/reservation, payment settlement, dispatch/wake, reconciliation, protected codes/actions and callbacks. Verified in source:

- Quotes and accepted orders retain exact amounts and release/merchant ownership; recipient data is encrypted outside ordinary snapshots.
- Reservation and worker transactions share the security serialization boundary. The committed create claim precedes the sole supplier POST, and subsequent jobs reconcile rather than recreate it.
- Dispatch checks allocated, confirmed customer payment, the current contract/customer/case state, the configured merchant and the fresh supplier cost before claiming a purchase.
- Supplier callbacks authenticate raw bytes and schedule authoritative reads; they cannot allocate customer payment or independently complete an order.
- Code reveal and private action routes require current ownership and recent verification; provider destinations are constrained and private data does not enter ordinary events.
- Nexus test purchasing is explicitly isolated from application production. Deferred Vendoria runtime tokens are rejected.

These source observations are not claims of passed persistence, race, real-provider or deployment tests. No concrete spend-authorization bypass or private-code disclosure was found; the case-resolution and misleading-action findings above remain correctness/UX blockers. Final rendered browse-return/recent-verification evidence, the visible narrow queue action and an unchanged manual checkout/delivery path remain required before complete scoped approval.

## Round 5 — backend corrections and remaining rendered checks

Re-reviewed the parent agent's corrected supplier visibility predicate, supplier-aware service-case resolution and parent-order/active-case delivery projection. No additional correctness issue was found in those changes. The visibility predicate now runs before keyset pagination. Supplier case resolution retains the durable create fence, reconciles existing obligations, and leaves partial/cancelled or unsafe-review states held. Protected code availability additionally requires an active, unexpired, correctly owned secret and an eligible parent without an active service case.

The persisted review evidence includes the parent agent's `checkout-db10.log` (hidden-record pagination; manual continue/cancel; supplier unsent/pending/partial case outcomes) and corrected `checkout-db11.log` (completed rework). The initial completed-rework failure was useful: completed orders retain their state when a service case opens, so checking only parent `on_hold` was insufficient. The added active-case check corrects that projection.

At the parent's explicit request, this independent reviewer authored **only** the abandoned supplier-checkout expiry fix and its persisted regressions in `payments/shop_expiry.go` and `integration/supplier_expiry_test.go`. Consequently, the expiry implementation requires the parent's independent review and is not self-approved here. The parent reviewed its bounded accepted-deadline query, authoritative no-funds proof and permanent POST fence; the requested supplier-version bound was added.

The parent subsequently approved the final expiry implementation independently, including the oldest-first bounded sweep, parsed deadline recheck, current contract/funds guards, retained unknown-POST fence and both order/supplier version bounds.

`checkout-expiry2.log` passes both focused race-enabled TiDB test functions and all four protected-state subcases. It covers three abandoned unissued orders freeing the pending-order limit, idempotent expiry, retained unexpired/funded/claimed obligations, and an uncertain external invoice that cannot be created again. Preserve `checkout-expiry1.log`: its ambiguous-invoice assertion incorrectly expected the parent to remain awaiting payment, whereas existing payment maintenance closes the local link/order while retaining the unknown invoice's permanent create fence. The corrected test asserts the actual local transition, unchanged supplier obligation, absence of a supplier-expiry event and no repeated invoice POST. This was a focused local test, not a live purchase or a complete qualification run.

Rendered follow-up reviewed:

- Round 10 combined discovery and filter return, plus the normal recent-verification modal, in WebKit at 390 px.
- Round 10 cancelled and held parent-order delivery states: no misleading payment/reveal/action controls; the current blocker and Messages destination remain clear.
- Round 11 first-column queue action at 390 px (WebKit) and 320 px (Chromium), with the target visible inside the narrow viewport. A final small accent/arrow was requested because its plain white bold text looked indistinguishable from the adjacent noninteractive game label.
- Round 10 manual customer purchase review is readable, but its initial synthetic fixture used zero-minute reservation/default delivery values. The author is supplying valid representative values and finishing actual-component manual claim/recipient/proof evidence before final approval.

Round 10's four failed queue/manual checks and round 11's two remaining manual checks remain recorded. The queue failure was an ambiguous test locator; the manual fixture/locator correction is still being qualified. The public browse failure exposed a real repeated-fetch bug, not merely a fixture problem: its facet schema was constructed during rendering and repeatedly changed the resource dependency. The parent hoisted the schema; the corrected browser evidence includes bounded request-count and return-navigation checks.

## Round 6 — final scoped verdict

**Passed the independent scoped rendered/source review, with no remaining blocking finding in the reviewed changes.** This is approval of the listed local changed-flow evidence, not a guarantee that every product, supplier response, browser or live deployment has been exercised.

Final inspected evidence:

- Round 12 (`shop-ui-browser12.log`, 4/4): manual product checkout through options, recipient, accepted review and the existing payment destination; staff claim, authorized recipient reveal, proof selection and submission. Inspected Chromium 1440 px purchase review and WebKit 390 px staff proof form. The representative manual policy now uses 15-minute reservation and 24–48-hour delivery, with correct exact total and no supplier-only controls. This is an actual-component synthetic API path, not a persisted claim or a real delivery.
- Round 13 (`shop-ui-browser13.log`, 2/2): corrected staff queue at 390 px in WebKit and 320 px in Chromium. The first-column order link now has a visible mint accent, arrow and adequate hit area. Its normal pointer click reaches the same existing staff fulfillment destination, preserving navigation context and issuing no purchase mutation. The table can still scroll for secondary columns, while its primary action is immediately reachable.
- Retained round-10 passes cover parent-only closed/held transitions, combined discovery/filter return, quote/uncertain recovery, private codes, recent-verification continuation/cancellation and administration library/draft/preview. The final queue/manual reruns replace only their earlier failed cases, without mislabeling the original failures as passes.

The independent source review found no remaining concrete authorization, duplicate-purchase or protected-data disclosure regression in the reviewed quote, reserve, payment allocation, dispatch/reconciliation, private reveal/action and callback paths after the recorded corrections. The separately authored expiry change received independent parent review and its focused race-enabled persisted tests passed.

Preserve all scope limits: synthetic rendering does not establish database persistence; local persisted tests do not establish live supplier parity; read-only provider import does not qualify purchasing, webhook delivery or production activation. Nexus Sandbox callback/deployment qualification, normal focused commit/security checks and release decisions remain the parent task's responsibility. The broader multi-role UX165 review stays paused. No live credentials, customer data, funds, messages, publication, SSH or production deployment were used by this reviewer.
