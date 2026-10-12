# Service144 independent booster manual review

> Historical r11 observations follow. The senior reviewer adjudicated these findings and verified their fixes on later frozen candidates. All actionable findings from this report are closed; see [the final broad adjudication](SERVICE144_BROAD_ADJUDICATION.md). Original failure evidence and coverage limits below are preserved.

Date: 12 October 2026 (Asia/Tehran). Reviewer: `service144_booster_manual`, independent from implementation and the scoped senior designer. This review began after the full server gate was dispatched. The parent subsequently reported early unit-check failures; those are not relabeled passed by this manual review.

## Candidate and boundaries

- Immutable three-portal frontend snapshot: `.cache/flow-review141/snapshots/service144-r11`.
- Snapshot manifest SHA256: `a1b8e3eb1ab2c19aa649c416f4ecbfd636ace56e81695bae22ace815d59a9010`.
- Parent full1 source manifest: `3213df383932993df3a44ec4cc86027dab77bfbe653746474086c80ab1903377`. This review certifies only the frontend snapshot and the exercised synthetic responses, not that full gate.
- Private instances: `service144-booster-manual1` and `service144-booster-manual2`; runtime receipts, request journals, screenshots, traces and probes are under `.cache/flow-review141/evidence/` and `.cache/flow-review141/service144-booster-*`.
- Chromium desktop 1440px; WebKit 320px; WebKit 320px with root text enlarged to 200%. Personally inspected rendered screenshots in addition to browser DOM and focus observations. This is browser emulation, not a physical iPhone/VoiceOver qualification.
- All data invented. API routes match exact method, portal, path, query and mutation body; unknown routes remain501. Separate new browser contexts, no personal cookies. External navigation, real identity providers, mail and funds are blocked. No application source, Git state, gate runner or production data was changed.
- Manual2 uses a private copy of the preview runtime with explicit synthetic local SSE keepalive support. The application snapshot is unchanged. The fixture represents connection/reading behavior, not delivery of a real message or reliability of the production stream.

## Findings requiring senior decision

### B01 — P2: progress save has no local completion feedback and loses active focus

1. Open a current assignment → Progress.
2. Enter a customer-visible note and change reported progress from20 to42.
3. Focus **Save progress** and press Enter.
4. The exact synthetic save succeeds and the current assignment is fetched. The header changes to42%, the note clears and the save button becomes disabled because no new note is present.
5. There is no local saved confirmation or live status, and active focus becomes BODY. On a long/narrow page, the updated percentage is above the work form.

Repeated in Chromium1440 and WebKit320/200%. A focused keyboard recheck waited one second after success and found no status-region text. The next Tab reaches **Add scanned proof in assignment messages**, so this is not a keyboard trap or a claim that navigation resets to the page header.

Recommendation: announce a concrete successful outcome beside the action (for example “Progress saved:42%”), and preserve/restore focus to a suitable stable action or status target when the clicked control is disabled. Avoid shifting focus if the user has already moved elsewhere. Apply the same outcome handling consistently to relevant fulfillment actions, while retaining errors and double-submit protection.

Evidence:

- `service144-booster-manual1/keyboard-focus.json` and `keyboard-focus-chromium-1440-trace.zip`.
- `service144-booster-manual2/flows-chromium-1440-100.txt`, `flows-webkit-320-200.txt` (saved-progress).
- `service144-booster-manual2/flow-2-saved-progress-chromium-1440-100.png` and `flow-2-saved-progress-webkit-320-200.png`.

### B02 — P3: assignment-access loss does not place focus on its recovery context

1. Open assignment Progress and focus **Refresh assignment**.
2. Simulate current assignment permission being removed; press Enter to refresh.
3. Private details and drafts are cleared and **Assignment access changed** with a recovery explanation appears correctly.
4. The triggering control disappears and focus becomes BODY. The next Tab reaches **Return to assigned work**.

The explanation already uses an alert, so this is a modest recovery-orientation improvement, not a privacy failure. Recommend focusing the recovery heading after a triggered access-loss replacement (without taking focus from a different deliberate interaction). The existing verification-specific recovery already attempts a heading focus; ordinary revoked access should have equivalent orientation.

Evidence: `service144-booster-manual1/keyboard-focus.json`; manual2 revoked-assignment entries and `flow-12-revoked-assignment-*.png`.

## What was exercised

| Area / mapped journey | Actual rendered interaction and outcome | Limits |
| --- | --- | --- |
| F31: Pro entry | Uninvited email returns focused, actionable access feedback; retains email entry; no sent-code success or countdown. Owner provisioning instructions name Customers & staff → Booster workspace. | Synthetic403; real identity eligibility is backend qualification. |
| F31: invited resend | Exact202 response shows10-minute expiry and2:00 resend. Narrow WebKit clock installed before navigation: at119s, expiry8:01/resend0:01; at120s, Resend becomes available. | Browser clock advanced intentionally; not two minutes of wall-clock waiting. |
| F31: revocation before resend | Resend receiving staff-access403 removes code challenge, restores retained email form and clearly says no code was sent. | No live challenge/mail sent. |
| F31: Google feedback | Explicit `error=staff_access` callback view explains that this Google account lacks Booster access and directs to owner provisioning. | Real Google flow deliberately disabled in preview; no provider success claim. |
| F31: separation/security | Pro profile, Security, Sessions, Recovery codes and Preferences stay on Pro routes and clearly describe independent accounts. Authenticator-required sign-in wording, account-specific recovery implications and current-session information inspected. | Successful MFA sign-in/enrollment, secret rotation and recovery adjudication not manually executed in this review. |
| F12: discovery | Overview, assignment queue, search/state filter, queue record and persistent assignment identity inspected. Filtered contextual back link returns to `orders?search=Mobile&state=active`. | Empty/filter states are fixed synthetic records; no real server filtering test. |
| F12: shared instructions | Expanded staff-shared details renders requested24–48hours as supplied labeled fields and structured collection “Collector ·2: Aldous, Yu Zhong,” not object serialization. | No arbitrary extra catalog mappings or business validity inferred. |
| F12: local work sections | Overview, Progress, Messages & proof and Game access remain on the same assignment. Active section is visibly selected, record context persists, and ordinary chat draft survives changing local sections. | No claim of a persistent draft after leaving the assignment. |
| F12: progress/error | Exact save response + updated fetch displays42%; completion conflict retains note and shows recovery guidance. Missing/expired game access disables Start while explaining how to obtain prerequisites. | B01 remains. Completion response used actual generic fulfillment-conflict contract; proof scanning and administrator approval not performed. |
| F12/F11: shared chat | Read existing synthetic customer message, inspect clear recipients, connected state and composer, enter ordinary draft, change section and return. Sender/role and proof selection are readable. | No message/proof sent, no attachment scanned/uploaded here; synthetic SSE is only keepalive. |
| F12: protected access | Read-only synthetic reveal displayed clearly labeled fake game access. Fresh-verification response opens contextual dialog; Escape cancels without performing reveal and returns focus to Reveal game access. | Successful fresh MFA/email confirmation not executed; automatic30s concealment not timed in this review. |
| F12: revocation | Re-fetch permission denial hides private assignment content and provides return/recheck controls. | B02 remains; no actual staff revocation occurred. |
| F13: calendar | Calendar/agenda and availability controls inspected; invalid IANA timezone yields inline error and focuses field. Labels explain proposal vs booking and dated windows. | Booking confirmation/rescheduling/DST/concurrency and window publication not executed. |
| Preferences/notifications | Pro-local email preference and timezone explanations inspected; no standalone Pro notification inbox found in the current navigation. | No notification emission or preference mutation. |
| Responsive/keyboard | Desktop +320px +320px/200% text; no page-level horizontal overflow in recorded assignment/chat/calendar/recovery states. Keyboard action/cancel/focus inspected. | Some long layouts require substantial vertical scrolling; no claim of physical device or assistive-technology testing. |

## Fixture corrections and honest gaps

The first probes returned explicit501 for portal-specific auth paths, calendar query variants and chat stream. These were fixture gaps, not application defects. The initial read receipt incorrectly returned `{}` instead of the documented null response, temporarily disabling chat; corrected before judging messaging UX. All failed probe output/request history is retained.

The first enlarged-text attempt used a stylesheet injection rejected by the page CSP. The subsequent successful probe changed the browser's root text size directly; application security policy was not altered. An early generic sidebar-back click returned to the unfiltered queue by design; the later exact contextual-back click preserved filters.

No screenshot or successful fixture is evidence of real email/Google delivery, database authorization, malicious upload scanning, live payment, transactional concurrency or production usability. Unexecuted MFA/recovery/booking/proof/notification branches remain gaps, with automated qualification and owner-led live acceptance separate. No claim that all possible Pro flows passed.

## Result

Manual review completed with B01 and B02 submitted for senior UI/UX adjudication. No observed cross-panel navigation leak, private-data exposure, new horizontal overflow, blocked local-section navigation or false OTP success in the exercised candidate. This is not a release approval or complete-suite pass. Any accepted correction needs a fresh scoped rendered recheck against its own snapshot.
