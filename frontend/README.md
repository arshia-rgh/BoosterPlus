# Booster Plus frontend

Independent React/TypeScript project in the Booster Plus monorepo. The current deliverable is the tested prelaunch shell and quality tooling. It has home, game catalog, safe not-found/error screens, and empty customer/admin/booster portal shells. It deliberately offers no checkout or login before those features exist.

## Commands

```sh
make install
npx playwright install chromium
make dev
make pre-commit
```

Install development dependencies explicitly (`npm ci --include=dev`), including when the host has a production Node environment. Use the committed npm lockfile. Node 24.21.0 is the target LTS runtime; the compatibility shell has also been checked with the host Node 26.0.0.

`make pre-commit` runs Prettier, React Router type generation and strict TypeScript, ESLint with React hooks/security/accessibility rules, component tests and route coverage, a dependency audit including development packages, the production SSR build, and desktop/mobile Playwright tests with axe accessibility checks, an independent Docker build, a Trivy image scan, and a non-root/read-only container smoke test. Browser tests start an isolated production server and fail if the port is already occupied.

The installed JSX accessibility linter currently requires ESLint 9, so ESLint 9.39.5 is pinned despite its upstream deprecation notice. Track migration to ESLint 10 when a compatible accessibility plugin is available; do not bypass peer dependency checks. Dependency audits remain mandatory. TypeScript 5.9.3 is pinned because the current OpenAPI generator requires TypeScript 5; it is also supported by typescript-eslint. A targeted `js-yaml` 4.3.2 override fixes the vulnerable version pinned by the generator's Redocly dependency. Remove that override after upstream includes the patch.

Public pages are rendered on the server through React Router. Go owns future pricing, auth, database, and financial decisions. Docker packaging and a generated typed OpenAPI client are included. Subsequent phases replace prelaunch content with actual published offerings.

## API contract

`contracts/openapi.json` is the pinned frontend input. `make contract-generate` regenerates types; `make contract-check` fails when those types are stale. Updating from the monorepo's backend is an explicit `make contract-update` operation. Normal install/build/generation never imports backend files. The root gate checks the published and pinned contracts match.

`createAPIClient` takes a trusted API origin and returns a client typed from this contract. It does not invent success responses when the API fails. The UI is still prelaunch; authentication, customer data and protected portal functionality arrive in P02 and later phases. Only Google and email sign-in are planned, without passwords.

## Independent production image

```sh
make docker-build
make docker-run
```

Visit `http://127.0.0.1:3000`. The multi-stage image uses checksum-pinned Node 24.21.0 LTS archives on a digest-pinned Debian-based image. Both amd64 and arm64 build paths are defined. It contains production dependencies only, removes unused package managers, runs as `node`, and executes the SSR server directly. The gate also exercises it with a read-only filesystem and dropped capabilities. TLS termination and browser security policy integration are finalized with authentication/deployment; this shell is not production launch approval.

`make image-security` fails on fixable high/critical image findings. Full reports remain in ignored `.cache/`; npm audit includes all installed development and production dependencies and fails at low severity. These checks do not prove that every possible vulnerability is absent.
