# Booster Plus frontend

Independent React/TypeScript project in the Booster Plus monorepo. P02 includes email/Google sign-in, account settings, authenticator enrollment, recovery codes, session controls, and protected administrator/booster portals. Commerce remains prelaunch.

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

Public pages are rendered on the server through React Router. Go owns authentication, authorization, pricing, database, and financial decisions. Docker packaging and a generated typed OpenAPI client are included. Subsequent phases replace prelaunch content with actual published offerings.

## API contract

`contracts/openapi.json` is the pinned frontend input. `make contract-generate` regenerates types; `make contract-check` fails when those types are stale. Updating from the monorepo's backend is an explicit `make contract-update` operation. Normal install/build/generation never imports backend files. The root gate checks the published and pinned contracts match.

`createAPIClient` takes a trusted API origin and returns a client typed from this contract. It does not invent success responses when the API fails. Identity responses are validated at runtime with Zod against generated contract types. Only Google and email sign-in are supported, without passwords. Staff need MFA at every sign-in.

## Independent production image

```sh
make docker-build
make docker-run
```

Visit `http://127.0.0.1:3000`. The multi-stage image uses checksum-pinned Node 24.21.0 LTS archives on a digest-pinned Debian-based image. Both amd64 and arm64 build paths are defined. It contains production dependencies only, removes unused package managers, runs as `node`, and executes the SSR server directly. The gate also exercises it with a read-only filesystem and dropped capabilities. The server provides a same-origin API proxy, nonce-based CSP and browser security headers. Set public deployment configuration explicitly; building the production image alone is not launch approval.

`make image-security` fails on fixable high/critical image findings. Full reports remain in ignored `.cache/`; npm audit includes all installed development and production dependencies and fails at low severity. These checks do not prove that every possible vulnerability is absent.

## Identity development and deployment

Start `make -C backend dev-up` from the monorepo root, then `make dev` here. The local setup helper copies only the proxy secret into a private ignored frontend `.env`; independent deployments configure it themselves from `.env.example`. Vite reads that value only in its server proxy configuration. It is never exposed through a `VITE_` variable or a browser token store. Visit `http://127.0.0.1:5173/account` and read local verification emails in Mailpit on port 8025.

`make build start` runs the production SSR server on port 3000 (set HOST/PORT as needed). `API_ORIGIN` and `PROXY_SHARED_KEY` are server-only. Public deployment requires explicit `APP_ENV=production`, approved `ACCOUNT_TERMS_TEXT`, matching frontend/backend `TERMS_VERSION`, HTTPS at the gateway and exact `TRUST_PROXY_CIDRS`; the server checks terms-version alignment at startup. Never publicly launch with preview terms. See [identity operations](../docs/identity-design.md).

Browser tests require local TiDB and Mailpit and launch a disposable database through `scripts/browser-tests.py`. They test actual email delivery, API cookies/CSRF and SQL persistence, not mocked successful sign-in. They drop only the randomly named test schema on completion. Private fixture configuration is mode 0600 and deleted afterward. Browser traces use synthetic accounts and remain ignored. Unit route coverage remains enforced separately from component and browser behavior; its percentage is not a claim of whole-application coverage.
