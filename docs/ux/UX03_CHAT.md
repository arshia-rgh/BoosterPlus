# UX03 — Conversations and support

Implemented for stage qualification on 13 September 2026. The green palette, font families, homepage artwork and animation remain intact. R10/R11 remain on hold.

## Interaction

`/support` and `/admin/support` use compact status filters and readable conversation rows. Customer conversation creation and staff notification-delivery history expand when needed. Filter state travels with inbox links so Back to Inbox restores the selected view. Desktop threads include recent conversations; smaller screens use a dedicated thread with an explicit inbox link.

The customer, staff and booster routes share a single history scroller and bounded multiline composer. Messages have day separators, accessible timestamps and existing public sender aliases. Staff notes have an explicit audience label as well as a different color. No presence, typing indication or recipient-read receipt is invented.

Initial history opens at the first unread message, a remembered reading anchor, or the latest page. Earlier history is fetched in bounded pages and preserves a visible message's position. Incoming messages follow the bottom only while the reader is there; otherwise a New messages action appears. Read acknowledgments use the visible audience sequence only when the document is visible and the loaded end is reached. Reading anchors contain only a sequence and pixel offset, are bounded to 30 threads in memory, and clear at a session/account boundary. They do not survive a full reload.

The composer uses Enter to send on desktop with a fine pointer, Shift+Enter for a newline, and an explicit Send action on small/touch layouts. Composition events and legacy IME confirmation are guarded. Public and internal text drafts remain separate. Switching audience removes selected attachments instead of moving an internal file into a public reply. Leaving a thread discards its drafts; no text, file or credential is stored in browser persistence.

Successful sends clear the current draft only after server acceptance. An uncertain response freezes the exact request body and idempotency key; Retry same message repeats that request. A definite validation rejection allows correction. Duplicate submission is locked while a request is pending. A transient connection failure hides messages while access is checked, preserves the in-memory draft and disables sending. Confirmed denied/missing access removes history and the composer. API errors preserve HTTP denial status even when a proxy returns malformed JSON.

A stable event stream, queued hints, polling and online recovery reconcile bounded forward pages by stable message ID. Old requests cannot overwrite a superseding recovery request. Brief normal stream renewals do not repeatedly announce an outage. A large gap exposes Continue updating rather than pretending the complete history has arrived.

## Attachments and staff controls

Attachments expand above the composer with a labeled close control and Escape/focus return. Local JPEG/PNG/WebP previews are explicitly marked not sent. Upload progress is indeterminate; checked-ready, scanning, rejection, retry and removal use the existing upload protocol. Protected downloads still require server authorization. Preview support does not expose quarantined server files or weaken CSP, size/type limits, sanitization or scan requirements.

Conversation details, order/submission links, staff assignment, status, linking and booster sharing are inside Details & actions. Escape closes that panel and returns focus. Staff edits retain their observed revision; incoming changes show a review/reload notice and the backend still rejects stale writes. The redesign adds no privilege, presence feed, payment bypass or new API contract.

## Verification and limits

- Unit/component cases cover audience isolation, uncertain send retries with identical payload/key, duplicate-submit protection, editable rejection, access revocation, transient reconnect, delayed failure after recovery, IME/desktop/touch shortcuts, thread unmount, malformed proxy denials, stable event-stream cleanup, deduplication, multi-page catch-up and account-separated reading anchors.
- Real-service browser journeys continue to cover customer/staff replies, offline catch-up, private staff notes and files, failed upload retry, sanitized protected downloads, unrelated-account denial, state changes, order coordination and revoked booster sharing.
- A build-tagged fixture adds 120 public historical messages and five staff-only notes to each disposable device database. Long subject/body/URL, earlier-page position, new-message scroll behavior, native keyboard scrolling, response-lost-after-commit retry, draft separation, attachment Escape/focus, denial cleanup and axe/reflow checks exercise the redesigned thread. Fixture data never enters development or production databases.
- The history region is intentionally keyboard-focusable for native Page/Arrow scrolling, with one narrowly documented accessibility-linter exception. Legacy IME keyCode detection has one documented deprecation exception alongside standard composition events. Neither is a blanket lint exclusion.
- The root tracked Git hook runs repository, backend, frontend and existing production regression checks before delivery. Logs and synthetic screenshots remain ignored under `.cache/` and `frontend/.cache/`.

Physical iOS/Android keyboard behavior and assistive-technology walkthroughs still need device review in UX10. Automated Chromium viewport/focus checks do not qualify every operating-system keyboard. This stage does not resume launch infrastructure work, initiate live payments or claim complete application accessibility certification. UX04 will integrate the thread navigation with the redesigned order workspace.
