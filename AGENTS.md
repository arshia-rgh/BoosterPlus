# Booster Plus repository rules

These rules record the owner's instructions from 9 September 2026 and apply to every stage and future task in this repository.

## Repository and delivery

- This is one Git monorepo with independent `backend/` and `frontend/` projects. Keep their dependency graphs, builds, Dockerfiles, and Makefiles separate.
- Work directly on `main`. Do not create feature branches or worktrees unless the owner changes this instruction.
- Commit and push each completed, verified implementation stage directly to `origin/main`. This action is already authorized; do not ask again. Never force-push or discard remote/user work.
- Before **every** commit, run both `make -C backend pre-commit` and `make -C frontend pre-commit`, plus the root repository checks. A root `make pre-commit` must run all of them.
- Install the tracked Git pre-commit hook and retain the same gate in CI. Do not bypass hooks, skip failing checks, lower thresholds to hide failures, or claim checks passed when tooling/network/infrastructure blocked them.
- Review the actual staged diff, exclude secrets/generated runtime data, and check `git diff --check` before committing. Verify the pushed commit matches `origin/main` afterward.

## Quality and security

- Test each stage's happy paths, invalid inputs, authorization boundaries, errors, retries, concurrency, and relevant security scenarios. Record reproducible evidence and remaining limitations in `docs/progress.md`.
- Backend pre-commit must include formatting, `go vet`, `golangci-lint`, standalone `gosec`, `govulncheck`, dependency verification, race-enabled tests, applicable TiDB integration tests, generated-code checks, and production builds.
- Use a broad maintained golangci-lint configuration for security, correctness, resource cleanup, context propagation, error handling, and Go style. Follow Google Go style where applicable. Gosec is required both in golangci-lint and as a standalone command; no linter can prove absence of vulnerabilities.
- Frontend pre-commit must include formatting, strict type checks, ESLint/security/accessibility rules, unit/component tests, browser/accessibility tests for implemented routes, dependency audit, contract checks, and a production build.
- Required tests fail closed when their dependencies are unavailable. Do not silently skip integration tests in the pre-commit gate. Use dedicated test databases and isolated test resources; never destructive tests against production.
- Keep checks reproducible with pinned tools and lockfiles. Address findings instead of blanket exclusions. Any narrow suppression needs an inline reason and review.
- Run relevant container/configuration, secret, dependency, and workflow checks as part of the repository gate as they are introduced.

## Product and architecture

- Follow `BOOSTER_PLUS_SPEC.md` and `IMPLEMENTATION_PHASES.md`; keep phase status accurate. All seven additional features are in scope.
- Go backend with Ent query generation; explicit SQL migrations in `backend/migration/`, driven by the Cobra CLI. Never run Ent/Atlas migrations or automatic startup migration, including in tests.
- Google/email passwordless login only; no customer/seller wallet. Crypto checkout uses verified evidence, idempotency, reconciliation, and explicit refund/payout records.
- Keep private information, game credentials, provider secrets, auth codes, and personal data out of logs, commits, public files, and message/event payloads that do not require them.
- Missing business decisions may block their dependent features, not unrelated implementation. Do not invent live prices, payout terms, or win-rate guarantees.
