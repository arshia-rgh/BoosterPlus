# Dedicated staff workspace (R02)

The frontend remains one independent project, with one pinned dependency graph and shared API schemas, identity components, forms and workflows. `app/routes.ts` owns the storefront/customer/booster route graph; `admin-app/routes.ts` owns every `/admin` route. Each has its own root, client manifest, SSR build and Docker image. Staff administration is extracted from the shared identity module into the admin graph. Shared order/chat components retain role-specific controls; browser code is never an authorization boundary.

The staff workspace uses grouped navigation, an accessible native mobile dialog, breadcrumbs, order search, actual operational counts, a dense order table, request/quote history, a conversation switcher and visually distinct internal notes. All existing catalog, coupons, intake, reviews, reports, calendars and background-task routes remain available. Further module editing and commercial finance interfaces are R09/R05 work. No example sales, revenue or prices are inserted into the real application.

## Local use

From the root, start `make -C backend dev-up`, then `make -C frontend dev`. The latter checks both ports before starting either process and prints:

- Storefront and account security: `http://127.0.0.1:5173`
- Staff workspace: `http://127.0.0.1:5173/admin`

Both applications share the public development origin and session cookie. The storefront Vite server routes `/admin` and its development assets to the separate admin Vite process on 5174. Ctrl+C or failure of either child stops both. An occupied port fails without terminating its owner. Restart an old frontend dev command to load this new launcher. Optional `DEV_STOREFRONT_PORT` and `DEV_ADMIN_PORT` must be distinct valid unprivileged ports; changing the public origin also requires corresponding backend identity/Google settings.

`make -C frontend dev-storefront` and `dev-admin` are individual debugging targets; only the combined launcher supplies the default shared-origin setup. Direct use of the admin debug port for authentication requires an explicitly matching backend `PUBLIC_ORIGIN`. `build-storefront`, `build-admin`, `start-storefront` and `start-admin` select individual production builds; default `build`, `start`, `typecheck`, `pre-commit` cover both. `test-admin` runs the complete real-service browser suite because staff actions span account, catalog, order, conversation and review flows.

## First owner and later staff

1. Create a customer account at `/account` using email or Google. Email codes arrive in local Mailpit at `http://127.0.0.1:8025` in development.
2. Enroll an authenticator in account security and save the single-use recovery codes privately. Copy the internal account ID displayed in the profile.
3. An authorized operator runs the following from `backend/`, substituting the verified user ID and an auditable operator reference:

   ```sh
   docker compose run --rm --entrypoint /app/boosterplus api identity bootstrap-owner --user <verified-user-id> --operator <operator-reference>
   ```

4. Bootstrap revokes existing sessions. Open `/admin`, sign in again and complete the authenticator check. Bootstrap cannot grant a second owner.
5. Owners grant subsequent roles from Administration. Sensitive account/role/recovery actions require recent verification of both factors in `/account`. Use the Profile and security link to return there; the Administration link returns to the staff app.

The authenticated session and live capability check gate every child workflow. Pending MFA, customer/booster roles, expired sessions and failed session refreshes conceal staff content. Every API operation independently rechecks authority. Staff sign-in remains passwordless plus mandatory MFA. See [identity operations](identity-design.md) for recovery and production setup.

## Production application artifacts

`make -C frontend docker-build` produces `boosterplus-frontend:local` (Docker target `storefront`) and `boosterplus-admin:local` (target `admin`). Each contains only its corresponding `build/storefront` or `build/admin` directory, runs as `node`, supports a read-only filesystem, and has its own SSR healthcheck. Both use the existing trusted API proxy, request nonce CSP, private page caching, body limits and bounded shutdown. Only fingerprinted assets receive immutable public caching.

Route `/admin`, `/admin/*` and React Router’s root data endpoint `/admin.data` to the admin service; route other application paths to storefront. Admin assets use `/admin/assets/*`, public assets `/assets/*`. Paths and queries must be preserved by the gateway. Cross-application account/storefront links use document navigation so a router never takes over the other graph. Each standalone server returns 404 outside its own graph. The combined local SSR server reproduces that dispatch for browser tests. Admin pages include `noindex, nofollow`; this is indexing guidance, not access control.

Root `production/` remains deployment-only and is unchanged by R02. R04 supplies the actual production gateway/Compose/configuration stack. Image builds alone do not establish production readiness or provider qualification.

## Verification

Run the mandatory root `make pre-commit` before each commit. It includes both project gates, SSR/proxy tests, isolated build routing and asset checks, real TiDB/SMTP desktop and mobile browser journeys, axe, unit tests, scans and both image smoke checks. The dual launcher tests cover routing, missing pages, separate dev assets, occupied ports and child shutdown. Browser tests cover staff entry/MFA, drawer Escape/navigation, cross-application sign-in persistence, search, catalog publication, order/quote transitions, private/internal chat, reconnects, account review and existing security scenarios. Tests use synthetic identities and isolated databases; screenshots/traces stay ignored. See [progress](progress.md) for actual results and remaining limits.
