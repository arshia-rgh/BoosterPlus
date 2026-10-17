# UX165 — independent administrator/owner review

16 October 2026. Baseline application `20fe17e`, repository documentation baseline `95f094a`. Tester: `/root/ux165_admin_owner`. **First pass; persisted cross-role work is pending, not passed.**

## Method and first-time interpretation

I approached the staff workspace as someone who needs to find an order, decide what happens next, answer the customer and manage the business. I read the current route/flow inventory, then used the actual frozen frontend in an isolated Chromium context. I did not use the owner's browser session, production records, external mail, payment services or customer data.

The admin overview gives useful destinations and the order workspace retains its order identifier while its seven local sections change. The original estimate is visible before quoting. The unpaid fulfillment state clearly explains that verified payment is required. The mobile menu is usable and Escape returns focus to Menu. Failed details loads generally provide a named Retry action instead of pretending the record is empty.

The quote editor is substantially less approachable than those navigation improvements: it asks staff to convert prices into an internal integer representation, and several admin pages repeat the same heading before presenting controls. These are usability findings, not evidence that money was miscalculated or access control failed.

## Evidence and boundaries

- Local synthetic frontend harness `ux165-admin-r1`, frozen snapshot `ux165-baseline`. Its exact source manifest and per-request dataset hashes are retained in `.cache/ux165/engineering/evidence/ux165-admin-r1/`.
- Desktop Chromium 1440×1000: 33 route observations (all admin canonical route templates except signed-out login; the 32 authenticated templates plus unknown route). `.cache/ux165/admin/round1/routes.json`, screenshots `00.png`–`32.png`, and `admin-route-review-chromium-1440-trace.zip`.
- Chromium 390×844 and 320×844: 17 main routes at each width. `.cache/ux165/admin/mobile/results.json` and individual screenshots. No document-wide horizontal overflow. The local order-section rail scrolls horizontally by design; offscreen tab coordinates do not count as page overflow. The responsive order table headers are hidden while the row becomes a labelled card.
- All seven order sections clicked at 390px, retaining the same order path and changing only `section`. Mobile menu opened and escaped; focus returned correctly. `.cache/ux165/admin/interactions/observations.json` and screenshots.
- Blank final-quote preview: visible summary, four inline errors and first-invalid focus on amount. `.cache/ux165/admin/quote-validation/state.json` and `blank-quote.png`. No quote was issued.
- The fixture has one submitted synthetic order and portal-local profile/session values. Missing fixture endpoints deliberately return501. Their service-unavailable screens are **frontend failure-state evidence only**. They do not establish that the real backend failed or that a persisted workflow succeeded.
- No page runtime errors or external requests were observed in the completed runs. An initial harness startup lacked local socket permission; a corrected isolated run was used. One interaction script incorrectly looked for a button instead of the real section link and timed out; its corrected run completed. These are tester/harness faults, not application defects.

## Findings for product/design triage

### A-PRICE01 — money input requires internal minor units (P2 usability risk)

Route: `/orders/:id?section=quote`, desktop and390px. After choosing Quote & agreement, the primary price field is labelled **Pre-discount amount in minor units**. Help says **For example,1234 means12.34**. The visible validation asks for a positive whole amount in minor units. A staff member thinking in dollars must multiply the agreed price before typing, which creates a realistic100× entry risk and adds technical terminology to a routine commercial task.

Expected: currency-labelled normal decimal money entry, an unambiguous formatted total before issue, exact validated conversion to the existing integer API representation, and equivalent handling for optional quote lines. Preserve server validation, rounding, quote preview, explicit customer acceptance and immutable historical contracts. This is a data-entry UX correction; no calculation error has been demonstrated.

Evidence: `.cache/ux165/admin/interactions/order-quote-agreement.png`, quote-validation receipt. Source: `frontend/app/orders/quote-editor.tsx`.

### A-COPY01 — repeated admin headings add avoidable mobile clutter (P3)

Route examples: `/support` shows a page-level Support inbox followed by another Support inbox; `/accounts`, `/content`, `/reports` and `/shop/orders` similarly duplicate their task title. At390px this uses scarce vertical space before the first useful control. The order page itself has meaningful persistent context, which should be preserved rather than stripped.

Expected: keep one task title and use a genuinely distinct subsection heading only where needed. This is a scoped copy/hierarchy refinement; navigation remains operable.

Evidence: `.cache/ux165/admin/mobile/390-support.png`, desktop route receipts/screenshots.

### A-SEARCH01 — global search prompt is visibly clipped (P3)

The staff topbar search visibly reads **Search game or orde** at1440,390 and320px, despite unused space inside the outer search container on mobile. Full intended placeholder is Search game or order ID…; the input has an accessible Search orders label. This does not prevent keyboard access but hides the useful ID scope from sighted users.

Expected: shorter visible prompt (e.g.Search orders…) or an input that uses the available width, with the full accepted search scope available in a clear label/help if needed.

Evidence: desktop `round1/00.png`, mobile `390-finance.png`, `320-orders.png`; `frontend/app/admin/shell.tsx` topbar form.

## A01–A21 ledger

Statuses distinguish observations from unfinished transactional coverage.

| Family | First-pass observation | Still required |
| --- | --- | --- |
| A01 | Panel-local profile/security/sessions/recovery/preferences rendered; sign-out/menu context clear; existing authenticator instructions retained | Real invited email/MFA enrollment/sign-in; administrator versus owner; wrong portal/recovery/fresh-action branches |
| A02 | Order queue and seven local sections rendered and clicked; same order identity retained; mobile drawer Escape/focus passes | Real queue filtering/back restoration and persisted stale edits |
| A03 | Original manual-review estimate shown; final-quote form and blank validation reviewed; A-PRICE01 | Customer-created numeric estimate, actual quote/revision/acceptance handoff |
| A04 | Unpaid assignment/delivery refusal clearly explained | Paid assignment, scheduling/hold/proof and booster continuation |
| A05 | Inbox filters and failed-load retry rendered; duplicate heading noted | Persisted customer reply/internal note/delivery/pagination/retry |
| A06 | Order-support unavailable state has Retry; no form mutation attempted | Admin builder→recipient response→secure reveal/share/revoke across roles |
| A07 | Submission queue/detail failed-load states rendered with retry | Customer submission→review→administrator proposal→seller acceptance |
| A08 | Listing list/detail failed-load states rendered | Public image/terms/preview/publication/archive and buy-first/consignment constraints |
| A09 | Finance tabs/queue failure state clear and responsive | Actual fixture invoice/provider exception evidence; administrator denial |
| A10 | Finance shell rendered | Cases/disputes/appeals/refund decisions with real isolated records |
| A11 | Finance shell rendered | Owner manual payout eligibility/receipt/duplicate/hold; no real transfer |
| A12 | Finance policy section reachable | Isolated draft/preview/errors/history and fresh verification |
| A13 | Catalog failed-load state rendered | Realistic MLBB linked choices, price rules, offers/art and safe publication |
| A14 | Shop list/editor/delivery failed-load states rendered | Product/variant/recipient/stock editor, saved/public contract and customer delivery |
| A15 | News create/list/editor shells and failure states rendered | Article cover/inline media, schedule/preview/publish/correct/history |
| A16 | Review queue/detail failure states rendered | Eligible customer review→moderation/respond/appeal |
| A17 | Customers/staff filters and invite disclosure rendered | Actual owner invitation/admin denial/role/suspension/recovery/audit |
| A18 | Calendar failed-load state rendered | Real availability/session conflict and three-role update |
| A19 | Content/coupons failure states rendered | Draft/preview/validation/history and retained agreements |
| A20 | Privacy review failure state rendered | Disabled deletion guidance, real export/request/hold and permission checks |
| A21 | Reports empty filter entry and jobs/media/alerts failure states rendered | Populated report/export, job recovery history, scan/media controls and alert action |

## Shared exception ledger

X01 local section navigation and menu return observed; X02/X04 explicit failed-load and limited empty/populated fixture states observed; X03 blank quote validation observed; X08 desktop/390/320 observed; X09 semantic section links and menu Escape/focus observed; X10 findings above; X12 unpaid fulfillment explanation observed. Actual identity/mutation/concurrency/protected media classesX05/X06/X07/X11 and broader branches remain pending persisted testing. No comprehensive pass is claimed.

## Handoffs and next review

The engineer is preparing the real local three-portal API, database, Mailpit and fake provider. Use synthetic `desktop_owner`, a separate administrator identity and shared customer/booster records. Record those actual attempts in an appended round; never replace the frontend-only qualification label with a database claim. Root coordinates the customer custom order and seller/buyer chain. No application code was edited by this tester.

## Round 2 — persisted local owner workflow (completed wave)

The real isolated API became available at `playora.localhost`, `admin.playora.localhost` and `pro.playora.localhost` on port4173, with local database, Mailpit and fake payment provider. No production identity or service was used. The owner signed in using the actual email code UI and enrolled an authenticator through the actual QR/setup UI. The synthetic seed/session are private local files; codes are not report material.

Completed actual workflows:

- **A01/A17:** Normal owner email/MFA enrollment. Created a separate synthetic administrator via Customers & staff→Add staff access, with the independent-account confirmation. UI explicitly confirmed no invitation email was sent. New administrator ID`f91efa58-e6e4-4912-90f4-77e23c7dff30`; its normal sign-in and permission comparison remain pending.
- **A13:** Created `UX165 Mobile Legends` / `ux165-custom` (`ff387430-262b-458d-946d-0cba626e41b3`), imported the repository's realistic MLBB configuration through the actual import editor, reviewed the draft, checked explicit review, saved, previewed and published. This published only the isolated testgame. Rich linked fields, estimates, fixed packages and seller intake are now available for customer handoffs. File-based authoring supplied the existing JSON, but creation/import/review/publication were UI actions.
- **A12:** Authored complete synthetic payment terms in the actual UI, saved, previewed and explicitly published. Initial route was amended to `usdttrc20` / `trx` before customer checkout to match the fake provider's actual network contract. This was fixture setup correction, not a production policy change. Checkout enabled/outgoing disabled remained as provided by the isolated environment.
- **A05/A06:** Replied to Customer3 thread`01a141ca-3f25-7196-82fc-52c0a2f8b893`, separately saved an internal staff note, then authored/previewed/sent `UX165 seller test details` with ordinary contact time and protected synthetic note. Customer response/privacy cross-check pending their resumed wave. No duplicate public reply was sent after the first script used an incorrect internal-note button label; the retry continued only the unperformed actions.
- **A02/A04/A14:** Customer2's real synthetic shop order`4d2442bc-d50b-4fc9-b125-164122f293a6` arrived paid/queued after the customer's fake-provider webhook. Staff claimed it, checked blank-note inline validation, explicitly revealed/hid recipient details, uploaded the repository's synthetic proof PNG through the scanner, published proof in Messages, submitted delivery and approved it. Order now completed, revision5. No real supplier purchase/delivery occurred. Customer-side proof/receipt/review remains their next step.
- **A04:** Customer2 fixed package`3b6738bf-fe76-49d8-8237-3c47ce388290` was queued but the assignment list was empty until the booster completed normal MFA. After their enrollment, assigned it through UI to `desktop_workbooster` (revision3), enabled shared coordination, sent an ordinary coordination message and an assigned-booster-only form `UX165 booster readiness details` with ordinary/protected fields. Customer-required order details and booster progression remain pending.
- **A15:** Created article`d50d7136-6ad0-4e79-97be-c7631ab640ae` in the synthetic MLBB game. Blank creation fields produced inline focus. Edited type/slug/summary/author/source, uploaded and selected a scanned cover, wrote a paragraph, reviewed rights, saved, opened private preview and published normally. Public synthetic slug`ux165-next-step-guide`. Multiple inline-image rows, scheduling/correction/archive still pending.
- **A02/A05/A07–A21 read-only:** Visited28 main owner routes/finance sections against actual persisted data; no alerts or document overflow, no runtime errors. These observations do not complete each mutation family. Reports, jobs, privacy, governance, payouts and cases still need their consequential branches.

Evidence under `.cache/ux165/admin/`: `real-routes/routes.json`+28screenshots; `catalog-created.png`, `catalog-preview.txt`, `catalog-published.png`; `policy-published.png`; `c3-form-preview.png`/`c3-form-sent.png`; `shop-claim-validation.json`, `shop-claimed.png`, `shop-submitted.png`, `shop-completed.png`; `fixed-assigned.png`; `booster-form-sent.png`; `news-validation.json`, `news-preview.png`, `news-published.png`. Exact browser traces and blocked/error receipts are in `.cache/ux165/engineering/evidence/ux165-admin-*`. One catalogue attempt overlapped a coordinated frontend build swap and stopped before import; the restored baseline attempt completed and the original failure remains retained.

### Additional confirmed findings

**A-ASSIGN01 — empty staff selector does not explain MFA prerequisite (P2 usability).** On the paid fixed order, Assigned staff contained only Choose staff and offered Save assignment. The endpoint correctly excludes boosters until MFA enrollment; the interface did not say why there were no candidates or what staff should do next. The same order became assignable immediately after normal booster enrollment. Expected: explicit empty-state reason and next step, refresh action, and disable assignment until a candidate exists; preserve the server's MFA guard. Source`frontend/app/fulfillment/actions.tsx`, authoritative filter`backend/internal/fulfillment/store.go` Directory. Root notified and correcting.

**A-COPY02 — removed credential-flow terminology remains in coordination (P2 clarity).** Fulfillment→Coordination says “Keep credentials in secure game access.” The standalone flow was removed; current secure exchange is the admin-requested chat form. Expected: explain protected chat fields in the current conversation and retain recipient/fresh-verification safeguards. Source`frontend/app/fulfillment/coordination.tsx`. Root notified.

The Customer3 source concern that proposal next-step guidance incorrectly names Owner for an administrator remains **pending rendered administrator reproduction**. Owner was the actor in this wave; no fabricated comparison is claimed.

### Pending next wave, by family

A01administrator login/negative permissions/recovery; A03customer-created custom quote/revision/acceptance; A04fixed customer-detail→booster work→staff completion and co-playcalendar; A05C2/C5 replies and retry/history; A06recipient replies/reveal/revoke/wrong-audience; A07/A08seller review/proposal/acceptance/listing publication; A09/A10reconciliation/cases/refunds; A11eligible manualpayout/duplicate/hold; A12policy stale/negative guards; A13specific linked-rule and pricing editor mutations; A14new product/variant/publication and stock conflicts; A15inline-image/schedule/correction; A16moderation; A17administrator/owner authority/last-owner/suspension/recovery; A18bookings/conflicts; A19content/coupons; A20privacy/disabled deletion; A21report export/job recovery/media exceptions. Current report is deliberately not an all-flows pass.

## Round 3 — separate administrator and cross-role handoffs

Completed with the same isolated persisted backend and frozen baseline UI. No production data, live provider, funds, email or application source was touched.

- **A01/A17:** The independently invited administrator completed normal email verification and authenticator enrollment. Its session and synthetic seed remain private. Administrator review approval then correctly required fresh action verification; the authenticator modal completed normally. This is distinct from owner authority, not a mocked role.
- **A07:** As that administrator, approved Customer3 submission`5a06cadf-2bb9-499e-a61c-54216ab37278` with a seller-visible reason, then used the published consignment defaults and route to issue an exact synthetic proposal. BaseUSD100,10% seller commission/netUSD90, fixture rate1 and exact90USDTTRC20/trx; no extra delay,48-hour initiation target,7-day offer expiry. UI showed offered and the full preserved terms. Customer3 must now explicitly accept; no payment or publication was inferred. Evidence`admin-proposal-next-step.png/.txt`, `seller-proposal-filled.png`, `seller-proposal-sent.png/.txt` and traces`ux165-administrator-seller-review-r4`/`ux165-administrator-seller-propose-r1`.
- **A03:** Customer1 custom order`2eb8d51d-7ef8-4694-bff3-0eaf21f43470` displayed its originalUSD21.84 estimate. Owner reviewed and issued an exactUSD21.84 quote with24–72-hour scope and48-hour expiry. Customer acceptance/payment and later co-play assignment are pending their wave. Evidence`quote-c1.mjs` and its exact trace/screenshots; no provider request was made by this reviewer.
- **A06:** Created and sent `UX165 fixed boost access request` in Customer2 fixed order`3b6738bf-fe76-49d8-8237-3c47ce388290`→Messages→shared coordination. It uses the explicit Boosting account access purpose, protected account ID/access fields, customer recipient and the explicit currently-assigned-booster sharing checkbox. Customer2 had already supplied ordinary PlayerID/Zone details; this form is the separate requested credential handoff. Evidence`c2-access-request.mjs` and completedr2 trace. Recipient response/readiness remain pending.

### A-SELL01 — administrator next-step guidance incorrectly delegates its permitted action to Owner (P2)

**Rendered confirmation:** after the independent administrator approved review, Overview showed `NEXT STEP · OWNER`, `Prepare a sale proposal`, and a passive `View sale agreement` link. Entering Sale agreement displayed the fully actionable Propose seller agreement editor, and the same administrator successfully issued the proposal. Thus this is a misleading actor/action instruction, not a permission failure. Expected: say Staff/Administrator consistently and offer the authorized preparation action to either permitted staff role, preserving owner-only payout controls. Evidence`admin-proposal-next-step.png/.txt`; source`frontend/app/submissions/selling-progress.tsx`. Root was notified immediately for correction and regression.

Harness limits retained: early seller-review attempts hit duplicated hidden local-panel labels and one omitted the legitimate fresh-verification modal. These were corrected selector/automation assumptions, not product defects; no review action completed until normal MFA. An initial access-form attempt opened the private order conversation where assigned-booster sharing was unavailable and stopped before sending; the completed form used the intended shared coordination conversation. No duplicate proposal, access request or review was submitted. All private contexts were saved for the next wave.

Handoffs sent to root/customer agents: Customer3 agreement acceptance; Customer1 quote acceptance/fake payment; Customer2 requested protected answer→booster fulfillment. The comprehensive A01–A21 ledger remains partially complete; later publication, delivery, finance, governance and exception branches listed above are still pending.

## Round 4 — corrected candidate listing, assignment and protected answer review

Used `real-browser-candidate1.mjs`: the same local portal URLs resolve to the corrected frontend at private port4187, with the original isolated API/database. This qualifies these rendered frontend changes against the existing backend; it does not prove the new unread backend implementation.

- **A07/A08:** Customer3 accepted the proposal in their own wave. Independent administrator returned to submission5a06cadf; Overview correctly showed `NEXT STEP · YOU` and Prepare listing. Created listing`3a03b89e-8cbd-4cb8-94e3-fcc45485c922`, filled public title/description/region/rank, selected and viewed the seller's scanned synthetic PNG, chose it as cover, applied approved buyer terms, set1–24-hour delivery and168-hour inspection, saved and previewed. Verified baseUSD100+USD5 buyer commission=USD105. Published through the normal explicit public-content checkbox/action. No credential form was requested from the seller and no credential prerequisite blocked publication. UI reported published. Customer4/root received the listing ID for the buyer journey. Evidence`listing-source-review.png`, `listing-preview.png/.txt`, `listing-ready.png`, `listing-published.png/.txt` and exact traces`ux165-admin-listing-*`.
- **A04/A18:** Customer1's quote acceptance and fake-provider-confirmed payment arrived in the database. Administrator assigned custom play-together order`2eb8d51d-7ef8-4694-bff3-0eaf21f43470` to the normal MFA-enrolled synthetic booster, enabled shared coordination and sent a scheduling message. Customer/booster informed. Session proposal/conflict/progress remains their next step; no invented completion. Evidence`custom-assigned.png` and `ux165-admin-custom-assignment-r1` trace.
- **A05/A06:** Customer3 completed the presales ordinary/protected form in their own wave. Administrator opened the answered form, performed authorized protected reveal, confirmed the revealed state, explicitly hid it, and verified the return to masked state. Staff-only note was visible to administrator; Customer3 independently verified its absence and the protected value's absence from customer message history. Evidence`c3-response-review.json`, `c3-response-hidden.png`, trace`ux165-admin-c3-answer-review-r1`. Synthetic protected values were not printed in the receipt.

One exploratory listing edit closed without saving after inspecting the fields; the next run deliberately re-entered those values and saved before publication. This is a reviewer boundary, not a lost-save defect. Source image was a tiny synthetic scanner fixture, not meaningful promotional art; cover selection and access worked, but this does not qualify real-world image aesthetics. Successful publication reset preview/review checks for the next revision while clearly showing `This account is live`; not counted as a blocked publication.

The administrator and owner sessions remain privately saved. Next required wave: buyer delivery/access and acknowledgement, booster completion, Customer2 service case, eligible owner-only payout and negative guards, broader governance/authoring/report/export exceptions. No full suite or production operation was performed.

## 18 October continuation — R2 prerequisite rebuild and first handoff

The prior bounded environment ended. Its actual user-flow evidence remains intact; this is **a new synthetic database**, not the same persisted continuation. Current-source fixture `interactive-r2` runs isolated three-portal origins and disables outgoing transfers. Normal test owner email sign-in and authenticator enrollment produced private R2 state; customer seller/buyer and co-play customer/booster likewise used ordinary email/MFA controls. No old sessions, production records or live services were reused.

To avoid repeating previously observed UI authoring solely for setup, the following prerequisites were rebuilt through the real authenticated local APIs. These are explicitly **setup receipts, not fresh UI passes**:

- Current MLBB test fixture, including the corrected protected-chat guidance, published as `ux165-r2-custom`, game `2d68e3f8-e692-4879-8eda-de51c3887c32`, release `9605e736-8989-4bf0-91ef-d136050c9f62`. Review policy expressly allows honest critical feedback and forbids private data/spam/abuse.
- Fake-provider policy published with `usdttrc20`/`trx`, merchant fees, fixed rate, 30-minute checkout and existing generous case/appeal limits. No production configuration changed.
- Seller submission `2199b3c3-ad35-49d3-a4bb-0c168529f252`, accepted consignment offer `98365171-80e9-405c-9929-67fd042272e8`, and listing `597d0f08-9776-4784-820a-e99c766574c6`. Preserved USD100 base, USD10 seller commission/netUSD90 and USD5 buyer commission/totalUSD105. Publication used no credentials.
- Buyer order `eb5618f2-d0d3-4f9c-ae7d-8afacb2553b5` is queued after a signed **isolated provider** event and the actual worker allocation, not direct financial-row edits. It awaits delivery.
- Customer1 co-play order `2c3f9be6-5e90-4006-9314-98b308855591` accepted the exact USD21.84 quote and passed the same fake-provider verification. Assigned booster completed normal MFA, and a fresh future UTC availability window was published. Coordination creation was not performed before the local listener became unavailable; that continuation remains pending.

Setup validation correctly rejected a guessed rank key, a zero-hour delivery lower bound, and a one-hour inspection period. Corrected inputs used the actual catalog rank key, 1–24-hour delivery and the required168-hour inspection. An initial unassigned fulfillment GET returned404 because no assignment record existed; the supported assignment initialization created it normally. These are preserved setup mistakes/guards, not new product failures. The seven-day hold must remain: this fresh consignment cannot honestly be described as immediately payout-eligible. Eligible manual-recording UI will require a separately labelled fixture and controlled-clock domain evidence, without backdating this interactive sale.

**Actual new A06 UI action:** After the buyer's verified fake payment, the owner opened the seller's Messages & photos, authored the seller-access request, previewed and sent it. It is addressed to the seller and contains protected fields. Screenshot `.cache/ux165/admin/r2/seller-access-requested.png`; trace `ux165-r2-admin-seller-access-request`. Customer3 response and subsequent staff-to-buyer sharing remain pending. The R2 seller page repeats **Messages & photos** in two consecutive headings; root was notified as a narrow remaining A-COPY01-style hierarchy issue, not a broken task.

Private setup scripts/payloads/session files are under `.cache/ux165/admin/r2/`. Financial and credential fixture values do not belong in the public report. Local frontend connection refusal interrupted the next setup action; root was notified and the original attempt retained. No production activation or full gate was run.

### R2 lifetime interruption and R3 replacement (18 October)

The R2 frontend/API were owned by a completed worker process and ended during the next navigation. Root established **R3** with a root-owned bounded process, corrected API snapshot and newer frontend snapshot. R2 receipts are preserved but its private sessions/IDs were not reused. The same validated prerequisites were replayed through normal fresh sign-in and authenticated APIs; no production or direct database edits occurred. R3 files are in `.cache/ux165/admin/r3/`, and the helper is `real-browser-r3.mjs`.

Current shared IDs:

| Resource | R3 ID / state |
| --- | --- |
| Rich synthetic game | `ux165-r3-custom`; game `45638393-8ab6-4583-9c42-d767c35cb961`; release `712b3db6-a26c-45ac-96b5-0bce90bdc3d8` |
| C3 accepted submission / offer | `9b9a0432-72b1-424f-9bec-73eccb91f014` / `bb3711d9-f2cc-4846-804d-faa1fb07c0fe` |
| Account listing / paid buyer order | `0dc521b2-0107-4011-908e-7e6e89d8c6fd` / `f3967bd8-e5bc-43dd-8427-6c44a17af105` |
| C1 custom co-play | `29e35fd5-4ddc-44d2-9f41-24bb41cc81a7`, USD21.84 paid/queued, assigned, coordination enabled; fresh UTC availability |
| C2 fixed boost | `b7ae8943-7de8-4b24-8e5a-0986079cd7fb`, completed; current rich release enables the review policy |
| C2 shop order | `191b0ddd-14e0-4f60-9db3-6a9cf27275b4`, completed |
| C2 shop review case | `2bf5de93-5eb4-4e8e-b41f-9c0b52a874a1`, created for payment-evidence review |

The fixed-order restoration used normal APIs: actual fake-provider verification, active MFA booster assignment, ordinary later-stage data, admin-requested protected chat form and customer reply, then valid start/progress/submit/staff approval. It is explicitly setup, not another manual UI pass. An initial approval payload supplied100 in the progress field; server correctly rejected it because the completion action sets100 itself. The corrected approval sent0, preserving the guard and failed setup receipt.

**New actual UI observations in R3:**

- A06/A08: owner requested seller access after verified payment; Customer3 independently completed the requested form. Owner opened the answered form, revealed the invented protected details, hid them immediately and closed the dialog. The first script guessed a nonexistent Show protected answers label and timed out; the corrected run used the actual **Reveal protected details / Hide details now** controls. This was a tester locator error, not a product defect.
- Owner then authored a separate **buyer_access** share in the paid buyer's order conversation, previewed and sent it. The buyer's secret is absent from ordinary chat history. The delivery form still required the explicit ownership checklist and review checkbox. A blank checklist attempt was validated; after ordinary synthetic instructions, **Deliver account access** completed and the success region appeared. Screenshots `buyer-access-shared.png`, `account-delivered.png`; trace `ux165-r3-delivery-confirm`. Buyer acknowledgment/inspection/payout hold remain the receiving agents' continuation, not an inherited pass.
- A14: on C2's fake-paid shop order, the owner uploaded `frontend/tests/fixtures/proof.png` through the real local scanning path, waited for readiness, published a proof message, submitted delivery and explicitly approved it. UI showed completed/revision5 and a proof link; no supplier API or real delivery was contacted. Evidence `shop-submitted.png`, `shop-completed.png`, trace `ux165-r3-admin-shop-deliver`.

**Correction to the earlier duplicate-heading interpretation:** R3's DOM probe establishes that the first Messages & photos occurrence is a1×1px absolutely positioned, clipped **screen-reader-only legend**. Only the following H3 was visibly rendered. Therefore a transcript alone did not establish two visible duplicate headings. Root/senior design may still simplify the generic subsection header in favor of the meaningful conversation subject, but that is a scoped hierarchy decision; retain the accessible legend. Exact geometry is in `message-heading-probe.json`. The staff-view privacy sentence should name the seller rather than misleadingly say “you”; final changed-source review is pending.

- **A10 actual R3 case decision:** the case's blank reply produced visible validation. Owner sent a customer explanation and separate staff-only rationale, then proposed **retain** with an explicit customer-facing acceptance/appeal explanation. The case became decided with a30-day appeal deadline, no refund proposal and no outgoing payment. Evidence `shop-case-validation.json`, `shop-case-decided.png`; trace `ux165-r3-admin-shop-case-decision`. Customer2 must still inspect internal-note exclusion and exercise the receiving appeal/acceptance action.

R3 wave status: seller-access→staff reveal→paid buyer delivery is ready for Customer4; co-play scheduling is ready for Customer1/booster; completed fixed receipt/review and shop decision are ready for Customer2. Remaining staff authoring/governance/operations groups A09–A21 and administrator-only versus owner checks still require the next finite wave. This wave deliberately releases its agent slot for the receiving customer; it is not a final all-family pass.
