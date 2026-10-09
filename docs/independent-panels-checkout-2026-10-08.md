# Independent panels, form guidance and hosted checkout

Status: implementation and broad manual-review corrections are complete for
the reviewed scope. Round5 failed one desktop catalog focus assertion; the
owner requested a scoped retry instead of restarting the complete gate. The
catalog correction now passes focused qualification; remaining production
qualification and deployment are still pending.
The first full combined gate failed at an artwork-upload assertion; two focused
unchanged diagnostic reruns passed, and scanner startup readiness passed focused
policy tests and a fresh-volume server proof. Independent manual testers and
senior fix/review round trips closed all 19 observed UX findings.
Complete combined qualification, signed release and deployment remain pending.
This document records the owner's next-release expansion of 8 October 2026.

## Accepted scope

Customer, admin and booster accounts are independent identities. The owner
explicitly confirmed that the same email may have an account in each panel,
with separate profile, sessions, MFA and permissions. Staff security, profile,
recovery and session pages remain inside their own panel. Existing customer
order history and accepted payment agreements must survive the transition.
Admin and booster hosts remain `admin.playoragames.com` and
`pro.playoragames.com`; the semantic booster role/API names stay unchanged.

Email sign-in gains a server-governed resend cooldown and expiry guidance.
Win-rate preferences offer no preference, a range, below a percentage, above a
percentage, or exactly 100%. Actual guarantees remain specific to an accepted
order. New custom field type `win_rate` uses bounded scalar preference strings;
the exact original MLBB percentage field receives a compatibility adapter.
Published configurations and historical accepted answers are not rewritten.
Numeric pricing rules that cannot interpret a richer preference require a
manual quote rather than silently losing a surcharge.

Customer and staff form errors remain next to their fields, retain entered
values, reveal the relevant section and move focus to the first problem.
Shared controls, dynamic fields, catalog editors and affected service forms
are within scope, including payment policy editing.

## Payment diagnosis and correction

A bounded read-only production query found one USD 1 checkout with a claimed
invoice write, no stored provider invoice/link, and `invoice_uncertain`.
This establishes an ambiguous response, not proof that no invoice exists.
No financial POST or repair write was attempted.

Authenticated read-only NOWPayments minimum/estimate queries returned a current
minimum of USD 8.84547653 for the merchant-configured USDT/BSC fixed-rate,
merchant-fee route. The USD 1 estimate was below that minimum. The original
provider error body was not retained, so this is a confirmed current
eligibility problem rather than a claimed exact historical rejection reason.
Minimums change. Do not hardcode this value into prices or policy.

New checkout performs a bounded minimum read before creating its durable
attempt. Failed/unavailable evidence fails closed without locking the order
into an invoice attempt. Commercial terms, ownership and published policy are
revalidated transactionally afterward. Reusing an existing attempt does not
require another minimum read. New attempts use the hosted NOWPayments invoice
page, with one automatic continuation after the customer's own request and an
accessible continuation link. Existing native attempts keep their original
read-back instructions and reconciliation behavior. Ambiguous financial POSTs
are never automatically repeated, and return URLs never establish settlement.

Primary references consulted:

- [NOWPayments SDK hosted flow and preflight](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs)
- [Provider endpoint descriptions](https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description)
- [Dynamic minimum guidance](https://nowpayments.zendesk.com/hc/en-us/articles/27407237685917-Minimum-payment-amount)

Private read-only diagnostic receipts stay under
`/srv/playora-qualification/release140/`, outside Git and public files.

## Migration and release constraints

Explicit SQL migration41 separates the identity namespaces. Existing staff
IDs and their factors remain with their corresponding staff identity;
independent customer identities own historical customer records. Historical
staff actor/audit references retain attribution. Any separately required
booster identity needs its own MFA enrollment. Old sessions/challenges/flows
are revoked at the boundary. Owner sign-in uses the existing authenticator in
the new admin workspace after migration.

Encrypted customer credentials cannot simply change their cryptographic owner.
A narrowly validated legacy owner binding preserves their existing ciphertext;
new or replaced credentials bind to the current independent customer identity.
The migration and identity/reference isolation require real TiDB/TiKV tests,
including failure and preservation scenarios. Schema41 is forward-only: the
old schema40 application is not a valid post-migration rollback. A release
recovery plan must reflect that before cutover.

The exact published starter payment policy (revision3, agreement
`e1957da6-a9dd-4e66-b78b-4cd2ed4df190`) remains unchanged. Checkout stays enabled;
outgoing transfers and deletion remain disabled. No assistant invoice, funds
movement, provider-wallet change or external test email is authorized.
Off-host backups are still absent; previous exact-release exceptions are
consumed. Normal release defaults and the final concrete deployment decision
remain applicable.

## Evidence and review

The obsolete `portal137-round2` qualification was cancelled after the owner
expanded scope. Its exact isolated process group and four fixture containers
were stopped; production containers were unchanged, fixture volumes retained,
and `cancelled_superseded_by_owner_scope` recorded. It is not a completed pass.
A fresh full candidate must include all portal/contact/QR and current changes.

Focused catalog/payment race unit tests passed, including isolated provider
minimum responses and failure cases. Focused frontend checkout/navigation/
win-rate tests passed29 cases. These are not substitutes for the required
complete gate, real database migration tests, rendered senior design review,
exact-commit CI, image scans/signatures and live post-deployment checks.

Live Google sign-in, mail placement and actual financial qualification remain
owner-led. Automated fixtures do not qualify real funds movement or guarantee
that every recipient receives mail in their inbox.

Focused isolated TiKV qualification passed17 scenarios covering namespace
migration/preservation, independent identity/authentication boundaries and payment
preflight/reconciliation. Fixture cleanup was confirmed and production was
unchanged. A final independent code review then identified two new-request WR
boundaries that still accepted historical scalar answers. New create/revise,
validation/estimate/discount and reorder requests now require the five preference
forms, while accepted historical orders remain readable, calculable and eligible
for their original fulfillment rules. Invalid writes cannot change an order.
Race unit tests, lint, standalone gosec and tagged integration compilation passed
for this correction; its three new database scenarios await the full gate.
The earlier preflight snapshot was superseded before any full gate started.
See `redesign/reviews/PANELS140_PAYMENT_WR_REVIEW_2026-10-08.md` for the
independent review and bounded verdict.

## Owner-requested parallel UX review

After the implementation candidate is frozen and the normal full gate starts,
independent agents manually exercise customer/seller, admin and booster flows.
A separate senior UI/UX designer coordinates findings and verifies corrected
screens. The review covers the existing31 journeys in `docs/redesign/FLOWS.md`,
shop/news/artwork addenda and this release's identity/resend/WR/payment/error
changes. Each report records actual routes, viewport, state, actions, outcome,
findings and limits. Empty, invalid, expired, denied, loading, retry and mobile
branches are included where applicable. A coverage table distinguishes tested
flows from unavailable evidence; neither a finite review nor automated checks
prove absence of all possible bugs.

Use synthetic accounts/provider evidence and local or isolated qualification
resources. No real purchase, financial mutation or external email is part of
this review. The running full gate retains its exact source manifest. Fixes
made afterward receive the checks required by their changed scope; preserve
the baseline and delta evidence rather than claiming the running gate tested
files changed after it began. The first frozen gate failed; its evidence remains
unchanged. The nineteen manual findings and actual37-journey branch matrix are
recorded in `redesign/reviews/PANELS140_MANUAL_SENIOR_2026-10-08.md`. Final rendered
rechecks passed 48 checkpoints in the last immutable snapshot, and the senior
returned PASS with no remaining actionable scoped findings. The latest frontend
passed 164 unit/component files with 710 cases, all 3 builds, formatting, types and
lint; root checks passed. The new complete candidate includes all corrections
and scanner-fixture readiness. Complete server qualification, exact release and
deployment remain pending; actual provider/authentication/device limits remain
explicit in the review matrix.

## Second full qualification and browser corrections

The second full gate **failed** on frozen tree
`3a0e36cb82715ae26231eac35281a0c16ff3ac88` (412 changed paths). Backend
static/security/race checks, generated code, builds and 268 real-database
scenarios passed; the database suite took 4,467.020 seconds. Frontend static
checks, all three builds and 700 unit/component cases in 163 files passed.
The earlier local total of 710 cases included ten cases from the held, untracked
homepage cameo experiment; those files were excluded from this candidate.

The browser stage ran 156 cases: 140 passed and 16 failed across nine journeys.
Frontend image/container and production gates were not reached. No commit was
created, production was unchanged, and all four isolated fixture services
stopped. The exact failed source, log, resource samples, all 16 error contexts
and original traces remain private; the collected evidence receipt has SHA256
`1d25499a334100f183f6adda50b04d70a519353d8102c624ee6e784c0e9859de`.

Nine independently reviewed test/helper corrections retain the application
bytes from that run:

- Foundation and shop-editor tests now assert the required first-invalid-field
  focus, visibility and associated inline errors. The mobile shop failure was
  its obsolete summary link; the desktop failure was its obsolete heading.
- Order recovery verifies focused guidance, the exact customer return route,
  removal of private details/drafts and an empty draft after fresh access.
- Refund assertions distinguish the staff instruction from the customer's
  destination form; seller submission exercises client ownership validation
  before the real server region error and successful correction.
- Workspace fixtures include the now-required independent portal identity and
  verify navigation to that panel's own settings with restored focus.
- The owner and background-task compound journeys have scoped 45-second test
  budgets, after traces showed progress through QR capture, worker completion
  and accessibility checks at the old 30-second deadline. Individual waits,
  authentication factors and assertions remain intact.
- Shop payment capture targets the hosted provider link and payment refresh.
  It verifies the exact synthetic invoice URL, safe link attributes, absent
  native deposit controls and no received funds before signed fixture evidence.
  Returning from the intercepted provider page is never payment success.

Scoped source review and relevant local tests passed. Standalone foundation
and synthetic workspace checks each passed four Chromium/WebKit desktop/mobile
cases. These do not replace database-backed browser qualification. The corrected
418-path candidate, tree `4a3ad80061474896c64ce97ec06a2af79baa579c`, is frozen for
a separate focused rerun covering every affected journey on both configured
device projects, with shop policy mutation in its own fixture. It is not yet a
pass. A fresh complete gate follows; exact release/signature checks, schema41
inspection, deployment approval and owner-led live acceptance remain separate.

The first focused rerun then completed with 34 passes and two failures. Customer,
staff, order, payment/refund, seller and complete shop-purchase/manual-delivery
journeys passed on both configured device profiles. The two failures were the
same later shop-editor assertion for an obsolete publication-summary link after
changing an existing variant's compatibility. The invalid preview correctly
navigates directly to its stable-key field. The test now verifies the exact
immutable-key error, focus and retained values, restores the original region,
saves reviewed revision7 and requires a valid preview before publication becomes
available. It leaves the fixture product paused. Application and backend
compatibility protections are unchanged.

That final test correction passed independent review, 11 focused unit cases,
types, lint and formatting. The failed focused run and its seven-file private
evidence collection are retained; all fixture containers and listeners stopped.
A second focused candidate, tree `d28a8c7d781b6e4825d08daaf5798f69d9cfdf15`,
contains the nine reviewed test corrections and only these two qualification
documentation changes beyond the original full-gate source. Its real-fixture
rerun remains pending. The earlier prepared round3 candidate was superseded
before dispatch; no additional full gate or commit has run yet.

The second focused rerun **passed all 36 cases**: 17 ordinary journeys and the
separate shop-purchase/manual-delivery journey on each device profile. It used
the exact `d28a8c7d781b6e4825d08daaf5798f69d9cfdf15` tree and manifest SHA256
`3fe4273bccc5a553d0c1d7e759f69dbd45a41507c60e3317f3801d6f9ba77f48`.
The completed log has SHA256
`c3a86103aeff930c0c42815e48695cc26ad60d5d70cb5aae1c4fb50fb320aec7`.
Source verification and clean fixture shutdown passed; no production action,
real email, invoice or funds movement occurred. The fresh complete round3 gate
must retain these exact runtime/test bytes; only the two reviewed qualification
documents change to record actual outcomes. This focused success is not a
complete gate or release pass.

## Third full qualification and repeated shop validation

Round3 **failed** on tree `a72b9cebabe6f97ee6e365caab34e044021b556a`.
Backend static/security/race/build checks and all 268 database scenarios passed
(4,503.236 seconds). Frontend units had 699 passes and one failure across 700
cases. Browser and production qualification were not reached. All four isolated
fixture containers stopped, and no commit or deployment resulted. The private
failed gate log has SHA256
`559d38fdbf5f6888120be2d57be46ad90d3b820d0daac6fdd5bff57f3676a14d`;
the seven-file evidence receipt is
`060b71f4e73a4a5755bdc0c2c2084c6c414b3209911001bcbed8bfe77bb30cda`.

The failing shop-editor test waited for focus before checking that a repeated
validation response had returned from Terms to Variants. The visited Variants
section remains mounted but hidden, and the prior field query remains in the
URL. A deterministic regression reproduced the focus effect calling a hidden
field while Terms was selected. This is not proof that a real browser visibly
focused a hidden field: the unit DOM permits behavior that browsers normally
ignore. The local ShopIssues correction requires the selected section to match
the target and rejects hidden/inert ancestors. The regression verifies visible
Terms, no hidden-target focus, the pending second response, and then the exact
route, visible field, focus, retained draft and accessible error together.
The real-fixture shop journey also repeats invalid quantity submission before
correcting it and continuing its existing preview/publication checks.

Separately, the production real-TiKV suite's aggregate Go deadline increases
from 240 to 360 minutes, with a derived outer process deadline five minutes
later. This is preventive headroom for the expanded suite, not the cause of the
round3 failure. The prior 251-case real-TiKV run took 12,838.853 seconds, close to
the previous budget; simple case-count scaling is not a measured runtime for
the new 268 cases. Per-operation deadlines, readiness bounds, race detection,
fail-fast behavior, assertions and cleanup remain unchanged. Five fixture-tool
unit tests cover command selection and the outer deadline. A fresh complete
round4 candidate must include the actual frontend correction and timeout tests;
previous successful checks cannot certify these changed bytes.

The portal deployment guide now distinguishes historical schema40 host-only
instructions from the schema41 independent-account release. It requires
resign-in, explicit forward migration and preserved attribution; ordinary
rollback to the schema40 application is unavailable after migration. Actual
release, migration evidence, off-host recovery and owner-led live acceptance
remain separate from automated qualification.

Focused correction checks passed: all 700 tracked frontend units in 163 files
(the held cameo experiment excluded), 77 production-tool unit tests, repository
checks, types, lint, formatting and the changed admin build. Ten repetitions of
the strengthened shop-editor unit file passed. Fresh synthetic desktop Chromium
and mobile WebKit checks exercised both invalid submissions, retained and usable
Terms content, visible field focus, correction and zero network mutations.
These browser fixtures do not qualify backend persistence or a full release.
The scoped senior review and its exact evidence are recorded in
`docs/redesign/reviews/PANELS140_MANUAL_SENIOR_2026-10-08.md`. The fresh complete
round4 qualification is still required; no check is waived or counted as passed
merely because an earlier candidate succeeded.

## Fourth full qualification: infrastructure advisory blocker

Round4 **failed** on frozen tree `159d01f9d9762484d29422ec3727940550ae349c`
(420 changed paths). The corrected shop regression passed in the full run.
All 268 backend database scenarios passed in 4,446.008 seconds, all 700 frontend
units in 163 files passed, and all 156 database-backed browser cases passed.
Application builds/image checks, 77 production-tool units, isolated TLS staging
and pinned runtime configuration checks also passed. The production real-TiKV
business suite was **not reached**.

The eight vendor-image scans completed. Four immutable PingCAP v8.5.8 images
(BR, PD, TiDB and TiKV) each have one additional HIGH `vim-minimal` finding for
`CVE-2026-73073`. The other 481 package/image findings match the existing
acceptance; these four do not. This is a security-policy blocker, not a test
assertion, timeout, scanner execution error or permission to suppress findings.
The exact advisory, digests, package fingerprints and exposure assessment are
in `production/security/DATABASE_REVIEW_2026-10-08.md`, pending an owner decision
or a qualified fixed official image. The tracked acceptance policy is unchanged.

The failed log SHA256 is
`cd6e36dc8bf24e7abdd840914922b896c931b0a8e640a327520c839a30dc8366`.
The seven-file failure-evidence receipt is
`1d313723c42c6cdc9e0c849d76c37ca9f1634dc403f56856f9cdf9ca106d7db8`;
the separate complete eight-report/summary collection receipt is
`b0da29a869010d33b382622ec05bc212f9d7e496dd27d72c8b0909ce83b8952a`.
Original server evidence and private local copies are preserved. Isolated
fixtures stopped, no commit was created, and production remains unchanged.
No full-gate success or scoped continuation exception is implied by the passing
earlier stages. Repeating the unchanged candidate would encounter the same
unaccepted findings.

The owner subsequently replied **“yes i approve”** to accepting exactly the
four findings in the database review and rerunning qualification. The approved
policy addition preserves every earlier finding and report hash and records
this separate decision against each exact image/report. The four findings
remain vulnerable; neither this approval nor assessment of the preserved
reports is a fresh scan or full-gate pass. New findings and scanner failures
still block. A fresh round5 candidate will run the normal complete tracked
hook, with an additional infrastructure scan before the long application suite
to detect this class of blocker earlier. No test is omitted, and no previous
failed run is relabeled as passed. Runtime images, schema, live financial
policy and production settings remain unchanged.

## Fifth qualification and owner-requested catalog retry

Round5 failed on frozen tree `c577fb1b5e90dd77795013b4d3d7206028bbf1e6`.
The infrastructure precheck passed with the exact accepted vendor findings;
all 700 frontend units passed. Browser qualification recorded 155 passes and
one failure in desktop `catalog-admin.spec.ts:266`. Its mobile counterpart
passed. Later production qualification, including the real-TiKV business
suite, was not reached. The original log SHA256 is
`e75e4f649d746034250b170855768dc9f895cf024adfc082feccf10bbfc0efde`;
the nine-file private failure/trace collection receipt is
`9190440bb8669bd691d94aca82ca64bb9c30760a834797a6523139ce6f4219d9`.

The owner then explicitly requested rerunning only the failed section. The
unchanged desktop catalog journey reproduced the same focus assertion in
44.1 seconds. Original evidence, source and built files were preserved and the
four isolated fixtures stopped afterward. An initial private retry helper had
stopped before starting services because its screenshot-preservation bound
included unrelated captures; the corrected helper retained only this journey's
13 named captures. No application check ran in that preparation attempt.

The trace identifies a real interaction defect: after saving an invalid draft
from FAQ, the game-name input receives focus, then the section's passive effect
moves focus to its container about 21 milliseconds later. The narrow correction
preserves focus already within the destination section, while ordinary section
navigation still moves focus into that section. A regression using the actual
catalog component reproduces this effect ordering; restoring the old code
makes it fail. The existing browser assertion and timeout remain unchanged.
Scoped senior UI/UX review approved this behavior and preservation of inline
errors, unsaved values and normal navigation.

Correction qualification uses a separate snapshot with only
`frontend/app/catalog/admin.tsx` and its new `admin-focus.test.tsx` changed.
It runs focused form tests, formatting/lint/type checks, the affected admin
build and the catalog journey on desktop/mobile. Full-suite reruns are excluded
under the owner's instruction. The original gate remains failed; neither a
successful scoped correction nor earlier passes certify unexecuted production
checks, a commit, release or deployment. Private evidence is retained under
`panels140-round5/catalog-fix2`.
The first correction attempt passed the focused units but stopped at a
TypeScript error in the new test: Testing Library's role query does not support
Playwright's `exact` option. Removing only that unsupported option preserves
exact string-name matching and the strict focus assertion. Its failed evidence
is retained separately in `catalog-fix1`; no browser ran in that attempt.

**Scoped correction PASS (9 October 2026):** three focused form tests,
formatting, ESLint, complete frontend type checking, the affected admin build,
and the unchanged catalog scenario on desktop (1.6 minutes) and mobile
(1.5 minutes). The scanner's isolated readiness/clean/malware prerequisite also
passed. Root repository, secret, contract and workflow checks passed. The
corrected runtime file SHA256 is
`aab034427457811062bea52f6f93e96121d45dcfaf81f5ed9e7afcb87e741fa7`;
the regression test SHA256 is
`bac6782c3db10f18f8cc8d01bb6978b06c7ad13cb660b37389d26414379af2ca`.
The 19-file scoped evidence collection receipt is
`842a4746beb4e0615c71930eb6514acb7e29fcc3301f0cfa57885fe6fd3b0c6a`.
The isolated fixtures are stopped. Both baseline and correction source hashes
were verified unchanged across execution. No complete suite was restarted;
unexecuted production checks and release/deployment requirements remain open.
