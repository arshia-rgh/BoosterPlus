# One-time owner test-gate waiver — 9 October 2026

The owner explicitly requested: “Despite of the result of the tests, please commit the cnages and start production this time (only this time), and later we will fix and hotfix if any test failed”.

This supersedes the complete-test prerequisite for the pending combined independent-panel/contextual-verification release only. It does not turn any failed, running or unexecuted check into a pass. Normal repository hooks, future release requirements, image/signature verification, migration preconditions, authentication protections and financial/deletion settings remain in force outside this exact exception.

## Source and evidence

The runtime source is the frozen round3 candidate, tree `855177c7e7a14f046c37c5a34d44b4097d15832e`, based on `23c70774594c488bc6fe1dfe166f06291d81bfb1`. The exception adds this record and the corresponding repository instruction only. A private one-use commit hook binds the complete staged tree, base commit and file hashes, records the owner instruction and runs repository checks without representing the omitted full suite as passed. It is invoked for that commit only; the tracked hook configuration remains unchanged.

Round2 failed a frontend focus assertion after backend/database/image checks passed. Round3 includes a test synchronization correction, passed the early 730-test release unit suite, and was in the isolated database suite when this instruction arrived. Original failure/source/logs remain preserved; round3 results will be recorded separately. Local broader unit testing included 740 tests because it also found the held, unshipped experiment. No production qualification pass is inferred from either count.

## Release boundaries

Commit and push the prepared source to main. Retain exact-commit build/CI observations, immutable image scans/SBOMs and operator signature. Bind private deployment preparation to the explicit waiver, never a fabricated normal-full receipt. Verify migration41 preconditions and owner/account/order/policy preservation before startup. The migration is forward-only; old schema40 application images cannot be used after it. Off-host backups remain absent. A test waiver does not resolve those separate recovery facts.

Preserve payment policy revision3 and its agreement, USDT/BSC checkout enabled, outgoing refunds/payouts disabled, deletion disabled and private webmail. No live financial or external-email test is authorized. Stop on an unsafe installation condition rather than claiming a test waiver proves deployment safety. Record actual activation and post-deployment observations only after they occur.

## Deployment completed

Signed release `fb31bb082ee673c12c25e5959cd1151631e74640` (tree `11bb6fb9590c51c30796cf35fe101e658a8e198b`) was committed and pushed to main. Exact GitHub CI `37900088007` and five-image release `37901897059` passed; image scans, SBOMs and operator signature were retained. These checks do not replace the owner-waived complete suite.

After successful production preflight, the owner explicitly replied “Do it its ok” to the exact release's forward-only account-separation migration, absent off-host backup and inability to roll back to schema40 application images. The private one-use decision was consumed during cutover. Schema41 migration and server verification completed on 9 October 2026 at 08:25 UTC. Current deployment manifest: `/srv/playora/releases/fb31bb0/deployment.env`. Stable mounted deployment source remains `/srv/playora/releases/99f60bd/source/production`, with the five reviewed gateway/compose/deployment-tool files patched to the signed target. Prior files and failed attempts remain retained for provenance, not a compatible schema40 rollback.

Before application startup, aggregate/fingerprint comparisons verified expected identity separation, historical ownership and attribution, financial/history records and preserved owner authenticator factors. Existing sessions were revoked by migration; users need to sign in again. Running-state checks verified the signed images, schema journal, customer/admin/pro HTTPS entry points, HTTP redirects, application health and private webmail login. Mail/storage/database services were preserved. Checkout remains enabled, outgoing payments and deletion remain disabled, and published payment policy revision3/agreement `e1957da6-a9dd-4e66-b78b-4cd2ed4df190` is unchanged.

The first private preflight failed because TiDB does not implement the requested MySQL read-only transaction syntax. No migration or application switch occurred on that attempt. The bounded inspection helper was corrected to use a supported repeatable-read transaction with fixed SELECT statements and unconditional rollback; no database read-only privilege is claimed and no no-op mode was enabled. Its focused tests and subsequent production inspection passed. Original failure and helper/source/binary bindings remain private.

Authenticated live sign-in/MFA, provider checkout/payment and physical-device acceptance remain owner-led. No external test email, invoice or funds movement was performed. Off-host recovery remains absent. The one-time commit/test and cutover exceptions are consumed; normal rules apply to subsequent application changes.

## Follow-up verification — 11 October 2026

A read-only server recheck confirms the same signed release/schema41 and healthy application/mail containers, with no subsequent deployment. The independent round3 full gate finished with a frontend mobile accessibility failure in `tests/e2e/layout.spec.ts:40`: the inline account-terms link relied on color and had 1.24:1 contrast against surrounding text, below the rule's 3:1 distinction threshold. This is an unresolved accessibility follow-up, not a passed or waived-away assertion. Later gate sections were not certified by this failed run. The original log and source remain in `/srv/playora-qualification/panels141-round3`.

Initial public browser verification attempts were preserved: one used the incorrect `/policies/privacy` path (the route is `/privacy`); another incorrectly rejected the intended same-host legacy background-image redirect on the admin host. The private runner was corrected to use the actual route and to verify only exact allowlisted artwork redirects and JPEG responses. Application code and deployed images were unchanged by these inspection-tool corrections.

The corrected anonymous browser run passed all 120 route/viewport checks (20 routes × three widths × Chromium/WebKit), including customer/admin/pro entry points, signed-out security/recovery/session routes, approved contact destinations, legacy redirects, portal boundaries and responsive overflow checks. This was not an authenticated or full accessibility suite. Private receipt SHA256: `9f2bbc6fbd04c659b57a4654d21a3c1c7b904a72de69675e54faa5d509017543`. Screenshots and original failed attempts are retained under `.cache/panels141-owner-waiver/release-preparation/`.
