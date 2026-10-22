# WANTED173 — senior UI/UX review: wanted accounts

Scope: the new public “Wanted accounts” section on each game's Accounts page, its link beside “Sell an account →”, and the new admin “Wanted accounts” workspace (see `docs/wanted-accounts-2026-10-22.md`). Shared change: the `Check` control gains optional `disabled` and hint text. Reviewer: an independent senior UI/UX designer agent, separate from the implementing agent. The reviewer decided and verified; it did not edit repository files. Evidence used synthetic self-hosted Vite fixtures only (`frontend/tests/fixtures/wanted-accounts`, `frontend/tests/fixtures/wanted-admin`); no live data, sign-in or request.

## Round 0 — decisions before implementation

The reviewer mocked two public layouts into the running baseline page and chose a list-board over a card grid (cards left empty space around short text). Decisions D1–D15:

| ID | Decision |
| --- | --- |
| D1 | Title 1–80 characters on one line; optional description up to 300 characters and four line breaks; plain text only. No structured rank/region/price/quantity/deadline fields: they invite invented prices and demand counts. |
| D2 | At most 6 shown and 20 total per game; the public response has only identifier, title and description (no dates or counts). |
| D3 | Public section only while the game accepts account sales (intake configured, not paused); game Accounts section only, not the global marketplace. |
| D4 | Section after results, empty message and pagination, before the FAQ. “Wanted accounts ↓” beside “Sell an account →” in one link row, moving focus to the section without changing the address; both links stay on one line at 320 px. |
| D5–D6 | Eyebrow “Sell to PLAYORA” (the only champagne accent), h3 “Wanted accounts”, intro, one bordered list matching the filter panel (title beside description from 768 px), `pre-line` descriptions, no motion. |
| D7 | One primary “Sell your account” action to `/sell/new?slug=<game>`; no per-entry buttons; no wanted-entry identifier carried into the unchanged sell flow. |
| D8 | Loading, empty and failed reads render nothing; the read is keyed only by game, so filters and pagination never refetch it. |
| D9–D14 | Admin module after Account inventory: game select in `?game=`, closed-game note, “View on site ↗”, “{n} of 6 shown”, ordered rows with Shown/Hidden chips, Move up/down, Edit, Hide/Show, Delete with inline confirmation, titled accessible names, focus return and polite announcements, limit/empty/error/conflict copy. |
| D15 | Verbatim public and validation copy. |

## Round 1 — FAIL, six findings

Checked Chromium and WebKit at 320/390/768/1440 px for `many`, `one`, `none`, `error`, `stock=none` and signed-out states, injected 80-character unbroken titles, 286-character four-break descriptions and HTML/markdown/URL text; keyboard order and the section link with and without reduced motion; admin at 1440/360 px in ready, empty, full, closed, error and conflict stages through add, invalid save, save, move, hide, edit/cancel, delete/Keep and conflict reload. A1–A10 otherwise passed and deviations 1–5 (shared page h1 plus a game h2, admin-scoped button variants, disabled Show at the limit, smooth scroll only without reduced motion, new-tab site link) were accepted.

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| W1-01 | Minor | Section h3 used the 18.72 px default, smaller than the card h3s above it. | 1.25rem below 768 px, 1.5rem from 768 px. |
| W1-02 | Moderate | Admin form showed the browser's grey fieldset frame inside the green card, no group name, 1,041 px fields and a detached checkbox hint. | Frameless fieldset with “Add/Edit wanted account” legend, add form in a row-style panel, fields max 40rem, hint directly under its label. |
| W1-03 | Moderate | Row buttons had 8 px left margins, so wrapped lines started indented and Hide/Show columns did not align. | Zero margins, one 0.5rem gap, shared Hide/Show minimum width. |
| W1-04 | Moderate | After a 409 or Reload, focus fell to `<body>`. | Conflicts focus “Reload list”; reload announces “List reloaded.” and focuses the open form's Title or the game heading; other failures focus their notice; a shown-limit 422 focuses the checkbox. |
| W1-05 | Minor | Delete question and buttons started on different edges. | Left-aligned, max 28rem. |
| W1-06 | Minor | New-tab behaviour was only signalled by ↗. | Screen-reader text “(opens in a new tab)”. |

Observations outside scope, unchanged: the shared `ErrorNotice` shows its summary sentence twice; admin link colour; admin sidebar background in full-page captures.

Sign-in return for signed-out sellers is covered by existing component tests (`portalReturn` keeps `/sell/new?slug=mobile-legends`; the sell page preselects the game from `?slug=`).

## Round 2 — FAIL, three findings

All round 1 fixes verified in Chromium (headings 20/24 px; frameless legend form; 640 px fields; flush-left 0.5rem action gaps and aligned Hide/Show at x=1218; conflict focus to “Reload list”, then Title or the game heading with “List reloaded.”; race 422 focus on the checkbox; aligned delete confirmation; new-tab text). No regressions in ready, full or conflict stages.

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| W2-01 | Moderate | Server validation (`wanted_account_invalid`) showed the generic “The service is unavailable. Please try again.” because new problem codes were unmapped; this would occur in production. | Map `wanted_account_invalid`, `wanted_account_not_found`, `wanted_accounts_unavailable` (and `wanted_account_conflict`) to the reviewer's copy; regression asserts the outage text is absent. |
| W2-02 | Minor | The form's errors rendered above its legend with no gap and an 8 px edge mismatch at 360 px. | Legend → message → issues → fields on one edge, 0.75rem before the first field; regression asserts order and edge. |
| W2-03 | Minor | “6 already shown.” sat about 27 px below the checkbox text inside the 44 px label. | Admin-scoped centring of the label row and a −0.375rem hint offset: 7 px below the text, same x, 44 px target kept; regression asserts 0–8 px. |

## Round 3 — PASS

W2-01–W2-03 verified at 1440 and 360 px: the race case shows “Check the highlighted fields before continuing.” with the linked limit issue and checkbox focus, no outage text; legend → message → issues → fields share one edge with 26 px before the first field; the limit hint is 6 px below the checkbox text, aligned with it, keeping the 44 px target. Conflict focus and unsaved-text retention, the clean form and the public section were rechecked without regressions.

**Verdict: PASS — no remaining actionable findings in this scope.** PASS means no issues were found in this review, not that none exist; owner acceptance remains separate.

Non-blocking observations: the shared `Check` control places inline errors about 28 px below the box at the checkbox edge (site-wide behaviour, left unchanged); the shared `ErrorNotice` duplication (O1) is out of scope.

Limits: public page reviewed in Chromium and WebKit at 320/390/768/1440 px; admin in Chromium at 1440/360 px; synthetic fixtures only; no physical devices or screen-reader software (accessibility verified through focus position, live-region text and accessible names); WebKit's default Tab behaviour skips links, so keyboard order was judged in Chromium; sign-in return to the sell flow relies on existing component tests.

# WANTED174 — account request button

Scope: an owner-requested “Request an account” action beside each game's wanted accounts, opening the existing pre-sales support start pre-scoped to that game; the `/support` start form's request mode; the sign-in return of that query. Same independent senior designer, same synthetic fixtures (`tests/fixtures/wanted-accounts` now also serves `/support`).

## Round 0 — decisions

| ID | Decision |
| --- | --- |
| E1a | With shown entries: a request row inside the wanted section after “Sell your account” — divider, lead-in “Looking for a different account? Message our team with what you want to buy.”, secondary “Request an account”; one line from 768 px, stacked and flush-left below. |
| E1b | With no shown entries or a failed read: a separate quiet section, h3 “Looking for a specific account?”, line “Message our team with what you want to buy.”, the same secondary button; no eyebrow, no list, no teaser. |
| E1c–d | Neither variant until the wanted read settles; shown whenever the game Accounts section renders, including with no stock; not on the global marketplace; teaser unchanged. |
| E2 | Link to `/support?account_request=<slug>`; subject “Account request — {published game name}”, editable; request mode legend “Request an account”, single note “Next, describe the account you want in the chat. Don’t share passwords or codes.”, no order help text, panel open, Subject focused in view with caret at the end; no auto-sent message; any unresolvable game falls back to the ordinary empty form. |
| E3 | “Sell your account” stays primary; “Request an account” is the storefront secondary outline link (44 px, shared focus ring, no motion); signed-out visitors return to the same query after sign-in. |

## Round 1 — PASS

Verified in Chromium and WebKit at 320/390/768/1440 px (`many`, `one`, `none`, `error`, `stock=none`), loading sampled every 250 ms with a held read (no wrong-variant flash), and support request mode at 390/1440 px with and without a long inbox (open panel, verbatim legend/note, prefilled subject, focus and caret, slug sent, no message sent). Fallbacks: unknown game and failed game read show the ordinary empty form without the slug; a crafted value is a plain `/support` visit with nothing echoed. Accepted deviation: an invalid slug leaves the start panel collapsed like a normal visit. **Verdict: PASS — no remaining actionable findings in this scope.** Observations: long prefilled subjects scroll inside the single-line field at 390 px; fallback forms take no automatic focus. Limits: no screen-reader software or physical devices; sign-in return verified by component test, not rendered; synthetic data only.
