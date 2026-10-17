# UX165 — Customer 1 review

16 October 2026. Persona: customer configuring a custom MLBB boost, with common customer-family discovery and recovery tasks. Status: first wave in progress; persisted API environment not yet ready.

## Evidence and scope

Baseline application is20fe17e; repository95f094a. Frozen built-frontend manifest is `.cache/ux165/engineering/snapshots/ux165-baseline/snapshot.json`. First attempts used actual SSR/frontend with an explicitly synthetic API, instance `ux165-customer1b`, and the retained MLBB configuration from `frontend/tests/fixtures/mlbb-catalog/configuration.json`. The catalog fixture is not a current-production catalog assertion. Browser contexts have no personal sessions and reject all nonlocal origins.

Customer1 files: `.cache/ux165/customer1/`. Runtime request journal and traces: `.cache/ux165/engineering/evidence/ux165-customer1b/`. The initial instance `ux165-customer1` failed at localhost bind due to sandbox permissions, before starting the frontend; retained as a setup failure. A script locator mismatch for the recovery-specific action and a newline-sensitive order-link locator were corrected; neither is an application defect.

## Findings

### C1-01 — Customer email recovery copy implies mandatory authenticator (P2, observed)

- Route: customer `/login`, Lost access to your email modal; Chromium390×844.
- Steps: open customer login without a session, open Lost access to your email.
- Actual: “Your authenticator remains required” appears unconditionally. Ordinary customer accounts may never have enrolled an authenticator. The preceding paragraph already asks for independent owner review.
- Expected: distinguish optional customer MFA from mandatory staff MFA. Suggested customer wording: “If you set up an authenticator, it will still be required.” Staff wording should retain mandatory verification. Preserve actual security behavior.
- Evidence: `login-observations.json`, `login-recovery-invalid-mobile.png`, trace `login-modal-errors-chromium-390-trace.zip`; source `frontend/app/identity/identity.tsx` recovery paragraph.
- Status: sent to root for product/engineering confirmation; no source changes by tester.

## First-wave attempt ledger

| Task | Result | Evidence / limit |
| --- | --- | --- |
| C04 missing/invalid customer email | Completed in frontend fixture | Specific inline error and first-invalid focus observed; no code/email requested. |
| C08 recovery open, missing fields, Escape/return | Completed in frontend fixture | Focus moved to current email, both missing fields marked, Escape returned to trigger and underlying invalid-email draft remained. Copy issue C1-01. |
| C05 order list and detail local sections | Partial in frontend fixture | Selected visible order; Messages/Payment/Help preserve order context and URL section. Payment correctly explains accepted quote prerequisite. Messages endpoint missing from fixture so no chat success claimed. |
| C09 order narrow layout | Completed narrow surface check |320px document width320; no horizontal overflow on order Help. |
| CB01 region→server | Completed in frontend fixture | SEA limited server choices; switching to Americas cleared incompatible Singapore. |
| CB01 server→region | Completed in frontend fixture | Japan automatically selected its region. |
| CB01 heroes→lane | Completed in frontend fixture | Kagura selected Mid Lane; adding Miya cleared/disabled incompatible shared lane. |
| CB01 rank stars guidance | Completed frontend check | Warrior III with999 stars gives specific0–3 guidance. |
| CB01 invalid submit / delivery range | Blocked by fixture gap | Validation request is not yet mocked and returns explicit501; generic service error is not counted as defect. Actual API needed. |
| CB02 live estimates / request | Pending actual API | No authoritative estimate or persisted request yet. |
| CB03–CB06 quotes, paid fulfillment, progress, review | Pending cross-role handoff | Requires same actual isolated order and admin/booster actors. |
| C01–C03 homepage and other services | In progress | Catalog/service shell observed; no complete common task pass yet. |
| C06–C07 chat/form | Pending actual API | Fixture missing conversation endpoint, so no fabricated success. |
| Seller/buyer/shop/news/account full families | Pending actual API | Do not count unavailable fixture endpoints as application failures. |

No production state, messages, invoices or funds were touched. This is a task attempt ledger, not a claim that every possible flow passed.

## Additional first-wave observation

- Homepage: manually selected all five service tabs, used End keyboard navigation, and followed Choose your game; focus moved to `game-selection-title`. At390px, document width stayed390. The game-list loader in this fixture rejected the preliminary listing shape, so no actual catalog browse success is claimed yet.
- Public Contact: email and all three owner-specified social links were discoverable without authentication. Private Chat clearly says sign-in is required and uses `/support`. External destinations were inspected only; never contacted.
- Game shell: all four services were discoverable; paused Shop said “soon” in this retained fixture configuration. This is administrator-provided content, not an application guarantee or newly observed availability fault.
- Automated accessibility spot check: zero axe violations on mobile Contact, MLBB custom form and submitted-order Payment in the frozen frontend. This does not replace manual assistive-technology testing.
- Evidence: `common-discovery.json`, `home-games-mobile.png`, `contact-mobile.png`, `axe-results.json` and corresponding recorded traces.

## Persisted actual-API wave — custom order and customer discovery

The engineer's isolated actual API and three local portals became ready. Customer1 signed in normally with synthetic identity key `desktop_orders`, retrieving the code only from the local mail sink. Private browser storage is retained at `.cache/ux165/customer1/customer-storage.json` for continuation without repeated email requests. No authentication bypass was used.

An administrator published rich synthetic MLBB game `ux165-custom` through the normal authoring UI. Customer1 submitted **order `2eb8d51d-7ef8-4694-bff3-0eaf21f43470`** through normal customer UI: Epic V with1star → Legend V with0stars, play together, Japan,24–72hours, Asia/Tokyo. Original authoritative estimate **USD21.84**. Handoff record: `handoff.json`. Order support conversation: `01a141d9-bd70-71d8-90fe-dd0a5190d3ea`.

### C1-02 — Own outgoing message appears unread (P2, observed and source-confirmed by root)

- After sending the first synthetic customer message and leaving the order, My account showed that conversation with1unread. Reopening Messages showed an “Unread messages” divider before the sole Customer-authored message. No staff response was present.
- The send succeeded and message persisted; this is misleading unread semantics, not a delivery failure. The customer should not be prompted to read their own sent message as an incoming update.
- Root confirmed unread computation currently uses sequence minus read marker and is assigning engineering correction.
- Evidence: `real-chat-mobile.png`, `real-chat-common.json`, actual-API traces under `.cache/ux165/engineering/evidence/ux165-customer1-real-chat-common/`.

### Actual attempts completed

| Attempt | Observed result |
| --- | --- |
| Missing custom required fields | Backend validation200 with issues; clear inline errors and first-invalid starting-rank focus. |
| Reversed72→24hour delivery interval | Specific latest-completion error and input focus; unrelated safe answers retained. |
| Corrected24→72hours | Automatic authoritative estimateUSD21.84 beside configuration; change did not submit or charge. |
| Review and quote request | Review stage clearly unpaid; explicit terms consent required; successful order persisted and shows original estimate and staff next action. |
| Order messages | Synthetic customer message persisted; audience explicitly Customer and PLAYORA support. No booster sharing implied. |
| Local order tabs and draft | Unsent coordination draft retained across Overview→Messages; order context remained. Unpaid Progress accurately explained payment prerequisite. |
| Customer account pages | Overview, profile, preferences, security, sessions, privacy, activity, favorites, reviews, availability and seller list rendered without1440px overflow. Profile/security/session roles remained customer-local. |
| Privacy | Deletion correctly disabled; export controls describe fresh verification. Export itself not submitted. |
| Other services | Seller game chooser, empty account marketplace, unavailable Shop and published guide index discoverable. Full seller/buyer/shop transaction branches remain assigned to specialist actors and are not counted as Customer1 completed flows. |
| Mobile chat |390px document width390, message/composer readable, no horizontal document overflow. |

Screenshots/request status and textual evidence: `real-start-observations.json`, `real-submit-observations.json`, `real-chat-common.json`, `real-empty.png`, `real-invalid-delivery.png`, `real-review.png`, `real-submitted.png`, `real-chat-sent.png`, `real-chat-mobile.png`. Some instantaneous text snapshots after navigation retain the previous section while routing completes; screenshots and eventual locator waits are authoritative, not those interim text snippets.

A final common-action script selected Save game to favorites but expected a differently named removal button and stopped. Its trace is retained; this is a test locator limitation, not a confirmed favorite defect. No second order was created.

Continuation requires administrator quote/form and subsequent synthetic payment/booster handoff. Quote acceptance/rejection/revision, checkout, scheduled sessions, protected form completion, progress/proof, disputes/reviews/reorder and remaining secondary mutations are explicitly pending. Customer1 does not claim every possible flow completed.

## Candidate1 quote/payment and independent common-action continuation

Used the corrected frontend through `real-browser-candidate1.mjs`, retaining the same actual isolated API and normal customer session. The API is still the original frozen backend; no claim is made that the unread backend correction is present here.

- Accepted exact USD21.84 quote and terms. Agreement remained unpaid until checkout evidence arrived.
- Chose the published synthetic USDTTRC20/TRX policy, accepted it, created fixture checkout and observed navigation to a wholly intercepted provider page. No external provider request was made. Returning to PLAYORA alone left the order unpaid with Go to payment available.
- Sent the existing isolated test provider's signed synthetic webhook to the local API; the real worker processed it and the order became queued with Payment verified. Fixture returned its fixed synthetic crypto receipt amount; this is not a real exchange-rate/settlement check.
- Evidence: `real-quote.txt`, `real-quote.png`, `real-quote-checkout.json`, `provider-handoff.json`, `payment-signal.json`, `checkout-return-unpaid.png`, `checkout-verified.png`, and the corresponding actual-API traces. Admin was notified to assign `desktop_workbooster` for play-together scheduling.
- **C1-01 corrected and rendered recheck passed**: customer recovery now says “If you set up an authenticator, it will still be required.” Modal Escape still returns focus. Evidence `candidate-recovery-seller.json`, `candidate-recovery-mobile.png`.
- Favorite save persisted and was visible under Favorites. Published article `ux165-next-step-guide` opened under the same game shell at390px without document overflow. The article preserved author/date/source and return navigation.
- Mobile account-filter dialog opened normally; entering12.999 showed the specific two-decimal error and focused Maximum price. Profile save displayed success and survived reload.
- Seller game selection and missing-title validation worked. Continued with an invented private title; a read-only visit to `/sell` confirmed exactly that private draft exists. It was not sent for staff review. An initial generic URL wait matched `/sell/new` prematurely, so that interim screenshot is not proof of draft creation; the later list observation is authoritative. No second create was attempted.
- Prior common-action scripts stopped at a hidden mobile filter and a transitional article heading because the test had not opened/waited for the current UI; corrected interactions passed. These remain recorded test-navigation limitations, not application defects.

Actual custom order remains `2eb8d51d-7ef8-4694-bff3-0eaf21f43470`. Next blocked tasks: staff assignment, co-play proposal/confirmation, protected chat form, progress/proof, final completion/review. The older backend's own-message unread issue remains open for separate engineering verification.

## 18 October continuation — independent C1 passport and co-play handoff

The Oct16 runtime was no longer available. Root rebuilt an isolated **r3** database/runtime and replayed the prior order prerequisites through authenticated local fixture APIs. This replay is **setup**, not another manual quote or purchase pass. C1 used only the synthetic `desktop_orders` identity and its normal customer session. Backend source is frozen candidate2, frontend candidate4; production was not contacted. Evidence below is under `.cache/ux165/customer1/r3/`, with browser traces in the corresponding `engineering/evidence/ux165-c1-*` directories.

Actual r3 order: `29e35fd5-4ddc-44d2-9f41-24bb41cc81a7`. C1 entered invented player, zone and ordinary coordination details through the form, selected the supplied availability window and proposed **18 Oct 04:15–04:45 UTC**. An empty session note produced its inline error and focused the note. The real API accepted the corrected proposal; it visibly remained proposed until the separate booster agent confirmed it. C1 refreshed and observed the same confirmed time, read the booster's message attributed to **Assigned booster**, and replied through the shared conversation. The audience remained customer, assigned booster and PLAYORA staff. No clock was advanced and no appointment was represented as already played. Evidence: `proposal.json`, `handoff-readback.json`, `reply-focus.json`, and their mobile screenshots.

### C1-03 — Duplicate purchase-review heading (P3, confirmed)

Customer `/reviews` renders consecutive visible H1 and H2 headings, both “Your purchase reviews.” At390px the measured Y positions were224 and282; both had nonzero visible rectangles. This is not an invisible legend or screenshot artifact. Keep the page H1 and remove the redundant body heading without losing the list's accessible name. Evidence: `common-actions.json` stage `C19-headings`, `reviews-mobile.png`. Root accepted the correction and owns source changes; **final corrected rendered closure is pending the senior review**, not claimed here.

### Independent C01–C20 attempt ledger

“Actual” means C1's rendered browser against the isolated persisted backend. “Controlled” means this agent's separate exact-response frontend fixture `ux165-c1-passport` using candidate4; it is not persistence, authentication or financial proof. Earlier C1 evidence remains listed separately rather than reassigned from another persona. These are bounded representative attempts, not exhaustive branch passes.

| Family | C1 observation | Evidence and remaining limit |
| --- | --- | --- |
| C01 discovery | Actual mobile home keyboard navigation selected all five services; Choose your game moved to game discovery. Game/package/shop/account/news entry retained the game shell. Paused shop had an explicit unavailable message and return path. | `common-actions.json`, `passport-inspect.json`, `shop-discovery.json`. No390px document overflow on the17 inspected destinations. |
| C02 sign-in | Actual missing consent/email and malformed email, incorrect code, locked resend at2:00, then successful resend **after the real120-second interval** and normal new-code sign-in to intended `/orders`. Customer cookies did not authorize admin and went to its login. | `auth-results.json`. Synthetic mail sink only. Google provider, external email delivery and all expiry permutations remain outside this review. |
| C03 recovery/security | Earlier C1 rendered recovery modal checked missing fields, Escape/focus return and corrected optional-authenticator wording. Current actual recovery explained no codes because C1 has no authenticator; security offers setup and customer-local sessions. | Prior `candidate-recovery-seller.json`; current `passport-inspect.json`. Enrollment/recovery-code consumption not performed on this persona. |
| C04 custom boost | Retained actual C1 request exercised required fields, reverse delivery interval, correction, authoritativeUSD21.84 estimate, review/consent and persisted request. Earlier explicit frontend checks covered both region/server directions and single/mixed hero-lane behavior. | `real-start-observations.json`, `real-submit-observations.json`, `custom-controls.mjs` evidence. r3 prerequisite replay is not a second purchase attempt; every rank/WR/catalog permutation is not claimed. |
| C05 fixed package | Current actual Epic to Legend exposed fixed starting/target ranks andUSD18 price, only four customer delivery details, missing-field validation and favorite action. No custom rank controls appeared. | `passport-inspect.json`, `common-actions.json`. C1 did not create a redundant fixed-order financial chain; specialist C2 evidence is separate. |
| C06 quote agreement | Retained C1 actualUSD21.84 quote accepted with terms; original estimate/final agreement and staff next action were distinguishable. | `real-quote-checkout.json`, `real-quote.txt`. Expired/rejected/revised offers are not newly executed C1 outcomes. |
| C07 payment | Retained actual local hosted-checkout journey reached an intercepted fake provider, return alone stayed unpaid, signed fixture webhook + real worker changed the order to queued/payment verified. | `provider-handoff.json`, `payment-signal.json`, payment screenshots. No real invoice, exchange rate, funds or provider settlement proof. r3 paid state was setup. |
| C08 order/fulfillment | Actual paid/assigned order keeps local sections; C1 filled ordinary handoff fields, proposed an appointment and observed the separate booster's confirmed time. Mobile customer/pro coordination agrees. | `proposal.json`, `handoff-readback.json`. A future confirmed session was not backdated or completed; completion was reviewed separately as a controlled scene. |
| C09 conversations | Prior actual order-support send/draft/tab retention; current actual shared coordination received safe Assigned booster attribution and sent a customer reply. Correct shared audience and private-support separation remained visible. | `real-chat-common.json`, `handoff-readback.json`, `reply-focus.json`. This persona has not answered a protected staff form; C3/C4 actual protected flow evidence is not counted as C1. |
| C10 cases | Actual Help opens a formal-case disclosure explaining work hold and no automatic refund. Empty case submission shows10–2,000-character field guidance and focuses Describe your case after rendering. No case was created against the active co-play chain. | `final-common.json`, `reply-focus.json`. Staff decision/appeal/refund outcomes remain separate specialist/controlled evidence, not C1 transactions. |
| C11 seller intake | Prior C1 private draft created and confirmed in its own list; current r3 game chooser and missing Private account title error/focus worked. This persona's empty seller list remained intelligible. | Prior `candidate-recovery-seller.json`, `real-common-actions.json`; current `final-common.json`. No duplicate submission, image/scanner or accepted sale was fabricated for C1. |
| C12 seller agreement | Controlled independent offered agreement clearly showed100base/10%fee/90net, route, expiry, inspection timing and decline alternative. A short note or missing consent kept acceptance disabled; valid note+consent enabled it. No accept/decline mutation issued. | `controlled-seller.json`, `controlled-agreement.png`. Exact frontend scene only; not a real C1 commercial offer. |
| C13 seller payout | Controlled separate accepted/sold receipt scene showed90.000000USDTBSC/bsc, destination, hash/time and explicit staff-recorded external-transfer disclosure, with no wallet balance. | `controlled-payout.json`, screenshot. No payout was recorded or funds moved. Mandatory eligibility/inspection was not bypassed. |
| C14 marketplace | Actual sold C3 listing was readable at its public URL withUSD100base+5buyercommission=105total and a sold/unavailable purchase state. Earlier C1 malformed max-price filter received two-decimal guidance. | `shop-news.json`, prior `real-common-actions.json`. Public listing access does not grant private order access; no second reservation/race initiated. |
| C15 buyer delivery | Actual C1 request to C4's private order showed Order access changed and cleared private detail. Controlled own-buyer scene separately showed unpaid protection, delivered instructions,10-character acknowledgement validation/focus and continuing rights after initial inspection. | `shop-news.json`, `controlled-buyer.json`, screenshot. C1 has no actual account purchase; no credential reveal or receipt acceptance is claimed. |
| C16 shop | Actual published synthetic item shows manual fulfillment. Quantity3 exceeds its1–2 range and disables progression; quantity1/2 updates exact totals. Missing recipient yields inline guidance and focused player field; corrected identifier is masked on review, with compatibility/fees/delivery terms and explicit consent before reservation. | `shop-controls.json`, `final-common.json`, `reply-focus.json`, `shop-review-mobile.png`. Stopped before Reserve and continue; no redundant invoice/order. |
| C17 news | Prior actual published guide opened under game shell with author/date/source/return. Current r3 empty lists explain no articles; search/Guide filter and Clear filters retain context. | Prior `real-article-mobile.png`; `common-actions.json`, `shop-news.json`. Scheduled/private draft publication boundaries were not mutated by C1. |
| C18 activity/favorites | Actual package favorite saved and appeared in Favorites after completion; notification Mark read succeeded. Availability alerts showed honest empty state and no reservation/price guarantee. | `common-actions.json`, `passport-inspect.json`. Subscription email, token expiry and all reorder revisions not exercised by this persona. |
| C19 reviews | Actual list/filter returned honest empty/ineligible feedback guidance; duplicate headingC1-03 reported. Controlled completed purchase showed moderation policy and missing rating/body/consent errors with rating focus. | `common-actions.json`, `review-validation.json`, `review-validation.png`. No review published, withdrawn or moderated by C1. |
| C20 profile/privacy/contact | Actual profile saved and survived reload. Privacy export opened same-page fresh-verification modal and Escape cancelled; deletion remained disabled. Sessions show customer scope and90-day expiry. Prior signed-out Contact exposed social/mail links while chat required sign-in. | `final-common.json`, `passport-inspect.json`, prior `common-discovery.json`. No export download, deletion, external contact or live session alteration. |

### Interpretation, failures retained and limits

The revised controls generally made the actor and next action understandable: fixed terms are separated from delivery information, shop review masks the player identifier, seller terms show net proceeds, manual receipts explicitly avoid claiming automatic blockchain verification, and scheduling correctly distinguishes a proposal from a booking. The remaining long account-sale text is accepted legal content; this reviewer did not silently rewrite its guarantees.

Several exploratory scripts stopped because their locators guessed old names or clicked a deliberately disabled control: Session start versus Session start (local time), generic Continue versus Continue to account details, a nonexistent Manual payout receipt heading, and clicking Continue to recipient while quantity was out of range. One favorite attempt navigated away before the save finished; the corrected attempt waited for Saved to favorites and passed. First browser startup was denied by the local sandbox before navigation; the isolated browser then ran with the permitted tool escalation. These are retained **harness/setup failures**, not relabeled product failures. Immediate focus snapshots in `final-common.json` were too early; `reply-focus.json` waits for rendering and confirms both case and shop fields actually receive focus. None prompted retrying a financial mutation.

This is one independent customer persona's representative matrix, not proof of every possible flow. Exact provider/Google outcomes, physical mobile devices, full screen-reader use, all network/concurrency permutations, future elapsed inspection/session timing and this persona's unexecuted protected-form/case/full seller transaction branches remain explicit limits. Other agents' depth is cross-role evidence, not silently inherited C1 passes. No full suite, production mutation, live email, invoice, transfer or deployment occurred.
