# P05 implementation design

This phase implements unpaid custom/package orders, quote revisions and accepted commercial contracts, customer/admin views, favorites and safe reorder drafts. Payment evidence and provider operations remain P07. No order can become paid through a client claim, an admin status button or an estimate.

## Transaction and authorization boundaries

Every mutation rechecks the live session/role inside a READ COMMITTED transaction fenced by the identity security-control row. The initial implementation serializes these short business mutations with catalog/coupon/staff changes. This favors explicit correctness on TiDB; production load qualification must measure contention before choosing narrower resource locks. No network/provider calls occur while holding this transaction.

Customers can access only their own orders/favorites. Administrators use separate administrative endpoints. Boosters receive no access to other customers' orders until P08 establishes explicit assignments. Customer-visible private timelines contain customer-visible explanations and role labels, never internal notes, provider data, credentials or unnecessary staff identity.

## Orders and quotes

Order creation has a customer-scoped idempotency key and keyed request digest. A replay with the same request returns the existing order, even if catalog availability changed afterward; a different request under the same key conflicts. New requests validate the current published release, current terms acceptance, ordinary order-stage inputs and package eligibility. Snapshots retain the original catalog/form and commercial context. No fulfillment-stage credentials or file references are copied into this flow.

Custom requests start submitted and cannot create a payment route from an estimate. Staff can request clarification, reject, or issue a quote. Customers can revise unaccepted selections; this returns the request to review and supersedes the previous quote. Quotes carry sequential immutable commercial revisions, itemized amounts, scope, explanation, delivery ranges, current terms and explicit expiry. Default validity follows the proposed 48 hours; the server bounds administrator-selected expiry. Staff quote issuance requires recently verified factors. Customer acceptance must name the current quote and order revision and explicitly agree to its scope/terms.

Coupon eligibility, policy version and result are revalidated on acceptance. A changed policy/discount or exhausted limit requires a revised quote and fresh acceptance. A successful acceptance creates one immutable payable contract, its coupon claim and the timeline entry atomically. No later endpoint silently reprices that contract. Fixed package orders create their unpaid contract without quote review, comparing the customer's displayed total against the server calculation and checking the published release and current coupon.

## Reservation and cancellation boundary

Package capacity and coupon limits are reserved transactionally with payable contracts and count across catalog/coupon revisions using stable offering/coupon IDs. An unpaid contract begins with a payment lifecycle state that says no invoice has been issued. P07 must durably change this marker before contacting a payment provider. Cancellation/retirement may release a claim only while the contract is provably unissued; invoice-pending, detected or settled funds require payment reconciliation and cannot use that shortcut. No age-based blind claim release is introduced.

Quote acceptance controls the latest time to create an initial invoice. A future issued invoice retains its own valid payment window. Expiry and cancellation cannot erase detected or unresolved funds. P07 completes renewal, late-payment and financial-exception handling; P08 completes paid capacity release and fulfillment changes.

## Favorites and reordering

Favorites are unique, private customer/item records for games, services and packages. Saving does not reserve capacity. Missing/archived offers remain clearly unavailable in saved items without exposing drafts. Reordering reads the current offering and copies compatible choice, boolean, numeric and rank answers into a fresh draft. It excludes free text, attachments, credentials, coupon entitlement, payment state and accepted quotes. Removed options/fields require correction; archived offerings cannot be revived. Submitting the draft creates a new idempotent order under current prices/terms.

## Required evidence

Test idempotent retries/conflicts, duplicate concurrent requests, immutable snapshots, object ownership, staff MFA/session revocation, stale/simultaneous quote actions, expiry, clarification/revision/decline, coupon change and exhaustion on acceptance, package capacity races, protected cancellation/release, private favorites and incompatible/sensitive reorder inputs. Real TiDB and desktop/mobile browser journeys exercise custom review-to-acceptance and immediate unpaid package creation. Run both project pre-commit gates and root checks, including standalone gosec, before the direct-main stage commit. P05 is not complete until implementation and these checks pass.
