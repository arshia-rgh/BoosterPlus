# UX165 — Customer 2 review

16 October 2026. Independent customer persona: fixed-package and shop purchaser. **First wave completed; cross-role fulfillment and remaining branches await continuation.** This is an agent usability exercise, not a human study or a claim of exhaustive bug-free behavior.

## Evidence and method

- Frozen baseline: actual copied three-portal frontend, snapshot `ux165-baseline` (manifest SHA256 `b43bb97f932ea802bdacb2d892502f51da3a60d9fa27566b8a8d9318e7ea0e35`), separate instance `ux165-customer2`. Forty navigations covered all 39 canonical customer/public route templates plus the selected boost view at 390 × 844 in Chromium. Unknown fixture endpoints returned 501; their generic unavailable views are **fixture limitations, not application failures or passed transactions**.
- Actual isolated API: normal email sign-in with the dedicated `desktop_shopbuyer` fixture, using local Mailpit. One sign-in; private session reused. Actual profile/favorite, support, shop reservation, fixed-package order and provider-fixture transitions persisted to the isolated database. No production account/data, live email, provider request or money was used.
- Checkout navigation was intercepted at the exact synthetic provider URL. A valid signed local fixture webhook then supplied payment evidence. Returning from the hosted page remained unpaid beforehand. This demonstrates application behavior, not real provider settlement, exchange rates or live delivery.
- Viewports observed: 1440 × 900, 390 × 844, and 320 × 740/640. No horizontal document overflow in the forty baseline route entries. Shared 320 px checks covered shop review, favorites, news empty state and seller entry. Physical devices, screen readers and every timing/network permutation remain untested.
- Private evidence: `.cache/ux165/customer2/` (route observations, screenshots, transcripts, synthetic object IDs); browser traces under `.cache/ux165/engineering/evidence/ux165-customer2-*` and `ux165-c2-*`.

First impressions were recorded from the UI before referring to test source. Subsequent seeded-catalog and actor handoffs are assisted: the admin actor published the rich synthetic MLBB game and isolated payment policy. Source/test selectors were consulted only to make exploratory scripts reliable, not treated as execution proof.

## Findings

### C2-01 — fixed-package progress and summary repeat locked contents (P3, observed; correction implemented by coordinator, verification pending)

Route `/games/ux165-custom/packages/package_1`; Chromium 390 × 844. On arrival, before the customer enters anything, the summary reports **“6 of 10 visible fields answered”**. Those six are preset, uneditable package contents. The same starting/target rank, stars, play mode and win-rate values appear in both Included in this package and the later Selection summary. The actual delivery form has four customer inputs. The frozen realistic package page was 6,745 px tall at 390 px width; this includes game context/FAQ and is not itself a failure threshold.

The task remains completable, but the progress denominator and duplicate scope make a predefined purchase look more like the custom configuration it should avoid. Suggested outcome: count only customer-editable delivery inputs, retain the fixed scope once, and keep exact price and accepted delivery terms visible. Do not remove immutable scope, add hidden defaults or relax validation.

Evidence: `survey/05.png`, `survey/observations.json`, `fixed-required-errors.png`, `fixed-review.png`, `real-fixed.json`. The current rich API-backed catalog reproduced the count/copy, so this is not solely a mock observation.

No P0/P1 defect was confirmed in this wave. Other unavailable screens in the baseline fixture must not be reported as product bugs.

## Completed persisted story and handoff

1. Signed in through the real local email/consent/code UI, landed on the intended game list, and saved the isolated customer session.
2. Browsed the seeded shop, selected the variant, attempted missing recipient data, received visible inline error, corrected it, reviewed masked recipient/price/manual delivery terms, explicitly accepted and reserved one item at USD 12.34.
3. The shop order initially correctly explained that a published payment policy was needed. After the admin actor published the synthetic policy, selected its exact route and accepted payment terms.
4. The application automatically navigated to the intercepted hosted checkout. Returning still showed no received funds. The signed local provider event returned 204; Refresh payment showed Payment verified, queued status and a receipt.
5. Browsed the admin-published rich MLBB fixed package. Scope was uneditable; only delivery inputs were requested. Missing required fields produced visible per-field errors. Choosing Japan first automatically selected East Asia. Filled timezone/availability, accepted fixed USD 50 terms and created the order without an admin quote. The same isolated hosted/return/verified-payment sequence passed.
6. Created a pre-sales conversation and sent the synthetic next-step question. A subsequent independent read confirmed the message persisted; no uncertain send was repeated. Admin was given both order IDs and thread ID for reply, form, manual shop fulfillment and booster assignment.
7. Saved a synthetic profile display name and game favorite; later favorites page confirmed the saved game. News empty state and seller game chooser were clear; no invented article or listing was counted as observed.

Object references are private in `shop-order.json`, `fixed-order.json`, `thread.json`. Parent/admin have the same IDs. These are shared persisted handoffs, not unrelated mocked screens. Staff fulfillment, booster progress, protected form reply and customer completion/review are still pending.

## Customer-family ledger

“Partial” means concrete steps were observed but the listed remaining state was not. No row marked partial is a full family pass.

| Family | First-wave status | Evidence and remaining work |
| --- | --- | --- |
| C01 home/game/service navigation | Partial | All baseline home/game/service routes rendered; actual game chooser and rich package/shop visited. Baseline has explicit missing metrics fixtures. Back/keyboard on all five homepage sections still pending. |
| C02 sign-in | Partial, persisted | Actual email consent/code/return passed. Google, expired/wrong code and 120-second resend branches not exercised here. |
| C03 recovery/security | Partial, rendered | Actual portal-local security/sessions/recovery viewed; baseline login redirects signed-in customer correctly. Recovery request, session revoke and optional MFA not mutated. |
| C04 custom boost | Partial, rendered | Rich custom route and linked controls viewed in baseline; server-first linked region also exercised in actual fixed form. No C2 custom quote request yet. |
| C05 fixed package | Completed primary path, persisted | Fixed scope, missing-field validation, four delivery inputs, explicit fixed consent, actual USD 50 order. Stock/version/coupon/duplicate branches pending. |
| C06 quote decisions | Partial | Submitted custom order overview seen in baseline. C2 fixed order correctly skipped quote approval. Actual custom quote accept/reject remains pending. |
| C07 checkout | Completed two primary paths, persisted | Shop and fixed order automatic provider navigation, unpaid return, signed synthetic evidence and verified receipt. Pause/provider failure/partial/expiry/duplicate branches not yet attempted. |
| C08 order workspace | Partial | Actual order context and Payment section; baseline overview visible. All local tabs/refresh/filter restoration and fulfillment stages pending staff/booster. |
| C09 support/forms | Partial, persisted | Subject validation, actual thread/message and independent persisted read passed. Staff reply, attachments, protected form and failed-send recovery pending. |
| C10 cases/refunds | Not completed | Help-route family available through order shell, but no actual case/cancel/appeal/refund was submitted. Preserve orders for staff fulfillment handoff. |
| C11 seller intake | Partial | Actual game chooser clear; baseline new-submission and unavailable-detail templates rendered. C2 did not submit an account or upload images yet. |
| C12 seller agreement/listing | Not completed | No C2 accepted seller offer; baseline unavailable-detail state does not certify seller lifecycle. |
| C13 seller payout/forms | Not completed | No seller payout flow attempted. Manual payout protections unchanged. |
| C14 marketplace/buyer | Partial, rendered | Global/game marketplace and unavailable detail visited in baseline. No actual account purchase yet; seller/admin shared listing pending. |
| C15 account delivery | Not completed | No paid account purchase or protected account-delivery form yet. |
| C16 shop purchase | Completed primary purchase, persisted; delivery pending | Variant/quantity boundaries rendered in baseline, actual required recipient/review/reservation/payment passed. Staff manual fulfillment not yet finished. |
| C17 news | Partial | Actual seeded game had no published articles; clear empty/search/filter interface. Article template baseline unavailable only, no article-reading pass claimed. |
| C18 favorites/alerts/notifications | Partial, persisted | Actual favorite saved/read; actual empty alerts/notifications rendered. Subscription lifecycle and populated notification deep link pending. |
| C19 reviews | Partial | Actual ineligible/empty review list clear. Completion-gated review remains pending staff fulfillment. |
| C20 profile/privacy/contact/policies | Partial, persisted | Actual profile/preference/security/privacy views, profile edit; deletion correctly disabled. Baseline contact/how-it-works/terms read. Export and other sensitive mutations not yet attempted. |

## Useful behavior to preserve

- Fixed package input does not expose the immutable ranks, win rate or play mode as editable options.
- Actual missing delivery/recipient errors are visible under fields; server-first region selection works.
- Shop explicitly says manual staff delivery after verified payment; it does not promise unsupported instant fulfillment.
- Masked recipient review, exact price and explicit separate payment acceptance are present.
- Hosted checkout begins automatically. Provider return alone never marks paid; the verified receipt is separate.
- Customer account data/security pages remain inside the customer shell; automatic deletion remains unavailable.
- Account/service views retained context and had no observed horizontal clipping at tested widths.

## Exploration-script limits and corrected assumptions

Exploratory scripts initially guessed a disclosure role, exact error text and a post-favorite button label incorrectly. They were corrected using the observed UI/source, with original failed traces retained. These were harness-selector failures, not application defects. A first chat screenshot captured Sending; an independent later read confirmed persistence before the admin handoff. Some earliest captures occurred before asynchronous state settled and are not used as final success evidence. Frozen package validation lacked an explicit endpoint fixture; actual API-backed validation subsequently supplied the real evidence above.

Coordinator reports a scoped C2-01 source correction: count only visible customer delivery fields and retain fixed scope once. It is not closed until this customer repeats the task on the changed build.

Resume this role after admin/booster handoffs and for C2-01 rendered verification. Remaining families and branch limits must be retained in the final aggregate report rather than silently marked passed.

## Second wave — delivery and formal support continuation

Continued the same persisted customer session and same two orders. The admin actor completed the shop through actual claim, recipient review, scanned synthetic proof, submit and approval. Customer 2 then inspected Overview, Messages, Delivery and Help through local order tabs. The order reference, game and completed status remained visible. Customer-visible proof, completed-delivery note, accepted terms and private recipient controls were present. No horizontal overflow was recorded. Evidence: `shop-completion.json` and `shop-completed-*.png`.

- **C08 / C16:** shop staff→customer completion handoff observed. Fixed boost was assigned to the booster; Customer 2 supplied actual synthetic Player ID/Zone ID through Progress & sessions → Save fulfillment information. Its private Messages section had no admin-requested protected form yet. Root/admin were notified; credentials were not placed in ordinary messages. Evidence: `fulfillment.json` and `fulfillment-info-saved.png`.
- **C09:** customer saw the admin's published proof message and scanned image-download action in the same completed shop order. Protected form creation/recipient response remains pending admin handoff.
- **C10:** opened Request a service review on the completed shop's Help tab. Missing case note produced a visible inline `Use 10–2,000 characters` error. Corrected with a clearly synthetic payment-review request, then observed the persisted open case, authored note, staff-next-action guidance and case reply field. No automatic refund or outgoing transfer appeared. Evidence: `shop-case.json`, `case-required-error.png`, `case-opened.png`. Staff response/decision/appeal remains pending. No cancellation was performed against the booster order.
- **C19:** no review form appeared for the completed shop. Source inspection and test-product configuration show reviews are not enabled for this fixture. This is an intentional eligibility condition, not a broken review flow; a completed eligible fixed boost is still needed for Customer 2's review submission.

**C2-02 — duplicate observation of stale credential guidance, P2 copy:** the frozen actual UI's Coordination and proof says “Keep credentials in secure game access.” That standalone destination no longer exists; the current action is an admin-requested protected form in Messages. Coordinator had already corrected this app-owned copy before this observation. Retain as corroborating evidence, not another independent issue; verify changed build later. The catalog's separate Player ID help also mentions a secure handoff, but that is existing synthetic catalog content, not a newly confirmed hardcoded production UI defect. Evidence: `fixed-delivery-state.txt`/`.png` and `fulfillment.json`.

An initial completion script expected the order reference to be a semantic heading; it is a visible workspace label. Correcting that selector allowed normal navigation. The retained selector timeout is not an application failure.

Next continuation: respond to the actual fixed-order protected form, confirm booster readiness/progress/completion, finish eligible review and staff case response, and repeat C2-01/C2-02 on the corrected build. The earlier family ledger's remaining limits remain applicable except the completed shop handoff and open-case steps explicitly upgraded here.

## Third wave — actual protected game-access response

The admin actor sent **UX165 fixed boost access request** in the fixed order's Shared coordination conversation, addressed to Customer 2 with explicit assigned-booster sharing. Customer 2 selected Shared coordination through the normal order UI, opened Complete form, and observed the audience and expiry description.

- Blank Send response produced per-field required errors and a highlighted first field. Both requested fields were protected password inputs; the form contained no ordinary fields, so ordinary-field validation is **not** claimed by this particular attempt.
- Entered only synthetic game-access values, submitted once, and observed Response sent followed by the persistent Response received / View form state on the request and response timeline cards. No sensitive value appeared in ordinary message previews.
- Two earlier forms addressed to another recipient correctly rendered unavailable to this account. They were not bypassed or answered.
- The recipient submission did not request a fresh OTP. No verification guard was bypassed; protected staff reveal remains a separate action to be tested by the booster/admin roles.
- Escape closed the completed form. Private customer session was preserved. Root/admin received immediate readiness handoff: Player ID/Zone and the requested access response are now on file for the same paid fixed order.

Evidence: `protected-form.json`, `protected-form-card.png`, `protected-form-open.png`, `protected-form-required.png`, `protected-form-answered-card.png`, trace `ux165-customer2-protected-form/protected-form.zip`. C09's actual recipient protected-response branch is now observed; staff reveal, booster progress/completion, eligible purchase review and corrected-build verification remain pending.
