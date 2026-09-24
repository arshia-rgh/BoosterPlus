# PLAYORA

Game boosting and game-account commerce, starting with Mobile Legends. Formerly Booster Plus. The accepted redesign is now in implementation under DI00–DI15; final launch remains held.

Planning documents:

- [Accepted design implementation roadmap](docs/redesign/IMPLEMENTATION_ROADMAP.md): DI00–DI15, mapping all 115 accepted views and 31 journeys to existing code and new portal, shop and news features.
- [Accepted design package](docs/redesign/README.md): atlas, screen/flow contracts and independent review records.

- [PLAYORA brand assets](docs/brand/playora/README.md): refined O logo, game-character social background, preserved green aurora and art/motion direction for review.
- [Historical UI/UX roadmap](UI_UX_ROADMAP.md): previous UX delivery requirements and history; superseded as the active execution queue.
- [Final launch](final-launch.md): full R10/R11 production operations and launch scope, explicitly on hold until UX review and separate authorization.
- [Earlier delivery roadmap](REMAINING_ROADMAP.md): R00–R09 history and retained product/deployment requirements.

- [Product and technical specification](BOOSTER_PLUS_SPEC.md): accepted baseline requirements, business rules, architecture, and open decisions.
- [Implementation phases](IMPLEMENTATION_PHASES.md): thirteen phases with dependencies, deliverables, and completion criteria, including all seven approved additional features.

- [Backend](backend/README.md): Go/Ent/TiDB project; explicit SQL migration CLI, API/worker processes, a durable queue, containers and compatibility/security tests. Business features follow the roadmap.
- [Frontend](frontend/README.md): separate React storefront/admin applications with type, lint, security, component, browser, and accessibility checks.
- [Customer experience](docs/customer-experience.md): R03 catalog, estimator, account, conversations and booster workspace.

R00–R09 and earlier UX work exist; DI00 contracts and addenda are delivered; DI01 is next. See [progress](docs/progress.md) for verified stage status and [repository rules](AGENTS.md) for the required workflow.

Run `make bootstrap`, start local services with `make -C backend dev-up`, then run `make pre-commit`. The root gate always runs repository policy/secret checks plus backend, frontend and production `pre-commit` targets. The tracked hook selects proportionate checks for each staged change: root checks for documentation, root plus frontend for UI-only changes, and the full gate for backend/deployment/dependency/tooling or mixed changes. Final qualification and CI retain the full gate. Stage commits are pushed directly to `origin/main`.
