# Versioned pricing (P04, pricing stage)

Pricing is configured inside each service in **Administration → Catalog editor**. Choose **Calculate estimate**, set the pricing currency and base, and enter positive minimum/maximum amounts in whole minor units. No price is seeded for Mobile Legends. Existing `manual-review-v1` services continue to request manual pricing.

Add operations in their intended order:

- **Fixed surcharge:** add an exact, nonnegative minor-unit amount.
- **Per unit:** multiply an estimate-stage numeric selection by an exact minor-unit price and add it to the subtotal.
- **Percentage adjustment:** adjust the running subtotal by −100% through 10,000%.
- **Multiply subtotal:** apply a named positive factor of at most 100.
- **Rank interval sum:** price progression through ordered ranks. Each interval identifies its starting rank. Without units, sum complete transitions; with two distinct unit fields, prorate partial ranks using their catalog unit counts. Every selectable interval needs a price; unit pricing requires positive catalog unit counts. Backward/nonadvancing or missing selections cannot receive an estimate.
- **Require manual review:** matching selections produce a manual-review outcome without an amount. Missing price dependencies and arithmetic overflow also fail closed to manual review.

Conditions use the same bounded, typed builder as form conditions and reference only estimate-stage fields. Values use exact decimal strings, at most 12 integer and 6 fractional digits, with no exponent syntax. No expressions, scripts, floating-point totals or client-submitted prices are evaluated. Each intermediate subtotal is bounded to 999,999,999,999 minor units. The configured min/max bounds apply last and then the nonnegative result rounds half up once. Breakdown lines are differences of rounded running totals so they sum to the displayed amount; these presentation values never influence the calculation.

Save synthetic price examples with independently specified expected outcomes and whole-minor-unit totals. At least one passing example is required for publication. Every saved example must satisfy the current form and match the current evaluator. Changing a rule, option, default or field can invalidate examples and prevent publication. Save multiple cases for the branches and edge conditions your service uses; one example is not proof that your commercial pricing is correct. Examples are retained in administrator drafts/history but omitted from anonymous release responses. Never put customer information in examples.

Preview validates the saved working copy. Expected-example mismatches can be inspected and corrected before publication; ordinary configuration and input checks remain active. Publishing requires recently verified staff factors and atomically pins form, catalogs, prices, examples and evaluator identifier in one immutable release. Saving a draft does not change the storefront price.

`POST /api/v1/catalog/games/{slug}/estimate` accepts `release_id`, `service` and ordinary `answers`, with the existing Origin/CSRF transport protection. The server resolves the current published offering, rejects a stale release or paused game, normalizes visible inputs and returns `estimated`, `manual_review` or `invalid`. Successful calculations include the release/version, evaluator, currency, reconciled breakdown and a 15-minute expiry. This response is provisional and never authorizes checkout. Custom orders still require an administrator's final quote and customer acceptance; that workflow is P05. Package prices remain exact published variant amounts.

Administrators can exercise the saved draft through `POST /api/v1/admin/catalog/games/{id}/estimate-preview`, passing its draft revision as `release_id`. Anonymous customers, customer accounts and boosters cannot use this endpoint. Preview does not store submitted selections or create an order.

[Coupon configuration and indicative eligibility](coupons.md) are implemented in the second P04 stage. Reservation/redemption/release behavior is integrated with orders and verified payment evidence in P05–P07. No wallet, payable contract, stock reservation or discount entitlement is created by an estimate. Live currency, Mobile Legends rates/options and win-rate guarantees remain owner decisions.

Run the root `make pre-commit` for the repository, backend and frontend gates. Pricing tests cover half-up boundaries, fractional per-unit/rank calculations, percentage/multiplier order, min/max, missing dependencies, manual conditions, overflow, hidden and injected inputs, saved-example failures, immutable published prices, stale/paused releases, CSRF, draft access and malformed/oversized requests. The real TiDB/browser journey creates pricing through admin controls, rejects an incorrect saved expectation, publishes the correction, and verifies customer estimates on desktop/mobile with axe accessibility checks.
