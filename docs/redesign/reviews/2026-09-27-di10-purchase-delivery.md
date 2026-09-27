# DI10 purchase, delivery and intake — independent final senior UI/UX review

Date: 27 September 2026. Reviewer: `/root/di10_final_design_review`.

**PASS — no remaining actionable findings in this scope.**

## Scope and basis

Reviewed the current staged increment against base `50ea8f3`: account listing → local purchase review and request recovery (`frontend/app/resale/market.tsx`), customer/admin delivery and local support/private buyer preview (`frontend/app/resale/delivery.tsx`), new seller intake (`frontend/app/submissions/pages.tsx`), affected order denial recovery (`frontend/app/orders/detail.tsx`), and relevant support, portal-return and component-test changes. This closes the first-round findings in `/tmp/playora-di10-purchase-review.md`. The earlier seller/inventory/finance review remains separately scoped; this review does not repeat or replace it.

Independently inspected current source, the staged diff, `useResource`, denial/uncertainty helpers, delivery and intake regression tests, capture scripts, all 12 round-2 rendered screenshots, the first eight round-3 recovery screenshots, and the replacement round-4 intake screenshot. No implementation edits or live writes were made by this reviewer.

## Findings verified closed

- **DI10-PD01 — resolved.** Listing secondary destinations use `catalog-actions`; rendered screenshots at 1440, 768 and 320 pixels show distinct links with clear spacing and natural narrow-screen wrapping.
- **DI10-PD03 — resolved.** The local review effect focuses the review panel and restores focus to “Review this account purchase” only when returning from review. It does not force focus on initial inspection. Round-2 evidence records successful review and Back focus at all three widths, with the actual `.game-stage` retained 1 → 1.
- **DI10-PD02 — resolved.** A delivery GET or POST access denial clears ordinary note and consent, and hides the row/protected controls. The denial helper covers 401/403/404. Recoverable 503 retains ordinary input. Explicit delivery refresh clears the write error and revalidates; loading keeps secret controls unmounted and ordinary actions disabled. After successful resource recovery neither denial condition remains, so fresh edits are not cleared in a loop. The isolated delivery component tests specifically exercise endpoint-only read denial and write-denial refresh while retaining the component. Rendered integration recovery shows blank note/unchecked consent after denial and “Fresh input works” after write recovery. The integrated 403 captures use the enclosing order/session denial path; they are not misrepresented as an isolated endpoint-only browser reproduction.
- **Uncertain intake regression — resolved.** Game selection and title are disabled during pending creation and remain disabled after an uncertain result. The retry is clearly labeled “Check the same submission request”; explanatory text asks the user to keep the page open. Source preserves the same key, game, release and title. The regression test covers an uncertain result, a subsequent 409 and eventual recovery with identical request payloads; the replacement 320-pixel rendered evidence confirms both game control and title disabled. The valid queried game remains selected.

## Rendered evidence and affected behavior

- `/tmp/playora-di10-review/purchase-delivery-round2/`: listing, purchase review, buyer delivery and admin delivery at 1440×1000, 320×700 and 768×1000 browser viewports. Full-page screenshots inspected. Evidence records no document overflow or axe violations; settled section switches remove customer reveal/admin secret-input controls from the DOM (0), while ordinary drafts survive local section round trips.
- `/tmp/playora-di10-review/purchase-delivery-recovery-round3/`: first eight captures at 320×700 inspected. Recoverable read failure/retry, access-denial recovery, denied-write recovery, signed-out request recovery and lost reservation-response recovery are legible, preserve appropriate shell identity, and present usable recovery actions. Evidence records no overflow or axe violations and one reservation write in lost-response recovery. Signed-out recovery does not claim stored private answers or acceptance.
- `/tmp/playora-di10-review/intake-round4/intake-uncertain-320.png` and `evidence.json`: authoritative replacement for the round-3 intake fixture. Both game and title are disabled; narrow layout and recovery instructions remain readable. Recorded axe and overflow results are clean.
- Customer delivery links remain local to the current order's Messages/Help sections. Admin buyer preview is explicitly labeled inside the admin workspace and excludes protected credentials. The affected order-denial actions are visibly separate at narrow width.

## Limits and handoff

This is an independent rendered/source review of the bounded increment, using synthetic local preview evidence at `http://127.0.0.1:4184`. Recorded automated metrics were inspected, not independently rerun by this reviewer. Fixture values are not approval of live prices, commercial terms or financial behavior. No real credentials, provider actions or funds movement were exercised. Physical-device, assistive-technology and owner acceptance remain separate qualification limits; this is not a full-site or entire-DI10 certification and does not authorize final launch. Root must record this verdict in the repository review/progress documents and complete the required repository gates before committing.
