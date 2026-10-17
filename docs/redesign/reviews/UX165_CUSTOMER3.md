# UX165 Customer 3 — seller review

16 October 2026. Independent seller agent. **Current handoff: actual seller proposal accepted; listing publication/buyer handoff pending. C3-01 independently verified fixed; protected-form response completed.** This is agent exploratory evidence, not a human usability study or a claim that every possible branch passed.

## Environment and method

- Frozen actual frontend snapshot `ux165-baseline`, manifest `b43bb97f932ea802bdacb2d892502f51da3a60d9fa27566b8a8d9318e7ea0e35`, instance `ux165-customer3b`. Exact synthetic API fixtures; unknown requests fail closed. These results qualify rendering, validation and navigation only.
- Real isolated API/TiDB/mail/provider fixture: synthetic identity `desktop_seller`, customer origin `http://playora.localhost:4173`. Normal email consent, local Mailpit code and intended-page return exercised. No production credentials, invoices, funds, customer data or external mail used.
- Chromium at 390×844 for shared/seller pages, 1440×1000 for discovery. Twenty-one frozen common routes, eight frozen seller routes and nineteen real common routes observed. No horizontal page overflow in those recorded passes. Physical device, real assistive technology and live provider settlement remain untested.
- Evidence in `.cache/ux165/customer3/`; full browser traces in `.cache/ux165/engineering/evidence/ux165-customer3*`. Private synthetic session state is retained for later handoffs; do not publish it.
- Source inspection was used to construct exact fixture responses and resolve locator names. This is assisted exploration, not an unaided human findability score. Two selector mistakes (file label and card accessible name), a local sandbox-listen refusal and an exclusive evidence-directory retry were harness failures, not product failures.

## Confirmed findings

### C3-01 — unrelated submission errors appear inside an image-upload error (P2)

**Observed, frozen actual frontend.** In Account details, click **Save and submit for review** without confirming authority. Select an unsupported `wrong.svg`, then **Upload image**. The upload correctly refuses the file, but below its file-format error it also renders the outer submission's authority error summary. The summary is duplicated in the wrong operation and can imply that confirming authority fixes an unsupported image.

Expected: the image control shows only its upload/attachment outcome; the submission error remains beside its own field and summary. Evidence: `seller-observations.json`, `seller-unsupported.png`, `seller-review.mjs`. Parent implemented scoped ErrorNotice isolation and a regression. **Closed by independent candidate1/real-API retest at320px**, recorded below.

### C3-02 — administrator is told only Owner can prepare the sale proposal (P2)

**Source-confirmed; rendered administrator confirmation pending.** `saleNextStep` uses the owner flag for the pending-proposal actor and label, while `SellerOffers` permits both owner and administrator. This conflicts with the delivered administrator seller-proposal permission. Sent to admin reviewer for rendered confirmation. Parent reports copy/actor correction preserving owner-only payout controls; **not closed until independent rendered check**.

### C3-03 — old seller browser journey describes removed ownership controls (test drift)

**Source-confirmed, not a production defect.** `frontend/tests/e2e/submissions.spec.ts` still names old Start/Create/Submit controls and a required Ownership and control information input. Current flow uses authority declaration, optional notes and Save and submit. Newer selling-flow tests reflect the newer UI, but the stale older journey must not be claimed as current coverage. Forwarded to coordinator/engineer for test maintenance.

## Completed persisted interaction

- Real seller sign-in returned to `/sell/new` as requested. Customer MFA remained optional, long-lived customer session was shown in Sessions.
- Initial `/sell/new` showed no intake-enabled games. This is a fixture precondition, not a discovered defect; admin catalog preparation is pending.
- Created local presales conversation **`01a141ca-3f25-7196-82fc-52c0a2f8b893`**, subject **UX165 Customer3 account sale questions**.
- Empty subject and empty message each produced a specific inline error and moved focus to the invalid control. Sent a synthetic seller question through the UI; reloading showed the persisted message. Admin was asked to reply and issue an ordinary/protected form.
- Evidence: `real-support.json`, `support-handoff.json`, `real-support-sent.png`, `real-start.mjs`, `real-common.json`, `real-services.json`.

## Coverage ledger — current limits explicit

| Family | First-pass observation | Still required |
| --- | --- | --- |
| C01 Discovery | Real home, game chooser and multiple game hubs; all five service tabs selected with matching visible panel at390px; paused/empty fixture states visible | Keyboard follow-up |
| C02 Sign-in | Real email consent/code login and intended seller return | Wrong/expired code, cooldown and Google fixture branches |
| C03 Recovery | Customer settings/security/recovery routes observed; authenticator remains optional | Modal cancellation/submit and recovery code branches; shared C1 finding applies |
| C04 Custom boost | Discoverable from game service; primary customer1 owns depth | Customer3 independent preference/estimate attempt |
| C05 Fixed boost | Featured fixed offer visible in game hubs | Purchase/stock/version branches |
| C06 Quote | No owned custom order yet | Actual request→quote→decision |
| C07 Checkout | No checkout attempted in this first pass | Local provider fixture continuation and return/error states |
| C08 Order workspace | Frozen submitted-order overview with clear no-payment-due and local tabs; real empty order list | Owned paid/progress/reload scenario |
| C09 Chat/forms | **Real** subject validation, conversation creation, message validation/send/reload | Admin reply/form, attachment ready/rejected, retry and wrong-recipient |
| C10 Remedies | Not yet exercised | Cancel/dispute/appeal/refund state |
| C11 Seller intake | Frozen draft, all six local sections, title/authority validation and wrong-format image rejection; real start blocked by intake fixture | Real valid submission, skin groups/linked fields, 4MiB scan flow, draft edit/retry |
| C12 Seller terms | Frozen no-offer message and overview next action; state schema inspected | Real review/clarification, exact proposal accept/decline, listing preparation/publication |
| C13 Seller payout | Frozen empty payout state says no obligation and no wallet | Actual consignment/buy-first timing, destination and manual receipt |
| C14 Marketplace | Real empty marketplace and filter/sell entry observed | Customer3 buyer listing/fee/reservation attempt; Customer4 cross-role purchase |
| C15 Account delivery | Not yet exercised | Protected delivered form/inspection/dispute |
| C16 Shop | Real game shop list and synthetic product/price/region entry observed | Variant/recipient validation/order/manual delivery |
| C17 News | Real game news list/filter and truthful no-articles state observed | Published reader/category/correction/unpublished branches |
| C18 Saved/alerts/activity | Real empty favorites/alerts/notifications; real synthetic game favorite save success shown; final Favorites read occurred before loading completed, so persistence is not claimed | Persisted read/remove/subscription/read/deep-link branches |
| C19 Reviews | Real empty review list explains completed paid eligibility | Eligible feedback and moderation branches |
| C20 Account/privacy/contact | Real profile/preferences/security/sessions/privacy/contact/terms; deletion truthfully disabled; all observed at390px without page overflow | Profile validation/save, export verification, session revoke/sign-out after handoffs |

No complete journey pass is inferred from a route screenshot. The first pass intentionally retains untested branches so later agents/coordination can close them rather than reporting fictitious comprehensive success.

## Usability notes for senior triage

The seller overview gives a clear next actor/action, and local tabs retain account context. At390px the six-tab rail is horizontally scrollable and later tabs are offscreen; inspect keyboard/swipe discoverability in the final design pass rather than classifying it as broken from a static screenshot. Account details are long but grouped into three steps. Review/payout no-offer states explain why money or publication is not ready. Public contact remains accessible without forcing login. Duplicate route/component headings on Sell and Reviews are visible; this is minor hierarchy duplication, not a blocked task.

## Handoff

Resume Customer3 once the admin publishes a synthetic intake-enabled game and/or replies to conversation `01a141ca-3f25-7196-82fc-52c0a2f8b893`. Continue with the existing synthetic session; do not consume another sign-in unnecessarily. Use the actual submission ID for admin and Customer4 handoffs. Retest C3-01 on a fresh build and have the admin/designer confirm C3-02.

## Second pass — real seller intake and protected-form verification

The admin published local game `ux165-custom`. Customer3 created and submitted **`5a06cadf-2bb9-499e-a61c-54216ab37278`**, title **UX165 C3 Mythic Collector account**, through the normal UI. Empty draft title focused its inline error. Missing authority focused the checkbox. After confirming authority, the API returned five required intake fields; the UI showed each error and focused the first field. Filled the configured hero count, highest rank, skin count, collection text and matches. The imported current catalog uses text/count fields, not a cosmetics-group control; group/region dependencies therefore remain untested in this specific configuration rather than falsely passed.

Uploaded the real synthetic `frontend/tests/fixtures/proof.png`: upload, private storage, scanner-ready result and Send screenshots all succeeded. **Save and submit for review** changed the local record to Awaiting review. Reload preserved the state and its screenshot message was visible in Messages & photos. No standalone handover or credential prerequisite appeared. Evidence: `real-seller-step1.json`, `real-seller-step2.json`, `real-seller-submitted.png`, private `seller-handoff.json`. Admin/root received the actual submission ID for the next handoff.

The admin's real reply and requested ordinary/protected form appeared in the presales conversation. The customer saw the public support reply/form and no internal-note message. Missing form answers focused the ordinary required field and showed both inline errors. Entered synthetic ordinary/protected answers and submitted; the application correctly required contextual fresh email verification. The initial automation expected immediate completion and did not handle this modal; the next run's helper fetched the previous sign-in email before delivery of the new one and the code failed safely. A corrected helper now waits for a *new Mailpit message ID*. A following attempt hit the legitimate120-second cooldown, rendered as **Request code in101s** and a retry time of **2026-10-15 23:18:11 UTC**. No rate limit was increased or bypassed. Form remains open/unanswered pending a later normal verification; **no protected reply success or masking pass is claimed yet**. Original traces and failure screenshots are retained, not converted into passes.

Coverage updates: C11 real submit/upload/happy path and required-field errors now observed; C09 real staff reply, requested form and required-answer errors observed, fresh-verification completion pending. C12–C15 await the administrator's actual review/proposal/listing and buyer handoff. Return to this agent after cooldown/catalog handoff; existing customer session stays reusable.

## Third pass — candidate1 acceptance, secure response and fix verification

Used `.cache/ux165/engineering/real-browser-candidate1.mjs`, which preserves the three normal local portal URLs/cookies while routing the changed frontend to port4187. The same isolated backend records were exercised; this is persisted cross-role evidence, not a frozen mock.

### Accepted seller handoff

Reviewed the administrator-created consignment proposal on submission `5a06cadf-2bb9-499e-a61c-54216ab37278`. The display clearly separated **USD100 base**, **10% seller fee / USD10**, **USD90 net**, and **exact90.000000 synthetic USDTTRC20 ontrx**, with the fixture conversion source/time and48-hour initiation target. Short decision note and unchecked exact-terms confirmation correctly kept acceptance unavailable. With the proper note and confirmation, acceptance persisted and the overview identified **PLAYORA** as the next actor to prepare the public listing, without a credential blocker. Payout correctly showed **No seller payout obligation is recorded yet** for this not-yet-sold consignment, so there was no destination field to fill prematurely. Admin/root received the acceptance handoff.

Evidence: `real-accept.json`, `real-proposal.png`, `real-payout-after-accept.png`. The policy text is intentionally complete commercial text, not a recommendation to remove disclosures merely for brevity. All figures are synthetic; no transfer occurred.

### Protected form completion

Completed the presales requested form through the normal customer verification modal, waiting for a **new Mailpit message ID** before using its code. Response survived reload. Ordinary answer displayed in the form; the protected answer displayed **Hidden** immediately after submission and was absent from ordinary chat history. Exact staff-only marker **UX165 internal-only staff note** was absent from the customer thread. Escape closed the form. Earlier harness failures remain preserved; this later actual success closes the blocked response step without changing rate limits.

Evidence: `real-form-final.json`, `real-form-answered.png`, `ux165-customer3-real-form-final` trace. Admin was notified to inspect the permitted response.

### C3-01 closure and withdrawal branch

Created disposable draft `7da34879-143a-4f54-b277-c000f59bb057` for a precise fix retest at320×720. Triggered its authority error, selected unsupported SVG and attempted upload. The file control showed only the file-format/size error; it did **not** duplicate the parent authority summary. The original authority error still appeared in the correct field/form. No page overflow. Removed the unsupported attachment. Opened withdrawal, chose **Keep this submission** and verified no withdrawal occurred, then confirmed withdrawal and saw the closed-sale next step. This cleanup did not affect the main accepted submission.

Evidence: `media-fix-retest.json`, `media-fixed-320.png`, `ux165-customer3-media-fix` trace. **C3-01 closed.** C3-02 administrator copy closure belongs to the administrator/designer's rendered check; C3-03 test maintenance remains with engineering.

The recipient's permitted **Reveal protected details** action also succeeded through the normal UI. The actual30-second timer hid the answer again; closing the dialog left no protected answer in chat. Evidence: `real-form-reveal.json` and `ux165-customer3-form-reveal` trace. No screenshot or report prints the protected fixture value.

Current pending handoff: admin prepares/publishes the accepted listing, Customer4 buys, then Customer3 can inspect sale/delivery/payout and confirm a synthetic destination if an obligation exists. Remaining C01–C20 branches in the ledger are still explicitly unqualified; these focused passes do not imply the full application suite passed.

## Continuation checkpoint — 18 October 2026

Reviewer `ux165_customer_3_r2` continues the same seller persona. The original bounded API and a subsequent R2 API stopped; their in-memory keys and sessions cannot be reused. R2's first page load returned connection refused **before any seller answer**, preserved in `ux165-r2-c3-inspect-form`. This is fixture lifecycle failure, not a website defect. The coordinator rebuilt explicit prerequisites in **R3**, using normal independent synthetic identities and the current application. No old persisted-object continuity is claimed. The fresh seller session came from the admin's normal synthetic email sign-in; session values, verification codes and invented protected answers are private artifacts only.

### Actual R3 shared seller handoff

- Fresh submission `9b9a0432-72b1-424f-9bec-73eccb91f014`, accepted proposal `bb3711d9-f2cc-4846-804d-faa1fb07c0fe`; setup/acceptance/publication were labelled administrator-created prerequisites. The earlier C3 intake and exact-terms interactions remain separate retained evidence.
- Buyer order `f3967bd8-e5bc-43dd-8427-6c44a17af105` was verified through the isolated provider by the other role. C3 did **not** inherit that buyer test as its own purchase pass.
- The administrator's **UX165 paid sale account access request** appeared in this submission's Messages & photos. Submitting empty answers produced both required protected-field errors and focused the first. Invented account ID/password were entered into password-masked fields. Normal fresh email verification used a **new Mailpit message ID**. Submission succeeded, both values were hidden, and reload retained the answered form without placing protected values in ordinary chat. Administrator received the handoff to prepare paid buyer delivery.
- C3 independently confirmed a synthetic receiving address for the exact **90 USDTTRC20 / trx** payout. Empty address produced a specific inline error and focus. Editing the address correctly cleared prior exact-address consent; the renewed checkbox was required. Confirmation persisted on reload. Seller had no **Record completed payout** control. The accepted agreement explicitly retains the **seven-day inspection** and other eligibility conditions; no time was backdated and no funds were transferred. Final buyer acknowledgement/settlement is still a shared-chain continuation, not presumed complete.

Evidence: `.cache/ux165/customer3/r3/response-result.json`, `answered.png`, `payout-reload.json`, `payout-reloaded.png`; traces `ux165-r3-c3-seller-access-response`, `ux165-r3-c3-payout-confirm-retry`, `ux165-r3-c3-payout-reload`. A harness assertion incorrectly expected the editable recipient form to disappear after confirmation; its failure is retained, while a separate reload verifies the actual saved destination. Likewise, the first focus assertion omitted the normal render/focus wait; the corrected check observed proper focus without changing application behavior.

### Independent common-family progress

| Family | This persona's new observed action | Status / remaining limits |
| --- | --- | --- |
| C01 | Candidate4 exact-response fixture: keyboard ArrowRight selected all five home services, moved focus to the selected tab, then game link and refresh retained the game. Paused shop was visible. | Meaningful keyboard continuation passed; stats/review fixture endpoints not supplied, so their temporary-unavailable cards are setup data, not defects. |
| C02 | Actual R3 secondary session: consent prevented code step, intentionally wrong fresh six-digit code produced visible failure, correct fresh code recovered and returned to requested customer Sessions. | Passed. Real Google remains unqualified; no external identity provider was contacted. |
| C03 | Candidate4 no-MFA recovery correctly has no regeneration control and links to local Security. Login recovery modal used optional-MFA wording, Escape closed it and returned focus. Actual R3 secondary customer session was signed out normally; the separate primary seller session remained usable. | Passed representative modal/session action. A harness expected the subtitle to be a heading after sign-out; retained final DOM instead shows the correct Sign in heading and signed-out form. No claim of MFA enrollment/recovery-code depth. |
| C04 | Actual rich custom form: empty preference errors, region filters servers, Japan selects its region, Kagura selects a lane, mixed Kagura/Miya disables lane, invalid72–24h range corrected to24–72h, live estimate and Review & request reached. | Passed representative independent custom selection. OtherWR modes/stale-estimate permutations remain assigned shared engineering/role evidence, not independently repeated here. |
| C05 | Actual immutable Epic-to-Legend package: no editable starting-rank field, required delivery errors, timezone/availability/server corrected, fixed-price consent and owned unpaid package order `d2c55fb1-266a-42ec-937f-a498735aa0cf` created. | Passed. Exact fixed scope remained visible; no real order or payment exists. |
| C06 | No owned exact-quote decision in this continuation. | **Pending:** labelled current-frontend quote accept/decline/expired fixture, preserving original estimate versus final price. |
| C07 | Own actual isolated fixed order displayedUSD18/USDTTRC20/trx and consent; fake hosted invoice redirected to a locally intercepted provider page. Return/reload remained unpaid with Go to payment and no verified receipt. | Passed representative continuation/unpaid boundary. No second invoice was created after the later selector failure; actual verified event belongs to the cross-role C1/C4 chains. |
| C08 | Own populated fixed order retained tabs, agreement and draft when moving Messages→Progress→Messages. | Navigation/draft observation passed; ordinary message completion under tab switching needs bounded investigation below. |
| C09 | Actual protected seller response, masking/reload plus retained earlier ordinary presales reply/form/reveal/30s hide. | Protected handoff passed. New fixed-order draft/send observation is unresolved pending careful loaded-conversation retry; no duplicate message was assumed successful. |
| C10 | No owned paid case in this continuation. | **Pending:** labelled paid-case form validation/decision/appeal fixture; unpaid cancellation is not substituted. |
| C11 | Earlier actual C3 intake/scanned image/authority errors and candidate320px upload-error closure retained. | No duplicate whole sale created simply to repeat a passed unchanged family. Skin-group variation remains a configuration-specific limit. |
| C12 | Earlier actual exact100/10/90 consignment acceptance retained; new R3 accepted proposal was setup by admin. | Fee/route/next-actor understanding retained; do not attribute R3 setup acceptance to this browser session. |
| C13 | Actual R3 destination validation/renewed consent/confirmation/reload and owner-control absence, plus accepted seven-day inspection terms. | Passed destination/hold boundary; eligible manual receipt remains separate labelled fixture/backend evidence, not a transferred payout. |
| C14 | Actual marketplace now empty after sale. | **Pending:** labelled independent populated listing/filter/gallery/reservation-conflict fixture, not the seller's own sold listing. |
| C15 | Seller supplied protected access, but C3 did not act as this sale's buyer. | **Pending:** independent paid-buyer delivery/acknowledgement fixture; do not inherit C4 receipt. |
| C16 | Actual seeded shop options/12.34USD/manual-delivery/quantity inspected. | **Pending:** independent recipient-error correction and owned-order or explicit unavailable recovery. |
| C17 | Seeded article keys discovered; no reader interaction yet in this continuation. | **Pending:** published reader/filter/back plus unavailable recovery. |
| C18 | Actual populated support notification marked read and deep-linked to own seller chat. | Notification interaction passed. Favorite persistence/removal and availability subscription remain pending. |
| C19 | No eligible completed owned review in this continuation. | **Pending:** labelled eligible review validation/submission/moderation fixture. |
| C20 | Actual profile changed/saved/reloaded; email preference toggled/saved/reloaded and restored. Privacy truthfully disables deletion; exact payout destination supplied a normal protected action. | Representative saved-settings/protected-action passed; C4/C5 own exported file integrity checks separately. |

Independent exact-response evidence is **rendered frontend behavior only**, never database authorization or persisted financial success. Candidate4 helper denies external requests and missing routes fail explicitly. The deliberately mistyped `/games/.../boost` in preparation returned404; actual game links use supported routes, so this is not a product issue.

Evidence for the common tasks: `r2/navigation-result.json` (candidate4 mock), `r3/auth-negative-retry-failure.json` and its trace (actual successful steps plus final heading-locator mismatch), `r3/boost-common.json`, `r3/fixed-order.json`, `r3/checkout-follow-failure.json` (hosted redirect/unpaid pass before duplicate-summary locator error), `r3/profile-payout-failure.json` (completed saved-settings/notifications before focus-timing assertion), and `r3/payout-reload.json`. Original failures are preserved and described rather than relabelled a clean scripted pass.

### Bounded next tasks when the slot returns

1. Finish the actual fixed-order ordinary-message check after fully loaded conversation; distinguish a tab-switch fetch/reset race from a harness issue using request/status evidence.
2. After C4 delivery acknowledgement, reload the actual seller payout and capture its current next actor/inspection hold explanation without waiting168hours or backdating.
3. One independent finite exact-response passport for C06/C10/C14/C15/C19 and remaining C16/C17/C18 interactions. Use separate synthetic records and explicit responses, not another persona's private records or a claim of real backend success.
4. Append final per-family scope and any confirmed findings. Final verdict remains **continuation required** at this checkpoint; no full-suite or deployment request is inferred.

### Final observations before the booster handoff

- Actual fully loaded fixed-order chat accepted a synthetic ordinary message (`POST /messages200`, then read204) and displayed it. Evidence `r3/chat-send.json` / `chat-send.png`; no credential was sent. Earlier fast tab switching followed by Send cleared the draft with **no message POST** and only repeated ensure-conversation calls. This is a **suspected loading/tab-switch race**, forwarded for engineering reproduction; do not yet call it a confirmed defect or a successful send. The loaded-conversation success does not erase that trace.
- After the separate buyer actually acknowledged delivery, C3 reloaded Payout and confirmed the same destination/net amount, no completed receipt and no seller payout-record button. Evidence `r3/payout-after-buyer.json` / `.png`.

### C3-04 — seller payout progress hides the current inspection prerequisite (P2)

**Observed on actual R3 after acknowledged buyer delivery.** The prominent status says **“Awaiting manual payout — The seller destination is confirmed. Staff handle this payout externally; no completed transfer has been recorded yet.”** The still-required seven-day inspection appears only within the long accepted seller agreement. No current inspection deadline or prominent waiting reason is shown. This suggests staff can simply pay next even though actual eligibility is still held. The existing financial guard remains correct; no premature transfer occurred.

Expected: the status/next action should distinguish *waiting for buyer inspection* (with the actual deadline and any active case hold) from *eligible, awaiting staff payout*. Preserve the complete accepted terms and never infer eligibility just from confirmed destination. Forwarded to root/product for a scoped correction and independent retest. Current outcome remains **open P2**.

The requested temporary slot handoff ends here. Precise remaining independent tasks are C06 exact quote decision, C10 paid case branch, C14 non-owned listing filter/gallery/conflict, C15 independent buyer delivery, C16 shop recipient/order, C17 article/filter/back, remaining C18 favorites/subscription, C19 eligible review; use explicitly labelled current-frontend fixtures where no own persisted prerequisite exists. C3-04 and suspected chat timing need follow-up. No production changes or full suite were performed by this reviewer.
