# Customer, booster and admin workspace revision

24 September 2026 · Design only. Supersedes disconnected panel-page navigation in the initial atlas. Existing business rules and the application/launch pause remain in force.

## Navigation contract

Every panel shows its role: **My account**, **Booster workspace**, or **Admin workspace**. The desktop sidebar and narrow-screen workspace selector expose the same destinations. The selected parent section remains highlighted while viewing a record. Breadcrumbs distinguish workspace → section → record; a named Back link returns to the record list. Global workspace navigation deliberately leaves a record; its local section navigation does not.

Record lists pair identity, service, status and the actual next action. There is no detached, ambiguous Open order button. Quote review, progress tracking and account delivery use different records. Search and status filters operate on the fictional records; an empty result explains recovery. Returning from a record retains filters, search and list position in the current preview session.

Orders use one persistent record shell. Identity, service, goal, status, breadcrumb and Back belong to that shell. Overview, Messages, Progress, Payment and Help replace only its content area. A compact sticky record/role line and local navigation keep the current context visible while scrolling. The browser URL records the section for Back/Forward/direct links; this is not a switch to a different order page. Text/form drafts stay in detached DOM nodes, scoped by role, record and section. Reload and Visitor reset clear them; there is no persistent private storage.

## Stable fictional records

| Record | Status | Money example | Destinations |
| --- | --- | --- | --- |
| PL-1042 | Quote ready; fulfillment has not started | USD60, unpaid | Customer C03; Admin A03 |
| PL-1038 | In progress, Epic I current milestone | USD48, verified | Customer C05; Booster B03; Admin A03 with explicit record ID |
| PL-1048 | Purchased account; preparing handover | USD120, verified | Customer C23; delivery stays local and receipt acknowledgment remains unavailable |
| SA-204 | Account sale offer ready; consignment example | No invented seller amount or due date | Seller S03; admin submission A21; payout review A17 |
| MLBB | Published revision4; draft revision5 | Catalog design | Admin A11 family |
| AC-208 | Unpublished listing draft linked to SA-204 | Catalog design | Admin A23 family |

These are independent states, not milestones automatically advanced by clicking. An unpaid order cannot display active progress. A paid order’s accepted quote is read-only and retains its exact sample amount. Prototype checkout creates no invoice, payable address or verified payment.

## Customer journeys

- Overview directs attention to a named quote; Orders offers Review quote, Track progress or View delivery on the corresponding row.
- Quote → Payment → checkout preview remains in PL-1042. Messages and Help always refer to that order. Progress explains why work has not begun.
- PL-1038 contains recorded milestones, proof placement, private messages, session coordination and player details. A review stays unavailable before completion.
- PL-1048 has account-specific delivery rather than rank progress. Acknowledgment cannot send the customer into an unrelated boost.
- Messages is an inbox of named order/sale threads. Opening one enters that record’s Messages section; Back identifies its parent collection.
- Seller submissions have their own Overview/Offer/Handover/Payout/Messages sections and SA identifier. Never mix buyer and seller audiences. Commercial terms remain explicit owner-defined requirements.

## Booster journeys

Overview → assigned-order list → PL-1038 keeps the booster role and permitted assignment. Local sections: Overview, Progress, Sessions and Messages. The inbox includes assigned conversations only. Shared security views retain the booster workspace and an explicit return. Progress submission and completion review explain staff review; they do not mark the order complete. Reassigned/revoked examples remove record content and return to Assigned orders with an accessible recovery heading.

## Admin journeys

- Order queue → PL-1042/PL-1038 → Overview/Quote/Fulfillment/Messages/Sessions/Payment/Case retains the order and admin role. There is no jump from order Payment to the entire finance queue or from Messages to a different customer identity.
- Draft quote preview remains labeled read-only inside the order, with a return to the quote editor. Paid contracts are read-only.
- Catalog → MLBB retains General/Order form/Pricing/Packages/Seller rules/Release. Customer previews state whose view is being previewed, preserve admin identity and return to the originating editor section with its draft.
- Inventory, seller submissions, payouts, refund cases, moderation and privacy requests retain distinct entity labels/parent breadcrumbs. They do not receive generic boost-order tabs.
- Customer-facing replies and staff-only notes have an explicit audience selector. No unrelated thread list is inserted into a record conversation.
- Footer support, security and workspace links use the staff’s own workspace; they are not rewritten into customer-order previews.

## Interaction and recovery rules

Local sections are real anchor links with `aria-current`, keyboard activation and section announcements; no tab-widget keyboard model is falsely advertised. Unknown records or mismatched entity types show a recovery view rather than another sample’s data. Form/demo mutation buttons explain the next operation without claiming a write, message, verification, payout or payment succeeded. Public read-only previews have a clearly named return. Loading, empty, denied and failed state specifications remain review fixtures; no prototype guard qualifies runtime authorization.

Review scope covers changed panel navigation, record families, fixture consistency, list recovery, messages/drafts, previews, mobile navigation and affected shared chrome. The required senior-designer round log is in `reviews/2026-09-24-panel-workspaces.md`. Owner visual acceptance, physical devices and assistive-technology qualification remain separate.
