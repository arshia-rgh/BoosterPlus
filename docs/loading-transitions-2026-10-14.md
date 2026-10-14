# PLAYORA loading transitions release

14 October 2026. Owner requested replacing visible sign-in/access checking messages with a polished loading presentation and deploying it before supplier integration work. Application base: signed `0c39963` at schema 42; repository base: `c927d4a`.

## Change

A shared PLAYORA symbol/orbit and soft three-part pulse replace access-checking text in all three identity entry/workspace contexts and relevant order, shop, account purchase, upload, editor and staff assignment refreshes. Compact variants stay within their forms. The status remains available to assistive technology; system reduced motion stops all loader animation. Actual connection failures and retry controls remain visible. Session checks, namespace isolation and MFA stay unchanged.

Account purchase now withholds sign-in/reservation controls while its session is pending or failed, instead of briefly presenting an incorrect signed-out action.

## Qualification

- Focused loading/identity/purchase/booster component cases: 29 passed.
- Strict frontend type checking: passed.
- Scoped Chromium and WebKit: four cases each passed; customer/admin/booster pending, no protected content, failure/retry/sign-out, narrow layout, reduced motion and axe; compact purchase surface.
- Independent senior design review: passed; see `redesign/reviews/LOADING151_2026-10-14.md`.
- Normal focused commit hook, exact CI, image scans/signature, server preflight and deployment verification: pending at preparation.
- Complete suite: not requested, not run.

## Deployment boundaries

Frontend presentation only. Preserve schema 42, manual payout recording, checkout enabled, automatic outgoing payments/deletion disabled, published policy revisions, latest owner catalog edits and stable 99f60bd runtime configuration/private webmail. No policy publication, provider purchase, live invoice, transfer or external email is part of this update.

Off-host backups remain absent. Earlier approvals were exact-release decisions and are consumed. Prepare the signed candidate and server preflight before obtaining the required concrete recovery decision. The current signed schema-42 application must remain available for compatible UI rollback.

## Supplier work

The owner's FazerCards, Nexus and Vendoria request is research for a future shop integration. No supplier purchasing or funding is activated by this UI release. Existing PLAYORA-authored/manual products must remain supported. A blanket instant-delivery claim must not be applied to supplier or manual products without a matching delivery promise; preserve product-specific estimates and confirmed-payment prerequisites.
