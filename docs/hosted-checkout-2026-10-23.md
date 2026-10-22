# HOSTED177 — USD hosted checkout

Status: signed `d768cbd` deployed and verified on 23 October 2026, unchanged schema50. The owner-approved hosted payment policy is published.

The owner explicitly replaced the unreleased MINIMUM176 coin-selection/minimum-cache work with NOWPayments hosted checkout. Create one invoice using the accepted USD amount, omit pay_currency, and let the customer choose a coin/network on the hosted page. PLAYORA does not promise that provider minimums disappear or every coin can pay every order.

Keep required consent, fee/rate terms, PLAYORA reservation window, uncertain-create recovery, signature verification and authenticated status re-reads. Never treat a browser return as payment. Coin/network receipt evidence remains available for history/refunds; staff payout choices remain separate from incoming checkout. Existing accepted agreements and legacy pinned/native attempts remain immutable.

Use an explicit provider-selection marker in immutable attempt route JSON at existing schema50. Missing/corrupt legacy route data is never interpreted as hosted selection. Bind exact invoice, attempt, USD amount and complete verified asset/network evidence before settlement. Different payment IDs for one invoice must not retire the entire order merely because an abandoned zero-funds choice expired. Allocate each contract once; preserve partial, duplicate, reversed and late funds for review.

## Qualification and release

Server-only focused tests; no full gate, real invoice, payment, message or publication test. Independent senior reviews: `redesign/reviews/HOSTED177_ENGINEERING.md` and `redesign/reviews/HOSTED177_DESIGN.md`. Normal focused hook, exact CI, scanned/signed images and server preflight precede fresh exact recovery consent. No off-host backup exists; old binaries do not understand new hosted markers, so a forward fix may be required even without a SQL migration.

Superseded MINIMUM176 hook3 passed at0435b7f; its bundle/logs and owned-source archive are retained privately under `.cache/minimum176/` and `.cache/hosted177/`. They do not qualify HOSTED177. Preserve all original failures and other-person prototype/cameo/account-ownership notes.

## Policy and activation sequence

Before activation, published policy `e1957da6-a9dd-4e66-b78b-4cd2ed4df190` explicitly restricted incoming payments to USDTBSC. Private revision4 changed only its title and first two payment paragraphs: USD hosted coin/network choice, provider conversion/minimums, and a precise PLAYORA reservation window distinct from provider quote validity. Fee mode merchant, fixed rate, 30-minute window, outgoing USDTBSC route, all remedies/refund/compensation wording and 365-day /30-day /3-appeal settings remain unchanged. Existing accepted copies remain immutable.

After a signed candidate, preflight and fresh exact owner recovery approval, publish this compatible wording through the normal owner session/MFA **before** activating hosted-selection code; verify and bind the published revision/hash in the activation evidence. The previous application may offer only USDTBSC during that short interval, a compatible subset of the new nonexclusive wording. If publication is blocked, do not activate the new code. No checkout-setting bypass is required.

## Review corrections and retained failures

Engineering rounds corrected missing-network funds handling, immutable route checks on reversals, and refund handling for a separate unallocated duplicate payment. The invoice writer rejects malformed selection markers before its single POST. Design rounds corrected missing-link recovery copy, action hierarchy, settled-state prompts, readable receipt coin/network labels with raw detail fallbacks, and unavailable-state support links; the actual policy editor/customer preview is rendered at mobile and desktop widths.

Original server round1 failures were stale source-sync/test expectations and missing fixture CSRF/session setup; round2 passed all20 browser cases and88 component cases, with two narrow linter corrections outstanding. Round3 passed Go race/lint/compile, types/lint and all20 browser cases, with one obsolete recovery-copy component assertion. Frontend-only round4 passed all20 browser cases but exposed a second obsolete offline-message assertion; the original failure is retained and its correction is included in the next focused pass. The engineer additionally identified and corrected null optional payout-route arrays in policy responses, with historical-snapshot and persisted serialization regressions. Private evidence is retained under `.cache/hosted177/` and `/srv/playora-qualification/hosted177/`; the final isolated database evidence and normal focused hook remain separate requirements.

## Focused qualification results

Server round5 passed formatting, canonical contract generation, affected Go unit/race tests, integration compilation, golangci/security rules, TypeScript, ESLint and all88 scoped component cases. Round4 passed all20 isolated browser/a11y cases; the later changes do not alter the rendered layout. Round6 passed declaration-only formatting, contract equality, TypeScript and lint after regenerating the mirrored OpenAPI from the corrected backend contract; no removed options endpoint or route-selection request field remains.

Isolated TiDB run1 passed10 actual top-level scenarios (including two legacy native outcome subcases), in363 seconds. Its launcher incorrectly listed11 because a historical-network regression had lived in the removed options test file; retain that original receipt and the corrected enumerated `database-verified1.json`. The regression is restored in its own maintained file. Run2 passed the updated empty-payout JSON scenario and the restored historical-network scenario in59 seconds:11 distinct scenarios total. Both exact isolated containers and tmpfs data were removed. Provider responses were synthetic; no live invoice/funds/customer-data test occurred. First-run scenarios are retained rather than unnecessarily rerun after the projection-only correction.

The independent designer approved18 mobile/desktop renders, the actual staff editor/customer preview and the final recovery/network-review states. Engineering review covers source, persisted evidence, legacy compatibility and the coordinated policy-publication sequence. Normal focused tracked hook, exact CI/image scans/signature, preflight and exact owner recovery consent still precede activation.

## Delivered release and recovery record

The normal server focused hook passed backend formatting, vet, golangci, standalone gosec, govulncheck, race tests, generation and builds; frontend 213 files/1,009 component cases and all three portal builds; and 83 deployment configuration cases. Exact CI39861397072 and image release39864233301 passed, and the five immutable image manifests/SBOMs were signed and verified. No full gate or local tests ran.

A concurrent, separately owned documentation commit bfaa30c advanced local main after release dispatch. The original finalizer safely stopped at its HEAD assertion; its failure remains retained. A separately reviewed finalize-only continuation allowed exactly that direct descendant and its three documentation paths, verified the original d768cbd tree and qualification, then authenticated and signed the original image artifacts. No source rebuild or repeated tests were needed and the neighboring commit was not included in the deployed application.

Before pulling images, only the inactive server Go build cache was cleared, reclaiming 3,695,489,024 bytes and restoring approximately22.7% free space. The20% storage floor, source, release images, data and qualification evidence were preserved. Registry-issued repository-pull tokens were memory-only; the GitHub credential stayed local and no server login was persisted.

The signed candidate passed server preflight. The owner then approved “Deploy d768cbd hosted checkout with this recovery risk” and completed the normal authenticator confirmation for policy publication. Reloaded Finance and a fixed SELECT-only inspector verified revision5, published policy `934c1c6e-7355-457b-8455-5d8db12d34fc`, exact reviewed wording and all preserved financial settings/remedies. A reviewed guard checked the same policy again under the release lock before activation. The prior application briefly offering a subset of hosted choices did not require any bypass.

Activation completed at unchanged schema50. All eight application/mail services are healthy and use the expected signed images; public HTTPS/redirects, unchanged legal and retention policies and private webmail passed. All14 read-only live browser cases passed across desktop/mobile public pages, customer/admin/booster sign-in and unauthenticated finance boundaries. The authenticated owner Finance screen also shows USD hosted checkout and a separately labeled seller-payout network list. No real invoice, funds, supplier purchase, message or customer-data test was performed.

Current manifest: `/srv/playora/releases/d768cbd/deployment.env`. Private receipts: `/srv/playora-qualification/hosted177` and `.cache/hosted177/`. The previous signed6022122 remains retained, but old code cannot safely understand new hosted-selection records: application rollback is unqualified and a forward fix may be required. Off-host recovery remains absent and this exact-release exception is consumed. Checkout remains enabled; supplier purchases, automatic outgoing transfers and customer deletion remain disabled; Vendoria remains absent. Existing catalogs, accepted agreements, identities/MFA, private webmail and user-owned prototype/cameo/discount work are preserved.
