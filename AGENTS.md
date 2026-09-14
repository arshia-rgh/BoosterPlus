# PLAYORA repository rules

These rules record the owner's instructions from 9 September 2026 and apply to every stage and future task in this repository.

## Repository and delivery

- This is one Git monorepo with independent `backend/` and `frontend/` projects. Keep their dependency graphs, builds, Dockerfiles, and Makefiles separate.
- Work directly on `main`. Do not create feature branches or worktrees unless the owner changes this instruction.
- Commit and push each completed, verified implementation stage directly to `origin/main`. This action is already authorized; do not ask again. Never force-push or discard remote/user work.
- Owner update: use checks proportionate to the changed stage. UI-only changes require the frontend pre-commit and root repository checks, without repeating unchanged backend/production suites. Documentation-only changes require root checks. Backend, deployment, dependency/tooling and unclassified changes retain the full gate. Root `make pre-commit` always remains the complete gate; the tracked hook selects the required scope from the staged paths.
- Install the tracked Git pre-commit hook; retain the complete gate in CI and at final UX qualification. Do not bypass hooks, skip failing checks, lower thresholds to hide failures, or claim checks passed when tooling/network/infrastructure blocked them.
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
- Staff must complete Google/email verification and an authenticator check at every sign-in. Sensitive actions require recent verification of both factors. Single-use recovery codes substitute only for the second factor.
- Google/email passwordless login only; no customer/seller wallet. Crypto checkout uses verified evidence, idempotency, reconciliation, and explicit refund/payout records.
- Keep private information, game credentials, provider secrets, auth codes, and personal data out of logs, commits, public files, and message/event payloads that do not require them.
- Missing business decisions may block their dependent features, not unrelated implementation. Do not invent live prices, payout terms, or win-rate guarantees.

## Final NOWPayments decision (12 September 2026)

- Use the production NOWPayments API only; sandbox has been retired by the provider. Credentials remain private runtime configuration.
- Keep `PAYMENTS_ENABLED` as a pause switch for new checkout. When false, orders remain unpaid and cannot enter fulfillment. The owner explicitly withdrew the proposed payment bypass; do not implement a runtime success simulation.
- Reconciliation continues for existing payments while new checkout is paused. Refunds/payouts have a separate explicit activation switch. Provider failure or missing credentials never grants payment success.
- Automated payment tests use isolated fixtures. Controlled live transaction qualification replaces unavailable sandbox qualification; fixtures cannot qualify real funds movement.

## Current delivery boundary (13 September 2026)

- R07, R08 and R09 are delivered. UX01–UX10 implementation and automated qualification are delivered as of 14 September 2026; see `docs/ux/UX10_QUALIFICATION.md` for the route/state matrix, media and explicit remaining human/device review. Stop for owner acceptance. R10/R11 still require separate authorization.
- Owner review on 14 September reopened the homepage hero and character showcase. Research and the proposed HF01–HF05 scope are in `docs/ux/HOMEPAGE_REFINEMENT_ROADMAP.md`. The owner requested this new roadmap before implementation: do not start the refinement until approved. Preserve the green theme and original background; plan removal of the hero Iori overlay and character biographies, with coherent soft internal character motion inspired by boosting.pro. Earlier automated qualification is historical evidence, not acceptance of these requested changes.
- The same planning brief now includes a tiny early-scroll character cameo with a skill, matching spoken line and full-width right-to-left exit, plus Iori/Chou punch feedback on eligible buttons across both frontend builds. Proposed HF04A/HF04B cover these additions, visitor sound/motion controls and real asset qualification. This is documentation scope until the owner approves implementation; do not claim authentic voice/skill/punch assets are already available.
- The owner renamed the brand to PLAYORA on 13 September 2026 and authorized generating a matching logo and separate social background now. The latest clarification requires preserving the current overall green website theme and changing details only; it supersedes the earlier permission for a different theme. Retain accepted fonts, website background/art direction, rank-transformation behavior, accessibility and image quality. Application rebranding is authorized within UX01–UX10; brand masters live in `docs/brand/playora/`.
- The owner also requested a more detailed O distinguishing PLAY/ORA, game-character social artwork (MLBB, WoW and other games), and rich character/scroll animation in the UX plan. Preserve the earlier abstract background as an optional asset. Plan actual character motion with native scrolling, reduced-motion controls, readable content and measured performance; do not treat a flat-image slide as the whole animation deliverable. Asset generation and application animation are authorized within UX01/UX05/UX10.
- R10/R11 are on hold. Their full retained scope is in `final-launch.md`; completing the UX work does not automatically authorize production implementation or launch.
- Continue running established production regression checks in the full pre-commit gate. This does not resume deferred R10/R11 implementation.

## Owner retention decision (13 September 2026)

- Customer deletion must stay disabled until the owner publishes and enables an explicit retention policy. Do not infer minimum periods or backup promises.
- Preserve active-order/dispute holds and financial/audit evidence. Erasure completion must distinguish live-data cleanup from pending file purges and retained backups/evidence.
