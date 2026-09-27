# DI10 resale and financial workspaces — in progress

27 September 2026. Base: DI09 receipt `50ea8f3b4ef75b7a9a24de0bf86bab2f536ca92c`. DI10 is being delivered in verified increments; this record does not mark the whole phase complete. DI11–DI15 remain authorized; R10/R11 and final launch remain held.

## First increment: persistent workspaces and purchase recovery

Seller and administrator submission records retain role, reference, status and local Overview, Account details, Messages & evidence, Sale agreement, Secure handover, Payout and Activity sections. Ordinary edits survive local navigation and recoverable outages; access loss clears private state. Offer acceptance, protected ownership handover and direct payout remain distinct. Withdrawal requires an explicit confirmation with the account identity and applicable restrictions.

Submission edits bind the saved revision. A newer remote revision cannot silently replace a dirty draft, and an acknowledged save cannot be rolled back by an older parent response. Starting intake from a game's Accounts service preserves the bounded game selection. Pending or uncertain creation locks game/title and retries the same request; no private title or consent is stored in a URL or browser storage.

Inventory has local Details, Images, Terms and Publication sections, a private preview of the saved revision and an explicit review prerequisite before publication. Reserved/sold restrictions remain. Leaving a dirty listing offers focused Stay/Discard choices. Internal section changes preserve ordinary drafts. Protected previews use authorized image downloads. Submission/inventory and finance/order links retain the exact source section plus validated filter/cursor context.

Account inspection and explicit purchase review are separate steps within the game shell. Going Back restores focus to the listing review action. Reservation requires current terms/price acceptance and reuses the existing owner-scoped request recovery API. A lost response can recover the saved order without a second reservation. A signed-out request exposes a sign-in recovery action without persisting private answers or acceptance. Account-specific support starts with a bounded listing reference.

Buyer delivery and staff fulfillment preserve ordinary notes across local order tabs. Protected upload/reveal controls unmount when hidden or checking eligibility. Delivery-specific denied reads or writes clear drafts/consent; recoverable 503 preserves them. Explicit recovery rechecks access and permits fresh input. Staff buyer previews remain labeled within the staff order and omit credentials.

No backend/API/migration, dependency, payment success, payout activation or commercial-state changes are part of this increment. Provider tests use isolated fixtures; no real transfer was attempted.

## Evidence and corrections

- Before application, prepared-source strict types, lint, builds and 366 component cases passed. The hash-checked workspace was applied only after DI09 was committed and verified remotely. The old prepared copy is historical, not the current source of truth.
- Actual application strict type checks, ESLint and the initial full component run passed: 371 cases, including ten held untracked experiment cases, with 100% required route-boundary coverage. Later focused tests cover the added intake and denied-write recovery corrections; the final hook must retest the complete frozen increment.
- Real isolated API browser journeys passed seller submissions, resale/payment and support: three desktop and three mobile cases. Log: `/tmp/playora-di10-focused-browser-1.log`. Existing portal, payment evidence, private handover and authorization assertions were retained. This run precedes the final designer fixes; the complete frontend gate will rerun the final tree.
- New component scenarios cover stale submission revisions, save acknowledgement, inventory conflict and dirty navigation, ordinary recovery versus denial, bounded finance/portal returns, purchase inspection/acceptance/lost-response recovery, protected control unmount, denied delivery writes and exact intake-request retries.
- Rendered purchase/delivery checks cover 1440×1000, 320×700 and 768×1000. Twelve captures have no axe findings or document overflow. The game stage remains mounted, review/Back focus is checked, and settled local tabs remove protected controls while retaining ordinary notes.
- Nine narrow recovery captures cover delivery 503, read403, write403 and restoration, signed-out purchase recovery, lost reservation response and uncertain intake. The intake game-summary fixture initially lacked required fields; a corrected narrow recapture in `/tmp/playora-di10-review/intake-round4/` verifies both game selection and title disabled. All final captures have clean axe/overflow results. The lost-response fixture records exactly one reservation write and recovers its saved order.

Local rendered evidence: `/tmp/playora-di10-review/round-{1,2,3}/`, `/tmp/playora-di10-review/purchase-delivery-round2/`, `/tmp/playora-di10-review/purchase-delivery-recovery-round3/`. Capture harness failures (wrong game selector, assertion before route settlement, incorrect axe context, incorrect recovery action after session invalidation, and preview startup timing) were corrected and rerun; failed captures are not passes. Existing 403 handling intentionally invalidates the enclosing customer order, so rendered recovery uses Check order access again. Component tests separately exercise delivery-local recovery without parent unmount.

## Independent review and delivery

The senior designer passed the seller/inventory/finance scope after three rounds and six corrections; see [workspace review](reviews/2026-09-27-di10-workspaces.md). The independent final purchase/delivery/intake review is **PASS — no remaining actionable findings in this scope** from `/root/di10_final_design_review`; see [final review](reviews/2026-09-27-di10-purchase-delivery.md). The initial reviewer verified spacing/focus and identified delivery write-denial and uncertain-intake game-switching follow-ups, then was interrupted before final verification. The final reviewer independently verified those fixes, source/tests and all final rendered evidence. Tracked-hook execution and delivery receipt will be appended after they actually complete. No missing review or blocked check is treated as a pass.

## Remaining DI10 work

Complete design-matched marketplace price/sort filtering with server pagination and currency-safe comparisons; verify all remaining finance/case/payout screens and F03/F05/F06/F07/F17 segments against accepted designs and existing backend state machines. Qualify exclusive/expired reservations, immutable commercial snapshots, both seller arrangements, delivery/secret authorization, case holds and duplicate/partial/failed outgoing operations with isolated fixtures. Update all twenty owned view rows only after phase exit evidence is complete. Controlled real transfer qualification belongs to held R11, not this increment.

## Full frontend qualification before delivery

`make -C frontend pre-commit` passed on the final runtime source: formatting, strict types, ESLint, 374 local component cases (364 tracked plus ten held untracked experiments), 100% required route-boundary coverage, dependency audit, both production builds, server tests, 106 desktop/mobile browser journeys, container builds/scans and isolated SSR/non-root/read-only container smokes. Log: `/tmp/playora-di10a-frontend-gate.log`. Root checks also passed (`/tmp/playora-di10a-repository.log`). The tracked Git hook must still run at commit; no commit or remote delivery is inferred from this standalone qualification.

## First-increment delivery receipt

Implementation `0677ae35864257ffca976cbb4c1a0cb6e3d58837` passed the unchanged tracked scoped hook (repository plus complete frontend pre-commit) and was pushed directly to `origin/main`; the remote SHA matched. Evidence: `/tmp/playora-di10a-resource-gate.log`. The hook repeated the 374 local component cases, 100% required route-boundary coverage, 106 desktop/mobile journeys, dependency/contract/build checks and container security/smokes on the frozen staged source. Both independent scoped design reviews are PASS. Held prototype/cameo directories remain untracked and excluded.

This delivers only the first DI10 increment. The full phase remains in progress, including marketplace filtering and financial evidence/workflow qualification. Independently prepared marketplace query/HTTP code has passed unit tests, Go lint, standalone gosec and targeted TiDB race tests in a temporary copy; it is not part of this delivered commit. DI11–DI15 remain authorized and R10/R11 stay held.
