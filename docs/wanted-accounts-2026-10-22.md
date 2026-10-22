# WANTED173 — wanted accounts

Owner request, 22 October 2026 (the owner calls them “required accounts”): in each game's Accounts section, administrators publish the accounts PLAYORA currently has buyers for, announcing that anyone who owns a matching account can sell it. The feature must be complete end to end. The most important part is a very nice public presentation, decided by an independent senior UI/UX designer. Plain-text entries are enough.

## Boundaries

- Plain staff-authored text only. No prices, payouts, demand counts, dates, guarantees or “instant” promises on the public page.
- The “Sell your account” path is the existing sell-an-account flow with the game preselected (`/sell/new?slug=<game>`). Seller submissions, intake, review, agreements, commissions and payouts are unchanged.
- Existing staff authorization, live-session fencing, recent verification and audit patterns. Focused checks and the senior rendered review gate; no full gate. A fresh exact recovery decision is required after the signed candidate and server preflight.
- User-owned prototype/cameo files remain untouched.

## Designer decisions (round 0)

The independent senior designer chose a list-board over a card grid (empty card space for short text) and fixed the following, recorded in full in [the review record](redesign/reviews/WANTED173_DESIGN.md):

- Data: title 1–80 characters on one line; optional description up to 300 characters and four line breaks. No structured rank/region/price fields: they would invite invented prices and demand counts. At most 6 shown and 20 total per game. Public responses carry only identifier, title and description.
- Public: shown only while the game accepts account sales (published, not paused, accounts service active, intake configured); game Accounts section only, not the global marketplace. A “Wanted accounts ↓” link beside the existing “Sell an account →” link moves focus to a section after the listings and pagination: eyebrow “Sell to PLAYORA”, heading “Wanted accounts”, intro “Own a matching account? Start a sale and we'll review it.”, one bordered list (title beside description from 768 px, stacked below) and one primary “Sell your account” action. Loading, empty and failed reads render nothing.
- Admin: new “Wanted accounts” module after Account inventory, with game selection, “{n} of 6 shown”, “View on site ↗”, an ordered list with Shown/Hidden chips, Move up/down, Edit, Hide/Show and Delete with inline confirmation, focus management and polite announcements, shown/total limits, empty, closed-game, load-error and version-conflict states.

## Implementation

- Migration `000048_wanted_accounts.sql` adds `wanted_accounts` (game, title, description, position, visible, version, idempotent request key/hash, actor and time columns) with unique `(game_id, request_key)` and ordered `(game_id, position, id)` indexes. Runtime schema version is 48 and startup readiness checks the new columns and indexes.
- `backend/internal/wanted`: administrator list/create/update/move/delete under `StaffTransaction`; every change requires one recent verification factor and writes an `auth_audits` record (`wanted_account_created|updated|shown|hidden|moved_up|moved_down|deleted`). Create is idempotent per request key; edits, moves and deletion require the exact version. Validation rejects control characters except line feeds. The public `GET /api/v1/games/{slug}/wanted-accounts` returns shown entries in staff order only while account sales are open (`catalog.AccountSalesOpen`); otherwise 404 `wanted_accounts_unavailable`.
- OpenAPI adds the six operations and `WantedAccount*` schemas; the frontend contract is regenerated.
- Frontend: `app/resale/wanted.tsx` (public section and link), `app/resale/market.tsx` (link row and section slot in the game marketplace only), `app/resale/wanted-admin.tsx` with its route and navigation item. The shared `Check` control gains optional `disabled` and hint text.

## Review and qualification

Three rendered review rounds after the round-0 decisions ended in **PASS** (round 1: six findings; round 2: three, including unmapped problem codes that would have shown a false “service unavailable” message in production). Findings, fixes and limits are in [the review record](redesign/reviews/WANTED173_DESIGN.md).

Local focused evidence on the final source:

- Go race unit tests for `internal/wanted` (validation bounds, line-break limit, request hash, shown counting, HTTP error mapping, strict JSON input, OpenAPI request/response contract), `internal/catalog`, `internal/database`, `internal/migrate` (48 migration files); golangci-lint and standalone gosec clean on touched packages.
- Frontend: strict types, ESLint, Prettier, repository/secret and design-inventory checks; 997/997 component cases including one untracked user-owned cameo file (tracked suite: 209 files / 987 cases, adding 6); 20/20 self-hosted fixture browser cases on desktop and Pixel 7 Chromium (public widths 320/390/768/1440, literal markup, empty/error omission, link focus, admin keyboard add/validate/move/hide/delete, limits, closed game, conflict focus and draft retention, shown-limit 422, action alignment, frameless form).
- Isolated server TiDB v8.5.8 (unistore on tmpfs, labelled container removed after each attempt; no live service touched): `TestWantedAccountMigrationStartupReadiness` (schema47 refuses a schema48 runtime, migrated schema passes `database.Ready`, one-step CLI rollback and reapply, drift rejected), `TestWantedAccountsAuthorityLimitsOrderAndVisibility` (customer/booster/anonymous denial, concurrent idempotent create, request-key reuse conflict, 6 shown / 20 total, public order/projection, moves and stale versions, hide/delete audits, recent-verification requirement, closed/unknown/paused games), `TestWantedAccountsHTTPPublicBoundary`, plus unchanged `TestChatFormMigrationStartupReadiness`, `TestTiDBMigrationLifecycleAndEntQueries` and `TestSubmissionHTTPBoundariesAndContract` — all passed.

Retained failures (private receipts under `.cache/wanted173/` and `/srv/playora-qualification/wanted173/`):

1. Attempt 1 used a non-allowlisted test port; the harness refused before any scenario ran.
2. Attempt 2: the new migrated-schema readiness regression caught a real startup defect — the non-unique `wanted_account_order` index was listed among required unique indexes, so the API/worker would have refused to start at schema48. Moved to the non-unique index check.
3. Attempt 3: five scenarios passed; the HTTP boundary test looked for a raw `<script>` although the encoder correctly escapes `<`. The test now decodes the JSON and asserts no raw `<`. Attempt 4 reran only that scenario and passed.
4. Mobile browser runs initially raced on a shared Vite dependency cache on cold start; each fixture and worker now has its own cache directory. Cold and warm runs then passed.
5. Lint caught a test that would have checked the intake game instead of the game without intake; corrected before any database run.

No full gate ran. No publication, message, invoice, funds or customer-data test occurred.

## Recovery note

Migration48 only adds `wanted_accounts`; no order, payment or account record references it. The schema48 runtime refuses schema47 and the current schema47 application refuses schema48, so returning to `6eaad20` would require the CLI to step back over 48, which deletes every wanted-account entry. That path is exercised against an isolated database only; application rollback on production is not qualified, and off-host recovery is still absent.

## Commit, release and deployment — 22 October 2026

Commit `746e545053d6e83b89411536555cd1a25d123c78` passed the normal focused hook on its fifth attempt (209 tracked frontend files / 987 cases, backend vet/golangci/standalone gosec/race/48 migrations/builds, govulncheck with no affecting vulnerabilities and the same unused-module advisory as before, 83 deployment-configuration cases). Retained hook failures: (1) Prettier rejected the copied `contracts/openapi.json` formatting, so both identical contract copies now use the formatted file; (2) strict types rejected a tuple in a round-2 browser regression; (3) the session ended during the generated-code check, leaving a half-regenerated `ent` tree that was regenerated and confirmed identical to the staged files; (4) the 100% route-coverage threshold required a route test for the new admin page.

Exact CI39708635082 and image release39710595717 passed, including image scans; the schema48 bundle was signed and verified. Preflight attempt 1 stopped at its own guard because the server qualification folder already held the database evidence (nothing transferred). Attempt 2 passed preparation, signed image pulls, signature, unchanged runtime/private configuration, gateway and configuration validation, schema47 with only 48 pending and the migration plan, then the live schema47 binary's storage probe failed: SeaweedFS (`-volume.minFreeSpace=20`) had no writable volume because the root disk reached 81% used, so **live uploads were also refused for a period**. This task's server qualification (Go toolchain/race build cache and four test source clones) plus the candidate image pulls caused the growth. Removing only the Go build cache and those four source clones (logs and results kept) reclaimed 2.42 GB; the live probe recovered within about a minute, and the server preflight step then passed. Free space is about 21%, roughly 1.5 GB above the floor, and needs owner attention before further large pulls.

The owner explicitly approved “Deploy 746e545 wanted accounts with this recovery risk”; this one-release exception is consumed. The normal signed procedure probed storage with the live binary, quiesced the application, applied migration48, verified schema48 (48 applied migrations), passed the candidate's dependency checks and started services. All eight services are healthy on the signed images; public HTTPS, portal isolation, redirects, unchanged legal/retention policies and private webmail passed. `GET /api/v1/games/mobile-legends/wanted-accounts` returns `{"items":[]}` and an unknown game returns 404 `wanted_accounts_unavailable`. Seven live read-only Chromium cases passed (GET/HEAD/OPTIONS only, no sign-in): the Mobile Legends Accounts page at 390/1440 px (wanted read answered, no section yet because nothing is published, no alerts or overflow), the global marketplace makes no wanted-account request, staff entry pages, and `admin.playoragames.com/wanted-accounts` requires sign-in.

Current manifest `/srv/playora/releases/746e545/deployment.env`; private receipts `/srv/playora-qualification/wanted173` and `.cache/wanted173/`. Off-host recovery remains absent. The schema47 application must not be restarted against schema48; returning to `6eaad20` needs the CLI to step back over48, which deletes all wanted-account entries, and production rollback is unqualified. Checkout stays enabled; supplier purchases, outgoing transfers and deletion stay disabled; Vendoria absent. No wanted account was published and no message, invoice, funds or customer-data test occurred. Administrators can now add entries at **Admin → Wanted accounts**.

## WANTED174 — request an account (22 October 2026)

Owner follow-up: a button beside the wanted accounts that takes customers to a conversation with staff about the account they want, so staff can publish it as a wanted account. Frontend only; no schema, API or backend change (the existing pre-sales conversation already records a published game slug for staff).

- Each game's Accounts section shows “Request an account” after “Sell your account” when wanted accounts are shown, or a small “Looking for a specific account?” section when none are shown or the read fails; nothing renders until the wanted read settles. It links to `/support?account_request=<game>`.
- The customer support start opens in request mode: subject “Account request — {published game name}” (from the public release, never URL text), legend “Request an account”, one note keeping the no-passwords warning, and the game slug on the created pre-sales conversation. The customer writes the first message; nothing is sent automatically. Invalid or unresolvable games fall back to the ordinary start. Sign-in return keeps only a valid `account_request`.
- Designer round 0 decisions E1–E4 and a round-1 **PASS** are in [the review record](redesign/reviews/WANTED173_DESIGN.md).
- Focused evidence: component tests for both request variants, loading, request mode, fallbacks, slug submission and the return path; 36/36 fixture browser cases on desktop and Pixel 7 Chromium (request row layout at 320/390/768/1440 px, empty/error section, loading rule, click-through to the prefilled start and the exact create body, long-inbox focus, fallbacks), plus the unchanged WANTED173 cases. Fixture iterations fixed a confirmation route that read storage once at startup, an inherited 12 px button margin and the row wrapping at 768 px. No full gate.
