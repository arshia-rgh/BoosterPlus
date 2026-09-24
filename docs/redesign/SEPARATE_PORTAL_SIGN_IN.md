# Separate customer, admin and booster sign-in

Owner request · 24 September 2026 · Design only; application implementation remains paused.

## Entry surfaces

| Audience | Design entry | Proposed application URL | Successful destination |
| --- | --- | --- | --- |
| Customer/seller | I01 | `/login` | Original customer task or My account |
| Admin | I09 | `/admin/login` | Original authorized admin task or Operations overview |
| Booster | I10 | `/booster/login` | Original authorized assignment or booster overview |

These are three distinct sign-in experiences, not one customer form with a role selector. Admin and booster entries have their own page title, portal badge, work-email label and eligibility explanation. Public navigation still opens customer sign-in only. Staff receive their dedicated portal URL through their established onboarding channel. The atlas screen/journey selector exposes each entry for design review; it is not product navigation.

Shared fonts, green artwork and input components keep the brand coherent. Staff authentication pages omit customer My account, customer activity panel and customer support-inbox navigation. Leaving a portal returns to the public website; starting over stays in that portal.

## Full flow

1. Open the correct portal; a session in another portal does not sign the person into this one. Staff cannot sign up publicly or select a role to grant themselves access.
2. Choose Google or email. Google cancellation/error returns to the same portal. Email uses a single accessible code field with paste/autofill, explicit recovery and server-controlled expiry/rate limits in the eventual implementation.
3. Customer verification returns only to customer/public tasks. Staff first-factor verification checks the role assigned for that specific portal, then opens that portal’s authenticator step. Wrong-role, suspended or removed access does not create a session or disclose account membership.
4. Every staff sign-in requires a second factor. Missing enrollment opens setup after first-factor verification; recovery codes appear only after setup verification and require safe storage. An unused recovery code substitutes only for the authenticator step. No remaining codes leads to reviewed administrator recovery; it never bypasses verification.
5. After both staff factors, revalidate the role and destination. Restore the original permitted record/editor, preserving safe draft context. Do not auto-confirm the sensitive action that prompted reauthentication.
6. Expired verification restarts at the same portal entry. Cancellation never opens the intended protected record. Logging out or expiring one portal must not silently enter a different portal.

## Session and return contract for later implementation

Keep customer, booster and admin challenge/callback/session audiences separate even if the same identity provider and account directory are reused internally. Customer sessions cannot satisfy staff authentication; admin sessions cannot silently substitute for booster sessions or vice versa. Multi-role people authenticate separately for each workspace. Portal assignment is server-authorized, never client-selected authorization.

Validate first-factor transactions, Google state/nonce, second-factor challenges, session audiences and safe same-portal return targets on the server. A URL parameter alone cannot grant access. Direct protected-page entry, refresh, revoked roles, stale forms, concurrent tabs and cross-portal redirects must fail safely. Preserve only nonsensitive drafts across verification; never retain auth codes, credentials or private delivery data. No passwords are introduced.

These are design requirements, not claims about the existing runtime’s session boundaries. Implement and test the boundaries only when application work is separately authorized.

## Clickable atlas paths

- Admin: `#I09` → `#I02/admin/return/A01` → `#I03/admin/return/A01` → `#A01`.
- Booster: `#I10` → `#I02/booster/return/B01` → `#I03/booster/return/B01` → `#B01`.
- Customer: `#I01` → `#I02/customer/return/P01` → `#C01`.
- Same-portal MFA recovery/setup use `I05/<portal>/return/<encoded task>` and `I04/<portal>/return/<encoded task>`.
- Existing bare I03/I04/I05 entries show a portal selection/recovery explanation; they do not default to admin or reuse customer identity.
- F09 is the admin journey; F31 is the booster journey. Their atlas shortcuts retain role context. The named states cover invalid inputs, cancellation, provider failure, throttling, access unavailable, expiry and other-portal sessions.

The prototype accepts fictional values and demonstrates transitions only. It does not authenticate, issue cookies, contact Google, send codes or implement real authorization. Tests of fixture navigation do not qualify session isolation in production.

## Error and waiting behavior

Invalid email, wrong authenticator/email code and recoverable request errors retain the current step and field. Retry stays in the same portal; it does not unnecessarily repeat a completed first factor. Loading and throttling keep the layout but disable both button and Google-link progression; leave/start-over remain available. Do not invent a cooldown when the service has not provided one. Expired/used email codes require a new challenge. Only terminal session expiry or unavailable access requires restarting the portal. The atlas has explicit reviewer-only default resets; they are not production retry permissions.
