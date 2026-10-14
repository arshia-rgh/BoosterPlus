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
- Normal focused commit hook: passed, including 189 frontend test files / 859 component tests, formatting/types/lint/contracts, dependency/secret checks, three builds, budgets and 14 frontend server cases.
- Exact CI `38541554923`: passed, including the lightweight backend security/static/race/build and deployment-configuration checks. No real-database/full-suite repeat.
- Image release `38543376954`, immutable scans and local signature verification: passed for `84b10e33fc2980418cbf92304cb18302df356336`.
- Server preflight and runtime verification: passed. Eight application/mail services are healthy; schema 42, finance settings, public legal/disabled-retention responses, stable runtime files and private webmail are preserved.
- Six post-deployment Chromium/WebKit cases passed across the actual customer/admin/pro hosts at 390/1280 px: loading presentation, no premature sign-in controls, no overflow, OS reduced motion and connection failure/retry presentation. These use synthetic session responses, not real account sign-ins or financial/email actions.
- Complete suite: not requested, not run.

## Deployment boundaries

Frontend presentation only. Preserve schema 42, manual payout recording, checkout enabled, automatic outgoing payments/deletion disabled, published policy revisions, latest owner catalog edits and stable 99f60bd runtime configuration/private webmail. No policy publication, provider purchase, live invoice, transfer or external email is part of this update.

Signed `84b10e33fc2980418cbf92304cb18302df356336` is deployed and verified at schema 42. The owner explicitly approved “Deploy 84b10e3 UI update without an off-host backup” after successful qualification/preflight. This exact-release recovery exception is consumed; off-host backups remain absent and recovery from server/data loss is not qualified. Prior signed `0c39963` and its schema-42 deployment manifest are retained for compatible application rollback.

Current manifest: `/srv/playora/releases/84b10e3/deployment.env`. Private receipts: `/srv/playora-qualification/loading151/preflight`, local `.cache/loading151`. Temporary registry credentials were removed. The source is on `main`; delivery-record documentation is separate from the signed runtime commit. No supplier account, purchase/funding, live invoice, transfer or external message was created.

## Supplier work

The owner's FazerCards, Nexus and Vendoria request is research for a future shop integration. No supplier purchasing or funding is activated by this UI release. Existing PLAYORA-authored/manual products must remain supported. A blanket instant-delivery claim must not be applied to supplier or manual products without a matching delivery promise; preserve product-specific estimates and confirmed-payment prerequisites.
