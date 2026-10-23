# SHOP181 — shop product ordering

The owner requested quantity and price sorting for game shops. On 23 October they clarified: **all diamonds first; Global diamonds before regional diamonds, then passes**.

## Behavior

- Default: all recognizable diamond packs first. Global leads, followed by other region names alphabetically; within each region, ascending diamond quantity. Passes follow all diamonds; other products follow passes. Region filtering preserves this order.
- Four choices: Diamonds: low to high, Diamonds: high to low, Price: low to high, Price: high to low. Explicit price sorting takes precedence over region and product type. It uses the published minimum enabled purchase displayed on the card; currencies are kept separate (USD first) rather than inventing conversion rates.
- Counts are inferred only from explicit diamond quantities in released titles. `50 + 5 Diamonds` means 55; `1000 Diamonds (500 + 500)` means 1000. Passes never become diamond packs because of their duration or included diamonds. Unrecognized products remain available after the known groups.
- Sort/filter state lives in the URL, resets pagination on Apply, survives product/back navigation, and clears to the default with Clear filters. Sorting applies before pagination across all visible published results.
- Bounded 200-row immutable-release batches and a 51-entry ordered page avoid loading every complete public product. Filter-bound cursors use deterministic IDs for equal-key ties. Old UUID bookmarks resolve their current public sorting position. Cursors are reading positions, not inventory/price reservations.
- No migration, catalog publication, price change, purchase activation, checkout, payout, identity or policy change.

## Design review

Independent senior designer initial recommendations accepted, amended to the owner's diamond-first clarification. Native Sort by select follows Delivery method within the existing Apply/Clear form. Existing green/champagne theme, narrow single-column controls and full-width action row are preserved. Rendered round 1 PASS: 1440px desktop, 768px tablet, 390px/320px phones, empty/error states. Three passing fixture browser cases cover keyboard Apply, four sorts, region filtering, product/back context, pagination/reset/back, clear and loading; no axe violations or horizontal overflow. Native-device and live-production rendering remain untested. Test-only lint corrections do not change rendered behavior.

## Qualification

Focused server-only unit/race, type checks and the initial three browser scenarios passed. First frontend lint run found two void-callback shorthand expressions and one fixture non-null assertion; corrected without changing behavior. First isolated TiDB run stopped at the environment guard before assertions because port14002 is not allowed; rerun uses the existing approved disposable port14001. Original failures are retained. Corrected frontend formatting, types, lint, component and three browser cases passed. All four isolated TiDB scenarios passed, including numeric ordering across 219 released products and multiple pages; the temporary database container and its memory-backed data were removed. The original normal focused hook passed and committed isolated sorting source6d6e5b5; it has not been published or deployed. Normal focused repository hook, exact CI, immutable image scan/signature and preflight remain required. No full gate or local tests. No live order, invoice, message, funds or customer-data tests.

The concurrently authored DISCOUNT179 work is excluded from this isolated source. Its eventual integration must reconcile price sorting with its new effective price projection; current production has no discount projections. Other authors' source/index entries must remain intact.

## Release

Pending. Live release at task start: 817812b, schema50. Supplier purchases remain disabled. Off-host recovery remains unavailable, and activation requires fresh exact owner recovery approval after passed preflight. Earlier exceptions are consumed.

During compilation, free disk fell to 19.6%, below the existing20% storage write floor. Removed only24 inactive generated Go binaries (1.39GiB) from eight completed qualification source directories after checking ownership, paths and executable use. Source, logs, runtime data, accepted images and receipts are intact; free space returned to20.56%. Further image-pull capacity must be checked before release.

## Owner expansion before release

The owner requested the same combined release also simplify product cards, prevent image alt/name flashes during loading, and replace public filtering controls with a modal and removable applied chips while keeping search visible. Independent senior design decisions extend this to shop, global/per-game accounts, news and boosting. Game directory search remains visible; private operations queues are outside this public-discovery scope.

Shop cards preserve the full authored title and one price block, combine region/delivery metadata without repeating title regions, show only exceptional availability and use a short View details action with the full accessible product name. Full descriptions/eligibility remain on details before purchase. Shared artwork retains reserved dimensions and accessible alt while hiding unfinished image paint; cached/lazy/error and source-change behavior are covered.

Filter edits are drafts until Apply. Cancel/Close/Escape discard drafts; Reset changes only drafts. URL state and back/detail return are preserved, all changes reset pagination, and chips remove saved criteria independently. Removing account currency also clears dependent price filters. Native modal, heading focus, close return, wrapping ≥44px chips and responsive sizing follow senior design decisions. Expanded rendered review passed after D01–D07 fixes; final responsive-image and hook qualification remain pending; the earlier PASS applies only to the initial sorting controls.

The original frozen focused hook completed successfully. Its backend/database qualification will be reused for the frontend-only expansion; no full gate is requested. Inactive generated compiler cache removal later reclaimed2.65GiB, restoring21.36% free; original cleanup evidence is retained.


Expanded UI qualification is separate from the passed backend evidence. UI3 exposed an unused import, callback lint issues, premature component queries, ambiguous label queries and an empty dependent price query parameter; original failures are preserved. UI4 passed21 component cases and7 browser cases; its eighth used the obsolete card action name, corrected in the fixture. UI5 passed9 browser cases. Senior rendered review then required the toolbar and short-dialog fixes; UI6 passed all10 browser cases including the new320×480 bounds assertions. A targeted responsive uploaded-artwork regression and final normal frontend/repository hook remain pending. No previously passed backend or database scenario was rerun for this frontend expansion.


Independent senior final rendered review: PASS using UI6's production-styled desktop/tablet/phone and320×480 evidence. A later test-only responsive fixture insertion incorrectly affected its account endpoint and failed UI7 types/lint/browser; corrected only that synthetic fixture, with the failure retained. The application responsive-picture correction keeps source and image as siblings inside a frame. No test failure or deployment risk has been waived.

Final scoped frontend round UI8 passed formatting, types, lint,22 component cases and the actual responsive thumb/card browser regression. Retained UI6 evidence covers the other10 browser journeys. The combined source now proceeds to the normal frontend/repository commit hook; original Go/security/race and four TiDB results remain applicable because backend bytes are unchanged.
