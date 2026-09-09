# P02 identity implementation

Status: implemented; final phase delivery is tracked in progress.md. This document records the security boundaries and testing scope for the phase.

- Email uses six-digit, purpose-bound codes (10-minute expiry, five attempts, 60-second resend cooldown), HMAC digests, browser binding, atomic consumption and shared TiDB issuance/verification limits. Delivery payloads are encrypted separately; durable jobs contain only message references.
- Google uses the authorization-code flow, PKCE, state, nonce and verified OIDC tokens. Provider subjects identify users. Matching email strings never silently link a new Google identity to an existing account. Linking requires an existing recent authenticated session.
- Sessions use opaque random HttpOnly cookies, stored token digests, a 30-minute idle timeout and bounded absolute expiry. Authentication and privilege changes rotate/revoke sessions. All mutations require an allowed Origin and a session/browser-bound CSRF token.
- Go is the authentication authority. React and `/api` share one public origin through a small frontend proxy; the projects remain separately buildable. Proxy targets come only from trusted server configuration, and client-supplied forwarding headers cannot influence authentication or client-IP limits.
- Customer, booster, administrator and owner capabilities are explicit. Self-service endpoints derive ownership from the authenticated session. Staff role/suspension/recovery mutations and audits are protected on the API, independent of UI visibility.
- Decision D11 (9 September 2026): the owner requires an authenticator code at every staff sign-in. Staff capabilities remain blocked after Google/email verification until the second factor succeeds. Sensitive operations additionally require recent verification. Staff cannot disable MFA while privileged. Recovery codes supplement the second factor and never replace Google/email sign-in. Replacing codes rotates the current session, revokes other sessions and fences concurrent use of older codes.
- Email changes require recent authentication and proof of the new destination. Recovery requests prove the destination first, then require audited owner review of independent ownership evidence. Approval revokes sessions and disconnects Google identities while preserving an enrolled second factor.
- First-owner bootstrap is an audited CLI operation targeting an already verified, authenticator-enrolled user; it cannot create a second owner after bootstrap. Later role grants require an authorized owner. Public clients cannot choose a role.
- Local development uses Mailpit and preview account terms. Production requires configured Google OAuth credentials, verified email delivery, approved terms, HTTPS and secrets supplied outside the repository. Missing deployment inputs do not become production bypasses.

Verification covers code expiry/replay/brute force/concurrency, shared throttling, Google signature/issuer/audience/nonce/state/PKCE validation, account-linking conflicts, CSRF and session fixation, role/ownership boundaries, suspension, owner invariants, email recovery, MFA replay/recovery codes, encrypted job payloads, browser flows and both full project gates.

Protocol references: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## TiDB transaction semantics

Identity transactions explicitly use READ COMMITTED, and every pooled connection sets `tidb_txn_mode` to pessimistic. Role, suspension, bootstrap and recovery decisions first update the single `auth_controls` row, then read current authorization state. Missing control state fails closed. This is necessary because waiting for a lock under TiDB snapshot isolation does not refresh later snapshot reads. A regression test reproduces two simultaneous self-demotions and requires exactly one success, leaving one active owner. Known deadlock/write-conflict errors are retried only after rollback, with a bounded retry count. See [TiDB transaction isolation](https://docs.pingcap.com/tidb/v7.5/transaction-isolation-levels/).

MySQL-protocol connections count matched rows so idempotent profile saves and same-tick session updates are not mistaken for missing/revoked records. Authentication still checks expiration, suspension, token hashes and the user's authorization version.

## Running locally

1. Run `make -C backend dev-up` to build all binaries and apply explicit SQL migration 4 through the CLI container. Existing data and local secrets are preserved.
2. Run `make -C frontend dev`. Its setup helper creates an ignored, mode-0600 `.env` with the matching proxy secret. The frontend is at `http://127.0.0.1:5173`; Mailpit is at `http://127.0.0.1:8025`. Use synthetic test mailboxes locally.
3. Sign up with an email code, then enroll an authenticator in account security. Save the single-use recovery codes privately.
4. Copy the account's internal ID from the profile. From `backend/`, run `docker compose run --rm --entrypoint /app/boosterplus api identity bootstrap-owner --user <verified-user-id> --operator <operator-reference>`. This explicitly grants the first owner and revokes existing sessions. Sign in again and complete MFA. It cannot grant a second bootstrap owner.
5. Owners can grant later staff roles in Administration. All staff sign-ins remain blocked at the API until MFA succeeds. Customers can optionally enroll the same protection.

## Deployment inputs and recovery

- Set backend `APP_ENV=production` (or staging), verified database TLS, a unique `AUTH_KEY`, a separate `PROXY_SHARED_KEY`, an HTTPS `PUBLIC_ORIGIN`, approved `TERMS_VERSION`, and a TLS SMTP configuration. Configure Google client ID/secret together and register the exact `PUBLIC_ORIGIN/api/v1/auth/google/callback` redirect URI. Google may remain unavailable while email is configured; live Google credentials have not been supplied/tested here.
- Set frontend `APP_ENV` explicitly, server-only `API_ORIGIN` and matching `PROXY_SHARED_KEY`, `TERMS_VERSION` and operator-approved `ACCOUNT_TERMS_TEXT` including privacy information. The server rejects public-mode startup without these inputs and checks the backend's terms version. Neither browser bundles nor `VITE_` variables may contain a proxy/provider secret.
- Terminate TLS at a trusted gateway. Configure `TRUST_PROXY_CIDRS` to its exact addresses, restrict direct backend access, and align `PUBLIC_ORIGIN` with the actual frontend origin. The frontend discards incoming proxy headers before forwarding an authenticated client address; the backend ignores untrusted forwarded addresses. Production cookies use `__Host-`, Secure, HttpOnly, Path=/ and SameSite=Lax. Responses use no-store; SSR uses per-response nonces without unsafe-inline scripts.
- Keep encrypted backups of the auth master key separate from database backups, and restrict database/SMTP/provider access. Losing the key makes encrypted authenticator secrets and pending messages unreadable. Rotating it requires an offline, reviewed re-encryption/session-revocation procedure; no automatic key-rotation command is claimed by this phase. Keep two independently enrolled owners before launch so one owner can review another account's recovery without self-approval.
- Recovery proves a new destination first. Owner approval requires independent ownership evidence and a restricted support case reference; approval revokes sessions and Google links, retaining MFA and suspension. Losing the authenticator and every recovery code has no web/API bypass. Security contacts, support evidence policy and production mail deliverability must be finalized before launch.
- Worker cleanup removes expired codes, message payloads, OAuth flows, limiter rows and sessions in bounded batches. Delivered message payloads are cleared immediately. Audits and recovery decisions are retained for operational review; the release data-retention policy is finalized in P12.

## Test boundaries

`make -C backend pre-commit` includes standalone gosec and race-enabled real TiDB tests. `make -C frontend pre-commit` starts a fresh random TiDB schema through SQL migrations and real SMTP delivery to Mailpit, then exercises the production SSR proxy in desktop/mobile browsers. A Go test-only harness seeds synthetic staff identities; no test endpoint or authentication bypass is compiled into production binaries. The harness and its cleanup are required, never silently skipped.

Google's adapter is tested against a local issuer with real signed JWTs/JWKS: signature, issuer, audience, authorized party, verified email, subject, nonce, expiration, PKCE and token exchange. Live Google consent and real SMTP delivery outside Mailpit remain deployment checks because production credentials are absent. P02 does not implement orders, payment processing, order-level assignments, chat or game credentials; their permissions are added with those phases.
