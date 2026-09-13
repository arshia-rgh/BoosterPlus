# UX02 — Account navigation and passwordless entry

Delivered as `1e3e51c9860b00619bc1300c23c3ac161860ca68` after the full stage gate on 13 September 2026. UX01 is delivered as `6e852f1`. This stage preserves the green theme, font families, homepage artwork and existing animation. UX03 chat is next; R10/R11 remain held.

## Routes and hierarchy

| Destination | Customer task |
| --- | --- |
| `/account` | See work requiring attention, active orders, unread conversations and upcoming sessions. Empty work leads to discovery and order history. |
| `/orders`, `/support` | Primary order and message destinations; their detailed redesign follows UX03/UX04. |
| `/account/settings` | Edit the display name; show verified email and an optional account reference in details. Staff can edit their public alias. |
| `/account/security` | Verify identity again, manage the authenticator, and expand session or linked-identity controls when needed. |
| `/account/preferences` | Save optional order-update email preferences; essential security messages remain separate. |
| `/privacy` | Existing export/deletion workflow. Owner-enabled retention policy and active-case holds are unchanged. |

Desktop uses a restrained sidebar. At widths through 850px, Overview/Orders/Messages/More replaces it; More opens a native modal with all secondary destinations and sign-out. Escape closes it and restores focus. The booster context exposes assigned work/calendar and a customer-account link; administration appears only for the relevant capability. Unverified staff never see privileged navigation. Page changes focus the task heading without resetting focus on ordinary form updates.

## Authoritative overview

`GET /api/v1/me/overview` returns at most five items per category and separate `more_*` flags. Attention contains requests for information, offered quotes and unpaid accepted checkout; active work contains submitted, queued, in-progress and held orders. Proposed and confirmed sessions are labeled differently and must not have ended. Completed and cancelled work remains in history.

Conversation selection searches all owned unread threads using customer-visible sequence/read markers. Staff notes and staff read positions cannot change customer unread counts. Responses exclude message bodies, staff identities, credentials and financial widgets. Each query is ownership-scoped and capabilities are rechecked at entry and exit. A concurrent read can remove a thread from this snapshot; refresh or inbox navigation retrieves current state. The summary is bounded, not a transactionally frozen report or automatic live feed.

Loading, unavailable and empty states are distinct. Explicit refresh retries failures. Components are keyed to the authenticated account so delayed responses and previous settings do not survive an account switch. No new price, payment state, win-rate promise or wallet is inferred.

## Sign-in and re-verification

Email entry becomes a focused code step, with numeric email-code input, automatic focus, expiry/resend guidance and a change-email/request-another-code action. Existing server throttles and expiry remain authoritative. Errors focus feedback; pending forms reject duplicate submission. Profile/preferences have specific saved confirmations. Staff still verify Google/email and an authenticator at every sign-in and acknowledge recovery-code handling.

Return destinations are allowlisted local task paths. External/protocol-relative URLs, control characters, backslashes and unexpected route families are rejected; arbitrary query strings and fragments are dropped. Google navigation state uses optional per-tab session storage with a ten-minute expiry and is consumed once. It stores only paths, never identity tokens or form contents. Blocked storage leaves sign-in available. Admin destinations use document navigation because staff and storefront have independent route graphs; customer destinations use the storefront router.

Expired sensitive verification provides a link to security and a manual return to the original task. Returning does not replay a mutation; users review the current data and explicitly try again. MFA/consent barriers remain in force. Provider callback, cookie and backend authorization mechanics are unchanged. Full external Google-provider setup and consent-screen branding require owner configuration; local tests do not claim live Google qualification.

## PLAYORA compatibility

New authentication email subjects/sender display names, email-change copy, authenticator issuer, default support/notification copy and invoice descriptions use PLAYORA. Tests inspect actual Mailpit messages and enrollment URLs. Existing authenticator keys remain valid. Historical accepted records and configured mailboxes/domains/provider merchant identity are not rewritten. Public UI brand configuration remains frontend-owned; Go has no frontend dependency.

## Reproducible verification

- `make pre-commit` at the root runs both independent projects and production regression checks through the tracked Git hook; no production launch work is resumed.
- `TestAccountOverviewOwnedBoundedAndRevoked` runs against isolated TiDB: category bounds, owner isolation, public/staff unread boundaries, read/completion transitions, future/cancelled sessions, response contract, anonymous access and suspended stale principals.
- Component tests cover empty/attention/proposed/confirmed rendering, API failure/retry, stale account responses, safe return paths, MFA waiting, expired/blocked browser storage and manual re-verification return.
- Real-service browser tests cover email delivery/PLAYORA sender and issuer, persisted settings, all staff-role MFA barriers, sign-out/private-data cleanup, modal Escape/focus, external return rejection, 320/390/768/1440px reflow and axe accessibility. Existing commerce, chat, privacy, homepage motion and admin journeys remain required.
- Local evidence: `.cache/ux02-overview-integration.log`, `.cache/ux02-go-checks.log`, `frontend/.cache/ux02-unit.log`, `.cache/ux02-browser.log`, and the full `.cache/ux02-commit.log`. Rendered account/profile screenshots are under `frontend/.cache/ux02-*`. These contain synthetic test data and stay untracked.

The first browser attempt exposed a canonical saved-name whitespace discrepancy and a sign-out assertion that could observe the already-visible security form before logout completed. The UI now uses the canonical trimmed saved value; the helper waits for the actual successful logout response. Failed evidence is retained in `.cache/ux02-browser-attempt1.log`. Neither authorization nor test thresholds were relaxed.

The second run passed every desktop journey and all other mobile journeys, but exposed a mobile helper race: immediately after a full page navigation it inspected More before account navigation loaded, then waited for the hidden desktop sign-out button. The helper now waits for the visible account navigation before choosing the mobile or desktop interaction. The trace showed no logout request was sent; the corrected check still requires the real 204 response and removal of private account data. That failed run is retained in `.cache/ux02-browser-attempt2.log`; the complete delivery hook must rerun both devices.

This phase does not claim physical-device keyboard qualification, a live Google/provider transaction, or complete application accessibility certification. UX03–UX10 retain chat, order, discovery/character-motion, checkout, staff/seller/booster and final cross-route UX acceptance.
