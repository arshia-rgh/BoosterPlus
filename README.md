# Booster Plus

Game boosting and game-account commerce, starting with Mobile Legends.

Planning documents:

- [Product and technical specification](BOOSTER_PLUS_SPEC.md): accepted baseline requirements, business rules, architecture, and open decisions.
- [Implementation phases](IMPLEMENTATION_PHASES.md): thirteen phases with dependencies, deliverables, and completion criteria, including all seven approved additional features.

- [Backend](backend/README.md): Go/Ent/TiDB project; explicit SQL migration CLI, API/worker processes, a durable queue, containers and compatibility/security tests. Business features follow the roadmap.
- [Frontend](frontend/README.md): React/TypeScript prelaunch shell with type, lint, security, component, browser, and accessibility checks.

Implementation has started. See [progress](docs/progress.md) for verified stage status and [repository rules](AGENTS.md) for the required workflow.

Run `make bootstrap`, start local services with `make -C backend dev-up`, then run `make pre-commit`. The root gate always runs repository policy/secret checks and **both** projects' `pre-commit` targets. The tracked hook enforces that gate before each commit to `main`; stage commits are pushed directly to `origin/main`.
