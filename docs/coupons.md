# Coupon administration and indicative checks

Administrators and owners use **Administration → Coupons** (`/admin/coupons`) after Google/email authentication and an authenticator check. Saving a policy requires recent verification of both factors because an enabled coupon takes effect immediately. Customers and boosters cannot list policies or read revision history.

Create a permanent 3–40 character code using ASCII letters, digits, underscores or hyphens. The server canonicalizes to uppercase. Codes cannot be renamed, deleted or reused to reset usage. Every save uses an expected revision and atomically updates the policy, inserts immutable history and records the authenticated actor in the audit trail. A conflict retains unsaved inputs; close/discard and select the current policy before deliberately applying revised changes.

Configure:

- Enabled state, an administrative name, and a fixed or percentage discount. Fixed discounts are positive whole minor units; percentages are exact decimals greater than zero and at most 100.
- A pricing currency (USD/EUR/GBP), which also denominates the minimum subtotal and optional maximum discount. Unsupported currencies cannot apply.
- Start/end instants with explicit timezone offsets. The start is inclusive and the end exclusive.
- A nonnegative minimum subtotal, optional positive maximum discount, global usage limit, and per-customer limit. Zero limits mean unlimited; positive limits are at most 1,000,000.
- Game slugs, service keys, package keys and categories. Empty offering scopes mean unrestricted. Service/package restrictions require game slugs to avoid unintentionally matching another game's reused key. Boosting is the UI default. If resale is enabled later, the platform funds its discount without reducing accepted seller proceeds.

No coupon creates credit or a wallet. One code applies after ordinary price adjustments/bounds and before final half-up rounding. The result retains at least one minor unit payable. Discounts too small to affect the payable amount are rejected. The displayed discount reconciles the displayed subtotal and final total; rounded presentation amounts are never used as arithmetic inputs.

The public form sends current release, service/package/variant selections and code to `POST /api/v1/catalog/games/{slug}/discount`. It cannot submit a subtotal, currency or payable amount. The server resolves the current release, validates the form and package eligibility/capacity, then applies the coupon. A paused, stale, archived or incompatible offering fails clearly. Manual-price-only selections need an administrator quote before a discount can be priced.

The endpoint returns the ordinary estimate envelope plus coupon ID/version/code and an `indicative` marker. Its expiry is no later than the coupon end time or the 15-minute estimate window. Origin/CSRF and server sessions protect requests. A shared TiDB limiter allows 30 attempts per minute per verified client address and, when signed in, per account. Forwarded addresses are trusted only with the configured SSR proxy authentication key; rotating arbitrary request headers does not reset limits.

Anonymous checks do not apply someone else's personal limit. Authenticated checks apply the caller's own limit. Both apply the global limit. Counted uses are all `held` and `redeemed` claims for the stable coupon ID, across every policy revision; `released` claims do not count. Lowering limits does not rewrite existing claims or accepted agreements. Policy history is bounded to 20 revisions per page; administrative lists use 50-code cursor pages.

## Reservation boundary

SQL migration 7 adds `coupons`, `coupon_revisions` and private `coupon_claims`, with a unique code, a unique policy revision and one coupon claim per payable contract. Ent generates queries only. Upgrade through the explicit Cobra migration job (`make -C backend dev-up` for local development), never startup/Ent migrations. A destructive development rollback drops this history and claim data; production uses forward corrections.

P04 implements policy management and **indicative checking**, not a standalone reservation endpoint. Checks do not insert claims. P05 reserves usage atomically with payable package orders or accepted custom quotes. P07 converts claims to redeemed only on verified settlement and releases them only once the invoice/contract cannot settle normally. Concurrent-redemption, expiry and late-payment behavior must pass the real P05/P07 integration before checkout opens. Refunds do not automatically restore uses or create balances.

Accepted custom quotes must capture pre-discount price and coupon policy/result. Recheck on acceptance; changed/ineligible discounts require a new quote and fresh customer acceptance. A valid invoice preserves its accepted discounted total. The tests that insert isolated synthetic held/redeemed/released claims in P04 verify counting and database uniqueness; they are not evidence of completed order/payment reservation behavior.

## Verification

Run `make pre-commit` at the repository root. Coupon tests cover exact rounding, minimum payable/caps, time boundaries, currencies/categories/scopes, reused keys across scope dimensions, invalid policy values, personal/global counts across revisions, ignored released claims, duplicate contract claims, concurrent edits with one winner, immutable history, transaction rollback on audit failure, staff recent-factor requirements, CSRF, malformed/oversized requests, stale releases and shared throttling despite forged forwarding headers. Browser tests create/edit policies through the UI, read history, check custom/package discounts, reject unknown codes, verify anonymous access boundaries and run desktop/mobile accessibility and overflow checks.
