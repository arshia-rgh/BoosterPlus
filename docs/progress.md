# Implementation progress

Updated: 9 September 2026.

## Repository policy

One monorepo, independent Go/React projects, direct commits and pushes to `main` after both projects' `pre-commit` gates and root checks pass. See [AGENTS.md](../AGENTS.md).

## Current stage

- P00 technical compatibility: committed and pushed to `main` as `efabfe3e204cb37f39a16453d5a27abbdc26012e`. The remote commit hash was verified.
- P01 foundations: implemented and verified locally. Delivery includes API/worker/CLI, durable queue/outbox, schema readiness, frontend shells and contract generation, Docker/Compose, image scans and CI. The stage is ready for its mandatory commit-hook gate and direct push. Remote GitHub Actions execution has not been verified; the unauthenticated Actions API returns HTTP 404 for this repository.
- P02–P12: not started.

## P00 verification evidence

Verified locally on 9 September 2026:

- Go 1.27.1, Ent 0.14.6, Goose 3.28.0, Cobra 1.10.2, MySQL driver 1.10.1, TiDB 8.5.7 (image pinned by digest).
- `make -C backend pre-commit`: formatting, module tidy/verification, deterministic Ent generation, vet, the configured golangci-lint 2.13.2 suite, standalone gosec 2.29.0, govulncheck 1.8.0, unit/race tests, real TiDB tests, migration validation, and CLI build passed.
- TiDB scenarios: read-only empty status; sequential install and upgrade; preserved existing user data; Ent JSON/default/unique-query behavior; transaction rollback; conditional updates with one winner; supported down/up; duplicate invocation; held lock; concurrent runners without duplicate versions; altered SQL/checksums; SQL snapshot immutability; unknown/missing/mismatched bookkeeping; partial DDL and blocked retry; invalid targets.
- `make -C frontend pre-commit`: formatting, type generation/strict type checks, React/security/accessibility lint, two component tests, current-route coverage, full npm audit, SSR production build, and six desktop/mobile browser checks passed.
- Browser checks cover navigation, unavailable services without fake checkout/prices, 404 handling without reflecting injected markup, skip navigation, layout overflow, and axe accessibility checks. A detected mobile contrast defect was fixed before the passing run.
- `make check-repository`: repository-policy validation, redacted Gitleaks scan, and whitespace checks passed.
- A transitive `golang.org/x/mod` advisory was fixed by updating to 0.41.0; the final govulncheck report contains no known vulnerabilities.

These checks validate the implemented compatibility/tooling slice. They do not claim authentication, payments, orders, production topology, or every future application scenario is implemented or secure. TiDB unistore tests do not establish distributed production availability. Frontend runtime checks used host Node 26.0.0; P01 also verifies Node 24.21.0 LTS inside the production container. The ESLint 9/accessibility-plugin compatibility constraint is tracked in the frontend README.

## Open business inputs

Payment provider/regions/networks, seller settlement arrangement, win-rate promise, actual catalog prices, launch languages, and production infrastructure remain unresolved. Foundation work can proceed independently.

## P01 verification evidence

Verified locally on 9 September 2026 before stage delivery:

- Backend `make pre-commit`: formatting, tidy, deterministic generation, vet, broad golangci-lint, standalone gosec, govulncheck, module verification, race tests, TiDB integration, packaged SQL validation, all three binary builds, Compose validation, Docker build and Trivy image scan passed.
- API: live/ready/status routes, published JSON Schema response validation, unavailable dependencies, unsupported methods, bounded bodies, panic redaction, request IDs and security headers, no secret reflection/logging, configuration rejection and graceful process shutdown.
- Persistence: existing migration scenarios still pass with the third SQL migration. Readiness rejects missing schema/columns and a missing idempotency unique constraint. Queue tests cover SQL and Ent transaction rollback, idempotent enqueue/conflicts, exact large JSON integers, invalid payloads, concurrent claims with one winner, ownership changes, stale acknowledgement/renewal/failure rejection, backoff, exhausted leases, handler failures/panics, unsupported kinds, completion and shutdown cancellation.
- Frontend `make pre-commit`: pinned contract generation, formatting, strict types, React/security/accessibility lint, seven component/client tests, current-route coverage, npm audit, SSR build, 12 desktop/mobile browser tests, Docker build, Trivy and the Node 24.21.0 non-root/read-only SSR smoke test passed. Portal title omissions were detected by axe and fixed.
- `make -C backend dev-up`: local credential generation preserves existing `.env`, separate runtime/migration roles, explicit migration container, API/worker processes, Mailpit and SeaweedFS S3. Smoke checks confirm readiness, processing of the newly enqueued job, email health and denial of anonymous bucket listing. Re-running setup against existing volumes is supported without deleting data.
- Root checks: Gitleaks, contract-copy synchronization, actionlint and whitespace validation passed. The tracked Git hook reruns the root and both project gates before the stage commit. CI uses the same gates and pinned action commit hashes.
- The OpenAPI generator's YAML dependency was patched through a targeted override and a freshly resolved lockfile; final npm audit reports zero advisories. Final govulncheck reports zero advisories. Trivy reports zero fixable HIGH/CRITICAL vulnerabilities in both application runtime images. Unneeded package-manager dependencies were removed from the frontend runtime after image findings.

Limits: these are foundation tests, not a complete production/security certification. Image gates use a documented severity/fixability threshold and do not scan all vendor service images. Distributed TiDB failures, scale/load tests, authentication/authorization, object-upload processing, real email delivery, payments and complete business journeys belong to later phases. Delivery remains at least once; handlers require their own idempotent business/provider effects. The current portals expose prelaunch content only. No production deployment has been performed. Remote GitHub Actions status remains unverified until authenticated repository access is available; workflow syntax and its local command sequence are checked.
