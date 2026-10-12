# Service experience release roadmap

Owner request: 11 October 2026. Baseline: `6b2cfb959b169ed89bbd47e133ff552f3fcae976`. Delivered on 12 October as signed `72ed5947fddf5859899d8c3e2b4f9e73c62177d9`, schema 41, replacing `3a9f694`. Implementation and scoped qualification are complete. Live catalog publication, owner-led provider/authentication acceptance and off-host recovery remain separate; see `service144-scoped-continuation.md` and `mlbb-catalog-setup.md`.

## Product and design decisions

- Keep the green PLAYORA identity, persistent game header/statistics, separate customer/admin/booster accounts and contextual verification dialogs.
- A fixed package is a complete admin-defined offer. Customers read its contents and price, confirm eligibility and purchase. They do not rebuild it using the custom boost form. Necessary delivery information is clearly separated from package contents.
- A custom boost collects the customer's preferences, including an explicit delivery-hours range. Estimates remain provisional; the accepted staff quote defines the purchased agreement.
- Catalog relationships, package specifications, cosmetic categories and pricing rules are admin-declared per game. No MLBB-specific branching based on field labels, inferred hero classifications or guessed prices.
- Keep historical releases, orders, quotes and policy revision 3 unchanged. Catalog updates are versioned drafts and require the normal preview/publication flow. Never silently rewrite the owner's live catalog.
- Images are limited to 4 MiB (4,194,304 bytes) per file; label this consistently as 4 MB with exact validation. Preserve scanning, dimension/pixel limits, metadata stripping, private drafts, responsive renditions and default game artwork.
- Cards use square artwork and balanced tile layouts: three columns where space permits, two on tablets and one on narrow screens. Text may expand at zoom/with long titles rather than being clipped to enforce a rigid square.
- The custom-boost action stays within the game content after statistics and before the footer. It must not cover forms, the keyboard, support controls or the footer.
- No live invoice, funds movement, outgoing email test or automatic staff invitation is part of automated qualification. Use isolated fixtures.

## Initial audit

Read-only public MLBB release 200 was inspected on 11 October. Its `rank_boost` service currently uses `manual-review-v1` with no price plan, so a numeric automatic estimate is intentionally unavailable. Rank/star fields and a progression validation rule already exist. The form has independent region/server and hero/role options; their labels do not establish executable relationships. Delivery is still Standard/Priority. The published win-rate field is still decimal, despite the newer win-rate preference input being implemented in application code. The published fixed package refers to the full custom service and only declares region/server as additional required fields; it does not pin the boost specifications. The seller form only records a skin count and free-text collector rank.

Article cover uploads, single body-image blocks, shop artwork, seller private screenshot uploads and reviewed public account galleries already exist. The backend image limit is already 4 MiB. Improve discoverability, composition and cover selection rather than creating a competing upload pipeline.

The owner confirmed booster login fails while customer/admin login works, and that this email has not been invited to the booster workspace. Separate staff provisioning is expected; showing a successful code request for an ineligible staff identity is the UX defect to fix. Preserve independent identities and required staff MFA.

## Implementation sequence

| Stage | Scope                                                          | Status                                                           |
| ----- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| SE00  | Roadmap, audit and design contracts                            | Planning and scoped implementation reviews passed                |
| SE01  | Booster entry, honest eligibility errors and 120-second resend | Implemented; focused checks and scoped senior review passed      |
| SE02  | Hosted checkout creation, continuation and recovery            | Implemented; focused checks and scoped senior review passed      |
| SE03  | Configurable option relationships and readable option values   | Implemented; focused checks and scoped senior review passed      |
| SE04  | Custom delivery-hours range and usable estimate pricing        | Implemented; scoped senior review passed including timing        |
| SE05  | Fully specified fixed packages and cover artwork               | Implemented; scoped senior review passed                         |
| SE06  | News cover/body image composition and consistent upload limits | Implemented; senior review and focused real-media checks passed  |
| SE07  | Seller screenshot flow, listing cover and structured skins     | Implemented; senior review and focused real-media checks passed  |
| SE08  | Square service grids and persistent custom-boost action        | Implemented; scoped senior review and responsive rechecks passed |
| SE09  | Integrated review, qualification and release handover          | Scoped qualification, signed deployment and live verification passed |

Stages are implementation work packages within one release candidate. Record focused checks as work proceeds; a stage is not qualified/complete merely because its source is edited. Retain the ordinary repository commit/release gates and exact-source evidence. Earlier one-use waivers are consumed.

### SE01 — staff login and resend

- Keep owner-created booster invitations in Customers & staff. Explain where to obtain access on Pro login; do not imply an admin identity grants Pro access.
- Exact onboarding: Customers & staff → Add a staff account → Booster workspace → Create staff access. This provisions access without sending an invitation email. The owner shares `https://pro.playoragames.com/login`; the booster verifies their own email/Google identity and enrolls their own authenticator. On an eligibility error, retain email entry, focus feedback and show neither a sent-code confirmation nor a resend timer.
- For missing/inactive staff access, return a bounded actionable error and stay on the email entry form. Do not display code-sent success or create a challenge. Keep customer registration behavior and rate limiting intact.
- Explain staff eligibility failures after Google separately from provider/callback failures, without copying identities or factors across panels. Verify first-time invited Google/email sign-in, linking rules and mandatory MFA.
- Enforce a 120-second resend deadline on the server and show the server deadline in all sign-in panels. Preserve expiry, concurrent-request guards, hourly abuse limits, clock/reload/error handling and invalidation of previous codes.
- Verify invited/uninvited/suspended identities, customer isolation, provider errors, cooldown boundaries and retry UX. Existing customer/admin login must continue to work.

### SE02 — payment continuation

- Trace the complete create → queue worker → provider response → stored attempt → polling → browser navigation path. A provider dashboard record alone is not evidence that PLAYORA stored a usable checkout URL.
- Reproduce slow creation, order/session refresh and remount cases with fixtures; retain intent through ordinary refresh without storing private payment data persistently.
- Redirect a newly requested hosted checkout once it becomes ready. Always provide a clear Continue to NOWPayments action for a valid unpaid hosted attempt, including return visits.
- Make waiting, uncertain creation, connectivity failure, minimum-amount errors and expiry understandable, with safe recovery and support access. Never create a second invoice automatically after an uncertain write or imply that a redirect means paid.
- Preserve historical native attempts, ownership, validated provider origin, accepted amounts/policy, idempotency and reconciliation. Diagnose existing owner attempts read-only; do not initiate live financial tests.
- Tests include customer workspace lifecycle (not only the isolated payment component), delayed polling, refreshed/remounted route, expired/settled/exception/native attempts, invalid URL, admin view, lost session and duplicate clicks.

### SE03 — linked choices and option keys

- Add explicit admin-editable relationships between parent choices and child choices. Region → server: choosing a region filters servers; choosing a server first resolves its single configured region. Changing a parent removes incompatible children with a visible explanation.
- Role → heroes: choosing a role filters optional heroes. Choosing heroes first selects the common unambiguous role; incompatible/multiple-role selections clear and disable the role constraint with a clear reason. Clearing heroes restores role selection. Handle heroes configured for more than one role without guessing.
- For many-to-many mappings: derive a role only when the selected heroes have exactly one shared role. No shared role clears/disables the constraint; multiple shared roles leave an explicit choice among those roles. Announce changes without moving focus or silently choosing the first match.
- Use explicit mappings and deterministic rules, not string parsing of display names. Validate mapping existence, duplicates, cycles, option availability, hidden fields, stale drafts and crafted inconsistent requests on the backend too.
- Make the same relationship behavior available to custom requests, required package delivery information and seller intake where configured. Respect original purchased versions.
- Permit an option value/key to equal its label (for example `Mid lane`), including spaces/case and supported Unicode. Keep structural field/rule/reference keys separate. Treat option values as opaque bounded text, never identifiers for SQL/HTML/paths. Preserve existing option keys; changing an already-used value is explicit and invalidates dependent examples/mappings until repaired.
- Editor offers a clear use-label-as-value action with duplicate/error feedback; do not silently rename values when a label is edited.

### SE04 — custom hours and pricing

- Replace Standard/Priority in prepared new MLBB configuration with minimum/maximum requested delivery hours and clear allowed bounds. Store the range in order selections; validate positive, ordered values and retain it in the quote/summary.
- Distinguish the requested range, admin's accepted delivery commitment and operational forecasts. A requested deadline must not become an automatic guarantee.
- Customer requests use elapsed calendar hours from when payment is verified and the required delivery information/access is ready. Display that basis beside the range and in the quote review. The final quote/package commitment explicitly states its start condition; changes require customer agreement. Working-calendar minutes remain confined to operational forecasts. Old contracts retain their own original terms.
- Improve pricing authoring around base price, rank/star progression, conditional additions, percentage/multiplier adjustments, lower/upper limits and manual-review cases. Use ordinary currency amounts in the UI while preserving exact decimal/minor-unit backend arithmetic.
- Only offer compatible fields for each operation. Explain ordered calculation and show human-readable rule summaries. Give inline errors with links/focus to the affected rule or field.
- Provide a live draft estimate preview and independently specified saved examples with readable expected/actual totals and breakdowns. Do not auto-accept evaluator output as the expected answer.
- Add a concrete MLBB configuration guide using the audited field keys and explicitly synthetic prices. Explain why release 200 is manual-only and how to turn on estimates. Preserve the requirement for final staff quote on custom orders.
- Prepare a reviewable catalog update for new hours, relational fields and the implemented win-rate preferences; no invented live prices or automatic publication.
- Tests cover partial ranks/stars, thresholds, ordering, rounding, bounds, missing inputs, conditional hero/role/range rules, saved-example failures and stale releases.

### SE05 — fixed packages

- Admin sets package title/description/cover, complete boost specifications, exact price, delivery promise, limits/availability and permitted eligibility/delivery inputs. Existing optional variants are complete offers rather than a second custom form.
- Store immutable preset answers alongside each offer and merge them authoritatively on the server. Reject attempts to alter package contents/price; show the exact preset contents before purchase.
- Do not ask customers to choose target rank, win-rate promise, hero/role constraints or delivery speed already specified in a package. Collect only genuine customer-specific facts required to check eligibility or perform delivery, clearly labeled separately; later private credentials remain in the existing secure handoff flow.
- Add checked package cover artwork with responsive square/card/detail variants, fallback, alt text and publication visibility controls. Keep shop cover uploads and make them equally discoverable.
- Existing incomplete package definitions need explicit admin review/migration guidance; do not fabricate their scope or silently change purchased contracts.
- Test preset injection, missing definitions, eligibility, limited capacity/concurrency, revisions, coupons, agreement acceptance and direct checkout.

### SE06 — news media

- Make the article title/cover upload prominent and explain that it appears on news cards and the article. Preserve alt text, attribution and focal-point controls.
- Allow images at any point between text blocks, including an image-row/gallery block with multiple uploads per row. Use bounded rows (up to four images), per-image alt text/caption/attribution, reorder/remove and clear partial-upload errors. Stack on small screens without cropping instructions/screenshots.
- Support insert-before/after controls so authors do not have to append every image at the bottom and move it repeatedly. Keep keyboard/focus predictable after insertion/removal/reordering.
- Apply the 4 MiB input limit consistently to editor hints, client validation, backend, gateway and sanitized renditions. Test exact boundary, oversize, malformed image, pixel limits, scan failure and upload retries.
- Extend structured content validation/publication and artwork authorization for every gallery image. Draft/unpublished media remains private; hiding/deleting an article revokes its public image access. Preserve old single-image content.
- Test saved draft, preview, publish/schedule, public card/article, image failures, mobile and keyboard use.

### SE07 — sell an account

- Give sellers an obvious multi-image upload step with previews, progress, removal and 4 MiB per-file guidance. Reuse private submission attachments; uploading is not public publication.
- In admin listing review, select which reviewed screenshots may be public and explicitly choose a title/cover image. Allow reordering and preview the resulting account card. Public cards must show that selected cover consistently, and removed/private images cannot leak.
- Add repeatable structured cosmetic groups to per-game intake: skin type/category, quantity and named skins/associated heroes. Example only: Collector / 2 / Aldous, Yu Zhong. Categories are admin-managed choices; sellers enter exact skin/character names for staff review. Support multiple groups and clear quantity/name consistency errors.
- Preserve existing scalar intake answers and accepted seller terms. Show structured groups clearly to seller, staff and on the reviewed public listing only when explicitly included.
- Test upload ownership, disallowed publication, duplicate/removed images, cover replacement, missing cover, categories/counts, repeated groups, draft recovery and customer/admin mobile flows.

### SE08 — discovery and custom-boost access

- Apply a shared three-column desktop tile system to news, accounts, shop products and fixed boost packages; use square title artwork, readable text, clear prices/status and consistent actions. Preserve filters, pagination, limited offers and game shell context.
- Boost discovery prioritizes fixed-package cards. Place Configure custom boost in a sticky action region bounded by the post-statistics game content and footer; route to the correct service/form without losing game context.
- Show this action only on boost discovery/package views, not news/account/shop views. One custom service opens directly; multiple custom services open a named chooser inside the game shell. Suppress it within an active custom form or when custom boosting is unavailable, retaining the normal availability explanation.
- On small screens use a compact action with safe-area spacing and collision avoidance for ongoing orders/support. Hide or adjust it while the custom form's own submit controls are active, so customers do not see competing actions.
- Keep focus-visible states, touch targets, reduced-motion OS support, no clipping at 200% text/zoom, and useful loading/empty/unavailable/image-failure states. Preserve meaningful inline legal links.

### SE09 — final qualification and handover

- Update API contracts and explicit SQL migrations only where needed; never use Ent migrations or mutate production test data.
- Run focused tests throughout, then the required combined backend/frontend/security/database/browser/production qualification against the frozen candidate. Record original failures and follow-up evidence; no previous waiver or old passing baseline certifies this release.
- Required senior UI/UX reviewer checks changed rendered journeys and review/fix rounds until no actionable scoped findings remain. Record desktop, tablet, narrow phone, keyboard and error/recovery evidence; distinguish fixture coverage from live acceptance.
- Review staged changes, exclude secrets and held prototypes, commit/push main through the tracked gate and verify origin. Prepare exact signed image/config/migration/rollback requirements for deployment, preserving stable mounted runtime patches.
- Preserve checkout enabled, outgoing payments disabled, deletion disabled, private webmail and the existing published payment policy. Off-host recovery remains absent and requires an explicit applicable deployment decision, not a reused waiver.
- Provide a complete next-release changelog, admin setup instructions and honest outstanding owner-led checks. Do not claim live Google/email delivery or real financial qualification from isolated fixtures.

## Acceptance checklist

- [ ] News cover and insert-anywhere multi-image rows are discoverable and work at 4 MiB.
- [ ] Every login uses a server-enforced two-minute resend timer.
- [ ] Uninvited booster entry explains missing access; invited email/Google still require separate MFA.
- [ ] New hosted checkouts navigate reliably, with safe continuation/recovery.
- [ ] Fixed packages are complete admin-defined offers, protected against customer overrides.
- [ ] Custom delivery requests use hours ranges and are distinguished from accepted promises.
- [ ] Region/server and role/hero relationships work in both selection directions and on the server.
- [ ] Option values can equal labels without breaking existing keys or contracts.
- [ ] Seller uploads, explicit account covers and structured skin collections work end to end.
- [ ] News/account/shop/package grids and persistent custom-boost action work on mobile and desktop.
- [ ] Pricing editor and audited MLBB setup guide make estimates understandable and testable.
- [ ] Senior rendered review, required tests/security checks and exact-source release evidence are recorded.

## Change log and evidence

- 11 October: roadmap and source/public catalog audit drafted. Owner clarified that the failing booster email has no invitation; included explicit eligibility feedback. No production data, invitations, messages or payments changed.
- Planning review round 1: senior designer `service_release_designer` requested explicit staff onboarding, delivery clock/start semantics and sticky-action scope (SE-D01–03). The document now specifies all three and the many-to-many hero ambiguity behavior. Rendered implementation review remains pending.
- Planning review round 2: `service_release_designer` returned PASS with no remaining actionable document findings. This qualifies the design contracts only; rendered implementation and end-to-end checks are still required.

- 12 October: SE01–SE03 source/component review rounds addressed revoked resend state, honest missing-link/offline recovery, shared-role provenance, seller relationships and compact validation focus. Rendered Chromium/WebKit review additionally found narrow native-select overflow and exact-value/default recovery issues; corrections and rechecks are tracked by the senior designer. No full-suite or deployment pass is implied.
- Focused server `service144/round4` passed auth and hosted-checkout integration checks against an isolated TiDB fixture; manifest SHA256 `c77f49c03e7ca2ccd524854bcd0e2277bb5637eef58d0bd6ccf4721e7b5f03a0`. Earlier readiness/reconciliation failures and the unstarted round3 attempt remain preserved. Its dependency scan reported no reachable vulnerabilities, with one non-imported dependency advisory; it does not certify later source edits.
- Focused server `service144/round5` failed a new test's expected anonymous status (expected403, actual documented401). Corrected assertion only; `round6` passed both private unsaved-pricing isolation and existing release/transport tests. Manifest SHA256 `202b5cc48492f777825957c0855d4dca0ee46f95c1e3db680b6d1f4cd9c1041c`. Later field-specific error paths are separately under regression/review. These runs used isolated synthetic resources and did not alter production.
- Added [MLBB setup and draft changes](mlbb-catalog-setup.md): audited manual-only pricing, exact field keys, explicit requested-hours replacement, configurable mappings and independently checked pricing examples. It contains no invented commercial rates or automatic publication.

- SE04 delivery timing correction passed the scoped senior recheck. New quote/package wording and requested ranges remain separate; legacy agreements retain their wording. Focused server `round7` passed fixed-package, quote, coupon and win-rate regressions with manifest `7810bcf058c6e63ce7239c4a53d3265bbfa5ed6cb7c074a92f2f1f14a8dbedde`.
- SE06 news composition passed independent rendered review (Chromium phone/tablet/desktop, narrow WebKit, keyboard, text enlargement, insert/order/remove and isolated upload-failure recovery). See `docs/redesign/reviews/SERVICE144_SE06.md`; simulated upload checks are not real storage/scanner qualification.
- SE07 adds private screenshot batches with identical uncertain retries and draft protection, structured skin groups, explicit staff-selected cover/order and authenticated expiring image previews. SE08 adds three/two/one-column square media tiles and a game-bounded custom action. They are in final rendered review; frozen `service144-r7` manifest `c406fcb87fdebc95fc56e566599302207ef5b2eed72a6483170520e207648561` is separate from later type/document changes.
- Focused isolated media/seller server `round8` started with manifest `df766af76295966619525d5455c809beae478ee8c0c0e9224c6f58e1a74b461a`. It uses disposable private database/storage/scanner fixtures, never production content. All eight selected integration scenarios plus scanner readiness passed. Fixtures were removed, with source, logs and failure history retained. No complete gate, commit, deployment or live funds/email check is claimed.

- SE05 final rendered recheck passed. SE07/08 review found missing required-group semantics, focus recovery, incomplete private cover preview, enlarged-text chooser bounds and a non-square account fallback. Corrections are frozen in `service144-r8` (`13efd0ecf7b54510ffc3fe24402390c4d24f77a63a6a3b47d0c58c1d271ac7d5`) for independent recheck. Twenty focused component regressions, typecheck, lint and three production builds passed. The earlier jsdom scroll-method failure and lint corrections remain in local evidence.
- The current backend completed Go formatting, vet, generated-code verification, migration validation and builds. The server live dependency scan against round8 reported no vulnerable imported/called packages (one non-imported module advisory); workstation primary and official mirror both returned403, retained as blocked local attempts.

- Final SE07/08 scoped rendered rechecks passed, including private-gallery expiry focus, WebKit screenshot outcomes, square account fallback and the320px/200% custom chooser. Final preview `service144-r11` manifest `a1b8e3eb1ab2c19aa649c416f4ecbfd636ace56e81695bae22ace815d59a9010`. All scoped SE01–SE08 findings are recorded in their review documents; broad combined qualification remains separate.
- Current frontend typecheck, lint, ten chooser regressions and all three builds passed. The earlier799-test local unit run included the held, untracked cameo tests; the clean server candidate excludes those prototypes and reports its own exact count. Existing server/portal checks and focused backend/media results remain bounded evidence.
- The initial full-run infrastructure precheck completed but correctly blocked on40 newly reported HIGH vendor package findings. The owner explicitly accepted those exact findings on12October; the original report and hashes are retained in `production/security/VENDOR_FINDINGS_2026-10-12.json`, with the decision/exposure review in `VENDOR_REVIEW_2026-10-12.md`. Acceptance is not a clean scan or a test waiver. The policy changes passed six fail-closed scanner tests and an exact40-fingerprint/previous-evidence preservation comparison.
- Isolated server `service144/full1` is prepared for the ordinary combined gate. No application commit, push, deployment, real financial test or new external email has occurred. The frozen candidate and actual run state will be recorded separately; existing production remains unchanged.

- Full candidate1 froze156files with manifest `3213df383932993df3a44ec4cc86027dab77bfbe653746474086c80ab1903377`; its early clean-clone frontend check passed789/790tests across178files and failed the purchase-review error-focus assertion. The assertion observed rendered error text before React's subsequent focus effect; it now waits for the same focused notice, preserving all customer-wording/no-reload/single-request checks. Five related local focus/validation tests pass; no application behavior changed. The original gate, source and failure remain under `service144/full1`. A separatefull2 retry is being prepared.
- Independent customer/seller, admin and booster rendered flow reviewers started afterfull1 dispatch against the immutable `service144-r11` application snapshot. Their bounded exploratory coverage and any correction rounds remain separate from automated gate results.

- Full2 manifest `aed481f5b8d7dcb132f52343f659f1fbf538512a1e2b34af80c81cc1e4dfbf79` stopped in its early unit check (788passed/2focus-timing assertions failed). Preserve both failed attempts;49focused asynchronous-focus tests now pass with unchanged required outcomes. No heavy suite/commit was reached.
- All three independent role reviews are recorded in `SERVICE144_CUSTOMER_MANUAL.md`, `SERVICE144_ADMIN_MANUAL.md` and `SERVICE144_BOOSTER_MANUAL.md`. The senior adjudication requires four scoped corrections (A01/B01/B02/C01); corrected source and26focused regressions pass, with frozenr12 rendered verification still pending. Actual31-journey coverage and untested limits remain explicit. A later full3 source will include the final reviewed corrections and test evidence; no full-suite/deployment pass is claimed.

- Final broad senior review PASS after four rendered rounds: A01/B01/B02/C01/C02 closed on final `service144-r14` manifest `fcfdb03bfe0cacf599ba1da177fcdb1618d8468538a8e208286d1eba54dbfc85`. Exact desktop/narrow/zoom/recovery evidence and honest remaining limits are in `SERVICE144_BROAD_ADJUDICATION.md`. Final27related component regressions, lint and all three builds passed. Full3 is prepared separately for normal complete qualification, retaining earlier failed sources/logs; production remains unchanged.

- Full3 manifest `17dba4dd38d1fe428c5f9fc2bc9375070f3503bf6092264dca5609c8d76b9022` stopped in the early clean-clone frontend precheck:799/800tests passed. One older admin-directory assertion raced its mocked refresh effect. The correction explicitly waits for that request, preserving all existing outcomes; all13directory cases passed locally and in three consecutive server reruns after an isolated dependency-copy setup repair. No application change or new design review is needed for this test-only delta. Full4 will retain the normal complete gate and all earlier failure evidence.

- Full4 manifest `b44fed2d8e9f76b133d83be257627b2f84a190e621783c9f471db65640d794ec` passed its clean800-test frontend precheck, infrastructure/configuration checks and backend static/security/race-unit stages. The normal complete hook then failed an older Google-linking assertion after93top-level PASS records including readiness: actual `ErrConflict` correctly rejected an already-verified staff identity, while the assertion expected generic `ErrInvalid`. The correction checks exact conflict, no returned token/new session, unchanged Google link and consumed flow. All six related race-enabled identity scenarios passed in isolatedround9. No runtime/UI change was needed, and no complete pass or deployment is claimed. Full4 failure evidence is preserved; full5 will retain the normal complete gate.

- Full5 manifest `75610a7712f33b019cc79def99ba5969af830ec9b85ef0a10e826cb01da8a3e3` passed the clean 800-test frontend precheck and backend static/security/race-unit checks, including the corrected Google conflict scenario. It failed at the HTTP email timing assertion, which still expected 60 seconds instead of the requested 120. The test now verifies the correct response and repeated-request rejection without changing application behavior. All 14 focused race-enabled identity scenarios passed in round10, manifest `3452f05eb656c200559213dfef5ea438c9c036fbac40e5c1c76bed2490d32cb9`, including recovery, rate limits and namespace/owner protections. A separate normal full6 gate remains pending; original failures are retained and production is unchanged.

- Full6 manifest `313b432e897102a01b4bbd750d535f9ae229d5ca6abd895335071d468d645409` completed the backend gate (database integration4548.233seconds), frontend static/security/800unit/build/server stages and152browser cases. Ten browser cases failed on stale selectors or fixed-package fixture assumptions; later frontend-container/production checks were not reached. The owner requested a scoped continuation retaining unchanged passed backend evidence. Five browser-only corrections preserve behavioral/security assertions; the first retry passed eight cases, while catalog alone required a further fixed-value label correction. Catalog's desktop retry passed; mobile and unexecuted stages remain pending. Full6 stays failed and its original source/logs remain immutable. See `service144-scoped-continuation.md`; no production change is implied.

- Scoped browser continuation completed: eight first-retry passes plus two catalog-only follow-up passes qualify all ten originally failed cases. The other152baseline browser results and passed backend/unit/build results are retained for unchanged bytes. Unexecuted frontend image/container and production stages are now running; their result, commit and release remain pending. Original failed runs are not relabeled passed.

- Production-retry1 retained all stages through infrastructure audit but failed isolated migration14 setup due to fast-index backfill's minimum100GiB scratch-disk requirement. No production-database business scenarios ran. The owner requested only that stage be retried. A two-file fixture-only correction uses a separate private initializer selecting standard backfill; live configuration, migration SQL and application code are unchanged. Manifest `4d4a87229001f0b429c1d6fdacf7985afb0528e8d8c9e6d96e36fb5ba65bf12f`, seven local fixture checks and two new server regressions passed. Database-only qualification is running; previous successful stages and original failures are preserved.

- The first database-only correction failed before business scenarios: TiDB8.5 requires fast reorganization when distributed index tasks remain enabled. The observed service error, failed state/log and partial proof are preserved in `database-retry1`; no migration journal was reset. The private initializer now disables distributed tasks before fast reorganization, keeping both fixture settings consistent. Manifest `7f293edac6dd04baba20db1a048ec4e197650c5907d2d7feffe0329f2872158b` binds the same two fixture-only files. Two changed fixture regressions passed locally and on the server. Only the unfinished production database stage runs in `database-retry2`, retaining all previously passed stages and original failures. Actual completion, commit and signed deployment remain pending; production data/configuration, financial settings and external-message authorization are unchanged.


### Service144 scoped qualification completed

The corrected real-TiKV database run completed successfully. Migration/history, TLS private storage/scanner, restart regression and the business suite passed. Completed aggregate proof SHA256: `93e6ea9f7cac50122545ac8957b08ce6525d3fe251d903ee3ccedbdb728abc45`; business log SHA256: `27f2e78ec7470a6606d5af3b5ae2c43127015dadca09fd30f89c90a6e0acd5f1`. This combines the actual database-retry2 result with unchanged earlier backend/frontend/browser/image/container/staging/configuration/security evidence; original failed attempts remain failed. No previously passed business/browser suite was restarted. The normal tracked commit hook retains fresh repository, lint/gosec/dependency checks and refuses changed or incomplete evidence. Signed release, deployment preflight, recovery decision and live activation remain separate and pending.


### Service144 deployed and verified (12 October)

Signed `72ed5947fddf5859899d8c3e2b4f9e73c62177d9` is live at schema 41. All 275 remaining real-TiKV scenarios passed with no failures/skips; previously passed suites were retained. Normal exact-source hook continuation, CI 38254809607, image release 38256446741, signature verification, live server preflight/deployment and 12 Chromium/WebKit public entry cases passed. The owner explicitly approved this release without off-host backup, accepting possible forward-fix recovery; the one-use exception is consumed, and no recovery pass is claimed. All financial/privacy/identity settings and stable mounted configuration remain unchanged. No live email/invoice/funds test or catalog publication occurred. Current manifest: `/srv/playora/releases/72ed594/deployment.env`. See `service144-scoped-continuation.md` for exact evidence and `mlbb-catalog-setup.md` for required admin publication of real prices, linked choices, hours and complete fixed offers. Real provider acceptance and off-host recovery remain outstanding.
