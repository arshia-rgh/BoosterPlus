# Focused deployment checks and next release

The owner stopped automatic full qualification on 14 October 2026. This direction continues until explicitly changed. Each deployment uses lightweight checks and focused regressions for its changed behavior. Tests remain maintained as features are added or changed. Complete qualification runs only on an explicit owner request, using `make full-gate` (the existing complete project targets remain available).

## Current commission/policy release

Preserve the frozen service148/full2 source and original logs. The owner cancelled the run during its separate production database stage: 243 scenarios passed before interruption, with no scenario assertion failures observed before cancellation. Its process reports interruption/failure; the complete suite did not pass. All 280 earlier backend database scenarios, static/security/race checks, 185 frontend test files, 170 browser cases, image/container, staging and runtime configuration checks had already passed. The infrastructure scan reported 519 exact owner-accepted findings, not a clean scan.

The cancellation log hashes are `10ebfc516d236aaf6fdb4833921c7d1739c73f03c8eca3c39ffa83a2bc8a3cc2` (gate) and `5683871786146256dc7c18e7198411ac9f68a253a8d981103957d498fd62ade7` (production database). Preserve the earlier full1 browser timeout too. Both local release watchers were stopped; the live services were unaffected. New focused evidence must bind the final source, including this gate-policy change. Do not restart the aggregate database/browser suite.

The approved legal/retention private drafts are revision 1; MLBB's review-policy-only private draft is revision 246. Retention remains disabled. Compare the current draft again before publication so newer owner edits are preserved. Normal owner authentication/fresh verification remains required. Current payment policy and historical agreements remain unchanged; no live financial/email test is authorized. Recovery requirements are assessed against the signed deployment candidate separately.

## Following deployment: requested fixes

1. Show the customer's original custom-boost estimate to staff in the order workspace and quote decision context, including currency, pending/manual-review cases and its estimated status. Use the immutable order snapshot; do not recalculate it from a later catalog or imply it is a final quote.
2. Review and fix boosting-page FAQ and section alignment at mobile/tablet/desktop sizes. Check affected shared game/service layouts and prevent overflow, inconsistent content widths, sticky overlap and focus jumps. Preserve the green theme.
3. Use “Go to payment” for the customer checkout action rather than a provider-branded button. Keep transparent provider/network instructions and safe hosted-checkout validation.
4. Display a live estimate beside “Build your next climb.” Update it when valid preferences change, with debouncing, stale-response protection and clear pending/incomplete/manual-review/expired/error states. Keep fields in place and avoid automatic scrolling or stale totals. Final price still requires staff review; order submission binds a valid matching estimate.

Maintain regression coverage for those flows and run focused UI/browser checks plus senior design review for the changed surfaces. Deliver these after the commission/policy release, not as unreviewed additions to its frozen application source.

## Lightweight default

The tracked commit hook uses `make deploy-check` for cross-project changes, frontend `stage-check` for UI scope, and repository checks for documentation-only changes. These include applicable format/type/lint/security, dependency/contract checks, unit/component tests, builds and static deployment configuration without real database/service startup. Run changed integration/browser cases separately when needed. CI retains its existing lightweight policy. Image security/signatures, valid configuration and post-deployment smoke checks remain required. Focused success is never described as a full-suite pass.
