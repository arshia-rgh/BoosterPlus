# UX04 — Order workspace

Status: implemented; the official vulnerability feed has recovered and a fresh complete tracked verification gate must pass before commit/push. UX01–UX03 are delivered. R10/R11 remain held; no live transactions are part of this stage.

## Lists and return navigation

Customer orders show game, order type, current status, the next task, the actual order update time, a short reference and an accepted total only when an immutable contract exists. Optional unread indicators use the authenticated reader’s audience. Lists retain bounded pagination, explicit loading/error/empty states and search/status filters. Administrative filters remain available; their broader visual redesign belongs to UX08.

Filters travel through order → conversation → linked order → list in router state. The return destination uses a fixed local route and serialized query parameters. The selected row is restored into view after the list loads. Anchors contain only order IDs, are keyed by user/role/filter, bounded to 20 entries and cleared on identity changes; no draft or personal selection is persisted. They survive client navigation, not a full reload. Refreshing a list retains its filters.

## State-led details

The header separates offered estimates/quotes from accepted money, names payment verification accurately and keeps the long reference behind a copyable disclosure. State guidance distinguishes staff review, customer clarification/acceptance, provider verification, queued/in-progress work, holds and terminal outcomes. Account purchases use handoff language rather than boosting progress.

- Submitted requests emphasize review; clarification opens original selections and activity. Revision still invalidates the old quote and requires another staff review.
- A current quote shows scope, line items, price, delivery range and its versioned terms. A comparison shows the previous quote or original estimate alongside the current scope, total, timing and terms. Loading/failure is explicit. Acceptance remains an explicit checkbox/action tied to the observed quote and order revision. Changed terms or an expired quote disable acceptance; the backend remains authoritative. Pending actions reject double submission and failures remain retryable.
- Awaiting payment opens the accepted agreement and payment controls. Existing checkout pause/provider errors stay unpaid. Payment instructions no longer imply checkout is unimplemented. Settled payment is identified only from the accepted contract’s verified state.
- Paid boosting opens existing progress, proof, coordination and scheduling. Account purchases open protected handoff; active holds still block credential access. Completed purchases lead to delivery/proof and review eligibility. Existing reviews remain reachable in help after a later non-completed state.
- Unpaid cancellation and quote decline have separate, explicit disclosures. Their original state/version checks remain enforced. Terminal history opens when it explains rejection, cancellation or expiry.
- Agreement history, selections/reorder, payments and formal cases/refunds remain reachable through quiet disclosures and focused section buttons. Native summaries retain keyboard focus and tab behavior. Closed panels remain mounted to preserve local interactions; this is not lazy data loading.

Order chat uses the shared UX03 conversation instead of nesting another chat shell. A failed detail or session refresh removes private order content, and retry reloads both sources. Changing order ID unmounts its workspace. Secondary panels still use their own authorization and refresh guards.

## API and privacy

`OrderSummary` gains optional `accepted_price` (currency and decimal-string minor amount) and `unread` fields. List enrichment batches current contracts and unread existence for at most 50 already scoped orders; it validates contract/order/customer ownership and rechecks the live principal before return. Both directly attached and linked pre-sales conversations count, with matching order ownership. Customers use public sequence/read markers; staff-only notes cannot create a customer unread flag. No message bodies, private sequence values, payment details, form snapshots or credentials enter summaries. Detail and account-overview responses can omit this optional context. No database migration or Ent migration was added.

## Verification and remaining work

Reproduce with root `make pre-commit`, which runs both project gates and retained production regressions using isolated test resources. Targeted evidence includes the race-enabled `TestOrderListAcceptedPriceAndPrivateUnread`, state/quote/workspace components, and real-service `orders`, `payments`, `fulfillment` and `support` browser journeys.

Coverage includes all 11 status guidance variants, custom/package/account presentations, immutable totals, unaccepted requests, direct/linked unread and read markers, staff-note privacy, unrelated customer denial, stale suspended principals, terms/expiry guards, pending acceptance and error recovery. Browser checks cover quote revision/acceptance, reordering/cancellation, filters through chat and back, selected section focus, 320/390/768/1440px layouts, enlarged text, axe analysis, denied detail cleanup and retry. Existing fixtures exercise verified payment, cases/refunds, account delivery and completed purchase feedback. Screenshots/logs are ignored under `.cache/` and `frontend/.cache/`.

The new workspace filename intentionally avoids the existing shared `workspace-*.js` budget pattern; bundle thresholds are unchanged. Full checkout/case presentation is UX06, discovery and character animation UX05, broad staff layout UX08, and physical-device/assistive-technology review UX10. Chromium layout and automated accessibility checks do not certify every browser/device or whole-site accessibility. Publication, live funds qualification and launch remain governed by the held `final-launch.md` scope.
