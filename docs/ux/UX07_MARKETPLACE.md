# UX07 — Account marketplace and seller workflow

Marketplace browsing has image-led cards, explicit result count, URL-backed search/region/rank filters, reset, Enter submission and preserved detail/back context. Only API-reviewed images are rendered. The gallery retains aspect ratio, exposes numbered controls and a native enlargement dialog, supports Escape/focus return and handles missing/failed images. Notification setup is secondary; published scope, price and sale/transfer/dispute terms remain visible before reservation. Same-tab passwordless entry returns to the account; consent is not persisted, and repeated reservation is locked.

Seller intake has three visual groups: account details, ownership, then save/submit. Private review progress explains the step before an offer exists. Submitted information, prior offers and decision history remain available without overwhelming the current task. Active offers show exact net crypto obligation, fees, network, eligibility and timing; an optional comparison table allows review of prior amounts/arrangements. An expired offered agreement cannot be accepted locally; the server still controls accepted version, terms and authority. Both buy-before-resale and payment-after-delivery arrangements retain their original rules.

Protected handoff leads with preparation/access/acknowledgement guidance and places the accepted product terms behind a disclosure. It never reveals credentials before payment/hold/authorization checks. Secret controls, audit, clearing on blur and recent verification are unchanged. Direct payout status and consent reuse UX06.

## Verification

Frontend/repository commit gate, plus marketplace filter/back and screenshot-dialog keyboard journey, seller intake/review/offer/payment/handoff journeys, axe/reflow, both-arrangement expiry tests, image failure/revision clamping and existing credential/payout security tests. Browser gallery images are isolated synthetic reviewed-image responses; they are not user data or commercial listing changes. Screenshots under ignored `frontend/.cache/marketplace-*`, `account-product-*`, `seller-intake-*`, `seller-offer-*`.

No backend/API/SQL change or live transaction. R10/R11 remain held; UX08 admin operations follows.
