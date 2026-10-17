# UX165 task-based usability research

16–18 October 2026. Researchers: independent senior UX researcher agents `ux165_researcher` and `ux165_researcher_r2`. Status: **protocol and evidence synthesis checkpoint complete; remaining actor continuations and final closure pending**. This document does not certify the current site or claim every possible state was exercised. The original protocol is retained below; its early task numbers are mapped to the canonical coverage families in the continuation section.

## Scope and evidence standard

The owner requested five independent customer perspectives, one administrator/owner and one booster, with product/design/research synthesis and software review. Start with the 31 accepted journeys and six shop/news journeys in `journey-evidence.json`, then add the later independent identities, commissions, manual payouts, chat forms, upload/session and UX159–164 changes. Use the current product behavior, not obsolete design screens, as the acceptance baseline.

Each participant must attempt the common tasks and all assigned specialist tasks. A specialist assignment adds depth; it does not replace checking that the other customer services can be found and understood. Record a task as attempted, completed, blocked, or not attempted. “No issue found” requires an observed attempt, not source-file presence or an old test pass.

For each observation retain: task ID, role, route/section, viewport/browser, initial state, exact steps, expected outcome, actual outcome, screenshot or local trace, relevant source revision, and whether the result was repeated. Record the first impression before reading source or receiving assistance. If a teammate explains the workflow, label subsequent success **assisted**. Do not fabricate elapsed time, confusion, human satisfaction or participant quotations for an agent exercise.

Evidence labels:

- **Observed:** reproduced in rendered current software or a clearly identified isolated fixture. State which; a fixture is not production verification.
- **Source-confirmed:** behavior established by inspecting a specific implementation or contract, without a rendered reproduction.
- **Inferred:** plausible risk requiring an attempt; never count as a discovered defect.
- **Untested:** absent environment/state/access or a deliberate boundary. Explain the remaining gap.
- **Historical:** retained earlier evidence useful for prioritization, not a new UX165 pass.

Use isolated synthetic accounts, orders, assets and provider responses. Keep all staff permissions, MFA, ownership and financial guards. No live customer message, email, invoice, transfer, policy/catalog publication or production order is needed for this exercise. Provider fixtures qualify application behavior, not real funds movement or provider settlement. No arbitrary time estimates, scarcity, inventory, win-rate guarantees or service promises should be invented.

## Usability rubric

Score each dimension only after a task attempt: **0 blocked**, **1 completes with substantial confusion/workaround**, **2 completes with minor friction**, **3 clear without assistance**, or **N/A/not observed**. Scores organize findings; they are not a statistically valid human usability study.

| Dimension | Questions to answer from the attempt | Required outcome |
| --- | --- | --- |
| Findability | Can the actor find the service, record and intended action from their normal entry? | Clear labels and one obvious path; no URL guessing or inspector use. |
| Context and progress | Can they identify the game, service, account/order, current state and next actor? | Persistent record context; local tabs stay inside the record; back returns to the relevant list. |
| Next action | Can they state what to do now and what blocks unavailable actions? | Primary action matches current eligibility, with a reason and actionable recovery for blockers. |
| Price and terms | Can they distinguish estimate, final quote, total charged, seller proceeds and provider/network fees? | Exact accepted terms and fees are visible before commitment; estimates are not promises. |
| Input and validation | Can they complete fields and recover from missing/invalid/server-rejected input? | Specific inline error, first-invalid focus, retained safe entries, linked dependencies explained. |
| Submission and recovery | Do loading, success, pending, uncertain and failure states communicate truthfully? | No double action, false success, erased safe draft or unexplained dead end. |
| Communication | Is message audience, send status, attachment state and secure-field handling clear? | Customer/public, staff/internal and protected answers remain visually and technically distinct. |
| Mobile and keyboard | Can they see and reach controls at narrow/short heights, with keyboard focus and dialogs? | No horizontal page overflow, hidden action, overlapping sticky surface or focus escape. |
| Content and hierarchy | Does each text block help the current decision, and are related elements aligned? | Concise task copy, grouped fields, consistent spacing, readable error/status/price hierarchy. |
| Trust and control | Does the actor know when they are committing, disclosing or leaving for payment? | Deliberate confirmation for consequential actions, clear recipients and successful return/recovery. |

Severity: **P0** privacy/authorization/funds integrity exposure; **P1** main task blocked or misleading commitment; **P2** repeatable confusion, error recovery, inaccessible control or substantial friction; **P3** small copy/alignment inconsistency. Cosmetic preference alone is not a defect. Product manager decides priority; designer decides interaction/visual remedy; engineer validates state and security consequences.

## Common customer tasks — all five participants

| ID | Attempt | Branches to include |
| --- | --- | --- |
| C01 | Start from Home, understand the five services and choose a game. | Select each homepage service, keyboard navigation, all available/paused game states, persistent game context and return to chooser. |
| C02 | Locate boost, accounts, shop, news, game FAQ and contact options. | No session; contact must remain useful without forcing sign-in; paused/empty services explain availability. |
| C03 | Enter each service and explain what is bought, what happens next and the price/terms. | Fixed versus custom boost; manual shop fulfillment; account buyer fee; unavailable offer and missing-policy state. |
| C04 | Sign in and return to the intended action. | Email missing/invalid, missing consent, challenge, wrong/expired code, resend cooldown, Google cancellation, expired session and wrong portal. Use fixtures for email/Google. |
| C05 | Explore My account, order list, an order and every local section. | Overview/messages/progress or delivery/payment/help, direct section link, refresh, Back/Forward, filtered-list return and an inaccessible record. |
| C06 | Contact support and exchange a synthetic message with the admin actor. | Public contact, pre-sales and order/seller thread; pending/retry/offline, attachment rejected/processing/ready and preserved text draft. |
| C07 | Read and answer an admin-requested chat form. | Ordinary/secure fields, missing answer, submission success, wrong recipient, revoked request, protected reveal/blur/navigation and clear audience. |
| C08 | Locate profile, preferences, sessions, security and email recovery. | Independent customer identity, loss-of-access modal, safe draft retention, sign-out; deletion disabled must remain truthful. |
| C09 | Check shared responsive and recovery behavior. | Desktop, 390 px and at least one 320 px/short screen; keyboard-only; loading/empty/422/429/503/offline; zoom/enlarged text where available. |

## Specialist customer tasks

| Participant | Task IDs and journey coverage | Detailed attempts |
| --- | --- | --- |
| Customer 1 — custom boost | CB01–CB06; F01/F08/F13/F18/F19 | Build MLBB preferences including role-first and hero-first links; region/server both directions; win-rate modes and delivery-hour range; observe live estimate and pending/error state; submit invalid then valid request; preserve values across sign-in/review/back; identify estimate versus final quote; request clarification, receive changed/expired quote and accept current terms; complete isolated checkout; arrange co-play session and timezone conflict; track progress/proof, request help, review eligible completion and reorder against current catalog. |
| Customer 2 — fixed boost and checkout recovery | FP01–FP06; F02/F04/F05/F18 | Compare illustrated fixed packages, verify admin-set scope is not a custom form, check eligibility/stock/expiry/version change; apply valid/invalid coupon; submit twice or lose first response; navigate hosted checkout and return; unpaid/expired/partial/over/late/unknown provider states; cancellation before and after payment, dispute/refund request and appeal; no fulfillment from a redirect alone. |
| Customer 3 — seller | SL01–SL07; F06/F07/F11/F17 | Find Sell from game Accounts; fill metadata and skin type/count/names, linked regions/servers; upload valid/oversize/unsupported images and recover; submit/revise/withdraw; identify admin versus seller next action; review/accept/reject changed consignment and buy-first proposals with 10% deduction and fixed crypto quote; see listing preparation/publication state without compulsory credentials; respond to optional admin chat form; identify hold/due/recorded manual payout and destination-confirmation steps. |
| Customer 4 — account buyer | AB01–AB06; F03/F04/F05/F11/F19 | Browse/filter the listing prepared by seller/admin; inspect title/gallery and public metadata; understand base plus 5% buyer charge; reserve, encounter another buyer conflict or expiry, accept current terms and use isolated checkout; open order context, receive credential details through protected chat form, acknowledge correct account delivery, raise issue/appeal, and review eligible completion. Never expose seller-private fields in listing or customer chat. |
| Customer 5 — shop, news and account management | SN01–SN07; SN01–SN06/F10/F18/F20/F21/F25 | Discover shop variants, recipient fields, stock, final price and manual delivery terms; fail recipient validation, order, see staff clarification/hold/proof and acknowledge delivery; expired reservation/late payment recovery; browse/filter/read news types, article images and unavailable/redirected article; favorite unavailable items and subscribe/unsubscribe to availability; notification deep link/read state, profile changes, session revocation and data export; disabled deletion never implies a submitted/completed deletion. |

For seller→buyer interaction, reuse the same isolated listing and record identifiers. For custom boost→booster interaction, reuse the same isolated order. Independent stateful fixture sessions are useful for repeatable UI failure branches; label them explicitly and do not call them a cross-role database handoff unless the same backend records were exercised.

## Administrator/owner tasks

| ID | Flow | Attempts and clarity checks |
| --- | --- | --- |
| A01 | Entry and authority | Separate admin email/Google fixture entry, invitation denial, MFA enrollment/challenge/recovery, panel-local security and sessions; distinguish owner-only controls from administrator permissions. |
| A02 | Custom and fixed order triage | Queue filters, original customer estimate/preferences and contract; clarify/reject with reason; preview/issue/change quote; assignment, holds, paid prerequisites and admin-reviewed completion. Preserve list context and safe editor state across local tabs. |
| A03 | Seller agreement and publication | Review Customer 3 submission, approve/request revision, propose exact terms as administrator and owner; accept only actual seller acceptance; prepare title image/public fields, preview and publish isolated listing. Consignment credentials are not a publication blocker; buy-first actual payment evidence remains a guard. |
| A04 | Chat and protected forms | Reply to every customer, send internal note separately, create ordinary/secure form with explicit recipient/purpose, inspect response via permitted reveal, share protected delivery with correct buyer/assigned booster, revoke and test wrong recipient. |
| A05 | Fulfillment and scheduling | Assign Customer 1 order to booster, review availability/session conflict, send instruction, inspect progress/proof, request correction and approve completion; customer progress must reflect the accepted state. |
| A06 | Finance and remedies | Find payment exception, explain invoice/provider status, review dispute/appeal/refund; manual seller payout amount/asset/network/destination/hash confirmation as owner, duplicate handling and hold reasons. No automatic outgoing transfer or real payment. |
| A07 | Catalog and pricing | Edit linked fields/rules, option label/key, region/server and role/hero relations, live estimate rules, fixed-package contract/artwork and default/uploaded game image; missing fields, invalid dependency/cycle, stale draft/preview, publish conflict and historical snapshots. |
| A08 | Shop and articles | Draft item/variant/recipient/stock/price/title image, preview/publish/pause; fulfill Customer 5 synthetic order after verified fixture payment; author news/patch/guide with cover/inline images, schedule/cancel/revise/archive, reader navigation and old-slug return. |
| A09 | Supporting operations | Roles/invitations/suspension/recovery, reviews moderation, media scan/rejection, public policy/coupon preview, reports/filter/export/source return, alerts/jobs/retry and retention disabled. Explain dangerous action before verification modal; cancel must not execute it. |
| A10 | Error and mobile pass | Form422, stale409, expiredverification, service503, emptylists, unknown outcome, narrow/short views, keyboard/focus and confirmation modal. Backend inspector must not be required to understand an ordinary user-fixable failure. |

## Booster tasks

| ID | Flow | Attempts and clarity checks |
| --- | --- | --- |
| B01 | Independent entry/security | Invited versus uninvited entry, email and Google fixture, MFA setup/challenge/recovery; panel-local settings/sessions, correct return and no customer/admin identity reuse. |
| B02 | Assigned work | Empty queue, filters, exact assigned order/context, instruction/accepted scope and due timing; unpaid/unassigned/revoked/held states explain the reason and do not expose protected information. |
| B03 | Coordination | Availability and timezone, proposed/confirmed/conflicting/rescheduled sessions, no-show state, messages with known audience, private access only when allowed. |
| B04 | Progress and proof | Start eligible assignment, update progress/match data, upload valid/rejected/pending proof, preserve failed submission, submit completion for review, handle correction and finalized read-only state. |
| B05 | Boundaries and recovery | No customer price changes, quotes, refunds, payout controls or final completion authority; revoked assignment clears protected content; back/deep links/reload, network/session failure and narrow-screen navigation. |

## Routes needing explicit observation

Source inventory: `frontend/app/routes.ts`, `frontend/admin-app/routes.ts`, `frontend/booster-app/routes.ts`. Production hosts normalize admin/pro paths; tests must identify the actual portal origin and not assume a shared customer login.

- Game shell children: `/games/:slug/services/:service`, `/packages/:pack`, `/accounts/:id`, `/shop/:id`, `/news/:article`. Test retained game context, no repeated/overlapping hero or confusing Back target.
- Customer records: `/orders/:id`, `/sell/:id`, `/support/:id`. Test all local section states and next actor/action after every handoff.
- Customer intent/auth: `/sell/new`, `/login`, `/account/*`, `/favorites`, `/availability`, `/notifications`, `/privacy`. Test return context, separate privacy/status semantics and unavailable destinations.
- Admin records: `/orders/:id`, `/submissions/:id`, `/accounts/:id`, `/support/:id`, `/shop/:id`, `/news/:id`, plus `/catalog`, `/finance`, `/content`. These have high density, many stale-version/verification branches and consequential transitions.
- Admin secondary operations: `/customers`, `/media`, `/alerts`, `/privacy`, `/reports`, `/jobs`, `/reviews/:id`, `/coupons`, `/calendar` and `/account/*`.
- Booster: `/orders/:id`, `/support/:id`, `/calendar`, `/account/*`; assignment-scoped data and portal context are primary risks.

This is a risk inventory, not a list of observed UI defects.

## Research findings before participant runs

**R-DOC01 — source-confirmed documentation drift, P2 for test accuracy.** `FLOWS.md` F06/F07 and `JOURNEY_QUALIFICATION.md` still name standalone Secure handover as part of sale/publication, while the delivered chat154 behavior removes it from navigation and consignment publication. `IMPLEMENTATION_CONTRACTS.md` also retains the earlier two-build/role-sharing architecture. These are historical design contracts, not evidence of current UI regression. Use current routes and later delivered rules as the test baseline. Add a current-behavior note or successor index so future reviewers do not demand removed controls or misunderstand independent identities.

**R-GAP01 — historical evidence limitation, not a defect.** UX164 live checks covered unauthenticated portal entry and homepage interactions; they explicitly did not exercise authenticated live purchases, account sales, chat forms or funds. UX163 observed modal layout/focus but did not submit recovery. This review needs isolated authenticated interactive attempts to assess those tasks. Never relabel existing read-only passes as complete transaction coverage.

**R-GAP02 — untested channels.** Real assistive technology, physical-device keyboard/touch behavior, actual email/Google delivery and live provider settlement cannot be certified by agent fixture exploration. Preserve these limits in the final report even after all reproducible application findings are fixed.

## Synthesis and closure procedure

1. Import each role's attempt ledger and evidence. Deduplicate by underlying cause, retaining every affected route and actor.
2. Distinguish business-policy safeguards from usability defects. Improve their explanation/next step without weakening verification, accepted agreements, payment evidence, recipient binding or permission isolation.
3. For every proposed fix state the problem, smallest clear outcome, expected improved task, affected branches and regression check. Avoid widening into a new feature without owner direction.
4. Designer inspects current rendered evidence and the fix. Engineer verifies authoritative state, errors, permission, race/duplicate behavior and data handling. Researcher checks the fix addresses the observed task rather than hiding an error or only polishing a screenshot.
5. Repeat the exact failing task on the changed source and one adjacent branch. Close only with evidence; mark untested areas explicitly. Report corrected, still open, intentional policy constraint and out-of-scope/untested separately.
6. Final report lists actual changes and remaining limits. “No remaining actionable findings in the reviewed scope” is valid; “every possible flow is bug-free” is not supported by this method.

Participant synthesis will be appended after the seven role agents supply their results. No application code or production state was changed by this initial research stage.

## Evidence synthesis checkpoint — 18 October 2026

Reviewer `ux165_researcher_r2` read all five customer reports, the administrator/owner and booster reports, the canonical coverage worksheet, product decisions, current senior rendered design results, engineering results and the implementation worklog. This is an independent research synthesis of recorded agent observations. It is not another manual browser run, a human study, a satisfaction survey or final acceptance. No participant quotation, completion time, score or success percentage is inferred.

### Correct interpretation of the task IDs

Use `UX165_COVERAGE.md` for all new receipts. The initial research tasks remain useful prompts, but their numbers **do not equal** the later canonical family numbers. Prefix the original numbers with `R-` when referring to them in new notes. In particular, original research C04 is sign-in; canonical C04 is custom boost.

| Original research prompt | Canonical customer families / shared checks |
| --- | --- |
| R-C01 — home and game discovery | C01; X01 navigation, X08 responsive and X09 keyboard |
| R-C02 — locate services, FAQ and contact | C01, C14, C16, C17, C20; discovery only, not transaction completion |
| R-C03 — understand service and price/terms | C04–C07, C12–C16; only the service actually attempted can be credited |
| R-C04 — sign-in and intended return | C02, C03; X05 identity boundary and X07 verification/dialog behavior |
| R-C05 — account, orders and local sections | C08, C20; X01 navigation/context |
| R-C06 — support, messages and attachments | C09; C08/C11 where embedded; X04 retry and X11 media |
| R-C07 — requested form and protected answer | C09, C13, C15; X05 recipient access and X07 verification/reveal |
| R-C08 — profile, preferences, sessions, recovery | C03, C18, C20 |
| R-C09 — responsive/error/recovery checks | X01–X12 where actually observed; does not independently complete a commercial family |

Specialist research labels map as follows: CB → C04/C06/C07/C08/C09/C10/C19; FP → C05/C07/C08/C10/C19; SL → C11/C12/C13; AB → C14/C15/C07/C10/C19; SN → C16/C17/C18/C20. These are many-to-many prompts, not automatic family passes. The original research A01–A10 and B01–B05 are also broad prompts; use canonical A01–A21 and B01–B09 for individual staff receipts. None of the three original number ranges should be silently merged with the canonical matrix.

### What the observed feedback establishes

The repeated problem is inaccurate or unnecessarily difficult **task information**: who should act next, what an input means, which message is unread, why an action is unavailable, and where to recover. The evidence does not establish that the approved overall theme needs replacement. Participants also documented successful persistent order context, local tabs, visible consent, exact fee breakdowns and clear unpaid boundaries. Preserve those behaviors while correcting the specific friction.

| Observed task problem | Research interpretation and current evidence |
| --- | --- |
| C1-01 and C5-01: ordinary customers are given misleading authenticator/recovery instructions | Different account states need different explanations. Conditional customer recovery copy and the no-codes-yet setup link address the actual decisions; staff protections remain. C1 supplied an independent corrected-render check; the designer later checked customer and staff variants in Chromium/WebKit. C5's own final continuation still needs to acknowledge its state. |
| C1-02 / ENG-03: a sender is prompted to read their own sent message | This is a state-feedback defect, not merely badge styling. Incoming-only unread counts/cursors are now supported by six focused race-enabled SQL cases and the subsequently executed desktop/mobile persisted support browser journey. Do not reuse candidate1's old API as proof of the backend correction. |
| A-PRICE01: staff must translate ordinary money into internal cents | This adds avoidable commercial entry risk. Decimal entry with exact conversion is a suitable correction; silent rounding is not. Both-engine rendered preview checks cover valid amounts, adjustments, invalid precision and retained values after a simulated failure. This is exact preview-request evidence; final staff/customer agreement display still belongs to their actual quote handoff. |
| C3-01 and C4-01: errors belong to the wrong operation or disappear after focus moves | Error context and persistent field association are the required outcomes. Original customers independently checked the fixes at 320 px; designer repetitions cover both engines. The actual invalid file/price still must be rejected. |
| A-SELL01 / C3-02 and A-ASSIGN01: next actor or missing prerequisite is unclear | The administrator actually could propose seller terms despite the old Owner instruction. An invited booster actually became assignable only after MFA enrollment. Correct actor copy and a precise empty-state/refresh action solve the explanation problem without broadening permissions. Designer exact-response checks close the changed presentation; actual authorization observations remain in the staff report. |
| C2-01: fixed-package summary counts locked values as customer work | Counting only editable delivery fields makes the remaining task truthful. Keep fixed scope and exact consent once. Both-engine corrected-render checks passed; a completed fixed-order customer's final receipt/review observation is still a separate missing task. |
| A-COPY01, A-SEARCH01, B-F01, D-MODULE01, D-HEADING01, D-INBOX01 and count grammar | These are evidenced hierarchy, clipping, semantic heading and link-row issues. Scoped designer candidate2–4 observations and interaction checks support the corrections. Do not turn that survey into completion of the underlying business transactions or remove prose/legal link affordances globally. |
| B-O02: UTC scheduling asks about repeated clock hours and repeats entered values | Product's bounded UTC-only simplification removes an unnecessary decision. The booster checked UTC; designer checked UTC/non-UTC control visibility and second-occurrence selection. Actual cross-role booking conflicts and server DST handling remain separate from this rendered proof. |
| B-O03 / ENG-04: unaliased booster appears indistinguishable from support | “Assigned booster” gives useful role attribution without private identity disclosure. Domain/component evidence supports the changed fallback; explicit aliases remain. The relevant role should still observe the corrected label in the current shared conversation. |
| A-COPY02 / C2-02 and C4-02: guidance names removed standalone credential collection | Application-owned coordination guidance is corrected. Active fixture help is updated separately. The historical prepared catalog remains unchanged, and no live-catalog copy defect/publication is established by the imported synthetic text. |

The designer reported a possible additional seller-chat heading duplication after candidate4. The administrator's later r3 DOM probe found an `sr-only` fieldset legend and **only one visible h3**. The original two-visible-heading allegation is therefore not confirmed. Senior design approved a small optional simplification of the generic body heading alongside the selected tab and useful conversation subject; root reports that refinement and clearer seller/staff audience wording implemented, with the narrow rendered check pending. Classify A-MESSAGES01 as this bounded clarity refinement, not a confirmed duplicate-visible-heading bug. A full-page screenshot's sticky-position artifact is also not sufficient to diagnose overlapping controls.

### Safeguards that must not be “fixed” away

- The customer accepts exact quote or purchase terms before commitment. Account purchase displays USD 100 base plus USD 5 fee; the seller separately accepts USD 10 deduction and USD 90 net. These observed synthetic figures do not qualify real provider exchange rates or settlement.
- A provider-page return remains unpaid until a verified isolated event reaches the real worker/allocation path. Local fixture success is not live NOWPayments acceptance.
- Staff sign-in requires MFA, eligible assignment requires enrolled active staff, and protected actions can require contextual fresh verification. The 120-second resend limit correctly rejected early retries. The test helper selecting an old mail code was not an authentication failure to weaken.
- Consignment publication does not require credentials. Protected seller access is requested by staff for the paid delivery workflow. The buyer's recipient/payment boundary, private staff notes, masking and current-booster sharing remain necessary.
- Booster completion is submitted for administrator review, not finalized by the booster. The absence of the final approval control is correct.
- Account-play has no local co-play session tab. The global Sessions route manages sign-in sessions; a script choosing that link is not evidence that an order tab changes context incorrectly.
- Disabled deletion, automatic outgoing transfers, unavailable reviews under the accepted product policy, and inspection/payout holds must remain truthful. A freshly created consignment with a 168-hour inspection rule is not immediately payout-eligible. Use an explicitly separate controlled-clock/domain or response fixture for later eligibility; do not backdate the interactive sale or change its agreement to manufacture success.

### Setup failures and evidence limits

The preserved failed runs include missing exact-response endpoints, guessed selectors and route assumptions, an old-mail-code race, local listener permission/refusal, scanner freshness setup and stale browser-test controls. Those are not all application bugs. ENG-01's missing test vault and ENG-05's obsolete seller journey are fixture/test maintenance; production already registered the form vault correctly. The maintained seller journey now passes on desktop and mobile after narrowly correcting its navigation assumptions.

The original bounded API ended, leaving records without their process-only keys. The later r2 reviewer-owned process also ended when its owner completed. Root reports that the fresh `interactive-r3` process is now root-owned. Treat both interruptions as **local review lifecycle failures**, not application outages. Preserve prior actual observations and failure receipts; explicitly label newly replayed prerequisites as authenticated local setup. Never describe replacement records as the same persisted continuation, reuse old sessions with new keys, or infer fresh UI authoring from setup API calls.

The candidate2–4 design survey/interaction receipts establish the changed frontend presentation. The engineering support/seller browser receipts establish those specific persisted journeys. Neither automatically closes the remaining seven persona ledgers. Route screenshots, no-overflow measurements and axe passes are useful but cannot prove purchase/delivery completion, authorization after state changes, all keyboard behavior or real assistive-technology usability.

### Prioritized remaining observations

1. **Finish the linked seller → staff → buyer delivery transition.** At this checkpoint root reports that C3 has answered the r3 requested seller-access form; retain that actor's appended receipt. Staff reviews and creates buyer delivery for the verified-paid record. C4 reveals/hides, identifies the inspection deadline and acknowledges or follows a separately recorded problem state. Confirm that publication stayed credential-free and that unpaid/other-recipient access is denied. Record the next actor after each transition.
2. **Finish receipt and remedy feedback.** C2 reads fixed completion and the staff case decision; test eligible review validation and moderation without changing an old contract's review policy. C3/owner inspect the real pending/held payout state, then use a distinctly labelled eligible fixture to assess destination, amount/network/hash errors and immutable manual receipt. No crypto transfer is involved.
3. **Finish co-play and changed-access states.** C1 proposes inside a new current availability window; booster/admin confirm and handle a changed/conflicting state. Observe the same booking in all three panels. Use known synthetic assignments for revoke/reassignment checks; a guessed 404 does not prove authorization.
4. **Finish independent customer account/support tasks.** C5 answers its requested ordinary/protected form and checks no-MFA recovery, optional setup/recovery/session behavior. C4/C5 inspect the actual downloaded export contents and ownership, not just the success notice. Revoke a persona's active session only after its dependent handoffs finish.
5. **Complete each customer's canonical passport and bounded staff groups.** Each C1–C5 needs its own meaningful C01–C20 attempt or a precise remaining limit; specialist evidence cannot stand in for another persona. Reuse unchanged dated observations instead of repeating them. API-seeded prerequisites and rare response-fixture failures are acceptable only when separately labelled. Admin and booster finish the finite governance/authoring/operations and permission groups already listed by product.

### Final-quality criteria

- One deduplicated issue row identifies the original observation, source correction, focused regression, corrected render and receiving actor's outcome. State whether the result is actual persistence, rendered response fixture, source-only, historical or untested.
- The final report distinguishes **corrected application defects**, **correctly enforced safeguards**, **test/reference maintenance**, and **remaining unexecuted limits**. Do not blend these into an invented defect total or completion percentage.
- Every currently confirmed required fix has a relevant changed-source recheck and an adjacent branch. The new optional seller-chat simplification needs its own narrow designer round trip; already reviewed unrelated pages do not need another broad sweep.
- Each linked story records a coherent actor/state handoff, rather than unrelated success screens. Setup recreation is explicitly disclosed. No claim of “all possible flows” or “zero bugs” is justified by this method.
- Real Google/email delivery, real payment settlement or supplier fulfillment, physical devices, actual assistive technology, all timing/concurrency permutations and production recovery remain outside these agent observations. Keep those limits even if the finite passports are complete.

**Research checkpoint verdict:** the observed corrections address real task feedback and preserve required controls. Continue the finite handoffs and per-persona passports before final research closure. No additional broad redesign is supported by the evidence reviewed here. This researcher changed only this report; no application or production state was altered.
