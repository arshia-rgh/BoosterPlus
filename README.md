# PLAYORA

Game boosting and game-account commerce, starting with Mobile Legends. Formerly Booster Plus; UI/UX implementation is underway.

Planning documents:

- [PLAYORA brand assets](docs/brand/playora/README.md): refined O logo, game-character social background, preserved green aurora and art/motion direction for review.
- [UI/UX roadmap](UI_UX_ROADMAP.md): layout repairs, a simpler account workspace, chat and complete customer/staff journeys; UX01 is delivered and UX02 account navigation/settings is implemented for verification.
- [Final launch](final-launch.md): full R10/R11 production operations and launch scope, explicitly on hold until UX review and separate authorization.
- [Earlier delivery roadmap](REMAINING_ROADMAP.md): R00–R09 history and retained product/deployment requirements.

- [Product and technical specification](BOOSTER_PLUS_SPEC.md): accepted baseline requirements, business rules, architecture, and open decisions.
- [Implementation phases](IMPLEMENTATION_PHASES.md): thirteen phases with dependencies, deliverables, and completion criteria, including all seven approved additional features.

- [Backend](backend/README.md): Go/Ent/TiDB project; explicit SQL migration CLI, API/worker processes, a durable queue, containers and compatibility/security tests. Business features follow the roadmap.
- [Frontend](frontend/README.md): separate React storefront/admin applications with type, lint, security, component, browser, and accessibility checks.
- [Customer experience](docs/customer-experience.md): R03 catalog, estimator, account, conversations and booster workspace.

Implementation has started. See [progress](docs/progress.md) for verified stage status and [repository rules](AGENTS.md) for the required workflow.

Run `make bootstrap`, start local services with `make -C backend dev-up`, then run `make pre-commit`. The root gate always runs repository policy/secret checks and **both** projects' `pre-commit` targets. The tracked hook enforces that gate before each commit to `main`; stage commits are pushed directly to `origin/main`.
