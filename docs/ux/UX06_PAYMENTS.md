# UX06 — Checkout, service review and transfers

Checkout leads with a three-step progress cue and the current task. The current attempt presents the authoritative agreement amount, exact selected asset/network and local deadline. Historical policy snapshots and technical receipt references are secondary disclosures. The provider supplies the exact crypto amount/address; PLAYORA does not invent a deposit address or QR code. No funds are treated as paid because of a redirect, approval, elapsed deadline or disabled checkout.

Consent is bound to the policy, immutable contract and selected route; changing route clears it. Checkout actions are disabled during refresh and locked during an in-flight request. Expired or malformed local deadlines hide payable links without claiming provider settlement/failure. Existing attempts continue reconciliation while new checkout is paused. Failed reads show retry rather than a permanent loading message. The original signed-webhook, reconciliation, allocation and authorization behavior is unchanged.

Formal cases begin with an explicit request disclosure explaining the work hold and that refunds are separate. Current state/next action precedes an ordered, dated case timeline. Customer replies and proposed decisions remain subject to observed versions, appeal deadlines and server authority. Outgoing records distinguish recipient needed, owner approval, provider authorization, processing, uncertainty, failure and confirmed transfer; exact terms and recipient consent remain visible before action. Merchant authenticator codes remain ephemeral.

## Verification

Run the tracked frontend/repository gate. Component tests cover consent changes, stale reads, pending duplicates, paused checkout, staff restrictions, expired links, uncertain/confirming/closed/exception states and failed-read retry. Existing refund tests retain exact destination/amount, owner-only authority and ephemeral-code assertions. The browser payment journey exercises policy publication, checkout, signed/invalid/duplicate webhook fixtures, verified receipt, case decision/acceptance and exact refund processing for desktop/mobile, plus axe/reflow. Screenshots: ignored `frontend/.cache/checkout-*` and `case-refund-*`.

No production credentials or live money are used. Automated fixtures qualify UI behavior only. Live transaction and deployment qualification remain in held R10/R11. Buyer/seller marketplace refinement follows in UX07.
