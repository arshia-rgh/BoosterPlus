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

The following planning/qualification checkpoints are retained; the completed deployment is recorded below. Off-host recovery remains unavailable.

## Focused evidence, 21 October

- Candidate is based on `3117a96`, retaining the concurrent product-readability/gateway/development-tool fixes. Supplier schema remains 47. The other task owns that earlier activation; recheck the current signed production release before this release preflight/activation.
- Race-enabled unit checks for supply, shop, resale and privacy passed. All 35 selected component cases and strict frontend type checks passed. Scoped ESLint passed after correcting a screenshot filename interpolation in the new browser regression; preserve the original failure.
- Standalone gosec passed. The first golangci run flagged an unchecked type assertion in the new privacy-export regression. The regression now checks both assertions; final normal-hook confirmation remains required.
- The isolated TiDB retry passed both real persisted scenarios: late matching offers across pagination/reimports and payment-confirmed Nexus checkout with customer/staff provenance boundaries. The first attempt stopped at an older test fixture that substituted manual delivery hours into an instant product and consequently cleared its review flag; correct the fixture, not publication validation. The disposable container and tmpfs data were removed after both attempts.
- Independent senior source/rendered review passed ten selected desktop/mobile cases with no failures, skips or flaky cases. Inspected screenshots include 1440/390/320 widths, matching-offer filters, unresolved delivery, protected codes and verification actions. Initial review harness quoting/extraction events remain in the private receipt. This is scoped synthetic browser evidence, not a full-site or live purchase pass.
- A private 224-item MLBB copy revision plan is prepared, including 72 customer region labels. Actual saved-draft changes await normal owner sign-in; do not report them applied. Preserve prices, images, owner edits, publication holds and unpublished status.

At this earlier checkpoint the normal hook, signed release and activation were pending. The completion record below supersedes that status. No live supplier order, payment, publication or email was created.


## Deployment completed — 21 October 2026

The exact signed application `c8530fca920548acc36def85efde2bd5450adb08` is live at schema47. The normal server focused hook passed208frontend files/981component cases, backend vet/golangci/standalone gosec/race/build/generated checks and83deployment-configuration cases. The official Go vulnerability scan found no affected imported code paths; an unused-module advisory is retained rather than called a clean all-module scan. Exact CI39524440062 and image release39526849389 passed, including image scans and signature verification. Existing two persisted supplier/provenance cases and ten senior rendered cases remain part of the exact source qualification. No full gate or local tests were run.

The owner explicitly approved “Deploy c8530fc combined update with this recovery risk”. The other task had started the independently approved parent3117a96 activation before this turn. This deployment waited for its completed eight-service verification, then refreshed only operational checks against that signed parent. The candidate images, source, schema47, runtime configuration and prior test evidence did not change. The original successful preflight is retained as `preflight-before-parent-activation.json`. The senior successor-helper review found a partial-refresh bookkeeping gap; activation now requires both exact-target/base refresh receipts to pass. This was corrected and re-reviewed before activation, without changing application code.

Normal signed activation and all eight service/image/configuration checks passed, including current/candidate storage readiness, public HTTPS/redirect boundaries, unchanged public legal/retention data and private Roundcube availability. Fifteen live read-only Chromium checks passed: six customer/admin/pro login cases, mobile shop discovery and eight desktop/mobile game-section, FAQ and fixed-package cases. Mutating browser requests were blocked. These are public smoke checks, not authenticated merchant or actual supplier-purchase qualification.

The private supplier library now offers **PLAYORA drafts → Not added to drafts / Already added**, combined with other filters and pagination. Customer delivery messages, new reusable terms and copied public/data-export projections omit internal sourcing, markup and artwork provenance. Staff records, immutable purchase definitions, accepted historical terms, refund/fee protections and genuine allowlisted verification/redemption destinations remain intact. The combined parent readability, form, FAQ and category-only delivery changes remain included.

Current manifest: `/srv/playora/releases/c8530fc/deployment.env`. Private evidence: `/srv/playora-qualification/supplier171` and `.cache/suppliers/catalog171/`, including original failures, source bindings, signed bundle, refreshed preflight, authorization, activation log and screenshots. The preceding signed3117a96 is retained; application rollback is not claimed qualified and recovery may require a forward fix. This exact no-off-host recovery exception is consumed. Stable99f60bd configuration/tooling, authentication/MFA and private webmail remain unchanged. Checkout is enabled; supplier purchases, outgoing transfers and deletion stay disabled; Vendoria is unconfigured.

**Still pending owner authentication:** the prepared224private MLBB copy revisions, including72region labels, have not been applied. The owner session expired; use normal sign-in/MFA and compare the latest saved revisions before changing them. Preserve15%markup, prices, existing images, eight unreleased Global holds, other eligibility requirements and unpublished/unreviewed status. This deployment did not publish products, modify those drafts, create invoices/orders, send messages/emails or transfer funds.
