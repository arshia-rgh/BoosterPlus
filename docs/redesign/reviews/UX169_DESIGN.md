# UX169 independent design review

Date: 21 October 2026. Reviewer: independent senior UI/UX designer agent `/root/senior_design`. Base: `7f91847`. Required workflow: `docs/redesign/DESIGN_CHANGE_GATE.md`.

## Scope and acceptance

The owner requests clearer product details, less redundant interface copy, review and improvement of all user-facing forms, clear visual boundaries between each game's persistent introduction/statistics, route-specific content and FAQ, and comfortable FAQ answer alignment. Preserve the existing green/champagne direction, complete authored product and policy text, actual pricing and availability, financial guards, private recipient handling, authentication/MFA, and independent portal identities.

The review covers fixed packages and custom service configuration; account details and purchase review plus affected shared staff/accepted-record presentation; manual and supplier shop details; the shared game shell across all ten child route families; and the shared field/action/validation presentation across public, customer, booster and administrator forms. This is a presentation review, not a revival of the paused UX165 cross-role backend audit.

The pre-existing uncommitted files identified in `.cache/ux169/baseline.json` belong to another person. They are excluded from the implementation and reviewed candidate. Review must use the clean base plus UX169's own delta. Untracked prototype/cameo assets are likewise excluded.

Acceptance criteria:

- A product's title, authored description, included facts, total and delivery expectations have a clear reading order. Labels are visually subordinate to values. Fixed contents do not resemble editable inputs.
- Redundant procedural copy is shortened without removing authored terms or conditions that affect the purchase decision. Optional detail may use an accessible disclosure; required consent remains explicit.
- Route-specific content has deliberate upper and lower separation, consistent with the current theme, without decorative headings or duplicated page titles.
- FAQ questions and answers share a deliberate text inset; open answers have sufficient top, side and bottom space, readable line length and line height. Long questions/answers and keyboard expansion remain usable.
- Labels, controls, help, errors and actions use consistent spacing; long labels and validation messages wrap; radio/checkbox text aligns sensibly; narrow layouts remain operable without horizontal scrolling. Existing first-invalid focus and entered values remain intact.
- No new unsupported product claims, publication, real order, invoice, outgoing payment, production-data mutation or live message is used for visual qualification.

## Round 0: source inventory and design direction

Verdict: **BLOCKED — rendered candidate evidence pending.** Source observations below establish review targets; they do not certify the rendered result.

| Target | Source observation and direction |
| --- | --- |
| Fixed package | `catalog/public.tsx` separates title/artwork/variant from a prose-heavy price box. `catalog/package-scope.tsx` renders a bare auto-fit definition grid with two surrounding procedural paragraphs. Group the decision facts, keep delivery timing truthful, and give included contents a padded, well-aligned fact presentation with small labels and clear values. |
| Game route boundaries | `catalog/game-shell.tsx` already has one shared `.game-local-content` container before `.game-faq`. Use those boundaries for a restrained champagne/green separator and spacing, avoiding per-page duplicated markup or extra copy. Check custom-action/featured-offer placement so the separation agrees with the actual content hierarchy. |
| FAQ spacing | `experience/experience.css` adds a box around all disclosures while `catalog/game-shell.css` resets FAQ details to zero horizontal padding. Make FAQ-specific rules explicit enough that answers and questions retain their intended inset in both open and closed states. |
| Account details | `resale/account-presentation.tsx` already exposes complete authored terms through disclosures. Preserve their content and protected-rights explanation; refine fact spacing and disclosure interiors, and verify public purchase, staff preview and accepted-record contexts. |
| Shop details | Manual and supplier flows share `shop/shop.css` but have distinct selection/recipient/review behavior. Use styling and clean shared presentation files only; protected in-progress purchase components are excluded. Verify compatibility facts, quantity, protected recipient fields and totals in all three steps. |
| Shared forms | `catalog/controls.tsx`, `catalog/dynamic-form.tsx`, `catalog/form-rhythm.css`, `styles.css` and `experience/experience.css` supply shared presentation with local overrides. Improve a consistent field rhythm and restrained help/error hierarchy; inspect native selects, grouped choices, multiline help and action wrapping across the portal contexts. |

### Form-family inventory

The route inventory includes `frontend/app/routes.ts`, `frontend/admin-app/routes.ts` and `frontend/booster-app/routes.ts`. The source inventory found controls in the following families; each must be accounted for in the final coverage record rather than claiming every individual state was exercised.

| Audience / family | Representative implementation | Required rendered coverage when shared presentation is affected |
| --- | --- | --- |
| Public discovery and filters | `resale/market-filters.tsx`, `shop/public.tsx`, `news/list.tsx` | Search/select/filter wrapping, clear/reset actions, empty results |
| Custom boost and fixed package | `catalog/dynamic-form.tsx`, `catalog/choice-input.tsx`, `catalog/cosmetics-input.tsx`, `catalog/win-rate-input.tsx` | Long labels/options, linked choices, required/optional guidance, estimate, delivery step, validation and first-invalid focus |
| Manual and supplier shop | `shop/public.tsx`, `shop/supplier-purchase.tsx` | Options, quantity, recipient, masked review, terms/consent, busy/error/unavailable; synthetic fixtures only |
| Account purchase | `resale/market.tsx` | Price facts, complete terms disclosure, consent, signed-out continuation and signed-in review |
| Authentication and account security | `identity/identity.tsx`, `identity/action-verification-content.tsx` | Customer/admin/booster sign-in, verification code, MFA/action verification and recovery dialog; keyboard dismissal/focus and narrow scrolling |
| Seller submission and workspace | `submissions/form.tsx`, `submissions/images.tsx`, `submissions/record-parts.tsx`, `resale/seller-route.tsx` | Dynamic facts, optional notes, authority checkbox, image input/retry, seller agreement and payout-route controls |
| Customer order and checkout | `orders/customer-workspace.tsx`, `orders/submit.tsx`, `payments/checkout.tsx`, `payments/cases.tsx` | Review/consent, actions, inline errors and existing payment status; no live invoice or funds action |
| Support and chat forms | `support/new.tsx`, `support/composer.tsx`, `support/forms/{create,answers,card}.tsx` | Subject/message, attachments, ordinary/protected fields, multiline labels, dialog scrolling/focus, validation, disabled controls |
| Reviews | `reviews/form.tsx`, `reviews/pages.tsx` | Rating, feedback, policy consent, dynamic review fields, error and withdrawal presentation |
| Availability / preferences / privacy | `availability/accounts.tsx`, `availability/pages.tsx`, `privacy/pages.tsx`, `identity/identity.tsx` | Long filter labels, optional fields, notifications, request/verification controls |
| Booster scheduling and order actions | `fulfillment/{availability-editor,bookings,calendar,time-input,booster-workspace,actions}.tsx` | Time controls, date/time-zone help, narrow action groups, task input, validation |
| Administrator authoring | `catalog/*editor.tsx`, `shop/editor.tsx`, `suppliers/editor.tsx`, `resale/inventory.tsx`, `site/editor.tsx`, `news/editor.tsx` | Shared field grids, nested fieldsets, long select values, help/errors, representative preview and publication controls without publishing |
| Administrator operational forms | `admin/*`, `orders/quote-editor.tsx`, `support/staff-controls.tsx`, `payments/*`, `reports/pages.tsx`, `operations/jobs.tsx` | Representative filters, action verification, numbers/amounts, checkboxes and disabled/busy/error actions; no live mutation |

### Required rendered matrix

Use synthetic fixture data and the running clean candidate preview. Minimum widths are desktop 1440, tablet 768 and a genuinely narrow phone 390 (supplement 320 for long-value wrapping). Full-page images must include both content boundaries; focused images must make actual text/padding legible. Capture the fixed-package long-content case, account detail and review, manual/supplier shop details and representative form contexts above. Exercise FAQ closed/open/long-answer and keyboard focus; dynamic-form invalid submission/focus, long labels and selected choices; and at least one modal form's narrow scrolling/focus. Record image paths, exact viewports, routes/states and observations per round. Source-only review or an unrendered mock is not a pass. Browser automation provides fixture-only visual evidence and does not establish real provider or persisted backend qualification.

### Clean-base form review recommendations

These source findings were sent to the implementing agent. They require candidate review; they are not a rendered pass.

| ID | Priority / target | Source observation | Required outcome |
| --- | --- | --- | --- |
| SRC-F01 | P2, `admin/directory-filters.tsx` | The Customer ID control, its help paragraph, Status, Apply and Clear are five independent children of a two-column `.catalog-grid`. Help can appear beside its control and displace the next field. | Keep the customer label/input/help together; keep actions together below aligned fields. Preserve filter semantics and validation. |
| SRC-F02 | P2, `support/forms/answers.tsx` | Required chat fields display an unexplained `*` while dynamic catalog fields use explicit required wording. Validation replaces `aria-describedby` help with error, so protection/audience guidance is omitted while errors are present. | Use explicit required wording and include both help and error descriptions. Preserve masking and private data behavior. |
| SRC-F03 | P3, `privacy/pages.tsx` export | Consecutive paragraphs repeat fresh-verification guidance. The disabled customer deletion notice explains owner publication mechanics. | State verification once; retain page limits, private-storage guidance and excluded secrets. Use a concise customer unavailable state while retaining the published policy. |
| SRC-F04 | P3, `support/new.tsx` | The long pre-sales legend and subject help repeat the purpose and contain avoidable instructions. | Use a short conversation heading and concise character-limit/existing-order help, preserving privacy and uncertainty guidance. |
| SRC-F05 | P3, `reviews/form.tsx` | Moderation is repeated in the intro, field help and submit action. | Reduce duplication while preserving privacy, rating/wording ownership, labeled staff responses and explicit publication-policy acceptance. |

No new copy or interaction change was recommended from the clean-source review for the following families; they remain within representative shared-style rendering coverage:

- Account-market filters: coherent label/help/error grouping, explicit currency semantics and grouped apply/clear actions already exist.
- Seller intake, screenshots and sale-workspace controls: numbered stages, authority consent, privacy notes and uncertain-send recovery guidance serve concrete decisions. The two-stage screenshot upload/send explanation must remain.
- Customer/admin/booster sign-in, MFA, recovery, profile and preferences: the compact form structure is already established; security distinctions, consent, fresh verification and recovery ownership review are essential. Profile/preferences controls are brief.
- Customer order acceptance, checkout, disputes, refunds, manual payout and administrator quote authoring: complete agreement, payment state, asset/network, uncertain-send and authority copy is decision-critical. Shared rhythm is the appropriate change; no financial workflow or consent simplification is justified by this review.
- Availability emails: no-reservation, fresh consent and delayed-alert semantics are meaningful. Long labels and consent lines need responsive checking, but removal is unwarranted.
- Booster calendar, availability, session proposal and fulfillment actions: distinct availability/booking states, local time-zone and repeated-clock-hour controls, and customer-visible update guidance are purposeful. Preserve these semantics and check date/time controls and wrapped actions.
- Catalog, site, news, account-listing, shop and supplier authoring: field labels, source/rights and exact-revision review guidance serve authoring tasks. Shared form structure should be improved where rendered evidence warrants it, without deleting publication safeguards or changing protected shop files.
- Staff invitations, governance, operational recovery and reports: independent-role, retry-risk, report recognition/date and audit controls must remain. Shared control/error/action presentation can be checked without carrying out these mutations.
- Support composer: audience, internal-note warning, attachment and uncertain-send instructions are functional; ordinary/protected form fields are covered by SRC-F02. No unrelated messaging behavior change is proposed.

## Rendered review rounds

### Round 1: independent browser review

Clean preview supplied by the implementing agent: `127.0.0.1:5189` (game/package/custom/account/forms), `5190` (manual/supplier shop), `5191` (seller), `5192` (foundation). These are actual application components in synthetic frontend fixtures, with local mock responses. They exclude the other person's protected changes. The reviewer used a separate in-app browser tab, with explicit 1440×1000, 768×1000, 390×844 and 320×850/650 viewports. Screenshots are retained in `.cache/ux169/senior-design/`.

Observed improvements: included package facts use a clear padded label/value hierarchy at desktop and phone; the shared game content boundaries are restrained and visually distinct; FAQ questions and long answers have consistent insets, readable width and keyboard expansion. Account facts, price/commission, expanded skin groups and complete sale terms remain legible at desktop/tablet/phone. Account review/back navigation returns focus correctly. Support subject validation and the foundation profile example focus the first invalid field with readable nearby errors. Native select and linked-region choices remain usable.

| ID | Severity / reproduction | User impact | Required outcome / status |
| --- | --- | --- | --- |
| UX169-01 | P2. Fixed-package delivery fields, 768×1000. Region and Server have one-line labels and equal container heights, but different help lengths cause normal grid stretch to distribute extra row height. Region select starts at y741.09; Server at y727.09 (14px difference). | Adjacent controls do not align, making a structured form appear uneven and harder to scan. | Start-align field grid contents. **Resolved in round 2**: custom-form Region and Server controls both start at y685.07 after the shared correction. Original evidence `r1-package-tablet.png`; corrected custom form was inspected live. |
| UX169-02 | P2. `/forms`, purchase review, 320×650. Submit the empty review. Real `ReviewPanel` and editor produce two `.catalog-section` panels plus two padded fieldsets. Inside the 288px outer panel the rating/body controls are only143.22px wide. | Validation and consent text become narrow word stacks and an already small phone wastes almost half its available form width. | Flatten redundant visual borders/padding while retaining fieldset disabling and semantics. **Resolved in round 3**: controls are232.61px wide, no horizontal overflow and empty-submit focus still reaches the rating. Original evidence `r2-review-validation-320.png`; corrected evidence `r3-review-validation-320.png`. |

Fixture failures were reported separately and do not count as product defects: initial discovery and validation mocks were incomplete (unavailable-state response instead of invalid fields), the privacy-policy fixture missed schema fields, the first seller route rendered blank, the supplier/seller fixtures omitted the real `.experience` wrapper, and standalone `AnswerInput` omitted its actual chat-dialog styling context. The implementing agent corrected the relevant fixtures for recheck. Initial screenshots remain retained. A press attempt on a nonfocusable heading and exact-text locator misses were browser-review harness errors, not application defects.

### Round 2: corrected field alignment and actual protected dialog

The reviewer verified UX169-01 closure as described above, and reviewed account detail at1440/768, account purchase review with a long expanded sale agreement at390, and custom searchable hero choices at390. Account details and complete terms remain readable with no width overflow. The source-required copy corrections are present in the real support/review/privacy components; their authored policies remain intact.

The corrected `/forms` fixture mounts the actual `ChatFormCard` and dialog. At390×844 and320×650 the protected response shows explicit required wording, a separately padded Protected badge, a themed edit button and readable privacy help. Empty Send response focuses the protected edit control; `aria-describedby` includes both help and error IDs. Escape closes the dialog and returns focus to Complete form. The dialog fits within the checked small viewport and preserves its available scrolling behavior. No response was sent. Evidence `r2-protected-dialog-phone.png`, `r2-protected-dialog-320.png`.

Current rendered verdict: **FAIL — UX169-02 requires correction; remaining fixture-context evidence is pending.**

### Round 3: corrected review, themed seller and shop fixtures

The purchase-review correction resolves UX169-02 at320×650. The outer card now contains simple editor spacing and borderless semantic disabled fieldsets. Empty submission still shows a clear summary and adjacent errors and focuses the rating. The field's232.61px usable width is substantially better than143.22px; the page does not overflow horizontally. The custom-boost source no longer repeats its procedural paragraph; the authored description and estimate/quote-stage notices remain. The final custom-service rendering and long Region/Zone ID FAQ were also rechecked at320×650: multiline questions, chevrons and answers have comfortable independent insets and no horizontal overflow (`r3-faq-320.png`).

The seller fixture now includes the real `.experience` wrapper. At320×650 and768×1000, the numbered account description/photos/permission sections, private notes, upload guidance and actions remain readable. Empty title plus unchecked authority produces correctly associated errors and first-invalid focus on Private account title. The page has no horizontal overflow; its local section navigation remains scrollable. Evidence `r3-seller-320-validation.png` and `r3-seller-tablet-validation.png`. No account submission, upload or draft save was made.

Supplier fixtures now use the real theme wrapper too. Account-sign-in delivery at320×650 keeps the quantity step/minimum help, Player ID, server, protected Game password help and errors readable; invalid Review current price focuses Player ID. All four controls measured269px wide with no page overflow. Automatic-ID delivery was inspected at1440×1000 and768×1000 with the complete compatibility/cancellation/refund/fee disclosure expanded. The digital-code method was inspected at320×650, including the local synthetic quote/review state: its private-delivery notice, price expiry, total, terms links and unaccepted consent/disabled Go to payment are clear. Evidence `r3-supplier-account-320-validation.png`, `r3-supplier-id-desktop.png`, `r3-supplier-id-tablet-terms.png`, `r3-supplier-code-320-review.png`. The earlier code screenshot named `r3-supplier-code-320-validation.png` actually captures the local review state, not a validation error. The manual-product recipient/review was inspected at390×844: required recipient focus, masked review value, complete terms and inclusive total remain readable (`r2-manual-shop-phone-review.png`). No payment or reservation was made.

Browser harness limits retained: a direct navigation away from the manual draft was aborted, so a separate review tab was used; specifying IAB visibility from a subagent was unsupported; a native disclosure exposed as an AX button required its visible text locator. These are review-tool conditions, not product failures. Initial missing-wrapper screenshots remain retained and are superseded by the correctly themed evidence.

Current rendered verdict: **BLOCKED — both actionable visual findings are resolved; representative built customer/authentication, administrator and booster context evidence remains pending.**

### Round 4: actual built portal contexts

The implementing agent supplied 16 Chromium PNGs from the actual customer, administrator and booster production builds, using isolated synthetic API/session data. The reviewer opened and inspected every image under `.cache/ux169/built-portals/chromium/`. Runtime source was unchanged after round 3. The viewports were desktop 1440×1000 and phone 390×844; full-page images extend beyond the viewport where the page scrolls.

| Evidence | State and result |
| --- | --- |
| `desktop-customer-login.png`, `mobile-customer-login.png` | Empty-email sign-in validation. Label, focused input, nearby error, summary link, consent and recovery action remain readable, with clear spacing and no clipped text. |
| `desktop-admin-login.png`, `mobile-admin-login.png` | Administrator sign-in validation. The invited-account and authenticator requirements remain visible; controls, errors, consent and access/recovery actions fit the desktop card and stacked phone layout. |
| `desktop-booster-login.png`, `mobile-booster-login.png` | Booster sign-in validation. The same field hierarchy remains clear with the booster-specific introduction, longer authenticator explanation and wrapped summary link. |
| `1440-customer-recovery.png`, `390-customer-recovery.png`, `1440-admin-recovery.png`, `390-admin-recovery.png`, `1440-booster-recovery.png`, `390-booster-recovery.png` | Open recovery dialogs. Current/new email labels, focused field, complete ownership-review/authenticator explanation, close action and verification action are comfortably inset. Phone button text wraps within its control. Full-page captures show the dialog relative to the scrolled page; they are not used to infer its viewport position. |
| `desktop-admin-order.png`, `mobile-admin-order.png` | Administrator quote authoring with an unsaved synthetic scope draft. Price/currency and delivery fields align in desktop columns and stack on phone. Long agreement guidance, multiline fields, optional line-item explanation and actions remain legible. The card preserves useful input width despite its semantic fieldset. |
| `desktop-booster-order.png`, `mobile-booster-order.png` | Booster progress with an unsaved synthetic update. Customer-visible audience/privacy help, progress range, status/readiness and grouped save/completion actions remain clear. Phone actions wrap without clipping or collision. |

The built-portal interaction suite is reported passed by the implementing agent after correcting an obsolete expected booster heading to the existing `Your work overview`. The reviewer inspected the relevant harness source: it checks no horizontal overflow, native-select touch height, recovery focus, inert background, Escape/close focus return and draft retention. The stale-heading failure remains a retained harness failure, not a product defect. These supplied checks supplement the reviewer's own live keyboard, validation and protected-dialog checks from rounds 1–3; the screenshots alone do not establish those interactions. No verification code, quote or progress update was sent.

Round 4 verdict: **PASS — no remaining actionable findings in the defined presentation scope.** UX169-01 and UX169-02 are both verified resolved, and the representative built-portal evidence closes the prior evidence gap.

### Coverage and limits

Every identified public/customer/administrator/booster form family received the clean-source review recorded above. Rendered coverage is representative of affected shared controls and styles, as required by the design-change gate; it is not a claim that every route, error permutation, role transition or persisted backend journey was exercised. Product coverage includes fixed package, custom service, account detail/purchase review, manual shop and the three supplier delivery methods. Shared game boundaries and FAQ disclosures were checked at desktop, tablet and phone widths, including 320px. Forms were checked in actual application-component fixtures and the three built portal shells. Prior incomplete fixtures, locator/navigation failures and the stale-heading harness failure remain recorded.

This design pass covers the reviewed clean base plus UX169-owned presentation changes, not the other person's protected in-progress files. It does not qualify real supplier purchases, payment, publication, account recovery, mail delivery or production data mutation, and does not resume the paused UX165 cross-role audit. No repository test suite, deployment or production action was run by this reviewer. The implementing agent owns proportionate automated checks and release qualification.

## Final verdict

**PASS — no remaining actionable findings in the defined UX169 presentation scope.** All actionable findings are resolved and the required representative rendered evidence is present. This is a scoped independent design review, not a guarantee that no undiscovered issue exists.
