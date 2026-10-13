# PLAYORA policy research and implementation notes

Research date: **13 October 2026**. This is an internal review record, separate from the customer-facing drafts. The owner requested complete researched wording and set account commissions at 10% for the seller and 5% for the buyer. Drafting does not publish an agreement, reprice existing contracts, enable payouts or enable deletion.

## Sources and drafting decisions

Competitor pages inform topic coverage and expose tradeoffs. They are not copied contracts, evidence of PLAYORA's practices, or authority for the law that applies to PLAYORA. The owner-approved October policy snapshot, payment policy revision 3 and the current application are the primary sources for PLAYORA's promises.

| Source checked | Relevant observation | PLAYORA decision |
| --- | --- | --- |
| [Boosting.pro terms](https://boosting.pro/terms-of-use/) | Discusses piloted/self-play access, delivery, moderation and crypto exceptions; contains visible drafting placeholders | Cover the operational issues without copying its placeholders, store-credit model, short warranty or liability cap |
| [Elo-Boost refund policy](https://elo-boost.net/refund-policy) | Distinguishes work not started from progress already made and permits partial refunds | Preserve PLAYORA's full affected-order refund for failure, including partial work; separate genuine change-of-mind cancellation |
| [Boosting Factory terms](https://www.boostingfactory.com/terms-of-use) | Explains individual service conditions, staff access, estimates and complaints | State accepted scope and evidence clearly; keep PLAYORA's stronger refund and damage commitments |
| [BuyBoosting terms](https://buyboosting.com/terms-of-use/) | Located in search, but repeated direct page retrieval failed during this review | Do not rely on an unverified clause or imply its full policy was inspected |
| [GameBoost terms](https://gameboost.com/legal/terms) | Separates buyer/seller roles, verification and seller obligations | State PLAYORA's two seller arrangements and provider limits explicitly; do not import a wallet or marketplace liability disclaimer |
| [Eldorado account warranty](https://support.eldorado.gg/en/articles/8408988-extended-account-warranty) | Describes initial and paid extended protection and balance-based refunds | Use an initial inspection period only for payout handling, not an expiry of PLAYORA protection or a paid warranty upgrade |
| [NOWPayments help](https://nowpayments.io/help) and [security FAQ](https://nowpayments.io/help/security) | Provider handling includes fees and compliance checks | Preserve exact-route instructions and honest confirmation/review timing; never guarantee no third-party verification |
| [ICO privacy information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) | Explains controller, purpose, recipient, retention and transfer disclosures where those rules apply | Keep public copy location-neutral as requested, but record missing operator/transfer facts for legal review rather than inventing them |
| [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | Retention must follow purpose and necessity; there is no universal default for every record | Propose review periods, separate categories and specific holds; do not present software waiting periods as automatic erasure |
| [European Commission online-shopping guidance](https://commission.europa.eu/digital-life/protecting-you-when-buying-online_en) and [consumer-rights summary](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=URISERV%3A0904_4) | Highlights information, seller identity, withdrawal and consumer remedies for applicable markets | Preserve mandatory rights; check applicable disclosures and withdrawal functionality before claiming global legal completeness |

Additional GameBoost seller-fee help was located but its redirected documentation could not be fetched reliably. No competitor percentage or payout promise was adopted from those search snippets. The 10%/5% figures are exclusively the owner's instruction. Proposed timings are PLAYORA drafting choices, not reported competitor norms or evidence of current staffing capacity.

## Confirmed directions and new proposals

Confirmed: worldwide service subject to actual availability; 24/7 operation; Google/email-only sign-in; independent customer/admin/booster accounts; mandatory staff MFA; direct crypto with no wallet; per-order WR; fixed or custom boost; manual shop fulfillment; staff articles; buy-first or consignment per offer; full refund for unfulfilled conditions and protected non-buyer-caused account problems; separate service-caused damage compensation; and new account commissions of seller 10% and buyer 5%.

New proposals for review: seven-day account inspection/ordinary consignment hold; seller payment initiated within 48 hours after eligibility and destination verification; seven-day offer validity; no routine listing/withdrawal fee; PLAYORA absorbs outgoing payout costs; whole-cent half-up fee rounding; merchant-funded discounts preserve seller net; and no automatic innocent-seller clawback. These proposals are deliberately visible in the review index. They do not describe already configured seller offers.

Retained targets: refund assessment 72 hours, initiation 48 hours after approval/destination verification, pending updates 48 hours, appeal review seven days and privacy response one calendar month. Current payment policy keeps 365-day boost/shop dispute controls, 30-day appeal controls and three appeals, with support rights beyond interface limits.

New proposed retention review values are 730/730/365/365/30 days for financial/dispute/audit/support/grace fields. They remain disabled and require the distinctions and verification in `RETENTION.md`; they do not claim statutory sufficiency or erasure implementation.

## Commission examples and edge cases

| Case | Buyer charge | Seller receipt | Treatment |
| --- | --- | --- | --- |
| Shared base $100 | $105 | $90 | Gross platform commission $15 before provider costs |
| Shared base $49.99 | $52.49 | $44.99 | Buyer fee $2.50 and seller fee $5.00 after independent cent rounding |
| Shared base $100 with PLAYORA-funded $10 coupon | $95 | $90 | PLAYORA funds the discount; the accepted seller net stays unchanged |
| Protected refund of that discounted purchase | Refund purchase payment corresponding to $95, in original allocated crypto units | Separate seller case | Do not refund $105 never paid or automatically reclaim an innocent seller's proceeds |
| Buy-first base $100, later resale base $120 | Later buyer pays $126 | Original seller receives agreed $90 equivalent in fixed accepted units | Different bases; gross margin is $36 before costs, not a claim of 15% commission on one shared base |
| Unaccepted submission or cancelled unsold consignment | No successful buyer sale | No sale proceeds | No advance/unlock/listing fee and no automatically earned successful-sale commission |

The USD examples are explanatory, not live prices, transaction authorizations, tax advice or a fixed USD/USDT conversion. Actual offers bind exact positive crypto units and the actual conversion basis. Minimum payout constraints must be checked before acceptance.

## Current application mapping and gaps

| Area | Existing implementation | Required before publishing or activating the new behavior |
| --- | --- | --- |
| Public terms | Bootstrap approved terms are served; structured editor has not been populated | Publish a new dated legal release through normal admin/MFA; preserve bootstrap/history and test new acceptance without rewriting old orders |
| Policy pages | Eight supported kinds: terms, privacy, refunds, account_sales, contact, delivery, cookies, complaints | Use complete bounded text and readable section breaks; do not truncate silently to fit 10,000-character sections |
| Account commission | Listing `amount_minor` is one charged price; seller offer has one exact net amount | Add explicit base/fee/total/net snapshots and validated 5%/10% arithmetic across quotes, invoices, receipts, disputes/refunds and exports; no double application on retries |
| Seller offers | Five required 20–2,000-character texts, exact positive crypto amount, model, delay/deadline and expiry | Fill real account facts per offer, show fixed net/rate/timestamp, obtain seller acceptance, preserve prior terms |
| Consignment | Payout eligibility checks accepted offer/control, confirmed payment allocation, sold listing, completed/settled order, acknowledged delivery and expired inspection, plus no active case/pending refund | Use `dispute_hours=168` only with newly accepted matching listings; `payout_delay_hours=0` avoids adding a second seven-day hold; deadline 48 is not proof of an operational payout SLA |
| Buy-first | Verified control anchors payout; resale publication requires confirmed payout | Verify destination and ability to pay before issuing an offer; do not condition an accepted purchase on resale |
| Seller withdrawal and later refunds | Stateful offers/reservations/payout obligations | Verify coordinated unpublish/return, late-payment reconciliation, no earned fee on cancelled sale, evidence-based fault handling and no automatic unagreed clawback |
| Outgoing payments | Separate activation switch remains off | Qualify provider route, funded balance, fee handling, idempotency, amount/destination approval and confirmed outcomes before promising functioning payouts; no live transfer authorized here |
| Compensation | Existing refund/seller-payout kinds do not establish a complete compensation workflow | Record damage compensation separately; never disguise it as an over-refund that violates receipt caps |
| Reviews | MLBB saved publication text was a placeholder | Replace it with reviewed content/rules and verify eligibility, moderation reasons, appeals, attribution and honest aggregate behavior |
| Shop | No live approved products; per-product policy fields required | Approve real products/regions, capacity and recipient requirements; fill policy/evidence/review fields; do not publish fictional stock from this package |
| Boost delivery | Operational `service.delivery` was unset; accepted offers have independent timing | Obtain real capacity/calendar/work rules or continue manual estimates; never equate 24/7 marketing with unlimited automated fulfillment capacity |
| Retention | Editor values are minimum profile-erasure waits; evidence is retained separately | Implement/qualify category-specific cleanup and proportionate holds; confirm actual legal periods; leave deletion disabled meanwhile |
| Private mail and copies | Self-hosted mail; no qualified off-host backup | Extend retention to attachments, mailboxes, exports and actual copies; do not promise backup expiry before implemented |
| Statutory withdrawal | General support/cancellation flows exist | Verify any required dedicated online withdrawal function and separately recorded early-performance consent for applicable markets; a footer disclaimer is not an implementation |

Relevant source files: `backend/internal/resale/model.go`, `backend/internal/resale/offers.go`, `backend/internal/resale/listings.go`, `backend/internal/payments/seller_payouts.go`, `backend/internal/sitecontent/model.go`, `backend/internal/sitecontent/discovery.go`, `backend/internal/privacy/holds.go`, `backend/internal/shop/model.go`, `backend/internal/catalog/reviews.go`, `backend/internal/catalog/delivery.go`, `frontend/app/site/policy-text.tsx`, and `frontend/app/ui/motion.ts`.

## Facts research cannot fill

The owner-selected public label remains **PLAYORA team** and the documents describe worldwide service without inventing a location. The actual contracting legal person/controller, any required public identity/address/registration details, applicable tax treatment, actual international transfer arrangements and jurisdiction-dependent retention/withdrawal obligations still need verified facts and appropriate legal review. “Worldwide” is not an exemption from required disclosures. Do not invent a foreign company, governing law, tax exemption or data-transfer agreement from another website.

The 24/7 statement is owner-directed. Neither competitor promises nor automated tests establish round-the-clock human capacity, near-zero damage, instant payouts or a verified success rate. These drafts avoid those unsupported performance claims.

## Scope and next publication step

This stage changes documentation only. It must not publish policies, alter the live MLBB catalog or payment policy, issue seller offers to real accounts, enable deletion/outgoing transfers, send mail, create invoices or move funds.

After owner review, prepare the missing fee behavior and policy publication as a separate qualified change. Use the normal authenticated editor and fresh verification. New terms take effect prospectively with a new immutable release label and a real publication date. Retain the old approved documents and policy revision 3. No earlier test or recovery waiver is reusable.
