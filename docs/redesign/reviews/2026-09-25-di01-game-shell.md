# DI01 persistent game shell and artwork framing — scoped review

25 September 2026 · Base `57ec5e2` · Reviewer `/root/di01_game_review` · **PASS after three rendered rounds**

## Changed scope

Persistent game introduction/background across the existing game, custom service, fixed package and public review routes; wide overlaid artwork, bounded desktop/mobile framing and desktop copy side; local errors/retry/focus and failed-art fallback; optional catalog-editor framing controls. This is a DI01 foundation slice, with the minimal versioned framing contract prepared ahead of DI03. It does not complete the service chooser, promotions, public statistics, accounts/shop/news subflows or DI01 as a whole.

Review used the actual built storefront/admin application through a loopback-only read-only synthetic API. MLBB/WoW reference images were served by an explicit temporary allowlist from the design package, not copied into production assets. No real credentials, mutations, checkout, provider requests or commercial claims were used. Existing catalog publication/authorization is qualified separately by automated tests.

## Rounds

- Preflight: reviewer rejected a split rounded-card draft and requested the accepted full-width overlay, per-image framing/copy side and context-preserving recovery. Applied before rendered review.
- Round 1 — **FAIL**. G01: strict CSP blocked inline focal variables in SSR output, clipping MLBB's face despite published metadata. Replaced inline positioning with static, bounded data-attribute rules; the CSP remains unchanged. G02: artwork retry unmounted the focused control. Kept a stable status/reload button through success and repeated failure; added a focus regression.
- Round 2 — G01/G02 verified fixed; **FAIL** for G03. A missing image could finish before hydration and escape React's error listener, leaving broken artwork and an oversized hero. Added ref-time complete/natural-width detection, retained asynchronous error handling, removed the failed backdrop and corrected right-copy compact fallback width.
- Round 3 — **PASS**. Reviewer verified G03 on direct SSR entry and all remaining fixes. Final verdict: “PASS — no remaining actionable findings in this scope.”

## Evidence

- Actual 320, 390 and 768px game/editor views; MLBB and WoW recognizable with readable overlay copy. Full 1440×1000 browser captures independently inspected because CUA's visible panel clipped its large screenshots.
- Custom/package transitions and browser Back retain game identity; one main heading. Local 404 retains game context; a synthetic 503 retry recovers and focuses its heading.
- Reduced-motion control stops backdrop motion. Editor controls reflow, keyboard ranges update values, dirty-draft feedback remains visible; repeated missing-art retries preserve focus.
- Missing-art SSR entries at 320/768 remove failed hero/background images and show a compact readable fallback.
- Supplied 320px/200%-root-text screenshots checked for both games, with no page overflow or lost controls. This is text-resize evidence, not actual browser zoom.
- Unit coverage includes navigation, transient retry, both child/parent HTTP errors, legacy/paused/failed artwork, pre-hydration failure, bounded framing edits, malformed metadata and repeated editor failure/focus.
- Backend catalog tests cover bounded numeric/enum validation and TiDB publication/immutable release framing. Existing role/version/publication checks remain active. No SQL migration is needed: this optional field is persisted inside the existing versioned configuration JSON, and legacy releases retain defaults.

## Limits and next work

Synthetic visual review does not prove live authorization, payment or production behavior. Real save/publish and browser recovery are part of the required repository gate, not the read-only review fixture. Physical devices, actual browser zoom, assistive technology and final DI15 owner acceptance remain open. Existing service-card/discovery design is outside this slice and remains DI03/DI04 work. R10/R11 stay held.

The final parent-level unavailable-game recovery also receives a specific document title. The game-shell browser regression asserts its 404/title/recovery link. The senior reviewer inspected this bounded title-only change and explicitly passed it without reopening unrelated screens.
