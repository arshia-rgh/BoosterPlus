# MINIMUM176 scoped design gate

Independent senior designer: `/root/minimum176_design`.

## Decisions

Use readable full-width radio rows for each approved asset/network, with a compact secondary reason for disabled options. Keep the agreed price above the group, green selection and champagne availability notes. Loading disables selection; unavailable and below-minimum states have distinct concise wording. All-disabled offers Check again and order support. Do not suggest changing prices, arbitrary fees or wallets. Clearing an invalid selection also clears consent without automatically choosing another network or moving focus during background refresh. Retain the legal/payment/safety disclosures and existing attempt UI.

## Rendered review

Round 1 reviewed actual server-rendered mixed/all-below/loading/error/stale screenshots at 390 and 1440 px. Layout, contrast and hierarchy passed; two changes were required: neutral selection-loss wording when no alternative exists, and realistic all-below fixture thresholds. The designer also recommended disabling policy consent until an eligible network is selected. All three changes were made.

Round 2 inspected `shots-r2/all-below-{390,1440}.png`, `selected-error-{390,1440}.png` and `loading.png`, and the changed source. The neutral notice, coherent USD50 versus55/60 minimums, disabled/cleared consent, readable disabled reasons, mobile wrapping and retry/support actions passed. Independent source/image review does not itself claim execution of financial or browser tests.

## Final verdict

**PASS**, round 2, no remaining scoped UI/UX issues. Private evidence under `.cache/minimum176/shots-r1/` and `shots-r2/`. Twelve focused server fixture browser cases independently passed, including shared custom/package/account/shop eligibility, axe on healthy selection, no horizontal overflow and selection invalidation after an unavailable refresh.

## Final implementation delta

The strict lint pass required pure render-time clock handling and moving selection invalidation out of a synchronous effect. No wording/layout changed. The designer inspected final source plus `shots-r3/selected-error-390.png` and `all-below-390.png`; **PASS**, no new scoped issue. Selection and consent are cleared before invalid choices are displayed. Scope5 independently reran and passed types, strict lint,28 component and12 fixture browser cases.

## Expanded 30-route review

The independent designer reviewed the expanded checkout and staff route picker only. Round 1 inspected actual `shots-r9/{thirty,filtered,thirty-disabled,policy,policy-selected}-{390,1440}.png` renders and the changed source. The grouped, searchable bounded chooser, readable disabled reasons, explicit radio selection, persistent selection summary, canonical staff checkboxes and separately preserved legacy entries were accepted. Three corrections were required: readable canonical coin/network wording in the payment warning; explicit networks in selection summaries and seller route choices, including old short labels; and matching policy selections by both asset code and network so a conflicting legacy entry cannot appear selected as a different canonical route.

Round 2 inspected all ten actual `shots-r11/{thirty,filtered,policy,policy-collision,policy-selected}-{390,1440}.png` images and the final source in `payment-choices.tsx`, `checkout.tsx`, `policy-routes.tsx`, `routes.ts`, `workspace.css`, `policy-editor.tsx` and `resale/seller-route.tsx`. The warning reads “Use BTC on Bitcoin only”; the selected route remains visible with its network when search hides its row. The same-code legacy collision is unchecked and disabled with “Review the saved option below”; exact saved values remain visible and removal is explicit. The source also guards the change handler against a collision or selection-cap violation. Search, selected-only filtering, mobile wrapping, readable green/champagne states and the named keyboard-focusable scroll region have no remaining scoped design issue. The isolated policy fixture's raw outer fieldset is not the production parent layout.

**PASS — expanded 30-route review**. This verdict records independently observed screenshots and source review, not an independent execution of the implementation agent's component/browser tests or verification of financial/provider behavior. The reported 16 server browser cases are separate qualification evidence; the corrected disabled-input component test and two affected admin browser cases were being rerun by the implementation agent. No local tests, live actions, publication, messages, invoices or funds operations were performed by this reviewer.
