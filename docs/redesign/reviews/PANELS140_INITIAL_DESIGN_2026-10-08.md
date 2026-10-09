# Panels140 initial independent design review

Date: 8 October 2026. Reviewer: `/root/panels140_senior_design`, independent of implementation. Base: `23c70774594c488bc6fe1dfe166f06291d81bfb1`. This review follows `DESIGN_CHANGE_GATE.md` and covers the pending portal, independent-account, QR/resend, field-validation, win-rate and hosted-checkout changes. The implementation is still a working candidate; this document does not declare the release or full gate passed.

## Round 1: FAIL — four actionable findings

| ID | Priority | Observed reproduction and impact | Required outcome |
| --- | --- | --- | --- |
| UX140-01 | P2 | At 320 × 740, submit the customer win-rate range 80–60. The preference dropdown received focus although the invalid value was a range bound; supplied generic group error did not identify the reversed bounds. | Explain the invalid bound below that input and focus it. Preserve the selected preference and other answers. |
| UX140-02 | P2 | In the actual quote editor at 320 × 740, enter a valid USD quote, scope and reason, then preview. The response added the preview below the viewport and focus returned to the document, making completion easy to miss. | Bring the preview heading into view and focus it after a successful user-requested preview. Keep issuance separate. |
| UX140-03 | P2 | In checkout at 320 × 740, an isolated below-minimum response added an error above the form, outside the viewport. A newly created uncertain attempt similarly left the customer at the lower half of the replacement card. | Focus a visible error/outcome region following the user's checkout request; include the in-order support action. Background polling must not steal focus. |
| UX140-04 | P3 | The customer refund-address error said “8–256 byte wallet address,” exposing an implementation unit rather than explaining the correction. | Use clear complete-address/network/no-spaces guidance while retaining validation bounds. |

The first win-rate preview deliberately injected a generic error. Its behavior after correcting values was a fixture limitation, not reported as an application defect. The reviewer asked for and then used the actual `DynamicForm` path for the correction round.

## Round 2: scoped PASS

**PASS — no remaining actionable findings in the initially reviewed scope.** All four findings were fixed by the implementing agents and independently rechecked through the rendered source-component previews:

- Reversed range 80–60 now focuses **Upper win rate (%)** and displays “Enter an upper win rate greater than the lower win rate (80%).” Correcting it to 90 clears the bound error and updates the summary to 80–90%.
- Successful quote preview focuses the **Customer quote preview · not issued** heading and scrolls it into view. The retained draft, exact visible price/scope and separate reviewed issuance remain understandable.
- A below-minimum checkout response focuses the visible feedback region, says no checkout was created and includes **Ask support about this order**. A newly created uncertain attempt returns the viewport to the payment/status area with its **Payment needs review** explanation. The fix is tied to the customer's request, rather than every background refresh.
- Refund-address validation uses the complete-address/no-spaces wording and focuses the address input without losing the selected consent.

The reviewer also manually exercised the shared administrator validation preview: a failed save reveals a previously hidden section, expands its nested disclosure and focuses the invalid customer-field label. Repeating the same invalid save after returning to the overview reveals/focuses it again. Customer service-case, refund-destination and administrator provider-reference/reason validation were exercised through actual components with synthetic responses. Errors remained associated with their fields, draft values remained available and narrow layouts remained readable.

## Evidence and coverage

Direct reviewer interaction used the browser tool against local previews at ports 4199 and 4201. These render actual application components with synthetic inputs and API boundaries. Narrow interaction checks used 320 × 740; desktop checkout inspection used 1280 × 900. The reviewer inspected the 1280/768/320 Chromium/WebKit form/policy renders in `frontend/.cache/validation140/`, including visible focus and nested-field error recovery. The policy preview is synthetic; the published payment agreement was not changed.

The reviewer independently inspected rendered screenshots and receipts from `.cache/identity140/browser/{chromium,webkit}/`, not claimed as separately executing the implementation agent's harness. The evidence covers 60 checks per engine at 1440 × 1000, 820 × 1180, 390 × 844 and 320 × 740. Reviewed representative images include:

- Customer, admin and booster resend/code-expiry screens and realm-labelled QR enrollment.
- Narrow admin security and staff-account creation, desktop admin recovery, tablet admin profile, mobile booster profile/sessions and tablet booster recovery.
- Clear workspace identity, panel-local account navigation and wording that sessions/factors belong to the selected independent account.
- QR readability, separate account issuer, discreet manual fallback and the retained code-confirmation step.

The exact harness/evidence hashes are retained in `.cache/identity140/browser/qualification.json`; its two receipts report unchanged input fingerprints, no unintended external requests and no scoped accessibility/overflow failures. These are fixture results, not live identity-provider or camera-enrollment qualification. The reviewer inspected the prior Contact138 independent review and the final narrow all-social-links render; the public contact entry, intentional email wrapping, explicit private-chat sign-in requirement and supplied social destinations remain clear.

## Fixture incident and limits

During the first default checkout interaction, the finance fixture's provider-module alias did not intercept the browser redirect. The reviewer observed a navigation to NOWPayments using a synthetic invoice reference and immediately returned. No provider control was used, no live invoice was created, and no credentials, message or funds operation occurred. This attempted navigation is retained as a fixture failure, not a clean isolation pass. The parent corrected the alias and independently ran a browser smoke check that blocked every nonlocal request: continuation was captured locally and no outside request was attempted. Evidence is `frontend/.cache/finance140/smoke.mjs` and `checkout-captured.png`.

The initial pass is a scoped design review, not a guarantee of no undiscovered issue. Actual provider payment, real Google/email delivery, physical devices, camera scanning and assistive-technology traversal are not certified. The local win-rate fixture's successful API progression was unavailable; the complete integration suite must cover that boundary. Additional form editors share the reviewed controls but still require their automated checks and the owner-requested broad flow review.

**The separate multiple-tester review of all 31 existing journeys plus the current addenda remains pending.** It will run while the frozen full gate is active, with senior triage and fix/review rounds. Its later changes require qualification against their actual source; this initial pass or a prior baseline cannot certify them.
