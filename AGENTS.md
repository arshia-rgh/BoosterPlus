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

## Design-first boundary (21 September 2026) — current owner direction

- Pause all application development, including the unfinished homepage cameo/audio work. Preserve that work without shipping it.
- The owner superseded the old UI/UX and homepage-refinement roadmaps. Their historical records remain, but do not resume them as the active implementation queue.
- Design all pages, details, states and end-to-end flows before resuming implementation. The active review package is [docs/redesign/README.md](docs/redesign/README.md), with its local design atlas, screen/flow specifications and route coverage.
- The 13 owner-provided HTML exports in `docs/redesign/pages/` are the full reference set and visual suggestions only, not the target quality. Create an independently improved design; do not copy their structure or unsupported claims blindly.
- The owner explicitly confirmed existing business rules remain: no wallet/escrow/tournament/top-up/automatic booster payout scope from the exports. Preserve the green brand direction.
- Design review does not authorize product implementation or launch. R10/R11 stay held with full detail in `final-launch.md`. Owner visual acceptance remains open.

## Design review gate (24 September 2026)

- During design-first work, follow [docs/redesign/DESIGN_CHANGE_GATE.md](docs/redesign/DESIGN_CHANGE_GATE.md): spawn a senior UI/UX designer to review only changed designs and affected shared behavior, fix findings and repeat review until no actionable scoped findings remain. Record each round and the explicit verdict; a missing review is not a pass. Keep the existing proportionate checks and owner acceptance.

## Homepage/game design revision (23 September 2026)

- The owner requested equal prominence for all games, service introductions on the homepage and game selection at its bottom; remove the homepage fighting-spirit section and global service navigation.
- Game hubs retain their game introduction across service selection and display featured offers. Use large service cards, then only the selected service with a small Back to choose service link; no All services feed/control. Game navbars also omit global service links; Sell an account belongs inside Accounts.
- All pages omit global marketing navbar links. Use shared contact/policy footers, homepage FAQ/review carousel, game FAQs and limited offers below game stats. Keep service subflows within the game shell. Shared non-game artwork and game-specific artwork have reduced-motion/pause controls. The signed-in corner order/support panel is a design fixture, not real authentication or progress.
- Shop and news discovery are now explicitly requested design concepts, superseding their earlier exclusion as unsolicited export content. Detailed downstream flows and business rules still need design decisions; this does not authorize runtime implementation. See `docs/redesign/HOMEPAGE_GAME_HUB_REVISION.md`.

## Panel design revision (24 September 2026)

- Customer, booster and admin panels retain explicit role/workspace identity. Order sections replace local content inside a persistent order shell, preserving record ID/status and drafts; never send a section tab to a global unrelated page. Lists use named record actions and retain filter/return context. Staff customer previews stay explicitly labeled inside the staff workspace and return to the originating editor. Follow [docs/redesign/PANEL_UX_REVISION.md](docs/redesign/PANEL_UX_REVISION.md).

## Current delivery boundary (13 September 2026)

- R07, R08 and R09 are delivered. UX01–UX10 implementation and automated qualification are delivered as of 14 September 2026; see `docs/ux/UX10_QUALIFICATION.md` for the route/state matrix, media and explicit remaining human/device review. Stop for owner acceptance. R10/R11 still require separate authorization.
- Owner review on 14 September reopened the homepage hero and character showcase. Research and the proposed HF01–HF05 scope are in `docs/ux/HOMEPAGE_REFINEMENT_ROADMAP.md`. The owner approved implementation of this roadmap on 14 September 2026. Preserve the green theme and original background; plan removal of the hero Iori overlay and character biographies, with coherent soft internal character motion inspired by boosting.pro. Earlier automated qualification is historical evidence, not acceptance of these requested changes.
- The same planning brief now includes a tiny early-scroll character cameo with a skill, matching spoken line and full-width right-to-left exit, plus Iori/Chou punch feedback on eligible buttons across both frontend builds. Proposed HF04A/HF04B cover these additions, visitor sound/motion controls and real asset qualification. Implementation is now authorized; do not claim authentic voice/skill/punch assets are already available.
- A fresh running-site senior design/UX review added proposed HF02A (LR01–LR10) for observed catalog/configuration/navigation issues, especially sticky summary overlap and lost custom/package intent. Both live notes are under `docs/ux/research/`. After the owner unlocked the workstation, resumed review confirmed package/Continue progression and selected Firefox responsive sign-in/marketplace states; authenticated workflows, narrow homepage and real-device checks remain open. Do not turn tool capture failures into app defects. The expanded roadmap is approved for implementation; HF05 owner acceptance remains required.
- The owner renamed the brand to PLAYORA on 13 September 2026 and authorized generating a matching logo and separate social background now. The latest clarification requires preserving the current overall green website theme and changing details only; it supersedes the earlier permission for a different theme. Retain accepted fonts, website background/art direction, rank-transformation behavior, accessibility and image quality. Application rebranding is authorized within UX01–UX10; brand masters live in `docs/brand/playora/`.
- The owner also requested a more detailed O distinguishing PLAY/ORA, game-character social artwork (MLBB, WoW and other games), and rich character/scroll animation in the UX plan. Preserve the earlier abstract background as an optional asset. Plan actual character motion with native scrolling, reduced-motion controls, readable content and measured performance; do not treat a flat-image slide as the whole animation deliverable. Asset generation and application animation are authorized within UX01/UX05/UX10.
- R10/R11 are on hold. Their full retained scope is in `final-launch.md`; completing the UX work does not automatically authorize production implementation or launch.
- Continue running established production regression checks in the full pre-commit gate. This does not resume deferred R10/R11 implementation.

## Owner retention decision (13 September 2026)

- Customer deletion must stay disabled until the owner publishes and enables an explicit retention policy. Do not infer minimum periods or backup promises.
- Preserve active-order/dispute holds and financial/audit evidence. Erasure completion must distinguish live-data cleanup from pending file purges and retained backups/evidence.

## Future character scenes

For fighting-spirit game artwork, motion or backgrounds, read `frontend/app/home/README.motion.md` and `docs/ux/CHARACTER_MOTION_AGENT_GUIDE.md`. Reuse the shared scene renderer and preserve perceptibility, planted-foot, loading/failure, accessibility and transfer checks.

HF04 three-game scene implementation and automated qualification are delivered as `3537aa5` (20 September 2026). See `docs/ux/HF04_SCENE_QUALIFICATION.md` for the verification scope and macOS Firefox limitation. Owner visual/physical-device acceptance remains open; do not infer acceptance or resume held launch work.

## Separate portal sign-in design (24 September 2026)

- Customer, admin and booster sign-in must be separate experiences, with no customer-session reuse for staff or shared staff entry. Preserve Google/email passwordless and mandatory staff second factor. Follow `docs/redesign/SEPARATE_PORTAL_SIGN_IN.md`. This is currently design-only; application development and R10/R11 remain held.
