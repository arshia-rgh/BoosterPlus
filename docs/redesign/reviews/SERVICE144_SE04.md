# Service144: SE04 pricing and delivery design review

Date: 12 October 2026. Reviewer: separate senior UI/UX agent `/root/service_release_designer`.

**PASS — no remaining actionable findings in the reviewed SE04 pricing, requested delivery and quote-timing UI.** This scoped design verdict does not certify the complete release or live quotation/payment behavior.

## Scope and builds

Reviewed `pricing-editor.tsx`, `pricing-preview.tsx`, `money-input.tsx`, the explicit delivery-hours template, related field/error registration, precise backend pricing-validation paths, and `docs/mlbb-catalog-setup.md`. Reviewed the existing quote display/editor only to check the roadmap's delivery timing contract. No production catalog, price, quote or policy was edited.

Initial rendered review used frozen `service144-r3` / `service144-review4`, manifest `2157d7f129ca5e802a12f401cbc0bc093e7af7e58f2d0468f9a691b39efad015`. The correction was reviewed in `service144-r4` / `service144-review5`, manifest `bede19a8b87428994fa0aeab58b2ce51240615fbb458127669af19817597ed5b`.

## Findings and round trip

### SE-P01 — misleading validation focus, medium — closed

The backend originally reported an invalid operation amount at the whole pricing-rule path. The editor consequently focused **Pricing rule key** and put the amount/percentage error below that unrelated input. Reproduced at Chromium390×844 through the unsaved checker with an invalid fixed amount and the actual backend issue path.

The correction supplies precise operation, quantity, rank, unit, interval and example paths. The editor registers current interval inputs and explicit removal controls for duplicate/unavailable rows. Rechecks confirm the invalid amount, a specific middle-rank amount, a missing high-rank amount and a duplicate-row removal action receive the appropriate focus. The original failed screenshot and corrected evidence remain separate.

### SE-P02 — requested and accepted quote timing, medium — closed

The first candidate described requested calendar hours in the custom form but lost the range and start basis during quote comparison; the staff editor and agreement used ambiguous delivery wording.

The correction identifies requested hours with an explicit `service.delivery_request` marker and pins the clock for newly issued commercial agreements with `delivery_basis: payment_and_access_v1`. It does not infer promises from arbitrary field names or rewrite legacy agreements.

Frozen `service144-r5` / `service144-review6`, manifest `17bd01e550047db35f6c529c4c0ae0365bca44c54c36aa12fe0dadb7238ed6e0`, was rechecked in Chromium390×844, 820×844 and1440×1000, and WebKit320×844. The original synthetic96–120 hour request appears separately from the current24–48 hour commitment. Both describe calendar hours after verified payment and required delivery information/access readiness, with the original explicitly labeled as a request. The staff editor repeats the original request and states that the agreed clock will enter the customer quote. A previous quote without the marker retains “original quote wording”; an unmarked agreement retains its earlier estimate wording. At390px, staff guidance also reflows at200% text without document overflow. Existing customer consent and staff preview/issue controls remain in source; this round did not submit or accept a real quote.

## Completed rendered checks

| Area                       | Browser / viewport                                 | Result                                                                                                                                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unsaved price checker      | Chromium390×844, 820×844, 1440×1000; WebKit320×844 | Ordinary USD inputs, synthetic USD12.50 match and USD13.00 mismatch, readable breakdown, independently retained USD12.50 expectation, stale result notice after editing, corrected amount error/focus. No horizontal overflow in these final states.                                               |
| Rank pricing fields        | Chromium390×844                                    | Target-rank selector excludes a different rank reference; exact middle-interval and missing-high-interval errors reveal/focus the correct input; duplicate row error focuses its removal control. Removing the duplicate retains current rows and keyboard navigation stays in the pricing editor. |
| Explicit delivery template | Chromium390×844; WebKit320×844                     | Adds the two required editable 1–720 hour fields and ordered-range rule; disables duplicate insertion; retains the old priority field for explicit review; exact synthetic save payload accepted.                                                                                                  |
| Customer delivery request  | Chromium390×844; WebKit320×844                     | Calendar-hour basis and non-guarantee wording visible beside the range; reversed96–24 hours focuses maximum hours with an inline explanation; correcting to96–120 preserves the values and clears the error.                                                                                       |

The MLBB guide correctly distinguishes manual-review configuration from a broken calculator, explains ordered operations/exact amounts, keeps synthetic arithmetic separate from live prices, and requires verified mappings and independently calculated examples before publication. Its prior live-audit claims were not independently re-audited during this design review.

## Evidence and limitations

Evidence is private under `.cache/flow-review141/evidence/service144-review4/` and `service144-review5/`, including dataset hashes, request journals, screenshots and traces. Relevant prefixes are `designer-pricing-*`, `designer-pricing-fields-*`, and `designer-delivery-*`. Helpers are `service144-pricing.mjs`, `service144-pricing-recheck.mjs`, `service144-pricing-fields.mjs`, and `service144-delivery.mjs`.

All requests used exact synthetic fixtures through an isolated browser that denies external traffic. These results qualify UI handling, not backend arithmetic, real saving, publication, quotes, payment, mail or production behavior. The complete backend/security/integration gate is separate. No real-device or assistive-technology pass is claimed.

Retain the initial helper failures: the first pricing helper did not open its collapsed service editor; the first delivery helper omitted the displayed hours unit from its exact label selector. Corrected helpers used the actual controls. These are fixture/test setup corrections, not product defects or passed attempts.

The source/component stale-in-flight behavior and exact decimal arithmetic have separate focused tests reported by the implementing agent. This reviewer did not independently rerun the full backend or frontend suite. The subsequent quote-clock recheck is recorded above and closes SE-P02. Evidence is under `service144-review6/designer-quote-clock-*`; helper `service144-quote-clock.mjs`. The first helper attempt used an ambiguous text locator matching both current-quote and decision summaries; the corrected run scoped it to the current-quote region. Retain that interrupted attempt separately. Synthetic response rendering does not prove server persistence, actual issuance, acceptance, or funds movement.
