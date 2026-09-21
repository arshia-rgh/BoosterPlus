# Detailed interaction contract

Applies to every screen specification. The atlas is a navigation/layout prototype with fictional examples; these are requirements for later implementation, not claims that its HTML executes the real business workflow.

## Global state and mutation rules

| Situation | Display | Interaction / recovery |
| --- | --- | --- |
| Initial load | Page title, stable structure, local loading indicator | Keep navigation usable. No empty-state claims before the response. |
| Empty result | Explain why there is nothing to show | First use: a relevant start action. Filtered empty: Clear filters. |
| Validation failure | Focused error summary + linked inline field errors | Preserve safe values. Do not require re-entry of unrelated fields. |
| Request underway | Specific progress label; preserve control dimensions | Block duplicate action, not unrelated page navigation. |
| Unknown mutation outcome | “Checking whether this completed” | Look up the original operation before retrying; do not create another invoice/message/payout. |
| Stale version | Describe what changed and which operation did not apply | Reload/compare current data; retain safe local draft separately. Never overwrite silently. |
| Partial outage | Error in affected module with timestamp of retained data | Do not convert failed metrics to zero or stale payment evidence to success. |
| Access removed | Remove protected content and stop refresh/stream | Safe return to allowed workspace. No cached private content behind an error banner. |
| Session expires | Explain sign-in needed; preserve nonsensitive work | Authenticate, return to a safe local destination and revalidate permissions/configuration. |
| Back/refresh | Stable route/query/tab/filter context | Do not issue mutations merely on render, refresh or navigation. |
| Destructive action | Explicit target, consequence and specific confirm verb | Fresh authorization/version checks; preserve audit and financial invariants. |

The atlas’s State selector shows the corresponding design treatment/copy. Not every state triggers a full behavioral simulation: for example it does not run timers, upload a file, send a message or reconcile money. Financial and sensitive actions are navigation demonstrations. This distinction must remain visible during review.

## Forms, drafts and responsive actions

- One section for related choices; persistent labels and optional/required text. Put rank/goal selectors together so their relationship is obvious.
- Validate after a meaningful interaction or submit; do not announce an error on every keystroke. A changed parent field clears incompatible dependent values and explains the change. Hidden fields are absent/neutral, not silently priced.
- Long option lists use searchable selection with selected-item text visible. Multiselect supports remove buttons with accessible labels. Numeric controls state unit/bounds and allow typing rather than forcing repeated clicks.
- Back preserves safe answers; changing service/game asks before clearing incompatible selections. Draft save reports saved/unsaved/failed truthfully. No browser draft of credentials, auth codes or private evidence content.
- Mobile form controls are full-width with readable text. Keep actions in document flow by default. A sticky summary is optional only if keyboard/focus/error/safe-area checks pass. No detached sidebar that covers a form.
- File controls display allowed types/size before choosing. Scanning and rejection are first-class states. Preview only available, authorized files. Failed upload keeps written answers and supports replace/remove.

## Custom request and quotes

**Builder:** game and service context; region; starting and target progression; mode; optional preferences. Display the actual admin-configured fields. Stage-specific fields are collected only when needed. Keep win-rate input unavailable until its definition and remedy are approved; do not use the placeholder in the exported concepts.

**Estimate:** identify it as nonbinding in the summary and on the review screen. Show itemized adjustments, currency, configuration revision and validity where relevant. Manual-review configuration can proceed without a fabricated numeric estimate. Staff approval and customer quote acceptance are separate steps.

**Submit:** require sign-in and published terms, preserve custom/package/account intent through verification. Revalidate options and price after returning. Ambiguous submission retrieves the original result rather than creating a duplicate order.

**Quote review:** show exact scope, total, delivery expectation, conditions, expiry and changes from the previous revision. Acceptance names the amount and agreement. Decline/revise returns to the appropriate review path. Superseded/expired quotes cannot be accepted. Changing an already accepted/paid contract requires the existing permitted change/case workflow, not an editable total.

**Order header:** one next-action card; separate chips for service and payment state; goal/play mode; reference; meaningful update time. Tabs: Overview, Messages, Progress & proof, Payment, Help. Historical agreements default collapsed after acceptance but remain accessible.

## Package and account purchase

Packages show fixed scope, exclusions, eligibility, price, delivery estimate and actual capacity state. Only explicit variants change price. If a choice requires open-ended pricing it belongs to custom requests. No countdown, popularity or stock badge without data.

Account listing: sanitised gallery, relevant attributes, included ownership handover, price and sale policy. Save and ask a question remain secondary to the purchase action. On mobile filters open separately and result context survives Back. A unavailable/sold listing preserves enough public context to explain the state without disclosing private material.

Reserve only after server validation. A competing reservation fails without creating a payable invoice. A reservation deadline is a real server fact. Reconcile detected funds before release. Late funds do not grant an account already sold elsewhere.

## Payment state display matrix

| Provider/domain condition | Customer label and primary action | Staff treatment |
| --- | --- | --- |
| No invoice / eligible | Choose asset and network | Show accepted contract and permitted routes |
| Checkout paused | New checkout temporarily paused; return to order | Existing reconciliation continues; unpaid remains unpaid |
| Below route minimum | Choose another available route | No invented invoice or automatic discount |
| Creation timeout/unknown | Checking for an invoice; do not pay again | Reconcile merchant/provider reference before retry |
| Waiting | Exact amount, network, address/memo and expiry | Monitor attempt; no manual paid override |
| Detected / confirming | Waiting for confirmation; no second payment | Fulfillment remains blocked until qualifying evidence |
| Verified | Payment verified; follow fulfillment next step | Activate fulfillment at most once |
| Underpayment | Explain short amount and supported invoice-specific action | Review accepted tolerance/top-up instructions; no guessing |
| Overpayment | Payment received; extra funds under review | Order settled once; excess case, never internal credit |
| Late / cancelled attempt | Funds under review | Reconcile original attempt and current stock/contract |
| Wrong asset/network | Contact support; recovery not guaranteed | Evidence review; no fabricated success |
| Multiple paid attempts | Additional funds under review | Fulfill once and resolve additional receipts |
| Expired without funds | Check eligibility before creating a new invoice | Reconcile before releasing stock |
| Provider unavailable | Status unavailable; keep invoice reference | Show last evidence time and retry status |
| Refund approved | Approved, awaiting transfer | Distinguish decision from funds movement |
| Refund/payout uncertain | Processing/review; no duplicate request | Reconcile existing outgoing operation |
| Refund/payout confirmed | Exact verified receipt | Include asset/network/precision and transaction evidence |

Invoice QR derives from the actual invoice only. Address, memo/tag and amount have separate Copy controls with local “Copied” feedback; network text is prominent and never only embedded in QR. No automatic wallet connection, internal balance, “I paid” success button or user screenshot determining payment status. Do not aggregate different assets into a deceptively precise total.

## Chat UX

### Information architecture

Customer general/pre-sales inbox, order conversations and seller-submission conversations share a familiar thread pattern. They retain distinct subjects/audiences. Booster threads require assignment. Staff have an inbox with customer/seller context and an explicitly separate internal-note mode.

Desktop has an optional 240–300px conversation list, a flexible thread and a collapsible context rail only when space permits. Mobile shows the list or thread, never both squeezed side by side. Thread header: title, participants/audience, linked item and Back. No fake “online” dot or reply-time promise.

### Reading and sending

1. Opening a thread positions at the latest read/unread boundary according to available history, without repeatedly jumping during refresh.
2. Loading older messages preserves the visual anchor. While reading history, new messages produce a “New messages” button; do not auto-scroll.
3. Composer has a clear Send action and multiline keyboard behavior. Enter/Shift+Enter respects the chosen convention and IME composition; software keyboard never covers the action.
4. Sending marks the local message pending. Success maps the server message to the same item. Failure offers Retry/Edit without duplicate content. Reconnect retains safe unsent text and verifies pending sends.
5. Upload progress → scanning → available/rejected are visible before sharing. A rejected attachment never loses the text draft.
6. Leaving a thread with unsent text preserves the appropriate safe draft. Changing account/logout/revocation clears private draft/cache data according to policy.
7. No credentials in messages. Secure handoff is a separate protected view linked from the relevant record.
8. Audience is always labeled. Switching customer reply/internal note with a draft requires an explicit decision; background/tone alone is insufficient. Seller and buyer messages are not adjacent tabs sharing a common unsent composer.

Use semantic log/history patterns carefully: announce new incoming messages politely without reading the whole loaded history. On reconnect, avoid duplicate announcements. Attachments have safe filenames, captions and authorization-aware failure text.

## Scheduling and fulfillment

Show local timezone and UTC offset on every commitment. Date changes recompute the offset; ambiguous/nonexistent DST times need explicit correction. Proposed, confirmed, declined, rescheduled and cancelled are distinct.

Calendar conflicts explain the unavailable interval and preserve the chosen timezone. On narrow screens use an agenda. Keep an existing booking until replacement is accepted according to the backend’s concurrency rules. Availability edits do not silently move booked sessions.

Boosters see assigned work only. Start/resume actions list blocking prerequisites: verified payment, required fulfillment data, assignment and holds. Progress updates distinguish measured evidence from staff-reported status; no simulated gameplay telemetry. Completion submission by a booster is a request for admin review. Admin completion requires the configured proof and records the result.

## Account resale and secure handoff

Seller intake → staff ownership review → exact commercial offer → acceptance → verified transfer → listing/payout steps under the selected model. The seller dashboard shows review, listing and payout states separately. No balance, Deposit or Withdraw UI.

Offer comparison highlights model, price/proceeds, commission, fees, asset/network, due trigger, deadline, expiry, transfer obligations and dispute treatment. Terms changes require new acceptance. Pre-acceptance withdrawal has a clear confirmation; after acceptance follow the contract/case process.

Secure handoff panel: context and audience, recent verification, masked values, deliberate reveal/copy if permitted, replace/revoke action where supported, timeout and access audit notice. Never put real secret samples in mockups. Buyer sees only purchased delivery material, not seller identity or source evidence. Rejected/scanning files do not open. Private handoff access is lost on reassignment/revocation as required.

Buyer acknowledgement records receipt under the actual terms; it does not create an unapproved blanket waiver of support. A refunded item is not automatically relisted; staff must verify recovered control and revoke obsolete access.

## Admin editing and operational safety

Editors display saved draft/live revision separately, with unsaved navigation protection. A side section list follows the actual task: identity/references → fields → conditions → prices → packages → policies → preview/publish. Move-up/down controls supplement dragging. Preview supports collection stage and narrow/desktop widths.

Validation links to exact fields/rules. Show missing/unknown references, cycles, incompatible values, uncovered combinations, invalid precision and stale preview. Publication includes a diff, customer preview and explicit confirmation with fresh verification as required. Do not silently rewrite historical records after catalog or policy changes.

Quote/status actions use expected record versions. Conflicts reload/compare rather than overwriting another staff member. Owner actions state session-revocation effects and protect the last owner. Audit is read-only and secret-free.

Finance queue separates incoming payments, customer cases, seller obligations and outgoing exceptions. Approving a remedy is separate from executing a transfer. Recipient changes restart verification; outgoing pause blocks execution. Retry must reconcile an uncertain transfer first.

Reports show applied filters, timezone, definitions, generated timestamp and separate currencies. Export preview must match the final export; a changed filter invalidates preview. Private exports use protected access and clear expiry.

File/job/alert tools show safe diagnostic categories, not raw personal payloads. A retry success message means queued, not completed. Unsubscribe is respected even if an old availability notification job remains queued.

## Privacy and recovery

Customer export shows the category and any continuation; never imply one paged response is the whole account export. Downloads are private and expire according to the actual implementation.

Deletion remains disabled until explicit owner policy publication/enablement. The owner sees scope preview and active order/dispute/policy holds. Cancellation is available only before irreversible erasure. Final status distinguishes live cleanup, pending files, retained financial/audit evidence and retained backups. No guessed legal periods or promises of immediate complete erasure.

## Copy and notification contract

| Event | Subject/title | Body principle | Destination |
| --- | --- | --- | --- |
| Quote ready | Your quote is ready | Reference and action; no secret scope in subject | Current quote |
| Clarification | Your order needs a detail | State what the customer should open, not sensitive answers | Order next-action panel |
| Message | New message from PLAYORA | Safe preview only when policy allows | Exact conversation |
| Payment confirmed | Payment verified | Exact order reference; no unsupported completion promise | Payment record/fulfillment next step |
| Booking changed | Review your session time | Explicit timezone/date in authorized content | Booking proposal |
| Sale offer | Your account sale offer is ready | Review before accepting; no wallet phrasing | Current offer revision |
| Refund/payout | Transfer status updated | Approved/processing/confirmed distinction | Linked transfer record |
| Deletion update | Privacy request updated | State and next action; no sensitive retained data summary in subject | Private privacy screen |

Every deep link handles signed-out, revoked, missing and stale targets safely. Marking a notification read never marks its underlying task complete.
