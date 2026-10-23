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

Focused server-only unit/race, type checks and the initial three browser scenarios passed. First frontend lint run found two void-callback shorthand expressions and one fixture non-null assertion; corrected without changing behavior. First isolated TiDB run stopped at the environment guard before assertions because port14002 is not allowed; rerun uses the existing approved disposable port14001. Original failures are retained. Corrected frontend formatting, types, lint, component and three browser cases passed. All four isolated TiDB scenarios passed, including numeric ordering across 219 released products and multiple pages; the temporary database container and its memory-backed data were removed. The normal hook remains pending. Normal focused repository hook, exact CI, immutable image scan/signature and preflight remain required. No full gate or local tests. No live order, invoice, message, funds or customer-data tests.

The concurrently authored DISCOUNT179 work is excluded from this isolated source. Its eventual integration must reconcile price sorting with its new effective price projection; current production has no discount projections. Other authors' source/index entries must remain intact.

## Release

Pending. Live release at task start: 817812b, schema50. Supplier purchases remain disabled. Off-host recovery remains unavailable, and activation requires fresh exact owner recovery approval after passed preflight. Earlier exceptions are consumed.

During compilation, free disk fell to 19.6%, below the existing20% storage write floor. Removed only24 inactive generated Go binaries (1.39GiB) from eight completed qualification source directories after checking ownership, paths and executable use. Source, logs, runtime data, accepted images and receipts are intact; free space returned to20.56%. Further image-pull capacity must be checked before release.
