# Implementation progress

Updated: 9 September 2026.

## Repository policy

One monorepo, independent Go/React projects, direct commits and pushes to `main` after both projects' `pre-commit` gates and root checks pass. See [AGENTS.md](../AGENTS.md).

## Current stage

- P00 technical compatibility: verified; stage commit/push is the current delivery step.
- P01 foundations: in progress; frontend shell, project Makefiles, and shared commit tooling were introduced to make both mandatory checks executable from the first commit. API, worker, full Docker packaging, and CI remain P01 work.
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

These checks validate the implemented compatibility/tooling slice. They do not claim authentication, payments, orders, production topology, or every future application scenario is implemented or secure. TiDB unistore tests do not establish distributed production availability. Frontend runtime checks used host Node 26.0.0; the P01 production target is Node 24.21.0 LTS. The ESLint 9/accessibility-plugin compatibility constraint is tracked in the frontend README.

## Open business inputs

Payment provider/regions/networks, seller settlement arrangement, win-rate promise, actual catalog prices, launch languages, and production infrastructure remain unresolved. Foundation work can proceed independently.
