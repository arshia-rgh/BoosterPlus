# Service144 independent admin manual review

> Historical r11 observations follow. The senior reviewer adjudicated these findings and verified their fixes on later frozen candidates. All actionable findings from this report are closed; see [the final broad adjudication](SERVICE144_BROAD_ADJUDICATION.md). Original failure evidence and coverage limits below are preserved.

Date: 12 October 2026 (Asia/Tehran). Reviewer: `/root/service144_admin_manual`, separate from the implementing agent and senior design adjudicator.

**Historical r11 result: one actionable finding, A01, generic catalog save failures outside the viewport.** The completed synthetic journeys below otherwise have no new actionable finding in the inspected states. This is not a complete release, security, persistence, production or all-scenarios pass.

## Exact candidate and method

- Frozen frontend: `.cache/flow-review141/snapshots/service144-r11`, snapshot manifest SHA256 `a1b8e3eb1ab2c19aa649c416f4ecbfd636ace56e81695bae22ace815d59a9010`.
- Parent full1 candidate manifest: `3213df383932993df3a44ec4cc86027dab77bfbe653746474086c80ab1903377`. The parent reported that the initial full1 early-unit precheck failed; this review does not relabel it passed.
- Independent instance/dataset: `service144-admin-manual1`; admin origin `http://admin.playora.localhost:65269`. The reviewer copied review12 data, then changed only this independent dataset and its private helpers/evidence.
- Actual rendered UI was exercised with Playwright clicks, form input, selections, file choices, keyboard Enter/Tab, navigation and submissions. JSON mutations require exact synthetic bodies. Browser external requests are denied. Local binary fixtures assert the exact path, method and (where supplied by Chromium) upload SHA256 and size. Unknown requests return501 and are retained as fixture gaps.
- Chromium1440×1000 and390×844; WebKit320×844. Selected forms also used200% root text size. This is desktop browser emulation, not a physical-device or screen-reader claim.
- Screenshots, DOM/focus/viewport observations, traces, fixture snapshots and request journals are private at `.cache/flow-review141/evidence/service144-admin-manual1/`. Representative failure, validation, modal, chat, gallery, cosmetics and narrow/zoom screenshots were visually inspected.
- No application source, production data/configuration, Git state, real account, message, invoice, publication, payment or funds movement was changed by this reviewer.

## A01 — medium: failed catalog saves can look like no action happened

Reproduction against r11:

1. Open Catalog → a synthetic game → Price estimation at WebKit320×844.
2. Open the custom service's pricing editor and edit the ordinary-currency base price to11.25.
3. Focus **Save changes** and press Enter. The exact request receives a synthetic503 `unavailable` response.
4. Wait750ms.

Actual: the edited value survives and the button is available again, but focus falls to `BODY`. The only error is rendered above the editor header. The alert's measured rectangle is y−546.97 to−523.23 while the visible viewport is0–844, at scrollY967. The current viewport still presents **Unsaved draft changes / Save changes**, without a visible failure or local retry explanation. A pointer-based run produced the same problem. This makes failure easy to miss on a long form.

Expected: reveal/focus a compact failure notice or appropriate retry control once a current save fails without field issues. Preserve the draft and restore a useful editing/retry position; retain existing precise field-error focus and avoid stealing focus for unrelated background work.

Relevant source: `frontend/app/catalog/admin.tsx`, catch handler around line319 and the general `ErrorNotice` around line357. Exact evidence:

- `manual-focus-measurements.json`
- `manual-focus-webkit-320-keyboard-save-error-viewport.png`
- `manual-pricing-webkit-320-save-failure-retains-draft-viewport.png`
- `manual-pricing-chromium-1440-save-failure-retains-draft-viewport.png`
- Helpers `service144-admin-manual-focus.mjs` and `service144-admin-manual-pricing.mjs`.

No correction has been reviewed yet. Senior design adjudication and a changed-build recheck are required before closing this finding.

## Completed rendered checks

| Area | Actual actions and observations | Limits |
| --- | --- | --- |
| Linked choice authoring | Edit role→hero mapping, switch parent, search children; remove the last server mapping and submit an exact422 response. The **Mapping coverage** group receives focus and its error is visible. Correct mapping and continue editing. Chromium390/WebKit320. | UI response handling; backend rule enforcement is separate. |
| Unicode values and delivery requests | Set the server label and option key to the same Persian/Unicode text through **Use label as option key**; add the delivery-hours template; duplicate insertion is disabled; values survive switching editor sections.200% text does not create document overflow. | Did not publish a live catalog or guess real game mapping data. |
| Keyboard value-copy check | After activating **Use label as option key** by Enter, the disabled button causes activeElement to becomeBODY, but the next Tab correctly proceeds to adjacent **Move down**. | Investigated and not raised as a defect; no navigation restart was observed. |
| Pricing | Ordinary10.00 base/expected inputs; exact synthetic matching preview. Change base to11.25, see stale-result notice, rerun and see mismatch while independently entered expected10.00 remains unchanged. Failed save retains11.25. Chromium1440/WebKit320 including200% text. | Preview arithmetic is supplied by the exact fixture, not a substitute for real evaluator/integration tests. A01 remains open for generic save failure. |
| Fixed offers | Start with a legacy unclassified offer; **Define fixed contents**, set Region/Role fixed, Server customer delivery, Heroes excluded, ordinary price39.90. Exact save succeeds. Submit reversed48–24 delivery hours; precise maximum-hours field receives visible error/focus. Chromium390/WebKit320,200% text. | Customer purchase and capacity/concurrency are outside this admin pass. |
| Catalog publication | Publish disabled before saved preview; valid preview enables it. Synthetic recent-auth requirement opens local modal. One valid synthetic authenticator resumes the exact publish action and displays **Catalog published.** | No real publication or second-factor verification occurred. The generic modal title is currently **Update this game catalog**; this remains understandable in its page context. |
| News cover and image rows | Cover upload guidance discoverable. Insert a gallery between paragraphs, add four images, prevent a fifth, reorder/remove while descriptions stay with their images, move the row down/up with focus retained. Chromium390/WebKit320,200% text. | This independent pass did not save/publish a complete article; scoped SE06 prior evidence remains separate. |
| News upload boundary and retry |4MiB+1 rejected before upload. Chromium exact4MiB upload receives503, exposes recovery, retries same local payload, prepares preview and applies image; focus returns to the upload input. | Synthetic binary processing only. WebKit Playwright returnednull for the PUT body, so exact-boundary processing is not claimed there; its client oversize rejection/composition were separately completed. |
| Listing cover | Publication preview prerequisite is respected. Missing cover focuses title-image selector. Choose image2, request a private preview, reorder it while preserving cover identity, remove it and require a new cover. Focus stays on the surviving image group. Chromium390/WebKit320 and200% text. | No public listing was created. |
| Private listing preview | With saved selected cover, load private image grants, see the selected image as title/first gallery item, select screenshot2, and load actual local pixels. WebKit320. | Exact local grant fixtures; real authorization, expiry and storage remain separate scoped tests. |
| Seller cosmetics in admin | Submission details show `Collector: 2 · Aldous, Yu Zhong; Epic: 1 · Chou`, retain order/submission context and reflow at WebKit320/200% text. | Seller input authoring is owned by the customer/seller reviewer. |
| Order workspace | Navigate Request & decisions, Quote & agreement, Fulfillment, Messages & proof, Payment & cases and Activity. URL/record identity stays on the same order and each section renders in its local workspace. Chromium1440/WebKit320. | Read-only states and synthetic messages/history. No new quote, assignment, case or refund was submitted in this pass. |
| Support | Public reply and internal-note drafts survive audience switching separately. Exact internal-note503 retains and locks the uncertain draft, focuses **Retry same message**, and explains duplicate-safe recovery. Chromium1440/WebKit320. | No real message. Successful final resend, scanner proof and live stream recovery were not repeated here. |
| Staff access | Required email error focuses the field. Synthetic Booster workspace provisioning succeeds with explicit **No invitation email was sent** feedback and the correct Pro sign-in destination. Independent identity/authenticator instructions are visible. | No real staff invitation/account/email. Duplicate-email, role/suspension and live sign-in remain separate coverage. |
| Protected action modal | Recovery-code action opens locally; input receives focus; invalid code produces local feedback; Cancel returns focus and preserves acknowledgement. One accepted authenticator resumes action and focuses synthetic recovery-code heading. Chromium1440/WebKit320. | This pass covers authenticator branch; email alternative and actual authentication are not certified. |
| Finance policy editor | Empty title error focuses the field; corrected unsaved title survives Payments→Payment policy section changes. Chromium1440/WebKit320 and200% text. | No policy save/publication, payout/refund or live-provider action. |

## Journey mapping and honest gaps

| Existing journey IDs | This review's coverage |
| --- | --- |
| F01, F02, F14 | Admin configuration, pricing, fixed-offer definitions and publication UI as above; customer order lifecycle belongs to other reviewers and automated tests. |
| F03, F06, F07 | Admin listing cover/private preview and seller details only. Offer negotiation, acquisition, secure delivery and payout execution not repeated. |
| F04, F05, F17 | Admin payment/case state viewing and policy editor recovery only. Provider transitions, disputes/appeals/refunds/payouts not manually executed. |
| F09, F10, F22, F31 | Admin local recovery/MFA modal and synthetic staff provisioning. Real Google/email/MFA, sessions/recovery governance and Pro entry are not covered by this admin pass. |
| F11, F16 | Staff chat audience separation and uncertain-send recovery; no real delivery or successful duplicate-safe resend. |
| F12, F15 | Order workspace sections and fulfillment/quote read states; no assignment/completion/quote mutation. |
| F13, F18–F21, F23–F24 | No new independent complete execution. Catalog publication intersects F23, but coupon publication, calendars, reports, notifications, reviews, privacy and jobs are not certified here. Prior evidence is not promoted into this run. |
| F25 | Current catalog validation/save error, editor retention, chat uncertainty and protected-modal recovery branches. Not an exhaustive global recovery review. |
| F26–F30 | Generic configuration supports these game templates; each game's real mapping/content was not manually authored or published. |
| SN01–SN06 / current addenda | News cover/gallery/upload editing and general admin order-view context; this review does not independently certify all shop/news lifecycles. Customer/admin/pro independent-account boundaries are synthetic UI observations only. |

No reviewer can establish “all possible flows” from these fixtures. Concurrency, backend policy enforcement, ownership, persistence, security scans, real TiKV, supplier/provider/email behavior, physical devices and assistive technology require their appropriate separate evidence.

## Fixture corrections and failed attempts retained

Earlier interrupted attempts remain in the private evidence and are not passes:

- Initial probe used a nonexistent `/catalog/games/:id` page URL; corrected to the actual catalog query route.
- A helper assumed an obsolete direct-child accordion selector, omitted `(required)` from a fixed-value label and used an old option-copy button label. Corrected helpers used rendered labels/structure.
- A mapping fixture retained an empty row, whereas the UI removes that row; exact-body409 correctly exposed the fixture mismatch. Corrected exact fixture subsequently returned the intended422 and focus passed.
- Initial order/chat fixtures lacked current query variants, read acknowledgement and open-chat state. They produced501 and disabled chat. Explicit routes/body fixtures were added to the private dataset, then both engines completed the later run. Those early requests are not product defects.
- The first listing helper attempted Publish before **Show listing preview**. The disabled prerequisite was correct; corrected runs followed the actual workflow.
- WebKit's synthetic binary interception lacked request bytes; its unfinished upload is explicitly excluded above.
- The first publication helper expected **Publish catalog** in the dialog; its actual title is **Update this game catalog**. Corrected exact UI expectation completed the synthetic resume.

The shared frozen frontend and production were never modified. Private helper prefixes are `service144-admin-manual-*`; completed evidence prefixes include `manual-catalog-actions-r3-*`, `manual-pricing-*`, `manual-package-r2-*`, `manual-news-*`, `manual-news-r2-*`, `manual-panels-r3-*`, `manual-listing-r2-*`, `manual-private-*`, `manual-keyboard-*` and `manual-publication-r2-*`.
