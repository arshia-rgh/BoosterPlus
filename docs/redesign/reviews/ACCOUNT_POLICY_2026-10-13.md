# Account commission and policy UI review — 13 October 2026

## Scope

Independent reviewer: `/root/account_policy_senior_review`, senior UI/UX designer. Reviewed changes against `963523d` only: account base/commission/crypto quote inputs, seller agreement breakdown, buyer detail/card totals, inventory price and buyer-term templates, shop-policy template and catalog review-policy template. The green theme and existing independent staff/customer identities are preserved.

User-approved behavior: 10% seller commission deducted from the base, 5% buyer commission added independently, legacy accepted agreements preserved, seven-day initial inspection does not end buyer protection, and 48-hour payout initiation target after eligibility.

The preview uses actual React components with isolated synthetic resources at `http://127.0.0.1:4198/`. No live accounts, mail, invoices, transfers or published policies were changed by this review. The preview wrapper and navigation are review tooling, not proposed product UI.

## Round 1

Rendered Chromium desktop 1440×1000, tablet 768×1000, phone 390×1000 and narrow phone 320×1000. Buyer/seller breakdowns, inventory editor and review-policy editor fit without document overflow. Buyer example USD49.99 + USD2.50 = USD52.49 is clear. Seller example USD49.99 − USD5.00 = USD44.99 retains its separately shown exact crypto quote and rate/source/time. Long public and private terms remain readable and preserve protection beyond initial inspection.

Private rendered evidence: `.cache/service148/review/{view}-{width}.png`, `designer-results.json`, `inventory-invalid.png`, `reviews-applied.png` and `designer-interactions.json`.

### Findings and required outcomes

- **AP-UX-01 — minor, duplicate price correction.** At 390px, clear Inventory → Account base price and press Save account listing. Focus correctly returns to the control, but the validation summary repeats the same field twice and the inline error concatenates two nearly identical instructions. Required outcome: one clear correction for an empty/invalid base; no errors targeting removed amount fields.
- **AP-UX-02 — moderate, arrangement consistency.** Confirmed at the owner route `/admin/?view=proposal`: apply approved consignment terms, then select buy-first. The proceeds field still says “This is a consignment sale” with buyer-acknowledgement conditions and no warning. Required outcome: changing arrangement must not silently permit an incompatible approved template; require a clear reapply/review or safely switch untouched template text.
- **AP-UX-03 — wording consistency, fixed and verified.** Proposal's numeric label called the approved 48-hour initiation target a “payout deadline”. The implementing agent corrected it; the rendered owner proposal now says “Payout initiation target (hours after eligibility)”.
- **AP-UX-04 — moderate, template loading loses unrelated edits.** At `/admin/?view=reviews`, delay only the synthetic defaults request by two seconds, click Replace with approved review rules, then Add feedback attribute. The new attribute appears while loading, then disappears when the template resolves. The loading handler uses an earlier callback/state. Required outcome: replacement changes only the named policy text and preserves edits made to other fields while loading; verify the shared shop-template behavior too. Private reproduction: `designer-race.mjs` and `reviews-template-race.png`.

### Fixture evidence needed

The initial owner proposal fixture rendered only the empty agreement state at the customer URL; using the correct `/admin/` browser path resolved this without a product change. The owner form was then reviewed at all four widths, including blank-base focus and USD100/rate1.0001 → USD90 net /90.009000 exact crypto preview. The shop fixture used `section="policy"` rather than the component's `terms` section. This is a preview limitation, not a proven application defect. Shop, public commission-inclusive listing cards and stale inventory refresh/reset need rendered follow-up.

## Round 2

Repeated the rendered matrix for seven actual-component views (proposal, seller, buyer, cards, inventory, review policy and shop policy) at 1440, 768, 390 and 320px. No document overflow or browser exceptions were found. Inventory's existing local section tab strip scrolls horizontally within its own boundary; this is not page overflow.

- AP-UX-01 resolved in inventory: a single base correction appears beneath the focused field and once in the summary.
- AP-UX-02 resolved for the reproduced path: untouched template text switches with arrangement. Edited wording requires explicit review or replacement. The implementing agent also corrected a reset initially attached to price edits; price changes now preserve the custom-review requirement, and approved replacement clears it.
- AP-UX-03 remains resolved.
- AP-UX-04 resolved: a new feedback attribute survives delayed defaults, and shop delivery hours edited to48 during loading remain48 after policy text applies. Template failure preserves existing wording; retry succeeds. Loading blocks duplicate template requests.
- **AP-UX-05 — moderate, keyboard continuity.** Keyboard Space on a template button disables the focused element; after success, focus is BODY rather than a useful control. The newly added custom-arrangement checkbox also unmounts immediately after being checked. Required outcome: preserve logical keyboard focus and expose applied confirmation without stealing focus if the user has moved elsewhere.
- **AP-UX-06 — minor, card hierarchy.** At320px the added commission note inherits the oversized price line, occupies three large lines and competes with the total/CTA. Required outcome: separate compact, readable fee-inclusion caption while retaining the total's emphasis. Evidence: `round2-cards-320.png`.

Evidence: `designer-results-round2.json`, `round2-{view}-{width}.png`, `designer-round2-interactions.json`, `round2-shop-applied.png`. Full backend/authorization, real payouts and live legal publication are outside this isolated UI review.

## Round 3 and final verification

All six findings are resolved and verified in the rendered components:

- **AP-UX-01:** both seller and inventory now show one actionable error per missing/invalid price field. Missing seller quote details are associated through `aria-describedby`, and focus moves to the first base-price field.
- **AP-UX-02:** untouched arrangement terms follow the selected model; custom wording requires explicit review. Price edits do not dismiss that requirement. Applying the correct approved template resolves it.
- **AP-UX-03:** staff entry and seller display consistently use an initiation target.
- **AP-UX-04:** template responses use the current callback; unrelated changes survive delayed loading in both review and shop editors. A simulated503 preserves entered text and allows a successful retry.
- **AP-UX-05:** keyboard Space leaves the template button focused with a visible green outline; the next Tab goes to the policy textarea. Success has an applied status. Custom-arrangement confirmation remains checked, visible and focused instead of disappearing.
- **AP-UX-06:** cards show the total prominently with a14px/21px fee-inclusion caption on its own line. It fits at320,390,768 and1440px.

Additional checks: buyer-term replacement sets168 inspection hours while preserving account title and base49.99; unsaved-change status remains visible. The stale fixture retains an unsaved50.00 price, requires explicit discard/load, then correctly resets the visible field to100.00 and the total to105.00. Legacy seller responses without a commission snapshot retain their exact crypto amount and do not invent a breakdown.

Evidence: `designer-round3.json`, `designer-final.json`, `round3-cards-{width}.png`, `round3-inventory-reset.png`, `final-buyer-template-320.png`. Exact reviewed UI file hashes and review time are retained privately in `.cache/service148/review/reviewed-ui-sha256.json`.

## Final verdict

**PASS — no remaining actionable findings in this changed UI scope.** The implementing agent corrected the findings and the independent reviewer verified the round trips.

Limits: headless Chromium with actual React components and synthetic responses; no physical-device or assistive-technology session, live account mutation, provider transfer, backend authorization, database qualification or policy publication was performed. The synthetic stale409 uses a generic error code; the specific stale-recovery interface was verified, not a claim about backend error mapping. The review wrapper/navigation and placeholder account artwork are fixture content. Unchanged site-wide UX was not re-audited. Passing this scoped review does not replace the complete application/security/release gates or promise absence of undiscovered defects.


## Broad manual review addendum

### Service148 final review

Reviewer: `/root/account_policy_senior_review`,13 October2026.

**PASS — BR-01 through BR-05 resolved; no remaining actionable finding in this bounded correction scope.** This verdict follows independent customer/admin rechecks and the senior reviewer's own calendar/browser/source/evidence verification. It does not certify real backend financial behavior or replace unfinished release qualification.

### Source and isolation

- Original full-gate source remains unchanged. Implementation exists in a separate private frontend copy under `.cache/service148/ux/source/frontend`.
- BR-01–04 were verified on immutable snapshot `service148-ux1`, SHA256 `ddff1494d7f19deb157355e7d7bd7e6dd5eec3d9aa67ba31d8b21580e27a4082`.
- BR-05 final verification uses `service148-ux2`, SHA256 `910310f3398210ff26dfbb2101e344da805fea3e608c46cee32f4f2ad05e3033`. The only changes from ux1 are calendar implementation/regression tests; retain unchanged BR-01–04 evidence.
- Separate senior runtimes `service148-ux-senior` and `service148-ux2-senior` used only copied synthetic datasets. Both were stopped after review. No live service, real email, payment, credential, account mutation or tracked-source edit occurred.

### Findings resolved

| Finding | Final observed outcome | Evidence |
| --- | --- | --- |
| BR-01 price disclosure | Normal and direct final review show base49.99 +5% fee2.50 = total52.49 before consent without expanding details. Legacy50.00 remains unchanged without invented fee. | Customer recheck Chromium1440/390 and WebKit320; senior inspected narrow screenshot and conditional source. |
| BR-02 inspection wording | New accepted snapshot says Initial inspection ends and expressly preserves protected refund/support rights. Legacy snapshot retains its historical wording. | Customer new/legacy delivery screenshots and source condition. |
| BR-03 seller conflict | Exact seller409 names agreement/submission refresh, retains decision note and does not replay acceptance on refresh. Buyer409 retains reservation recovery instructions; unrelated403 still clears private content through the normal access boundary. | Customer report and exact request ledger. |
| BR-04 server validation | Exact422 account-base and quote-time issues show actionable validation, one summary and one associated inline correction; changed values remain and field focus is correct. Real503 still reports unavailable. MFA cancellation retains draft. | Admin Chromium/WebKit390 report, screenshots and request ledger. |
| BR-05 calendar feedback | Successful profile save announces completion and moves lost keyboard focus to the result region after refresh; next Tab enters timezone locally. Deliberately moved focus is preserved. Failed save keeps keyboard focus on Save and retains the edited draft without a success notice. A later invalid attempt clears prior success and focuses timezone. | Senior ux2 nine scenario/browser runs plus four success→invalid subchecks. |

### Calendar verification detail

Success paths: booster Chromium1440 and WebKit320; admin Chromium390 and WebKit320. Each shows `Calendar profile saved.`, focuses `Calendar profile result` after keyed refresh, and next Tab reaches the timezone field. Each was followed by an invalid timezone attempt: previous success disappears, the invalid value remains, and focus goes to timezone.

POST503: booster Chromium390/WebKit320 and admin WebKit320 retain Europe/London and game-capability edits, leave no saved message, and preserve keyboard focus on `Save calendar profile` for retry.

Delayed save: moving focus to the footer Terms & policies link during an in-flight booster save does not steal that focus on completion.

Save succeeded but subsequent GET503: admin WebKit320 truthfully distinguishes saved data from failed refresh, provides refresh guidance and focuses the result region.

Two follow-ups were found in ux1 and fixed before final pass: failure lost keyboard focus because the save button became natively disabled; a later invalid attempt could retain an earlier saved notice. Both original failed observations are retained in `senior-calendar-roundtrip.json` / `senior-calendar-status.json` and original screenshots. They are not relabeled passed. Final observations are in `senior-calendar-roundtrip2.json`.

All nine final runs reported no page exceptions, blocked external requests or document overflow. Request ledgers for the senior instances contain only explicit synthetic fixture responses and synthetic sessions, with no missing/invalid/body-mismatch response. Screenshots and traces are under `.cache/flow-review141/evidence/service148-ux{,2}-senior/`.

### Supporting reports and hashes

- `.cache/service148/manual/customer-ux/RECHECK.md`
- `.cache/service148/manual/admin-recheck/REPORT.md`
- `.cache/service148/manual/senior-calendar-roundtrip2.json`
- `.cache/service148/manual/senior-reviewed-source-delta.json` records the13 changed frontend source/test files with baseline and correction SHA256.
- `.cache/service148/manual/senior-roundtrip-evidence-sha256.json` binds this report, relevant snapshot manifests, reviewer result files, reports and selected screenshots.

### Limits and release handoff

These are compiled Chromium/WebKit UI checks with exact synthetic API contracts and keyboard interactions, not physical-device/screen-reader sessions or real authorization/payment/email tests. The parent must qualify the final source delta and preserve exact-source provenance alongside the frozen baseline's actual result; do not imply the running baseline already tested these later edits. Retain legacy agreement protection and disabled outgoing/deletion settings. No additional feature or live-action authorization is implied.
