# Booster Plus frontend

Independent React/TypeScript project in the Booster Plus monorepo. The current deliverable is the tested prelaunch shell and quality tooling. It has home, game catalog, and safe not-found/error screens. It deliberately offers no checkout or login before those features exist.

## Commands

```sh
make install
npx playwright install chromium
make dev
make pre-commit
```

Install development dependencies explicitly (`npm ci --include=dev`), including when the host has a production Node environment. Use the committed npm lockfile. Node 24.21.0 is the target LTS runtime; the compatibility shell has also been checked with the host Node 26.0.0.

`make pre-commit` runs Prettier, React Router type generation and strict TypeScript, ESLint with React hooks/security/accessibility rules, component tests and route coverage, a dependency audit including development packages, the production SSR build, and desktop/mobile Playwright tests with axe accessibility checks. Browser tests start an isolated production server and fail if the port is already occupied.

The installed JSX accessibility linter currently requires ESLint 9, so ESLint 9.39.5 is pinned despite its upstream deprecation notice. Track migration to ESLint 10 when a compatible accessibility plugin is available; do not bypass peer dependency checks. Dependency audits remain mandatory. TypeScript 6 is pinned within the supported typescript-eslint range.

Public pages are rendered on the server through React Router. Go owns future pricing, auth, database, and financial decisions. Docker packaging and API contract integration follow in P01. Subsequent phases replace prelaunch content with actual published offerings.
