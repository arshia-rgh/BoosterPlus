# Account resale operations

Booster Plus supports two arrangements, selected on each owner-proposed offer:

- **Buy before resale:** the seller accepts the exact crypto obligation and ownership terms; the owner verifies control; the seller confirms a destination; an owner authorizes the transfer. Inventory cannot be published until independent provider evidence confirms that seller payment.
- **Consignment:** publication follows accepted terms and verified control. Seller authorization becomes eligible after verified buyer payment, buyer acknowledgement, the delivery dispute window and the offer's additional payout delay. An active case, reversed receipt or unresolved refund blocks authorization for review. A resolved refund does not silently reduce the seller’s accepted net amount; owner authorization must still honor that exact obligation. Cancelled buyer orders do not qualify for consignment payout.

The amount is an explicitly agreed net crypto amount, including its asset and network. There is no seller wallet, implicit exchange rate, automatically inferred commission or default contractual deadline. Enter proceeds, fees, ownership obligations, withdrawal/dispute terms and payout timing explicitly. Accepted terms cannot be silently edited or erased using a refund cancellation action. Renegotiation of an accepted agreement requires a separately agreed resolution; an operator cannot bypass its original conditions with a payment status toggle.

## Seller review and publication

1. The seller starts a private submission at `/sell`. Staff review its ordinary information and ownership screenshots in the submission conversation.
2. An owner proposes the arrangement and complete terms in `/admin/submissions/:id`. The seller explicitly accepts or declines, with a recorded note and recent passwordless authentication. Decision history remains private to that seller and authorized staff.
3. After acceptance, the seller supplies ownership details using **Protected ownership transfer**, never listing fields, ordinary notes or chat. The owner reveals them with recent primary authentication and MFA, independently verifies control and records the result.
4. Staff open the unique inventory item at `/admin/accounts/:id`. Enter public characteristics, price, delivery estimate, buyer terms, acknowledgement checklist and dispute window.
5. Select screenshots from the same submission's conversation. Open and review every chosen image, including identifiers, email addresses and recovery information, before explicitly confirming public publication. Antivirus scanning and re-encoding are required; they do not replace this human privacy review. Public image URLs expose neither private object keys nor submission media IDs.
6. Save or publish the listing. Buy-first publication also requires confirmed seller payout. Reserved and sold inventory cannot be silently edited or republished. Paused or archived games do not accept new account reservations.

## Buyer payment and delivery

Customers browse `/accounts`, review `/accounts/:id` and accept the exact release, price and terms. Reservation creates an **unpaid** order. A unique active reservation prevents concurrent purchases of the same inventory; each customer has a bounded active reservation allowance.

The existing direct NOWPayments checkout then applies. Pausing checkout leaves orders unpaid. A reservation expires safely if no invoice request was claimed. If an invoice may have been issued, local expiry alone does not release inventory: fresh authenticated terminal evidence with zero funds and no conflicting receipt is required. Unknown or ambiguous invoices stay held for finance reconciliation. Payments arriving after retirement remain finance exceptions and cannot settle a later buyer's agreement.

After verified settlement, staff prepare a **distinct buyer handoff bundle** on the account order. Seller-origin credentials are never automatically exposed to buyers. Staff supply an ordinary ownership checklist and explicitly deliver the prepared bundle. The paid buyer must authenticate recently to reveal access, then acknowledge receipt and testing. Browser reveals hide on loss of focus or after one minute; plaintext is not stored in browser storage.

A service case holds handoff access. Accepted cancellation withdraws inventory and invalidates the old control verification; refund alone never relists transferred access. A rework resolution deletes the old buyer bundle, resets acknowledgement and requires a fresh handoff. Owners can take over a pending handoff with an audited reason, revoking the previous bundle before storing a replacement. A fresh control verification is required before withdrawn inventory can be published again.

## Finance and qualification

`/admin/finance` includes seller obligations and their current eligibility. `/sell/:id` retains the seller's direct payout history and destination confirmation. Provider writes use one claimed attempt, exact accepted amounts, recent owner verification, independent reconciliation and ephemeral provider authorization codes. Ambiguity never triggers a blind second POST.

Automated qualification uses isolated provider fixtures, disposable SQL schemas, dedicated object prefixes and synthetic credentials. Production merchant transfers, actual network fees, public IPN reachability and destination receipts still require separate small funded live qualification. Fixtures do not prove live funds movement. After R07 is verified and pushed, work stops until the owner explicitly authorizes R08/R09. R10/R11 and launch approval remain deferred.
