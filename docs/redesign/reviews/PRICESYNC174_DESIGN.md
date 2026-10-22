# PRICESYNC174 — supplier price alerts design review

Scope: admin Shop products (`/admin/shop`) price-check section, product-row badges, the product editor notice and the supplier catalog `?q=` deep link (`frontend/app/shop/price-alerts.tsx`, `price-format.ts`, `shop.css`, `list.tsx`, `editor.tsx`, `suppliers/library.tsx`). Base commit `da8d6eb`. Reviewer: an independently spawned senior UI/UX designer agent (one agent across all rounds; it reviewed and reported, the implementing agent made every change). Evidence: self-hosted synthetic fixture `frontend/tests/fixtures/price-sync` (in-memory API, no backend or real data) rendered in Chromium through Playwright; captures in `.cache/pricesync174/shots-r*`.

## Round 0 — decisions before implementation

The designer fixed D1–D21, implemented as specified:

- D1–D3: one section, always the first child of the Shop products page, above the intro. Heading "{n} price alert(s)" from the server total, otherwise "Supplier price checks" (h2, focusable). Amber border and 4px left accent only while alerts exist; items separated by green dividers, no nested cards; no red frame.
- D4–D7: a quiet status line — "Checks every 8 hours. Last check: … (224 products). Next: …"; running, never-run, supplier-unreachable (amber) and unfinished-run variants say "Prices were not changed"; "Automatic price checks are off." when no supplier connection is configured, while existing records stay visible. Local en-GB times in `<time>`.
- D8–D13: only open alerts, sorted requirements changed → needs refresh → supplier price changed → unavailable → check failed. Badge, title (h3), quiet meta, one-sentence body, and for overridden prices a two-pair list: "Supplier cost[ for N units]: USD 1.005 → USD 1.20" and "Your price: USD 12.34". Supplier totals keep every decimal (padded to two), never rounded; no margin or recommended price. "Your price is below the new supplier cost." appears only when an exact BigInt comparison says so.
- D14–D15: actions per status (Keep my price / Change fixed price / Open product; Refresh in supplier catalog for blocking problems, which cannot be dismissed; Open in supplier catalog / Dismiss for unavailable; Dismiss for check failed), primary swapped to Change fixed price when below cost, visually hidden "for {title}" suffixes, a single refresh-path hint. After acknowledging: item removed, count decremented, polite status line, focus to the next, previous or section heading; quiet reload.
- D16–D21: collapsed "Automatic price updates in the last 7 days (n)"; loading, read-error (list never blocked) and "Showing the 50 oldest of n alerts." states; row badges (alert badge, then "Price updated {date}"); the editor notice above the toolbar in every section; supplier catalog reads `?q=` once; no `role="alert"` on load, 44px targets, no horizontal scroll at 320px.

## Round 1 — FAIL, six findings

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| P1-01 | Moderate | Primary and secondary actions rendered identically (the `secondary` class has no admin styling), hiding the action hierarchy and the below-cost swap. | All alert actions use the foundation `ui-button` with `data-variant="secondary"` for secondaries; one filled primary per item, asserted. |
| P1-02 | Moderate | Wrapped action rows started indented (inherited button margins plus the gap). | Zero margins on action children; regression asserts equal row starts and zero margins. |
| P1-03 | Minor | Row badge rendered "Price updated20 Oct" (inline-flex collapsed the space). | One inner span; regression asserts the space. |
| P1-04 | Minor | Amount pairs spread across 1071px, detaching our price from the cost. | `max-width: 28rem`. |
| P1-05 | Minor | On 409 focus landed on the error wrapper and acknowledge stayed enabled. | Focus "Reload alerts"; that item's acknowledge actions are disabled until reload; asserted. |
| P1-06 | Minor | The recent-updates disclosure had an off-palette blue box inside the amber section. | Box removed; green top divider; 44px summary kept. |

Accepted deviations: interval wording ("90 minutes" below two hours), a scoped rule letting existing product-row Edit buttons wrap long unbroken titles (needed for 320px), and the editor's post-acknowledge confirmation disappearing on section change.

## Round 2 — FAIL, one finding

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| P2-01 | Minor | P1-04 was not effective: the more specific `.price-alerts > li > *` rule kept `max-width: 100%` (the declaration matched but lost), so the list still spanned 1071px at 1440. The reviewer confirmed the other five fixes in the running page (one filled primary per item, flush-left wrapping, badge spacing, Reload-alerts focus with acknowledge disabled, unboxed disclosure). | The amounts rules (including the ≥480px side-by-side media rule, which had the same specificity problem) also target `.price-alerts > li > .price-amounts` and `.price-editor > .price-amounts`. New regressions measure the rendered width (≤448px) and side-by-side layout at every width, list and editor. |

## Round 3 — PASS

The reviewer re-measured the rendered lists and editor notice: 259px stacked at 320px; side by side from 480px (411px), 448px at 768 and 1440px with the pairs 236px apart; no horizontal scroll. The qty-5 below-cost item shows its amounts together, the below-cost line, one filled "Change fixed price" and two secondaries flush left. Verdict: **PASS — no remaining actionable findings in this scope.**

Rejected deviation: focusing the error wrapper on a 409 (became P1-05). Out of scope and unchanged: the shared ErrorNotice has no error styling; the editor's pre-existing "Product {id}" heading.

## Limits

Chromium only (fixture specs ran on Desktop Chrome and Pixel 7 emulation; no WebKit, physical devices or screen reader). Accessibility was judged from focus targets, disabled states, accessible names and live-region text. The reviewer did not run the 503 acknowledge stage itself; the spec covers it. Synthetic fixtures only — no live data. PASS means no issues found in this review, not a guarantee; owner acceptance remains separate.
