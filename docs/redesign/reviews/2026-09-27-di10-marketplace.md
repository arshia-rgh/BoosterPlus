# DI10B marketplace filter review

Reviewer: independent senior UI/UX designer agent `/root/di10_market_design_review`.
Base: `434e314`. Scope: `market.tsx`, new marketplace filter/game/price helpers, and affected marketplace CSS. Preview: isolated synthetic `http://127.0.0.1:4185`. No live provider calls or production writes.

## Round 1 — FAIL

**MF01 — P2, filter row alignment.** At desktop 1440 and especially tablet 768, `.market-filters fieldset { align-items: end }` puts the new currency and maximum-price field groups at different vertical positions because helper paragraphs differ in height. At 768 the Account rank input begins below the currency helper while Maximum price sits between, leaving a disjointed reading order and large empty gaps. Align groups from the top or provide consistent helper rows. Evidence: `applied-768.png` and `global-1440.png` under `/tmp/playora-di10b-review`.

Rendered checks completed at 1440×1000, 768×1000, and 320×700: marketplace baseline, missing-currency validation, exact decimal price application, sort/currency/maximum/game chips, clearing from the form, and game-local marketplace shell. No horizontal overflow and no axe violations in these captures. Applying filters places focus on the result summary. Missing required currency places focus on the currency field; filling USD permits submission, preserving the exact 125.50/12550 conversion. Mobile apply closes the filter drawer. Clearing removes global game/price/sort filters.

Evidence: `evidence.json` and corresponding screenshots in `/tmp/playora-di10b-review`. The synthetic API deliberately returns one fixture listing irrespective of filters; this review does not qualify real filtering or database behavior.

## Pending

Re-review MF01 after rebuilt preview is restarted. Finish keyboard, listing return context, empty and failed game-choice recovery checks. A follow-up capture overlapped preview rebuilding and timed out locating the listing; this is a harness/preview availability limitation, not an application finding.

## Round 2 — FAIL

MF01 is resolved: rendered 768px field labels and inputs now share aligned rows, with helper text beneath each control. See `resize-draft.png` and `return-global.png`.

**MF02 — P2, unsubmitted filter drafts lost at responsive breakpoint.** At 320×700, open Filter accounts, enter Search accounts = `Draft search`, currency `USD`, maximum `125.50`, and sort `price_desc`. Resize to 768×1000. All fields reset to empty/default newest, because moving between drawer and inline layout remounts the new stateful form. Rotation or window resizing discards user work before Apply. Required outcome: retain all draft selections/values across this layout transition in both directions, preserving current validation/application behavior. Evidence: `more-evidence.json` first entry and `resize-draft.png`.

Completed additional checks: global marketplace and game-local marketplace listing detail/back preserve exact currency, maximum, sort and region values; invalid three-decimal maximum focuses the relevant field; correcting invalid filters enables apply; changing price sort back to newest removes the currency requirement; keyboard Enter opens the mobile dialog and Escape returns focus to its trigger; game-choice 503 error offers a working Retry; filtered-empty state keeps filter/clear recovery visible. Screenshots `return-global.png`, `return-game.png`, `game-options-failure.png`, `filtered-empty.png`. No new overflow observed. Failure/empty responses were intercepted local fixtures, not live API failures.

Only MF02 remains open in this scope. Awaiting corrected preview for final round.

## Round 3 — PASS

**PASS — no remaining actionable findings in the reviewed DI10B marketplace UI scope.**

MF01 remains resolved in desktop/tablet renders. MF02 is resolved: the corrected preview preserved all seven game/search/region/rank/currency/maximum/sort draft values through 320 → 768 → 1440 → 320. Apply submitted the preserved values with exact maximum `12550`, closed the mobile dialog and focused the result count; Clear all filters reset the preserved form state. Evidence: `final-evidence.json`, `fixed-draft-320.png`, `fixed-draft-768.png`, `fixed-draft-1440.png`.

Repeated the original full 1440×1000, 768×1000, 320×700 rendered validation/apply/clear/game-shell checks on the corrected build: 15 new captures under `round3/`, zero horizontal overflow and zero axe findings. Missing-currency validation still focuses the correct input, applies successfully after correction, and retains readable game/currency/maximum/sort chips. Also verified the changed More accounts/First accounts actions return focus to the loaded result summary and retain filter query context using an isolated pagination fixture (`pagination-evidence.json`). Direct viewport capture `mobile-dialog-viewport.png` confirms the filter dialog occupies the viewport and its content scrolls internally; full-page screenshots of native top-layer dialogs include underlying content outside the viewport and should not be read as a real backdrop/positioning defect.

No further actionable scoped findings. This is a local Chromium and synthetic-data UI review, not physical-device/screen-reader qualification, database filter correctness, real account availability or provider/funds qualification. Those broader checks remain with implementation gates/DI15/held launch qualification as applicable. No product files edited by this reviewer; no live APIs or payments contacted.
