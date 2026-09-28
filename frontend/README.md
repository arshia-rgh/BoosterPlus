# PLAYORA frontend

Independent React/TypeScript project in the PLAYORA monorepo. Includes passwordless identity, protected customer/admin/booster workflows, catalog configuration, orders, conversations, fulfillment and account intake. R01 adds the animated storefront and MLBB rank transformation; the existing checkout uses live-provider adapters and isolated test fixtures. See [visual implementation and checks](../docs/visual-design.md). R02 adds the dedicated staff application at `/admin`, with its own route graph, shell, build and image. See [staff onboarding and architecture](../docs/admin-workspace.md).

## Commands

```sh
make install
npx playwright install chromium
make dev          # Starts both apps at 5173; staff at /admin
make dev-admin    # Individual debug server (5174; see shared-origin notes)
make build-admin  # Independent admin build
make test-home    # Focused desktop/mobile homepage + budgets
make pre-commit
```

Install development dependencies explicitly (`npm ci --include=dev`), including when the host has a production Node environment. Use the committed npm lockfile. Node 24.21.0 is the target LTS runtime; the compatibility shell has also been checked with the host Node 26.0.0.

`make pre-commit` runs Prettier, React Router type generation and strict TypeScript, ESLint with React hooks/security/accessibility rules, component tests and route coverage, a dependency audit including development packages, the production SSR build with enforced homepage asset budgets, and desktop/mobile Playwright tests with axe accessibility checks, independent storefront/admin Docker images, Trivy image scans, and non-root/read-only container smoke tests for both apps. Browser tests start an isolated production server and fail if the port is already occupied.

The installed JSX accessibility linter currently requires ESLint 9, so ESLint 9.39.5 is pinned despite its upstream deprecation notice. Track migration to ESLint 10 when a compatible accessibility plugin is available; do not bypass peer dependency checks. Dependency audits remain mandatory. TypeScript 5.9.3 is pinned because the current OpenAPI generator requires TypeScript 5; it is also supported by typescript-eslint. A targeted `js-yaml` 4.3.2 override fixes the vulnerable version pinned by the generator's Redocly dependency. Remove that override after upstream includes the patch.

Public pages are rendered on the server through React Router. Go owns authentication, authorization, pricing, database, and financial decisions. Docker packaging and a generated typed OpenAPI client are included. Catalog pages load published offerings from Go; API outages return an error rather than fabricated catalog data.

## API contract

`contracts/openapi.json` is the pinned frontend input. `make contract-generate` regenerates types; `make contract-check` fails when those types are stale. Updating from the monorepo's backend is an explicit `make contract-update` operation. Normal install/build/generation never imports backend files. The root gate checks the published and pinned contracts match.

`createAPIClient` takes a trusted API origin and returns a client typed from this contract. It does not invent success responses when the API fails. Identity and catalog responses are validated at runtime with Zod; Go tests verify catalog JSON against the pinned OpenAPI schemas. Only Google and email sign-in are supported, without passwords. Staff need MFA at every sign-in.

## Independent production images

```sh
make docker-build
make docker-run
```

The default `boosterplus-frontend:local` image serves the storefront at `http://127.0.0.1:3000`. The `boosterplus-admin:local` image serves `/admin` independently. The Docker targets are `storefront` and `admin`, and each excludes the other build. Root `production/` remains reserved for deployment configuration (R04). The multi-stage image uses checksum-pinned Node 24.21.0 LTS archives on a digest-pinned Debian-based image. Both amd64 and arm64 build paths are defined. It contains production dependencies only, removes unused package managers, runs as `node`, and executes the SSR server directly. The gate also exercises it with a read-only filesystem and dropped capabilities. The server provides a same-origin API proxy, nonce-based CSP and browser security headers. Set public deployment configuration explicitly; building the production image alone is not launch approval.

`make image-security` fails on fixable high/critical image findings. Full reports remain in ignored `.cache/`; npm audit includes all installed development and production dependencies and fails at low severity. These checks do not prove that every possible vulnerability is absent.

## Identity development and deployment

Start `make -C backend dev-up` from the monorepo root, then `make dev` here. The local setup helper copies only the proxy secret into a private ignored frontend `.env`; independent deployments configure it themselves from `.env.example`. Vite reads that value only in its server proxy configuration. It is never exposed through a `VITE_` variable or a browser token store. Visit `http://127.0.0.1:5173/account` and read local verification emails in Mailpit on port 8025.

`make build start` runs the production SSR server on port 3000 (set HOST/PORT as needed). `API_ORIGIN` and `PROXY_SHARED_KEY` are server-only. Public deployment requires explicit `APP_ENV=production`, approved `ACCOUNT_TERMS_TEXT`, matching frontend/backend `TERMS_VERSION`, HTTPS at the gateway and exact `TRUST_PROXY_CIDRS`; the server checks terms-version alignment at startup. Never publicly launch with preview terms. See [identity operations](../docs/identity-design.md).

Browser tests require local TiDB and Mailpit and launch a disposable database through `scripts/browser-tests.py`. They test actual email delivery, API cookies/CSRF and SQL persistence, not mocked successful sign-in. They drop only the randomly named test schema on completion. Private fixture configuration is mode 0600 and deleted afterward. Browser traces use synthetic accounts and remain ignored. Unit route coverage remains enforced separately from component and browser behavior; its percentage is not a claim of whole-application coverage.

## Catalog editor

Administrators and owners can open `/admin/catalog` after both sign-in factors. The UI manages game drafts, reference catalogs, typed forms, conditions, package variants, preview/publication, availability and historical releases. See [catalog operations and limits](../docs/catalog.md). Numeric answers and monetary minor units remain exact strings. Public catalog artwork lives under `public/catalog-assets/`; private uploads and credential handoff use the existing dedicated, access-controlled flows. Published bounded intake attachments use the isolated scanned intake flow; generic unscanned uploads never enter an order.

## Customer and booster experience

R03 applies the storefront design to the catalog, live selection summary, order guidance, customer conversations, account tools and booster workspace. See [routes, behavior and verification](../docs/customer-experience.md). `make test-experience` runs the complete real-service browser suite; `make budget-experience` checks the incremental route assets. Both remain included in the required `pre-commit` gate.

UX01 adds the vector PLAYORA identity, shared task headers/reflow rules and reusable scroll/motion foundation. See [the foundation and storyboard](../docs/ux/UX01_FOUNDATION.md).

UX02 makes `/account` the current-work overview, with separate `/account/settings` (profile), `/account/security` and `/account/preferences` pages and a privacy destination. Desktop navigation and the mobile Overview/Orders/Messages/More menu retain role-appropriate access. Passwordless verification returns users to validated local tasks without replaying sensitive actions. See [account behavior and verification](../docs/ux/UX02_ACCOUNT.md).

UX03 unifies customer/staff/booster conversation history and the composer, with separate internal drafts, immutable retry payloads, reading anchors and compact attachment/staff controls. See [chat behavior, privacy and verification](../docs/ux/UX03_CHAT.md). UX04 introduces state-led order details, accepted totals, private unread indicators, quote comparison and preserved list/chat navigation. See [order workspace behavior and verification](../docs/ux/UX04_ORDERS.md). UX05–UX10 follow; R10/R11 remain held.

UX10 cross-browser qualification: `make test-cross-browser` runs the complete isolated fixture journeys in Chromium, Firefox and WebKit. Install all pinned browsers with `npx playwright install chromium firefox webkit` first. Firefox narrow viewport is not actual mobile browser emulation. Optional `PUBLIC_SITE_ORIGIN=https://your-final-host` enables homepage canonical/share metadata; no public domain is guessed when absent. Reusable artwork and editable overlays are in `../docs/brand/playora/social/`. R10/R11 remain held.

## Current accepted-design application

DI00–DI14 replace the historical UI described above. Public discovery treats configured games equally. Each game retains its artwork, identity and statistics through Boost, Accounts, Shop and News subflows. `/accounts/:id` resolves a public listing into its game-local detail; marketplace filters survive the return. `/how-it-works`, `/terms` and `/policies/:kind` use published configuration and actual policy versions.

Customer `/login`, admin `/admin/login` and booster `/booster/login` are separate passwordless experiences; customer sessions do not authorize staff. Admin/booster enrollment, challenge, recovery and recent verification stay in their own workspace. Orders and sale records retain ID/status, ordinary drafts and local sections. Admin shop delivery and article editors use saved revisions, explicit publication, conflict recovery and permission checks. Private views receive noindex and no-store; neither replaces backend authorization.

Set optional server-only `PUBLIC_SITE_ORIGIN` for canonical game/article URLs. No new transition-specific environment variable is required. Proxy request limits match bounded business schemas; secrets never belong in browser environment variables. [Journey qualification](../docs/redesign/JOURNEY_QUALIFICATION.md) maps accepted flows to real-service fixture scenarios and security regressions. Final aggregate checks and review are DI15; R10/R11 stay held.
