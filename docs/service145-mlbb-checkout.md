# Service145 — researched MLBB catalog and hosted checkout

Prepared 13 October 2026 from main `d85f52b858c6b71bf22e89a3a9f1427bbf5d58d2`. Production is still signed `72ed594` at schema41. This document is preparation evidence, not a deployment receipt.

## Scope

- Fix the live NOWPayments invoice response mismatch: accept uppercase/lowercase echoes of the exact requested currencies. Preserve type, amount, order/attempt and hosted-provider URL checks, ambiguous-request protection, verified settlement and the existing published payment policy.
- Add optional absolute rank-unit starts; preserve the old zero-based inclusive interpretation when absent. New MLBB forms use displayed total Mythic stars and calculate interval distances correctly. No SQL migration or reinterpretation of historical releases is intended.
- Keep rank and stars in one goal group; searchable bounded hero choices preserve selection, keyboard/focus behavior and automatic lane/location relationships. Show neutral tier bounds and errors without interrupting typing.
- Add bounded, revision-checked catalog import/export as ordinary unsaved admin authoring. It neither saves nor publishes automatically; newer/unsaved owner changes, unsupported fields and foreign game imports are rejected.
- Prepare the complete MLBB catalog with 133 heroes, linked lanes/regions, explicit hours, win-rate preferences, 16 pricing examples, complete fixed scope and three generated package covers. Research, proposed prices and publication safeguards are in [the research note](catalog/MLBB_RESEARCH_2026-10-13.md).
- Improve affected package-card scanning: square cover, visible price near title, concise visual excerpt, timing and a clear detail link. Full contractual description and fixed contents remain on package details.

## Live diagnostic boundary

The owner's one diagnostic invoice approval was used once. A private exclusive receipt was written before the POST; replay is refused, including uncertain outcomes. The invoice remained unpaid, did not create a customer order and did not send email. The observed HTTP200 response used `USD` and `USDTBSC`, which previously failed the lowercase-only comparison. Private evidence is under `/srv/playora-qualification/service145/approved-one-invoice-*`; do not print credentials, the hosted payment URL or private merchant details. Synthetic regression fixtures reproduce the relevant response shape.

The owner's stuck order suffix is a troubleshooting reference, not proof of successful payment. Existing uncertain attempts cannot be blindly retried. They retain their normal expiration/reconciliation safeguards. Owner-led checkout after deployment and actual settlement/webhook acceptance remain separate from this unpaid response diagnosis.

## Catalog application boundary

The prepared JSON uses `base_revision: 0`, deliberately preventing direct import. Public release236 was the preparation source; the admin saved draft observed during this work was already revision243. After the authoring update is deployed, export the then-current saved draft through the authenticated editor. Compare and merge the prepared boost changes while preserving unrelated/newer owner edits, set the actual base revision, review, save, preview and publish using normal staff verification. Do not bypass MFA, write catalog SQL or replace the owner's newer draft silently. New fixed-price delivery commitments must be reviewed as concrete catalog content before publication.

## Qualification

Focused preparation checks cover exact provider response variants/rejections, absolute rank boundaries, legacy behavior, fixed-package tampering, linked field validation and every prepared pricing example. Frontend checks cover search/removal, stale import/unsaved edits, actual-star bounds, contracts/types/lint, desktop/mobile interactions, 320/768/1280 layouts, image loading and accessibility.

Early isolated preview runs found a selector/navigation fixture problem and missing heading context, then the independent senior review identified a hero-grid CSS collision, small import actions and dense package cards. These are retained as failures/findings rather than relabeled passes. Corrected renderings are reviewed in [SERVICE145_CATALOG_REVIEW.md](redesign/reviews/SERVICE145_CATALOG_REVIEW.md); it records both verdict and direct-browser-access limits.

The new full gate is prepared under `/srv/playora-qualification/service145/full1`, using an independent exact-base main checkout, normal tracked commit hook, pinned tool/dependency installation and synthetic test configuration. It uses no live merchant/mail credentials. The runner stops its disposable development fixture before separate production qualification; production services remain untouched. Frozen source hashes and private stage/resource logs bind results to the eventual commit. A running or failed gate is not a complete pass.

Preparation found only13GiB free. Clearing the operator's regenerable Go build cache restored37GiB, without removing previous source/log evidence, Docker images, production configuration or volumes. The cache will rebuild under the normal gate. The standard fixture-only TiDB index-backfill correction already on main remains in place.

## Release boundary

Commit/push main only after the normal gate and senior review pass. Keep held `docs/ux/prototypes/` and `frontend/app/home/cameo/` outside this candidate. Hosted CI stays lightweight; exact release image scans/signatures, runtime configuration and deployment preflight remain required. No new vendor findings are pre-accepted. Preserve independent identities/MFA, policy revision3, enabled checkout, disabled payouts/deletion and private webmail.

There is still no off-host recovery. The previous72ed594 recovery exception is consumed. Prepare a concrete signed candidate/preflight and the applicable rollback/recovery assessment before any necessary owner decision for this release; do not treat prior exceptions as a standing waiver.

## Superseding combined-release instruction

The owner extended the payment hotfix test waiver to the complete prepared catalog release and instructed publication after combined deployment. Service147 records that current authorization and the exact-source boundaries. The original full1 failure is retained; it is not a pass. The payment-only activation plan was stopped before image dispatch. See [service147-combined-release.md](service147-combined-release.md).
