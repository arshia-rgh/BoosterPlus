# UX165 — independent booster review

16 October 2026. Tester: `ux165_booster`. **First persisted pass complete; cross-role fulfillment continuation pending customer readiness.** This is not a complete-suite, production, physical-device or real-provider qualification.

## Environment and method

Used the actual isolated Go API, TiDB, Mailpit, storage/scanner and current built three-portal frontend, at `pro.playora.localhost:4173`. Normal synthetic invited email sign-in and authenticator enrollment were performed through the UI; no session was fabricated. Authenticator material and session cookies stay in private `.cache/ux165/booster/` files and are not reproduced here. Chromium viewports: 1440×1000, 390×844, 320×844. No production data, external mail, invoice or funds operation occurred. The following first pass uses persisted backend data, not response mocks.

Root/admin supplied the synthetic identity and the customer's paid fixed-order ID; subsequent task success is assisted cross-role testing. The order is recorded privately in `work-first.json`. Discovery still used the assignment queue and its search control, rather than opening only a supplied deep link. Source-test helper inspection was used for fixture authentication and upload mechanics; failed helper assumptions below are not application defects.

## Findings and feedback

**B-F01 — observed P3, overview title misidentifies the page.** At `/`, the page H1 and first card both say “Your next session”, while the page also contains active assignments and availability. The active navigation is Overview. This makes a general workspace appear to be only a session detail page, with redundant heading hierarchy. Evidence: `overview-desktop.png`, `overview.txt`, `mobile320-.png`. Suggested correction: H1 “Your work overview”; preserve the card title. Root reports the source correction has been made. **Rendered fix verification pending.**

**B-O02 — observed improvement candidate, calendar has avoidable technical density.** At `/calendar` in UTC, both start/end fields always expose “repeated clock hour” selectors and explanatory text, although the entered UTC time is unambiguous. At 320px the form is approximately 4,046px tall, including duplicated “Calendar controls” labels, tags/permission explanations, and multiple availability-versus-booking statements. Validation and publishing work, and there is no horizontal overflow. Designer/product should decide whether ambiguity controls can be contextual to ambiguous local times, with concise explanations. This is **not a functional failure** or authority to weaken timezone/conflict protections. Evidence: `calendar-320.png`, `calendar.json`.

**B-O03 — observed audience attribution candidate.** Messages and proof sent by the newly enrolled booster with no configured staff alias appear as “PLAYORA support · Staff”, like the admin response. The composer correctly states the shared audience. A clearer fallback such as “Assigned booster” might help customers know who is speaking without exposing staff email/name. This needs product review; the current privacy-safe alias may be intentional. Evidence: `shared-proof.png`, `mobile320-orders-…-section-messages.png`. No private identity leak was observed.

The assignment's persistent header and local Overview/Progress/Messages tabs were clear. The page explains that completion requires administrator review, identifies customer-visible updates, and directs credentials into protected chat fields. Disabled coordination explicitly asks the booster to contact the administrator. These are useful safeguards, not blockers to remove. On an account-play order, a local Sessions tab is intentionally absent; the global Sessions link manages sign-in sessions.

## Actual task ledger

| Family | Current evidence | Status / remaining branch |
| --- | --- | --- |
| B01 | Normal invited email sign-in, mandatory authenticator QR enrollment, verification and saved recovery-code acknowledgment. | Passed tested branch. Google, uninvited/expired/suspended, wrong/expired OTP, cooldown elapsed and returning MFA not yet attempted. |
| B02 | Empty overview before assignment; assigned fixed order appears after admin assignment; full-ID queue filter and entry through card. | Passed tested branches. Completion/hold/reassignment states pending. |
| B03 | Overview, Progress, Messages & proof retain order ID and game; shared instruction and review requirement visible. Account-play mode omits local Sessions. Refresh/deep links visited. | Passed current queued-state branches. Back/Forward and later-state scope pending. |
| B04 | Admin enabled coordination; booster opened recipient-bound ordinary/protected form, triggered required-field validation, filled and submitted response. Secure field uses password masking and protected explanation. | Response persisted; credential-readiness and starting work wait for customer. Reassignment/revocation/reveal/fresh-verification branches pending. |
| B05 | Proof mode, real storage upload and scanner acceptance, published synthetic proof in shared conversation. | Passed proof branch. Start/progress/hold/resume/completion request blocked by legitimate missing customer readiness; pending continuation. |
| B06 | Admin message received; booster sent visible coordination reply and secure-form response; customer/assigned-booster/staff audience stated. | Passed exchange branches. Admin/customer to verify receipts. Revocation/offline/unknown outcome branches pending. |
| B07 | Invalid timezone focuses timezone with inline error; empty window focuses start date. Enabled synthetic availability and published UTC dated window. Desktop/390/320 rendered. | Passed profile/window branch. Customer proposal, overlap, confirm/change/cancel/no-show pending suitable play-together order. |
| B08 | Profile/security/sessions/recovery/preferences routes all remain on pro host; staff-MFA requirement and portal ownership visible. | Routes rendered; profile/preference save, replacement/revoke/logout modal branches pending. |
| B09 | Unknown assignment clears private view and offers access recheck; unknown conversation denies with return; finance route unavailable; wrong admin prefix does not render admin page. Actual booster fulfillment response has no amount/email/payout fields; customer/admin order endpoints403. | Passed these narrow boundary checks. Known another-booster record, seller finance endpoints, revoked assignment and session-expiry branches pending. |

The 11 canonical booster destination templates have rendered observations, including denied `/support/:id`. Its valid conversation is also rendered within the persistent order shell; standalone permitted-conversation navigation remains to be exercised. This is route observation, not completion of every branch above.

## Responsive and validation evidence

`boundaries.json` records zero document horizontal overflow on `/`, `/orders`, assigned Messages, Security, Recovery and Sessions at both390 and320px. Screenshots retained for each. Calendar390/320 also has zero overflow. Actual visual inspection included desktop overview, 320px messages and320px calendar. Keyboard-focused validation was verified for timezone and empty date, but keyboard-only completion, dialog trap and all screenshots' independent senior review remain pending.

`boundaries.json` contains actual response status checks: permitted booster fulfillment200; customer order403; admin order403. Two guessed finance/listing routes returned404 and **must not be counted as endpoint-specific authorization proof**.

## Preserved harness failures

- `forms.mjs` awaited “View form” before response; recipient action was correctly “Complete form”. Corrected in `forms-second.mjs`; not an app failure.
- `respond.mjs` clicked Attach image after selecting proof, which already opens the attachment panel; the extra click hid it, causing a selector timeout. Actual form response and ordinary message had already persisted and were not repeated. `proof.mjs` completed upload/proof without resending the response.
- An exploratory “Sessions” click from an account-play assignment selected the global sign-in Sessions link; recorded in `work-first.json`. Account-play intentionally has no order scheduling tab. Do not report a local-tab navigation defect from that mistaken selector.

## Evidence and continuation

Private reproducible scripts: `login.mjs`, `routes.mjs`, `work.mjs`, `calendar.mjs`, `forms-second.mjs`, `respond.mjs`, `proof.mjs`, `boundaries.mjs`. Observations: `routes.json`, `work-first.json`, `calendar.json`, `boundaries.json`, `proof.txt`, `form-initial.txt`; screenshots alongside. Browser traces under `.cache/ux165/engineering/evidence/booster-*`. Do not publish private auth/state files.

Next: resume the exact customer2 fixed order after customer required details are completed; inspect readiness, start, progress validation/update, hold/resume, request completion and coordinate admin/customer receipts. Inspect returned protected form/reveal, sharing revocation, and scheduling with a play-together order. Then complete profile/security/recovery/error branches with isolated data and recheck confirmed corrections. External OAuth/delivery/settlement and physical assistive technology remain explicitly outside this review.

## Continuation 2 — fixed-order fulfillment and corrected candidate

The candidate1 frontend was reviewed against the unchanged isolated API via `real-browser-candidate1.mjs` (port4187 mapped to the same portal hosts). Do not interpret backend alias/unread behavior as a recheck of later backend fixes.

- **B-F01 closed for the rendered candidate:** H1 is now “Your work overview”, while the nearest-session card retains its specific title. `overview-corrected.png`, `resume.json`.
- **B-O02 UTC refinement verified:** repeated-clock-hour selectors are absent for the reviewed UTC date/window; published availability is preserved. `calendar-corrected-mobile.png`, `resume.json`. Non-UTC/DST ambiguity branch still needs a separate test and was not changed during an active cross-role booking.
- **B04/B05 actual fixed-order continuation passed:** customer required details and protected game-access response were present. Booster opened the correct form, revealed through normal authorization, hid details and returned to Progress. Missing start note produced field guidance; start succeeded.100% progress was rejected inline,75% saved, hold/resume succeeded, and completion was submitted for administrator review. No final approval control was rendered for the booster. `fulfill.mjs`, `fulfill.json`, per-step screenshots. Admin/customer continuation pending their actors; booster did not mark the order complete.
- **B08 saved-state checks passed:** profile display name and customer-facing alias saved/reloaded; email preference disabled/reloaded then restored; security email section stayed portal-local. Recovery-code replacement without its confirmation was rejected; the help text correctly preserves staff second-factor review. On320px the More dialog closed with Escape. `profile-security-retry.mjs`, dedicated browser trace and screenshots. No recovery-code replacement or session revocation was executed, preserving this handoff session.
- **B01 uninvited branch passed:** a new synthetic uninvited email received403 and explicit “Staff access is not available … No verification code was sent”; no code input appeared. Google is honestly marked unavailable in this fixture. `uninvited.json`, `uninvited-mobile.png`. This confirms application denial, not real Google/provider behavior.

Additional preserved harness error: `profile-security.mjs` expected generic “Saved.” rather than the actual “Profile saved.”; the save itself succeeded. Corrected retry completed. The first late error overwrote its JSON accumulator, now retained separately as `profile-security-harness-failure.json`; exact successful evidence is the retry trace and screenshots, with an explicitly transcript-derived execution receipt. Do not count this selector failure as a product defect or falsely present its summary as a passing raw trace.

Next cross-role requirement: C1's paid play-together assignment is available; customer must propose a session in the existing published window before the booster confirms/starts. That booking and completion review will be resumed in the next actor wave.

## Continuation 3 — 18 October checkpoint; wider exploration stopped

**Owner stopped the wider audit during this continuation. No new exploration will be started.** The observations below are completed evidence; unattempted branches remain pending rather than implicitly passed. Root owns the isolated `interactive-r3` process. This reviewer did not stop it, change production, start a full gate, modify application code or move funds.

### Environment and assistance

Actual isolated API at port4173 with real TiDB, local Mailpit, storage/scanner and synthetic provider fixtures; backend candidate2 and frontend candidate4. The admin reconstructed prerequisite records through normal authenticated isolated APIs, explicitly recorded as setup. This is a new r3 chain, not continuation of r1/r2 persistence. The booster reused its normally enrolled r3 session and performed subsequent actions through the pro UI. Fresh return-login checks used a second normal session and new Mailpit message, not a fabricated session. All session/MFA values remain private under `.cache/ux165/`.

Evidence: `.cache/ux165/booster/r3/` and traces under `.cache/ux165/engineering/evidence/booster-r3-*`. `confirm.json`, `remaining.json`, `remaining2.json`, `boundaries.json`, `returning-auth.json`, and `security-boundary.json` distinguish actual transitions from controlled read-error injection.

### Completed cross-role handoff

- C1 supplied ordinary player details and proposed a future session inside the booster's published availability. Booster confirmed the exact18October04:15–04:45UTC proposal through **Confirm session**. An empty action reason first produced inline guidance; the valid reason and confirmation persisted. C1 independently verified the confirmed time and customer next-state display.
- Booster sent one ordinary coordination message. C1 received it, verified **Assigned booster** as the sender, and replied. Booster received that reply through both the order-local conversation and the permitted standalone conversation route. The audience explicitly includes customer, currently assigned booster and PLAYORA staff. No private staff identity appeared.
- The assignment remained queued; readiness stated that required information and scheduling prerequisites were present. Confirmed booking and assignment were preserved for other reviewers. The original r1 fixed-order start,75% progress, hold/resume, proof and completion-request evidence is retained, not repeated or relabelled as r3.

### New confirmed finding

**B07-COPY01 — P3, role-inappropriate session guidance.** On the booster assignment Sessions section, the paragraph says “Propose a time, then wait for staff confirmation” although the booster sees Confirm/Cancel controls and no proposal form. The same text remains after confirmation. This misidentifies the actor's next action; it is not a booking-authority failure. Proposed correction: keep proposal guidance for customers; give staff/boosters concise review-and-confirm guidance while retaining prerequisite explanation. Root was notified and will own the fix and scoped verification. Evidence: `sessions.txt`, `confirmed.png`, and `mobile--orders-29e35fd5-4ddc-44d2-9f41-24bb41cc81a7-section-sessions.png`. **Open at this checkpoint; not claimed fixed.**

### Current bounded B01–B09 ledger

| Family | Newly completed evidence | Pending or explicit limit |
| --- | --- | --- |
| B01 | Normal returning email login: a wrong synthetic code was visibly rejected; the correct new code required enrolled MFA; correct authenticator restored the assignment Sessions return path. Earlier normal enrollment and uninvited denial retained. | Real Google, expired/suspended invitation, expired code, elapsed resend and same-email three-portal interactive matrix not completed here. |
| B02 | Corrected “Your work overview”, queue/current assignment and confirmed upcoming calendar session rendered. Earlier empty/assigned fixed queue retained. | Reassignment, cancellation and complete/held queue permutations not all executed. |
| B03 | Persistent assignment identity/local tabs, ordinary prerequisites, readiness and Back navigation to Overview passed. Desktop and320px views stayed in pro workspace without horizontal overflow. | Every later-status Back/Forward permutation not tested. |
| B04 | Earlier real protected form response/reveal/hide and fixed fulfillment retained. R3 play-together ordinary handoff/readiness passed. | Reassignment/revocation of an already revealed shared form was not exercised. |
| B05 | Earlier real proof upload/scanner, invalid100%/valid75%, start/hold/resume/completion-request branches retained. No final approval control for booster. | No new r3 completion; duplicate/stale write, scan-failure and4MiB boundary permutations not all manually repeated. |
| B06 | Actual bidirectional C1/booster coordination, corrected Assigned booster attribution, audience and standalone permitted route passed. | Permission removal with an unsent draft, reconnect unknown-send outcome and internal-note negative content were not newly exercised by this actor. |
| B07 | C1 proposal→booster confirmation→C1 readback; missing-reason validation; calendar lists confirmed session in UTC with local conversion. UTC repeated-hour controls remain absent. | Booking preserved. Overlap, cancellation/replacement, no-show, DST and future-window-removal branches remain pending for this actor. B07-COPY01 confirmed above. |
| B08 | Portal-local security/recovery/sessions; recovery replacement without confirmation gives field guidance. New second normal session revoked through UI; its captured cookie could no longer open the assignment while original session stayed active. Earlier profile/preferences save/reload retained. | Actual recovery replacement, lost-factor staff review and sign-out-all intentionally not performed while cross-role sessions were in use. |
| B09 | Known assigned fulfillment200 contains no amount/email/payout fields. Known customer/admin order, seller submission and admin-finance endpoints403. Known resale order through booster fulfillment409 contains no private fields and gives safe unavailable UI. Explicitly injected assignment GET503 hides details and offers Retry; retry returned to real backend. | Resale409 is not evidence for another booster's assigned boost denial. No known alternate-booster assignment/reassignment was exercised.503 is a controlled browser response fixture, not a persisted server outage. |

Actual320px visual inspection covered confirmed Sessions and calendar; security/session routes were also captured with zero document overflow. These observations do not establish every viewport, physical device, assistive technology or every possible branch. Original external OAuth, real payment/mail settlement, real game delivery and financial payout remain outside the review.

### Preserved continuation harness failures

- `remaining.mjs` successfully sent the message and recorded label/Overview/Progress, then expected `Assignment …` to have a heading role. It is a persistent record label. The30-second selector timeout is retained; `remaining2.mjs` corrected the locator and completed Back/context and remaining route checks without resending the message.
- `returning-auth.mjs` completed wrong-code rejection, successful email/MFA, restored return path and current-session revocation, then waited for a generic heading matching `Sign in`. Actual heading is **Booster sign-in**. The timeout is retained. `security-boundary.mjs` independently loaded the captured revoked cookie and verified denial, then verified the original session still worked. This is not a product logout failure.

At the stop checkpoint, the only newly confirmed actionable item from this continuation is **B07-COPY01**. The three prior booster findings have rendered correction evidence: overview title and UTC controls from earlier continuation; privacy-safe sender attribution now verified on the corrected real backend and independently received by C1.
