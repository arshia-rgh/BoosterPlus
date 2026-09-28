# DI14 — existing-data transition and integrated application

28 September 2026. Implementation and scoped senior review complete; final aggregate execution follows at DI15. R10/R11 remain held.

## Data transition

`backend/internal/integration/design_upgrade_test.go` starts at SQL25, populates historical users, published catalog releases, custom/package/account orders, accepted contracts, hosted invoices, consignment terms, conversations, messages, media and versioned policy records. It hashes each historical projection before/after reviewed SQL26–38 and checks repeat-up, readiness, old hosted-checkout compatibility, no invented intake ownership and no fabricated job history. The schema25 runtime fails current readiness; schema38 passes. The focused race/TiDB rehearsal plus portal/payment/history regressions passed in22.032s. This is a structural synthetic fixture, not a production-sized copy or backup/restore qualification.

`identity_portals_test.go` separately verifies migration invalidation of legacy sessions/challenges while preserving enrolled factors, coexistence of customer/admin/booster sessions, audience-bound email/Google flows, no staff signup, recent factors and cross-portal rejection. Existing invoice reconciliation remains available with checkout paused. New shop and article data do not rewrite old contracts.

Never roll schema38 down over new commercial records to restore an old binary. Stop writes, preserve the failed database, inspect the migration journal and DDL state, and apply a reviewed forward fix. A retained pre-upgrade backup can be restored only through the approved launch recovery plan, including intervening evidence reconciliation. See `docs/migration-recovery.md` and held `final-launch.md`; no production recovery promise is established by this local rehearsal.

## Routes, permissions and build boundary

Legacy public account-detail links resolve public listing authority before redirecting to their game-local route, preserving only bounded review/request context. Global marketplace cards enter the game shell and retain their originating filtered marketplace. Private records never resolve through this public alias. The accepted55 legacy route contracts remain registered or deliberately redirected. Separate portal routes/cookies and section allowlists remain authoritative; URLs never carry credentials or arbitrary return origins.

Configured game canonical metadata supplements article canonical/sitemap metadata. Workspace, identity/API and unknown paths receive noindex; SSR/no-store boundaries are preserved. Noindex is crawl guidance, never access control. Server-only API origin/proxy configuration stays private. New bounded article, product, recipient and policy payloads pass the proxy's256KB business limit; identity retains16KB and attachments their separate bound. Server regressions cover supported editor payloads and private indexing headers.

Backend/frontend Makefiles, dependency graphs, builds and Dockerfiles remain separate. No new runtime setting is required by this transition. The frontend example now explicitly includes the already-supported optional `PUBLIC_SITE_ORIGIN`; existing examples retain server-only proxy/identity/media and financial pause/activation settings. Portal routes and registered shop/news handlers use these existing settings. No secrets or public service promises are added. Docker/build smoke and full contract/regression checks run in the unchanged DI15 gate.

## Integrated traceability

See `JOURNEY_QUALIFICATION.md` for31 accepted flows and six shop/news addendum journeys, including exception/done-guard evidence and explicit limits. `implementation-matrix.json` maps130 views to owned phase evidence, and `implementation-routes.json` maps55 legacy contracts. A verified row means implemented with its recorded phase evidence; it does not claim every possible state/device was independently observed. DI15 refreshes aggregate execution and integrated senior review.

## Focused verification record

Frontend453 tests in135files passed with unchanged100% instrumented-route thresholds. Types/lint/format and both builds passed; root inventory/secret/workflow/contract checks passed. New public alias cases reject malformed IDs/slugs, wrong listing IDs, provider errors and unsafe query state without forwarding credentials. Actual source inspection and focused journeys validate global marketplace return, not merely the registered alias.

Stress runs exposed and corrected adjoining action groups, enlarged-text gutters, composer wrapping, sticky context and a stale scroll-padding selector. Failed runs remain failed. Build3 orders desktop29.8s/mobile31.5s and fulfillment36.4s/35.0s passed. Build4 shop desktop30.4s/mobile34.9s passed; mobile payment/resale passed with the corrected game-arrival wait. The older gallery test reloaded before the new game loader completed, returning to its previous marketplace; the test now waits for the canonical URL and account heading before reload. Final stable build5 run passed all seven desktop and seven mobile cases, including payment/resale, request decisions and separate staff MFA. Senior DI14 scoped review explicitly PASS after inspecting refreshed populated seller offers and enlarged-text states; UX01–03 closed. See the integrated review record. Tracked-hook delivery receipt follows.
