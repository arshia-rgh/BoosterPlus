# UX165 customer 4 — account buyer review

16 October 2026. Independent customer agent `ux165_customer_4`. **First pass complete; cross-role account purchase/delivery awaits the seller and administrator handoff. This is not complete transaction qualification.**

## Environment and method

Current built application and actual isolated API/database, accessed through `playora.localhost:4173`; synthetic identity `desktop_resalebuyer`. Normal email UI sign-in used the isolated Mailpit code, with session reuse after that. No production data, external provider navigation, real email, real invoice or funds movement. No frontend response mocks were used in this first pass. Local synthetic catalog: `ux165-custom`.

Chromium desktop 1440 × 1000, mobile 390 × 844, and account filters/error recovery at 320 × 640. Retained screenshots, body text, viewport measurements and Playwright traces under `.cache/ux165/customer4/` and `.cache/ux165/engineering/evidence/customer4-*`. Private session is retained only for the follow-up buyer handoff. Source code was consulted after observing the filter-validation behavior; navigation interactions before that used rendered labels. The incorrect scripted assumption that the game choice was a link rather than a button is retained as a tester locator failure, not a product finding.

Initial buyer impression: account purchase, selling and game services are distinguishable; the buyer fee/delivery claim needs to be assessed on a real published synthetic listing rather than inferred from the marketplace introduction. The account marketplace was empty during this first pass. Disabled shop and empty article/review lists were explained without fabricating products or public reviews.

## Confirmed finding

**C4-01 · P2 · Observed and source-confirmed: account-marketplace filter errors are transient browser validity messages, not persistent inline feedback.**

- Task: C14 / X validation. Desktop `/accounts`, repeatable by entering `-1` in Maximum price and pressing Apply account filters. Focus moves to the invalid input, but the rendered page contains no persistent error underneath it. The control has only the generic “Optional · up to two decimal places” description and no `aria-invalid` or linked error description. Once the browser validity bubble is dismissed, there is no clear correction message. Missing currency for price sorting/filtering follows the same source path.
- Evidence: `market-invalid-price.png`, `market-invalid-price.txt`, `common-actions2.json`. Source: `frontend/app/resale/market-filters.tsx` uses `setCustomValidity` and `reportValidity` without rendered field errors.
- Proposed correction: adopt the shared inline validation pattern for maximum price and listing currency, keep safe input values and first-invalid focus, and retain the mobile filter dialog until correction succeeds. Do not silently drop invalid filters or change price semantics.
- Required recheck: negative/overprecision price, missing/invalid currency, valid correction, changing sort, 320 px dialog, keyboard focus and current saved filters.

## Attempt ledger

Each row states actual scope, not a blanket pass of every branch.

| Family | First-pass attempt and result | Remaining work |
| --- | --- | --- |
| C01 discovery | Home, games, synthetic game hub, service cards, boosting selection, FAQ open and game favorites observed. Game context retained. | Homepage keyboard five-item traversal and additional unavailable games. |
| C02 authentication | Normal customer email + consent + code succeeded and returned to Account. Session reused. | Wrong/expired code, resend timing, Google cancellation and draft-return branches; no real Google delivery claim. |
| C03 recovery/security | Customer security, sessions and recovery pages visited; optional MFA is clearly described on security page. | Recovery request/MFA/modal branches not submitted in this pass. |
| C04 custom boost | Boost service and configured custom entry discovered. | Actual preference validation, estimate and custom order branches remain pending common-family follow-up; specialist C1 evidence does not replace C4 execution. |
| C05 fixed package | Fixed offers show fixed scope, price and delivery conditions; package detail visited in the handoff script. | Acceptance/order creation and changed availability. |
| C06 quote | Empty own order history inspected. | No quote yet; accepted/revised/expired quote states not executed. |
| C07 checkout | No invoice created in this pass. | Will exercise actual synthetic account invoice and signed provider-fixture confirmation after listing publication. |
| C08 orders | Empty order list/filter controls and inaccessible-order recovery visited. Wrong order showed access-changed recovery and focused its heading. | Own order tabs/status/Back/refresh after purchase. |
| C09 support/forms | Opened New conversation; empty subject produced persistent inline error and first-field focus. Created synthetic pre-sales conversation for buyer questions and sent an ordinary synthetic question. | Admin reply, attachment, requested ordinary/protected form and retry branches. |
| C10 case/refund | No paid own order in first pass. | Buyer protection/dispute/appeal and refund progress require paid delivered synthetic order. |
| C11 seller intake | Seller list, new submission, game choice and private-title draft entry visited. UI states details remain private. | Upload, title validation, submit and correction; primary seller handoff belongs to C3. |
| C12 seller terms | Seller list filters expose agreement states. | C4 has no own seller offer; common-family follow-up still required. |
| C13 seller payout | Not executed; no accepted seller offer/eligible payout on this identity. | Explicitly pending, not passed by source reading. |
| C14 account marketplace | Desktop/390/320 marketplace, empty listings, invalid price, filter dialog Escape and focus return. C4-01 found. | C3 listing, base+5% fee, gallery, filtered Back state, reserve and unavailable conflict. |
| C15 buyer delivery | No purchased listing yet. | Same cross-role order: protected delivery, unpaid denial, inspection and case. |
| C16 shop | Game shop unavailable branch and nonexistent product inspected, preserving game context. | Published product, recipient fields, stock and manual fulfillment need a synthetic product. |
| C17 news | Empty game news and nonexistent article inspected. | Published article, images, filters and correction need synthetic content. |
| C18 favorites/alerts | Saved game favorite through actual UI; favorites, availability and notifications pages visited; missing-token unsubscribe showed expired/used-link explanation. | Alert create/remove, notification target and reorder states. |
| C19 reviews | Empty own/public reviews and nonexistent review visited; unavailable review had a return-to-list action. | Eligible completed order, review validation/moderation. |
| C20 account/privacy/contact | Account, settings, security, sessions, recovery, preferences, privacy, terms, how-it-works and signed-out contact visited. Disabled deletion truthfully reported; export category choices present. | Profile/preferences save, export verification, sign-out and revoked-session branches. |

## Responsive and error observations

The first route sweep captured 27 desktop destinations and six 390 px destinations; none had horizontal document overflow. The 320 px filter dialog fitted the viewport, Escape closed it and returned focus to Filter accounts. Existing nonexistent order/listing/article/product/review and missing unsubscribe-token states provided bounded recovery instead of exposing other users' data. This is not an authorization penetration-test claim and does not certify every error code or physical device.

No new visual defect beyond C4-01 is asserted from the first pass. Some descriptions are long, but that alone is not an actionable finding without a failed task. The common family checklist contains substantial transaction branches still pending; they must not be relabeled passed from visits, source inspection or another persona's tests.

## Cross-role handoff

Synthetic buyer support conversation: `01a141d0-ad8d-7119-87b2-bc56594aa951` (local environment only). Buyer session saved privately in `.cache/ux165/customer4/session.json`. Await C3/admin listing ID; resume with the same buyer identity. Automatic outgoing payments and customer deletion remain disabled. Any simulated payment uses only the existing isolated provider and signed synthetic webhook, never a live NOWPayments request.

Coordinator update: C4-01 has a source correction and focused regressions. **Not independently closed yet**: the running first-pass build is unchanged; retest the final built source and mobile filter dialog during the follow-up.

## Candidate 1 follow-up and actual buyer payment

Used the corrected candidate helper with the same normal customer session and actual isolated database.

**C4-01 independently closed for the observed defect.** At320px, negative and three-decimal prices now show persistent inline errors with `aria-invalid` and the linked description. Errors survive moving focus. Missing currency and invalid two-letter currency have distinct correction messages. Correcting toUSD/105 applies `max_minor=10500`, closes the filter dialog and retains values; Escape restores trigger focus. `candidate-filter-results.json` records each branch. Profile display-name and order-email-preference changes also survived reload.

**C4-02 · P3 · observed catalog-copy drift.** Custom request stage2 Additional instructions says access uses “the dedicated secure handoff after payment”, whereas the shipped flow uses staff-requested protected chat forms. The current synthetic catalog inherited the wording from `frontend/tests/fixtures/mlbb-catalog/configuration.json` and `docs/catalog/MLBB_PREPARED_DRAFT.json`. Coordinator will update current reference/fixture copy only; this is not permission to silently rewrite published/history catalogs. Evidence `custom-step2.txt/png`.

Actual cross-role sequence:

1. C3/admin published listing `3a03b89e-8cbd-4cb8-94e3-fcc45485c922`. C4 browsed its game Accounts service, opened the detail/gallery, checked image-dialog Escape/focus return and saved a favorite.
2. Detail and review both displayed **USD100 base + USD5 buyer fee = USD105 total**. Delivery and inspection/protection terms were visible. The reservation button was disabled until exact terms were checked. A scripted attempt to click that disabled button timed out; this is preserved as a correctly enforced guard, not a defect. The corrected script asserted disabled state instead.
3. Reserved the account normally, creating order **`3e7d5cb3-ec3a-4181-8cf0-25fb44e00fb5`**. Overview/Messages/Delivery/Payment/Help retained the order context at390px. Unpaid delivery showed payment-required status and no account access.
4. Selected the synthetic USDTTRC20/trx route, accepted policy and created one **local provider-fixture invoice**. The intended provider URL was intercepted and fulfilled locally before any external network request. Returned to the order without payment: still unpaid, with the Go to payment link and no receipt.
5. Submitted the existing fixture's signed synthetic webhook to the actual isolated API. Its real inbox/worker/allocation path changed the order to queued and displayed Payment verified / USD105 allocated. No live invoice, money or provider API was used. `payment-evidence.json`, `checkout-*.png/.txt`, `checkout-results.json` retain evidence.
6. Admin was notified and is requesting C3's protected access. Buyer inspection/dispute awaits that handoff. Do not open a case before recording the ordinary delivery/inspection payout-blocker state.

Expanded common-family work:

- Custom form: missing fields showed individual errors; server-first Philippines selected Southeast Asia; Gold lane narrowed heroes to21 matching choices; EpicV→LegendV produced provisionalUSD17.50. Reached separate stage2 and submitted actual unpaid custom request **`21f5771d-b08d-4a88-b381-583eb0160329`**. No charge or quote acceptance implied. Optional scheduling fields differ from the fixed offer's required delivery fields; the original locator assumption is retained as tester error.
- Fixed package: six fixed included fields and four customer delivery details; validation, linked location, explicitUSD18 consent and actual order creation **`2ebc01f3-b28e-4e9f-86e2-6648eaaec7a2`**. Expanded Cancel this unpaid order, cancelled it, reloaded and saw cancelled state/retired contract and fresh-reorder guidance. No invoice was created for it.
- Privacy export: correct one-factor customer verification modal opened. Initial helper selected an older sign-in code before the new message arrived, producing400. A retry correctly encountered the120-second request cooldown with visible countdown and retry timestamp. This is **harness failure / intentional rate protection**, not a demonstrated application bug. Export completion remains pending; no limits were changed and no bypass attempted. Bind future code polling to a new Mailpit messageID before request.
- Existing synthetic shop list/product and published news guide were visited at390px. Manual staff delivery and no-wallet language remained clear. The game's intentionally paused Shop state was not changed. Private seller-submission access, article reading and populated favorites screenshots are retained in `shop-news-*` evidence.

No new overflow was observed in the added candidate views. Current screenshots use synthetic artwork, so that artwork's aesthetics are not a product-design finding. This second wave still does not qualify every customer family branch; the original pending rows remain pending unless specifically completed above.

## 18 October continuation — C4 buyer handoff and independent passport

Continuation agent `ux165_customer_4_r3`. The original persisted October 16 evidence above is retained. After the old local fixture's process/key lifecycle ended, the root created a fresh isolated **r3** environment. Admin replayed prerequisite catalog, seller agreement, reservation and fixture-payment setup through authenticated local APIs; that setup is **not counted as C4 repeating the UI purchase**. This continuation used the root-owned real API and database at port 4173, candidate 4 frontend/candidate 2 backend, normal synthetic buyer session, Mailpit and protected local fixtures. No production action, real provider request, live email or money transfer occurred. The completed purchase UI remains evidenced by the earlier pass.

Private continuation evidence is `.cache/ux165/customer4/r3/`; traces are in `.cache/ux165/engineering/evidence/customer4-r3-*`. Chromium 390 × 844 and 320 × 720 were used for this continuation. The generic WebKit coverage elsewhere belongs to its owning reviewers, not C4.

### Actual cross-role result

- C3 and admin delivered protected access for paid buyer order `f3967bd8-e5bc-43dd-8427-6c44a17af105`. C4 followed **Delivery → View account access in chat → View form**. Both credential fields started hidden. The normally signed-in buyer's current verification satisfied reveal without a new challenge; do not describe that as a new OTP challenge. Reveal displayed two invented protected values; Hide details returned focus, Escape returned to View form, and reload retained masking. Values were not copied into this report or ordinary messages.
- Receipt acknowledgment required the checkbox and a 10–4,000-character ordinary note. A blank note showed persistent inline feedback. A synthetic inspection acknowledgment persisted across reload, removed the repeated acknowledgment action and retained the initial inspection deadline **25 October** plus continuing refund/support rights. This is inspection of invented account information, not an actual game login.
- Only after ordinary acknowledgment and the seller's unchanged inspection-hold evidence were recorded, C4 opened a separate synthetic dispute `e7433a28-dfaa-4071-9f4e-03696b714bc6`. Empty case/reply text showed inline errors and useful focus. Opening and replying persisted; a second open-case action disappeared. The case remained open awaiting staff; no refund or payout was sent.
- Following that active case, protected reveal correctly became unavailable. The remaining next-action clarity problem is **C4-03** below; the security hold itself was not bypassed or weakened.
- A completed-purchase review `b4d380e0-4fb3-4d44-90b5-84eae76c7d87` was submitted with synthetic 3/5 feedback. Missing rating/body/consent showed inline errors and focus on the rating. Pending moderation, reload and editing preserved the customer's text. No review was published.
- Profile, forms and receipt privacy exports downloaded as the correctly named JSON files through the actual API. Each contained one scoped record and no next page. Authentication-secret keys were absent. The form had two protected field definitions but **neither protected answer key appeared in exported answers**. Deletion remained disabled. The already recent session satisfied this export without a fresh challenge; separate sign-in checks below use new-mail-ID-bound polling.

### New scoped finding

**C4-03 · P2 · Post-delivery service-review hold lacks a useful access explanation.**

Reproduction: paid account delivery → acknowledge → open service case → return to Delivery → View account access in chat. Delivery continued to say receipt was confirmed and offered the access link. The form correctly withheld reveal, but said only “Protected details are unavailable until delivery and access requirements are met.” The customer could not tell from this destination that the **active service review** caused the hold, even though Help displayed the open case. Evidence: `held-delivery.txt/png`, `held-form.txt/png`, `case-open.txt/png`, `case-reloaded.txt/png`. No unauthorized disclosure was observed.

Root reports an authoritative `active_case` delivery flag, explicit guidance/Help link, refresh on section return and clearer buyer-form copy implemented, with focused tests passing. **C4 has not rechecked that later candidate**: r3 remains frozen. Final candidate 6 rendered review is assigned separately; do not mark C4's original observation closed solely from source review.

### C4 independent family ledger

“Persisted” below means C4 actually interacted with the isolated API/database in this or the prior pass. “Rendered fixture” means an explicit synthetic response was supplied to the unchanged built UI; it is not a backend transition. Every family has an attempted interaction. This finite passport does not assert every combinatorial state or physical-device flow passed.

| Family | C4 action and evidence | Result / remaining limit |
| --- | --- | --- |
| C01 discovery | Prior game/service/FAQ/favorite navigation; r3 five-service keyboard traversal, wrap, Home/End, Previous/Next (`auth-home-results.json`). | Observed controls and context worked. Other unpublished-game branches remain bounded by prior route checks. |
| C02 authentication | Blank email error, consent, fresh Mailpit message-ID polling, deliberately wrong OTP, correct OTP, intended Orders return, disabled resend countdown; customer cookie did not grant admin access. | Persisted sign-in passed. Real Google, actual mail delivery, full 120-second expiry/resend and all suspension branches are not claimed. |
| C03 recovery/security | Lost-email modal opened at 390 px; conditional optional-customer-MFA text, draft persistence, Escape/focus return; customer recovery/security/session destinations inspected. | Modal checks passed. No owner-reviewed recovery, new authenticator enrollment or destructive session revocation submitted by C4. |
| C04 custom boost | Prior actual dependent region/server and lane/hero selections, missing-field feedback, EpicV→LegendV estimate 17.50 and submitted unpaid custom request. | Persisted earlier pass retained. C4 did not repeat every WR/rank/coupon boundary; specialist evidence is separate. |
| C05 fixed package | Prior fixed six-field scope/four delivery inputs,18 USD consent, actual order creation and unpaid cancellation/reload. | Persisted earlier pass retained; no silent custom scope. All stock races are not independently covered. |
| C06 quote | New independent exact-response mock: original 17.50 estimate versus reviewed 21.84 quote, consent enables acceptance; expired quote disables it and directs support. | Rendered fixture passed, no quote decision persisted. `mock-quote-consent`, `mock-quote-expired`, `mock-passport-results.json`. |
| C07 checkout | Prior actual 105 USD account invoice against isolated provider; hosted URL intercepted, unpaid return stayed unpaid, signed fixture webhook/real allocation reached paid. | Persisted local provider chain, not real NOWPayments acceptance, settlement, fees or every exception state. |
| C08 order workspace | Paid order tabs, Delivery/Messages/Help navigation, acknowledgment/reload, completed state and active case remain inside the same identified order. | Persisted context passed. C4does not claim another persona's co-play/booster progression. |
| C09 support/forms | Prior ordinary presales conversation and required subject; r3recipient-only delivered form reveal/mask/Escape/reload, active-case denial. | Persisted controls passed; C4-03 clarity correction pending final recheck. Protected values excluded from reports. |
| C10 remedy | Actual acknowledgment precedes separate dispute; missing case/reply text, open/reply/reload and duplicate-case suppression. | Persisted case pending staff decision. C4 did not claim a resolved appeal/refund or real outgoing transfer. |
| C11 seller intake | Own r3draft `cf259236-1e97-4dd4-9c8f-6ed1d38f81e5`: missing title validation, normal draft creation, missing required details/authority prevented submit with inline guidance. | Draft intentionally private/unsubmitted. C4 did not repeat C3's scanner/image boundary journey. |
| C12 seller terms | Independent rendered fixture shows 100 base / 10 seller fee / 90 net, route and consignment timing. Decision note and explicit consent required before buttons enable. | Read/decision guards observed; no actual C4seller offer accepted. `mock-seller-terms`. |
| C13 seller payout | Independent consistent accepted/sold fixture renders 90 USDT net, destination, transaction hash/date, staff-recorded external-transfer caveat and support route. No wallet or staff transfer control. | **Rendered confirmed-receipt fixture only**. No real inspection hold accelerated or transfer recorded. `mock-payout-results.json`; 320 px no overflow. |
| C14 marketplace | Prior real listing/gallery,5% buyer fee,105 total, consent/reservation; C4-01 invalid price/currency correction and mobile dialog independently rechecked. | C4-01 closed for observed negative/precision/currency focus cases. Reservation concurrency remains separately owned evidence. |
| C15 account delivery | Actual r3protected delivery, masking, acknowledgment, inspection deadline, subsequent service-case access denial. | Passed ordinary delivery; C4-03 clarity finding remains explicitly tracked for final review. |
| C16 shop | Prior unavailable/published product reading; r3actual product options,12.34 price, manual delivery/direct payment text and recipient step attempted. | Missing recipient fields blocked review with persistent inline errors; 320 px had no page overflow. No C4 shop invoice or fulfillment was fabricated; C2 owns the persisted shop delivery specialist chain. |
| C17 news | Prior actual published synthetic guide/images reading, empty/not-found branches; r3game news search and clear-filter attempt. | No article publication by C4; Search empty-state and clear-filter button passed after correcting the tester’s link-role assumption. |
| C18 favorites/alerts | Prior actual game/listing favorites; r3notification Mark read, reload, availability refresh; expired/missing unsubscribe token previously explained. | Notification response retained with one persisted `read: true` and three unread records; no availability subscription was created where C4 had no unavailable offer prerequisite. No real alert email. |
| C19 reviews | Actual completed synthetic purchase review validation, 3/5 submission, moderation pending, reload/edit preservation at 320 px. | Persisted own review passed; moderation/publication/appeal belongs to the subsequent admin handoff. |
| C20 profile/privacy/contact | Earlier profile/preferences persisted; r3downloaded profile/forms/receipt categories checked; deletion disabled, terms/contact signed-out navigation retained. | Exact export categories passed, not every pagination category or real erasure/recovery. |

### Harness limits and retained failures

The first Chromium launch failed under the macOS process sandbox; rerun with approved local browser permission worked. An evidence-directory collision, unbounded wrong form-title wait, assumption that an already recent session must show a new verification dialog, exact category-label locator, expected 201 versus actual 200 case success, early assertion before payout loading, and assumed post-case wording were tester/harness failures. They were retained and corrected. **The successful case creation was read back rather than resent**. Initial shop script skipped Options→Recipient and therefore could not find Review purchase; the corrected script follows the visible step order. A notification assertion incorrectly expected an explicit “Read” suffix; actual read state is checked separately. None of those failures is recast as a passed product test or hidden as a backend defect.

The review did not change time to escape inspection, use raw SQL for financial state, reuse ended-fixture keys, send external email/invoices/funds, publish policies/catalogs, or touch production. C4's mock runtime is independent and will be stopped; the root-owned actual r3 runtime remains available to other roles. The existing C4-01 source correction and active fixture-only C4-02 copy correction are retained; historical/live catalogs were not silently edited.

Final continuation checks: `shop-notification-final-results.json` records one persistent invalid recipient control and no 320 px overflow; `notification-data.json` confirms the earlier Mark read persisted; `news-final-results.json` records the search-empty and clear-filter success. The Clear news filters control is a button, not a link; the earlier wrong-role timeout is retained. The C4-only mock server was stopped; the shared root-owned r3 backend was left running.
