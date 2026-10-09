# Staff portal domain cutover

The staff portal change keeps the customer website on `playoragames.com` and moves admin pages to `https://admin.playoragames.com` and booster pages to `https://pro.playoragames.com`. The semantic configuration names remain `ADMIN_PUBLIC_ORIGIN` and `BOOSTER_PUBLIC_ORIGIN` regardless of the chosen DNS label. Do not infer that preparing these files has deployed the change.

## Current release: independent accounts and schema41

The 8 October independent-panel release supersedes the earlier host-only cutover
assumptions below. Follow [the current release record](../docs/independent-panels-checkout-2026-10-08.md)
and its exact qualified deployment handoff. Preparing these files is not a
passed gate or permission to deploy.

1. Require the exact complete qualified source, signed schema41 release and a
   current read-only preflight against the deployed schema40 baseline.
2. Retain protected runtime/configuration bytes and verify migration preconditions,
   the published payment policy and financial/deletion settings. Configuration
   copies are not a database backup or a qualified recovery point.
3. Obtain the concrete release decision acknowledging the forward-only schema 40 to 41
   transition and, if still absent, explicitly deferred off-host recovery. Earlier
   exact-release backup exceptions are consumed.
4. Stop application readers/writers, capture fresh aggregate evidence, then run
   the normal SQL migration once. Verify schema/history and strict ownership,
   authenticator and policy preservation before starting candidate services.
5. Keep application services stopped after uncertain migration or verification
   failure. Schema40 images cannot run against schema41; recovery requires a
   qualified forward fix or a separately verified complete data restore.
6. Require three-host HTTPS checks before starting the worker, then check current
   invariants against the retained pre-start proof and complete owner acceptance.

All old sessions and unfinished sign-in flows are revoked at this transition.
Everyone signs in again. Existing staff authenticators stay with their original
staff accounts; a newly separated booster account enrolls its own authenticator.
The exact starter payment agreement, enabled checkout, disabled outgoing
transfers/deletion and private mail/webmail configuration remain unchanged.

## Configuration contract

| Purpose | Deployment manifest | Backend and frontend runtime |
| --- | --- | --- |
| Customer | `SITE_ADDRESS` | `PUBLIC_ORIGIN=https://<customer host>` |
| Admin | `ADMIN_SITE_ADDRESS` | `ADMIN_PUBLIC_ORIGIN=https://<admin host>` |
| Booster | `BOOSTER_SITE_ADDRESS` | `BOOSTER_PUBLIC_ORIGIN=https://<booster host>` |

All three hostnames must be distinct, valid public DNS names, separate from the mail hostname. Manifest names contain no scheme, path or port. Production runtime origins are exact HTTPS origins with no trailing slash. Missing, mixed, duplicate or mismatched values fail deployment validation. Production does not fall back to the legacy single-host development configuration.

The customer and booster route graphs share the existing storefront Node process and resource budget; admin retains its separate process. Caddy selects exact host blocks and preserves the originating hostname. The frontend overwrites the private proxy-origin header, while the backend requires the requested portal and configured origin to agree before authentication or mutations. Cookies stay host-only and staff still complete their authenticator check at every sign-in. No wildcard CORS or shared `.playoragames.com` cookie is introduced.

## Before the release

1. Add the two DNS-only A records described in [DOMAIN_SETUP.md](DOMAIN_SETUP.md). Verify public resolution points to the intended server and remove unintended AAAA records only if explicitly authorized.
2. Register the exact new staff callback origins in the existing Google OAuth web client using [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md). Keep the customer callback unchanged. Keep old staff callbacks during preparation, then remove them after cutover verification. Never send an old callback's code/state to the new hostname.
3. Prepare protected backend/frontend runtime files and the deployment manifest with matching origins. Preserve credentials, approved terms, checkout/outgoing/deletion flags and mail/webmail settings. Preserve the installed schema during preparation until the explicit qualified migration in the current combined release sequence above.
4. Retain the current signed release, its exact runtime files, mounted gateway source and deployment receipt before changing them. The stable mounted source contains the accepted webmail patch; merge only reviewed gateway changes into it. For a historical host-only update with no schema change, rollback requires matching prior application images **and** prior host/origin/gateway configuration. That procedure does not permit schema40-image rollback after migration41 starts; use the current forward-only sequence above.
5. Complete normal server qualification, exact CI/image/signature verification and read-only release preflight. Backups and release approval follow the normal repository rules; this domain request does not itself record a new backup exception or authorize messages/funds.

## Expected navigation

The admin/booster dashboard is `/` on its own origin, login is `/login`, and nested pages remain relative to that staff root. Same-origin `/api/v1/...` paths retain their existing backend route names. Staff assets may retain technical `/admin/assets/` or `/booster/assets/` paths; these are not panel entry URLs.

Legacy customer-host staff page links use GET/HEAD-only, no-store302 redirects. Only validated navigation parameters survive; auth codes, tokens and arbitrary return URLs do not. POST/PUT/PATCH/DELETE requests receive405 without a cross-origin `Location`; old SPA data requests receive409 so stale clients reload rather than fetch protected data across hosts. The historical host-only move required staff to sign in again while leaving customer sessions in place. The current independent-account migration instead revokes all old sessions, including customer sessions; every account signs in again in its own panel.

## Qualification and cutover

The disposable staging recipe generates trusted test certificates for all three locally resolved portal names and checks matching/wrong portal requests, host-only cookies, secure transport, customer-to-staff authorization, forged internal/forwarded headers, SNI/Host mismatch, safe legacy redirects and unsafe-method/data rejection. The normal frontend browser suite covers page navigation, route-local actions and sign-in flows; fixture success does not qualify a real Google callback.

After deployment verify DNS/TLS, all three roots and login pages, deep links, assets, legacy bookmarks, no-store/CSP/HSTS and private API boundaries. The owner then checks Google and email sign-in, staff MFA, logout and representative authenticated admin/booster actions. Do not send extra email or initiate payments merely to complete a smoke test. Record any owner-led/physical-device limitations honestly.

Reference: [Caddy strict SNI/Host policy](https://caddyserver.com/docs/caddyfile/options#strict_sni_host), [automatic HTTPS](https://caddyserver.com/docs/automatic-https), and [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
