# Live estimates and shared service layout

This is the separate UI deployment requested after the commission/policy release. Base: `b0d7a9908f89ea782555438f0000f83c913cc3f5`. Signed release `d4e19ba4dfb663454c19c729382180af2eec70b7` is deployed and verified at schema 41 on 14 October 2026.

## Changes

- Admin custom-order Overview and Quote show the customer's original saved estimate, including its provisional breakdown or manual-review state. An accepted final quote stays distinct; later catalog changes do not recalculate the original amount.
- Custom preferences update the estimate beside “Build your next climb.” after a 500 ms debounce. Changed or incomplete selections immediately invalidate the old amount; stale responses, failed requests and expired estimates cannot revive it. Continue still performs fresh authoritative validation and estimation.
- Mobile uses a compact stable summary with accessible “Price & selections” details. The dialog traps keyboard focus, closes with Escape, returns focus and locks background scrolling. Short viewports avoid a sticky overlay. Price updates do not scroll or focus fields.
- Shared game, service and FAQ sections use consistent responsive inner gutters. Checkout's continuation is labeled “Go to payment”; provider, route and safe URL validation remain intact.

No backend, migration, dependency, provider or financial policy change is included. Independent accounts/MFA, historical agreements, disabled outgoing transfers/deletion and private webmail remain unchanged.

## Focused evidence

The final prepared implementation passed 61 component tests across seven changed-flow files, including response races, expiry, retry, incomplete answers, original-versus-accepted admin prices and checkout continuation. Scoped TypeScript and lint checks passed. Five isolated browser cases passed in Chromium and WebKit: 320/390/768/1280px price states, stable dimensions and scroll, dialog keyboard/focus/accessibility, and shared accounts/shop/package inner-gutter alignment. A corrected synthetic shop-capability assignment was typechecked and the affected shared-layout case passed again in both engines. Earlier failed browser attempts are retained, not relabeled passed.

The independent senior designer completed the required review/fix rounds and reported no remaining actionable findings for the nine changed runtime files. Round 1 included direct local browser interactions; round 2 inspected exact-source screenshots and browser results because the reviewer's browser surface was unavailable. The final actual runtime hashes are in `.cache/service149/review/round 2-final.json`; all fixtures use synthetic data and never create real orders, payments or messages.

Normal focused commit checks, lightweight exact-commit CI, signed image scans and deployment/runtime verification passed as recorded below. The complete database/browser suite is not run under the owner's current instruction. Real mobile keyboards, production authenticated workflows and real payment acceptance are not established by these isolated checks.

## Focused commit result

Implementation `048d1b7f3f56f6280d731411489beda6cffa4094` passed the normal focused tracked hook in a clean local main checkout, excluding unrelated held prototypes. Repository/secret checks, formatting, contracts, all three portal type generation, lint, 186 component-test files / 838 tests, dependency audit, three production builds/budgets and 14 server tests passed. No full database or aggregate browser run was started. Hook log SHA256: `4013d02760086bf30cca67756fe08df4b2b3c70ab0f08347a90aceaf9f72329b`; exact 26-file manifest SHA256: `1e6e495782346129daeaf3eb217c15baa387a801ea03fcd59c888ddb2b1868d6`. The subsequent publication receipt is documentation-only and uses the normal repository gate. Signed release and activation completed as recorded below.

## Production delivery (14 October 2026)

The owner explicitly approved “Deploy d4e19ba UI update without an off-host backup.” That one-release exception is consumed; off-host recovery remains absent and is not claimed qualified. Prior signed schema 41 release `b0d7a99` remains available for application rollback. Backend, migrations, dependencies and deployment configuration are unchanged.

Exact lightweight CI 38476331133 and five-image release 38478003581 passed, including image scans and signature verification. Signed manifest SHA256: `88cddc54977b8abbfc3a10530a878baf5f049c4ec0099b5479c308effdfe1d8f`. The initial successful preflight expired while awaiting approval; a fresh read-only validation preserved its original receipt and rechecked source, signatures, configuration, schema and migration checksums. Refreshed preflight receipt SHA256: `9106b6dcd894b63d8d11389066f77dcafb67dbd747b99e143a4815a2ceb4bc34`.

The serialized release completed and its runtime verification passed at 05:20 UTC. Current manifest: `/srv/playora/releases/d4e19ba/deployment.env`. API, worker, both frontend images, gateway, scanner, mail and private webmail are healthy. All three public hosts passed HTTPS/redirect checks. Schema 41, protected configuration hashes, checkout enabled/outgoing disabled, independent identities/MFA and stable 99f60bd mounted files are preserved.

A live read-only browser check used the public MLBB custom form: Epic V (0 stars) to Legend V (0 stars), Singapore and 48–120 hours automatically displayed USD 17.50, then USD 22.75 after selecting play together. No Continue/order submission, invoice or funds action occurred. At 390×844, the compact summary and details dialog displayed the updated amount; Escape closed the dialog, focus returned to its trigger and document width remained 390 px. The temporary viewport override was reset. The public legal and disabled-retention payloads still exactly match the previously published revision 2 responses. MLBB draft 250 was not edited or published.

Private deployment, runtime, policy-preservation and live-UI evidence are retained in `.cache/service149/preflight/` and `/srv/playora-qualification/service149/preflight/`. This verifies the deployed public estimate and runtime health; authenticated live admin/order/payment journeys, real funds acceptance, physical mobile keyboards and off-host recovery remain outside this check. No full-suite rerun or external message test was performed.
