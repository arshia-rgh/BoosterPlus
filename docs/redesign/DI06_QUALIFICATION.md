# DI06 qualification — in progress

27 September 2026. Customer records, scheduling presentation and the signed-in activity panel. DI00–DI05 are delivered; DI07–DI15 remain authorized subsequent work. Final launch stays held.

## Implemented scope

Customer orders retain record identity and status through Overview, Messages, Progress & sessions (or account Delivery), Payment and Help. URL-backed sections preserve back/forward and list filters. Ordinary drafts remain in memory across visited sections; private support and explicitly shared booster coordination have separate drafts and audience labels. Payment instructions and credential delivery remount for fresh authorization. Recoverable order/session refresh failures hide retained content and preserve non-sensitive drafts; confirmed access loss clears it and requires explicit recovery. Session events cannot trigger a repeated denied-fetch loop.

The account overview and order list link to the appropriate local next step. Scheduling starts with available windows; empty availability gives refresh/support guidance and does not invite unusable time input. Session proposals remain distinct from confirmed bookings. Account purchases use Delivery and are not routed into boost progress.

The customer-only corner activity surface exposes bounded owned current orders, real staff-reported progress and update timestamps. Its backend projection excludes notes, player answers, assignee details and credentials, and includes progress only for active orders with their current settled contract. Desktop expansion is nonmodal; narrow expansion uses a native modal dialog with inert background, keyboard dismissal and deliberate focus restoration. Navigation does not steal destination focus. Failure, empty, offline/stale and revoked-authority states remain distinct. Staff portals never render customer activity. The panel loads separately after customer-session verification to preserve shared homepage budgets.

## Qualification evidence

- Focused isolated TiDB race integration: account-overview ownership, bounded results, unread audiences, suspension, paid current-contract progress and excluded unpaid/completed/foreign progress passed (8.149s). No SQL migration is needed for the read projection.
- Initial component run passed 320 local cases (310 tracked plus ten held experiments). Final checks follow applied-build corrections. Coverage is limited to its configured modules; no whole-application coverage claim.
- Final applied-build real-API browser run passes all eight desktop/mobile journeys, including orders, quote decisions, both fulfillment modes, reviewed completion, scheduling, payments, disputes, refunds and account delivery. Additional assertions verify empty native activity dialogs across320/390/768/1440 widths, Escape/focus, sign-out removal, owned80% reported progress and exact-order navigation. Log: `/tmp/playora-di06-browser-final.log`.
- Strict types, ESLint, golangci-lint (zero issues), standalone gosec and root repository checks pass. The applied component suite passes320 cases (310 tracked plus ten held). Both production builds pass after moving authenticated activity CSS into its lazy chunk; budget thresholds were not changed.
- Required scoped senior review is **PASS** after three rounds, including the applied build at1280×900,768×1024,320×800 and320×450,21 zero-violation sampled axe scans, booking variants and recoverable/private draft checks. See `reviews/2026-09-27-di06-customer-workspaces.md`. The unchanged full tracked hook remains required before delivery.

## Corrections and limits

Preparation review found shared-channel refresh draft loss, hidden pagination locks, modal navigation focus theft, recoverable-order refresh draft loss, active-tab contrast, undersized embedded chat history, floating-control clearance and customer-facing staff task language. These were corrected with regression cases. Empty scheduling windows now suppress dependent fields until a current window is selected. The initial applied lint run caught test callback/type-narrowing issues; build caught shared CSS budget growth; model extraction then caught missing TypeScript type imports. Failed attempts are not qualification passes.

Synthetic previews supplement real-API fixtures and cannot qualify real money movement, actual merchant responses, physical-device keyboards or owner visual acceptance. No live merchant requests, private credentials or held cameo/audio assets are included. Full integrated 31-journey qualification remains DI14/DI15 work.


## First complete-hook failure and correction

The first unchanged full hook passed live Go security scans, race units and complete TiDB integration (504.895s),30 migrations, backend images/scans, 320 local frontend cases, and both production builds. Its browser suite exposed the same session-cooldown recovery regression on desktop and mobile: root activity issued its own customer-session request on protected account pages and could consume the429 fixture response before Identity's recovery view. The remaining browser checks passed; the hook correctly refused the commit. Log: `/tmp/playora-di06-resource-gate.log`.

The root now omits activity on the workspace layout; the customer workspace supplies its already verified session to the panel. Public-page checks remain separate and now respect in-flight requests and server cooldown before focus/poll refresh. Two new component regressions cover supplied-session reuse and public cooldown. Applied types/lint/builds and322 local component cases pass (312 tracked plus ten held). Real-API recovery regression and a fresh scoped designer round are required before repeating the unchanged complete hook. No recovery assertion, rate budget or timeout was weakened.


DI06 recovery qualification passes all 16 focused real-API browser cases (eight desktop/eight mobile), including the original unchanged cooldown assertions. The mounting follow-up found DI06-UX10 (public activity navigation left focus on BODY); first client workspace entry now focuses the destination heading and waits for delayed headings. Three component regressions pass. The designer rechecked public activity to history/support/exact order at 1280x900, 320x800, 320x450 and returned final scoped PASS. Evidence: `/tmp/playora-di06-recovery-browser.log` and `/tmp/di06-review-final-focus.json`. The complete tracked hook is being repeated; no commit is yet claimed.
