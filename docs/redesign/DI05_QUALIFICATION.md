# DI05 qualification — in progress

27 September 2026. The owner authorized application implementation through DI15. This report tracks verified increments within DI05; it does not mark the entire phase delivered. R10/R11 remain held.

## Increment A: configuration, review and interrupted creation

Custom boost progression validates the current published configuration before entering review. Review keeps the provisional estimate/manual-review outcome, separates order details from selected goals, supports editing and keeps private text in component memory only. Direct review URLs and reloads require current validation and fresh acceptance. Service/release changes and late validation responses cannot reopen an obsolete form.

Package variant selection is URL-backed. An unknown/retired variant requires an explicit current choice rather than silently selecting a different price. Customer sign-in preserves only bounded public variant/coupon/review intent and an opaque request reference; private answers and consent are not in URLs or browser persistence.

Creation persists its UUID request reference in the configurator URL before submission. The authenticated `/api/v1/me/order-requests/{key}` projection returns only the current customer's matching order identifier, or an empty identifier. The existing server-side request digest and per-customer unique key remain authoritative for retries and concurrent tabs. Another customer cannot recover an order using its request key; suspended authority is rechecked. A saved order replaces the editable creation form with a named record link and an explicit separate-new-request action. Recovery does not display during an active POST. No payment behavior or paid-state bypass is added.

## Evidence before the complete commit hook

- Strict frontend type checks, ESLint and production storefront/admin builds pass. Component suite: 285 local tests, including ten held/untracked cameo tests; 275 are part of tracked application qualification. Coverage thresholds are unchanged and cover their configured modules, not the entire application.
- New cases cover invalid progression, retained private in-memory edits, direct review URLs, late responses after navigation, bounded return after sign-in, recovery for signed-in and anonymous visitors, suppression during an active submission and malformed references.
- Scoped real-API browser journeys pass on desktop and mobile: catalog intent/validation/review/axe, customer creation with a deliberately lost server response, reload recovery of the same order, request revision, immutable quote acceptance, cancellation/reorder, packages and existing workspace checks. The final run also captures recovery, checks focus/axe and asserts the interruption notice is absent while the original POST is active. Evidence: `/tmp/playora-di05-browser.log`; local captures under `frontend/.cache/di05-recovery-*.png`.
- Golangci-lint (including gosec) and standalone gosec pass. Extended TiDB integration cases verify recovery ownership, unknown/malformed references, suspended access and existing concurrent request deduplication. Their complete race execution is required in the unchanged commit hook.
- Root policy/secret/contract/workflow checks pass. All OpenAPI copies and generated client declarations include the recovery endpoint.
- Required scoped senior review: [review rounds](reviews/2026-09-27-di05-request-review.md). Four-round scoped PASS; complete-hook receipt follows below.

## Corrections during qualification

The first API browser setup caught a Go ServeMux ambiguity between an initial recovery route and existing order child routes; recovery now uses the unambiguous customer `/me/order-requests/{key}` namespace. Axe caught a secondary-button hover contrast regression, corrected without exclusions. Recovery assertions were updated after the reviewer-required saved-order replacement removed the former submit button. One unchanged game-shell focus unit case failed once and passed on subsequent full runs; the full final gate remains required. An initial sandboxed Go lint invocation could not load the installed toolchain cache; the normal permissioned invocation passed. The first complete hook stopped on a secret-scanner false positive in this report’s prose; the sentence was rewritten without adding an exclusion. These failed attempts are not passes.

## Remaining DI05 work

Native provider deposit instructions/address/QR and expiry, exact-order provider return, checkout freshness/reconnect treatments, remaining accepted request/package confirmation details and full DI05 traceability are not delivered by Increment A. Existing hosted checkout, finance/reconciliation and strict unpaid fulfillment rules remain in place. No live merchant call or funds movement qualified by this increment; isolated financial fixtures and later separately authorized R11 checks retain their roles. DI06–DI15 remain authorized subsequent work.

## Increment A delivery receipt

The unchanged full tracked commit hook passed: live govulncheck, golangci-lint and standalone gosec, Go race units, complete TiDB/storage/scanner race integration (462.827s), all 28 explicit SQL migrations, generated-code verification and backend builds/scans. Frontend qualification passed 285 local cases (275 tracked plus ten held experiments), unchanged coverage, dependency audit, both builds, nine server cases and 94 browser journeys (46 ordinary and one policy journey per desktop/mobile project). Container scans/smoke and the full isolated TLS deployment regression passed. Log: `/tmp/playora-di05a-resource-gate-2.log`. Development services were restored.

Implementation `4b8e000892474af2d683a287b571f982fb64915e` was pushed directly to `origin/main` and its remote SHA verified. An initial sandboxed push could not resolve GitHub; the normal permissioned push succeeded. The held experiments, credentials and runtime captures were excluded. Increment A is delivered; DI05 remains open for the work listed above.
