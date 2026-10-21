# SUPPLIER171 — Draft discovery and customer-facing shop wording

Owner request, 21 October 2026: show imported offers not yet prepared as PLAYORA drafts and keep sourcing/markup information in staff tools only. Another task is deploying the preceding release; do not overlap activation or overwrite its changes. Supplier buying remains disabled. Products remain private until separately reviewed and published.

## Implementation

- Add **PLAYORA drafts** filtering: All offers, Not added to drafts, Already added. Added includes private, published and archived listings. Match each current offer, not just its parent product. Combine with game/category/search and preserve the selected filter on later pages; reset the cursor when filters change.
- Filter on the backend over the complete pinned import in bounded batches, filling 25 matching products and returning the last displayed product cursor. Persisted draft bindings survive reimports; absent price rows count as not added.
- Keep costs, configurable markup and source controls in the admin workspace. Customer delivery status and verification actions use PLAYORA wording. Preserve actual verification/redemption destinations and security allowlists rather than disguising where customers sign in.
- Update reusable shop wording to describe delivery, the total payable and support without source identity, sourcing arrangements or markup. Preserve refunds, wallet sending-fee disclosures and accepted historical contracts. Account-sale commissions remain explicit and unchanged.
- Omit internal artwork provenance from customer JSON and data-export copies. Preserve the original internal definitions, stored purchase snapshots and staff views; reservation validation must continue to see full provenance.
- Remove source/internal-review wording from existing private MLBB drafts through the normal owner editor, preserving price rules, images, regional restrictions, eligibility holds and unpublished status. No production purchase, publication, message or invoice test is authorized.

## Qualification and release

Use focused server tests only, including relevant database pagination/checkout projections and synthetic rendered desktop/mobile review. Maintain regressions and run the normal focused commit hook, security checks, exact CI, signed image verification and preflight. The full gate remains disabled. Retain failed attempts and exact evidence under `.cache/suppliers/catalog171/` and the temporary `/srv/playora-qualification/supplier171/` checkout; clean only this task's disposable resources after archiving compact evidence.

No deployment or test pass is claimed by this planning record. The prior release's recovery exception cannot authorize this new release; prepare the exact candidate before the required fresh recovery decision. Off-host recovery remains unavailable.

## Focused evidence, 21 October

- Candidate is based on `3117a96`, retaining the concurrent product-readability/gateway/development-tool fixes. Supplier schema remains 47. The other task owns that earlier activation; recheck the current signed production release before this release preflight/activation.
- Race-enabled unit checks for supply, shop, resale and privacy passed. All 35 selected component cases and strict frontend type checks passed. Scoped ESLint passed after correcting a screenshot filename interpolation in the new browser regression; preserve the original failure.
- Standalone gosec passed. The first golangci run flagged an unchecked type assertion in the new privacy-export regression. The regression now checks both assertions; final normal-hook confirmation remains required.
- The isolated TiDB retry passed both real persisted scenarios: late matching offers across pagination/reimports and payment-confirmed Nexus checkout with customer/staff provenance boundaries. The first attempt stopped at an older test fixture that substituted manual delivery hours into an instant product and consequently cleared its review flag; correct the fixture, not publication validation. The disposable container and tmpfs data were removed after both attempts.
- Independent senior source/rendered review passed ten selected desktop/mobile cases with no failures, skips or flaky cases. Inspected screenshots include 1440/390/320 widths, matching-offer filters, unresolved delivery, protected codes and verification actions. Initial review harness quoting/extraction events remain in the private receipt. This is scoped synthetic browser evidence, not a full-site or live purchase pass.
- A private 224-item MLBB copy revision plan is prepared, including 72 customer region labels. Actual saved-draft changes await normal owner sign-in; do not report them applied. Preserve prices, images, owner edits, publication holds and unpublished status.

The normal focused commit hook, exact CI/image release, signed preflight, exact recovery decision and activation remain pending. No live supplier order, payment, publication or email was created.
