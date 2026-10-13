# PLAYORA cookies and browser storage

**Draft for owner review — 13 October 2026. Not published or effective.**

## What the site stores

PLAYORA uses first-party cookies and browser storage to keep sign-in secure, return you to the requested page and preserve permitted non-secret selections during a short sign-in flow. Customer, admin and booster portals have separate sign-in contexts. These functions do not allow staff to inspect unrelated browsing activity.

| Item | Purpose | Duration |
| --- | --- | --- |
| `__Host-bp-customer-session`, `__Host-bp-admin-session`, `__Host-bp-booster-session` | Sign in to the corresponding portal | Cookie lifetime up to seven days; server-side inactivity expiry is 30 minutes and sessions may be revoked earlier |
| Corresponding `__Host-bp-…-browser` cookies | Bind a session or sign-in/security attempt to its browser | Up to 30 days from creation |
| `playora.google-return.customer`, `.admin`, `.booster` in session storage | Return to the intended page after Google sign-in | Consumed on return; ignored after ten minutes; remaining storage follows browser-session cleanup |
| `playora.configuration` in session storage | Restore allowed non-secret estimate selections after sign-in | Ignored after 15 minutes; removed by flow or browser-session cleanup, not a timed background deletion |

Permitted saved configuration excludes credentials, free-text answers and uploads. A stale storage entry is not an active order, payment or permission to process a secret.

The website follows the operating system's reduced-motion setting automatically. The historical `boosterplus.motion` preference is no longer used by the current motion controller. An old browser may still retain that unused local entry until site storage is cleared; it is not a currently required tracking or preference function.

## Third-party services

Choosing Google sign-in, opening NOWPayments checkout, or following Discord, Instagram or WhatsApp links can involve those providers' storage and policies. We do not describe their cookies as PLAYORA's first-party session cookies. The private staff webmail application is a separate interface with its own authenticated session.

The reviewed customer application has no identified advertising or behavioral-analytics integration. If we introduce optional tracking that requires permission, it will not be activated merely because you accepted general service terms. We will explain it and provide the required choice.

## Your controls

Your browser can block or delete site cookies and storage. Doing so may sign you out, prevent browser-binding checks or remove saved selections. Google or hosted checkout may not work if required storage is blocked. You can still email support@playoragames.com for help.

Sign out when using a shared device and use the portal's security controls to review or revoke sessions. Clearing one browser does not necessarily revoke a session on another device. For privacy questions, use the contact and rights process in the Privacy notice.
