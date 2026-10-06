# Mobile website and panel review — 6 October 2026

Base: `32e78ed8c600d457b2d0480d96f5b87751fc0ade`. Owner requested mobile review and fixes across the website and customer, booster and admin panels. Green branding, business rules, artwork sources and portal boundaries remain unchanged.

## Scope and changes

- Shared customer/booster mobile navigation uses balanced rows and omits duplicated authenticated masthead links. Messages remains directly available in the customer shortcuts. Desktop navigation is retained.
- Task backgrounds have a stronger contrast veil. Decorative mobile layers use stable large-viewport height; game heroes use responsive artwork/copy spacing and retain each game's configured focal point, failure fallback and reduced-motion control.
- Customer, booster and admin queues have compact mobile filters. Advanced admin filters use an accessible disclosure, reopen for applied URL filters, and preserve query/return context.
- Booster records retain one visible record identity while the generic page heading stays available to assistive technology. Customer order tools use less vertical space.
- Mobile chat no longer reserves desktop floating-widget clearance. Touch inputs retain at least 16px text without preventing user text enlargement.
- The activity header wraps by available space instead of squeezing away the logo. Customer/booster/admin drawers retain readable headings and Close buttons at 200% text.

## Independent review rounds

Reviewer: `/root/mobile_design_review`, senior UI/UX designer; rendered evidence plus changed source, scoped to the above shared behaviors.

| Finding | Initial result | Resolution verified |
| --- | --- | --- |
| MOB-01 | Navigation leaves an orphan More shortcut and duplicates header destinations | Balanced navigation; duplicate masthead shortcuts removed only inside authenticated mobile workspaces |
| MOB-02 | Queue filter spacing hides work below excessive form height | Compact labeled filters; secondary admin filters disclosed |
| MOB-03 | Booster assignment repeats generic and record headings | Persistent record identity retained, duplicate heading visually hidden |
| MOB-04 | Customer record tools consume unnecessary vertical space | Compact toolbar and record spacing |
| MOB-05 | Activity control removes brand at enlarged text; first fix broke support mid-word | Intrinsic wrapping header preserves brand and whole control words |
| MOB-06 | Drawer titles/Close controls collapse into letter stacks at enlarged text | Fixed narrow gutters, wrapping headers, explicit dialog maximum width and readable Close controls |

The first review returned FAIL for outstanding MOB-05/06; the implementing agent fixed them and sent new built-app renders to the same reviewer. Final verdict: **PASS — no remaining actionable findings in this scope.**

## Evidence and limitations

Private local evidence is in `.cache/mobile-review/`: synthetic read-only data, 23 representative routes/states, phone 320×740 and 390×844, tablet 768×1024, desktop 1440×900 and landscape 844×390. The core 14-route matrix also covered 320px at 200% root text. No page overflow or sub-16px mobile text inputs were found in that matrix. The additional nine routes cover settings/security, seller entry, catalog, reports and recovery states; the catalog editor was subsequently captured populated at its correct query-based route. The initial missing game metadata and incorrect admin/editor preview routes were fixture errors, not product defects.

`header-*`, `drawer-*`, `assignment-final320.png`, `order-final320.png`, `game-service320.png` and `catalog-fields320.png` capture the final review contexts. Keyboard Escape restored drawer trigger focus for all three roles at normal/enlarged text. Reduced motion disabled the game backdrop animation. The chat composer capture contains an unsent synthetic draft; no external message was sent. The first synthetic chat read receipt used the wrong response shape; it was corrected to 204 and rerun before successful composer inspection.

New browser regressions cover compact queues, applied advanced filters/clear, responsive navigation, input sizing, visible brand and coherent drawer controls at 200% text. The build initially exceeded the shared CSS budget by 69 bytes; task-only styles were moved into their route stylesheet, preserving the existing budget. 137 unit files/460 tests passed before final CSS refinements; the normal frontend commit gate will repeat required checks on the frozen final source. No full frontend/server gate or production rollout is claimed by this preparation record.

The additional WebKit mobile run found native admin-dialog focus did not return to Menu after Escape. An explicit trigger reference and close handler fixed that behavior; the rebuilt four-test mobile suite then passed in WebKit. The senior reviewer separately reviewed this bounded focus delta and returned PASS. The first isolated server gate stopped on formatting in the new regression file; formatting was corrected, with failed-run evidence retained in mobile122. Neither failure was counted as a pass.

This is synthetic Chromium/WebKit and independent screenshot/code review, not physical iOS/Android or assistive-technology acceptance. Shop/news editor captures establish recovery-state layout only; their real-data workflows remain covered separately by the existing browser qualification. Design review does not prove there are no undiscovered issues.

The next server attempt (mobile123) stopped at four custom-form unit failures: the focus assertion could run after the invalid attribute appeared but before React's focus effect, and `clearAllMocks` retained the unused one-shot API response after that failure, cascading into later cases. The unchanged isolated file passed on the same server. The test now awaits both the invalid state and required focus and resets mock implementations between cases; assertions and coverage thresholds remain intact. This test-only repair does not alter production validation behavior. A fresh normal gate is required for the repaired candidate.

Mobile124 passed all 136 committed frontend unit files/450 tests at the existing 100% route coverage thresholds, then the live npm audit blocked three existing dependencies. The prepared lockfile updates only compression 1.8.1→1.8.2 (plus its destroy dependency), proxy-addr 2.0.7→2.0.8 and source-map-js 1.2.1→1.2.2. The fresh lockfile audit reports zero vulnerabilities. Advisory references: [compression](https://github.com/advisories/GHSA-vc2v-76pw-4v95), [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). The dependency change expands the ordinary hook to the full repository gate; frontend qualification alone is not that gate or an authorization to bypass it. No commit or production deployment is claimed.

Mobile125 passed components/audit/build/server checks, then Linux Chromium found Overview/Messages too wide at 320px/200% text in the existing longest-word test (74/75 ordinary desktop journeys passed, followed by both separate policy journeys). The run was stopped after this confirmed failure while the mobile batch was still incomplete, preserving its evidence. The workspace grid now retains balanced normal-size rows while allowing fewer columns as rem-sized text grows. Rebuilt local Chromium desktop/mobile (8 tests) and WebKit mobile (4 tests) passed. Fresh phone/tablet normal/enlarged renders are `nav-final-*`; final Linux and full frontend qualification must cover this CSS correction.

The adaptive navigation re-review passed, but its new 768px/200% render exposed MOB-07: the booster queue's three-column filter grid squeezed the search label. Customer/booster filters now stack through 850px; a browser assertion measures the associated search label's longest word at tablet width and 200% text. Initial test code incorrectly assumed the input nested inside its label; it now uses the native `input.labels` association. Corrected local Chromium desktop/mobile (8) and WebKit mobile (4) passed. Fresh `filters-final-*` renders retain earlier `nav-final-*` evidence.

Mobile126 passed all 75 ordinary desktop journeys and both policy journeys. The mobile batch passed 74/75 ordinary journeys, then the ten-minute disposable backend expired while support history recovery was being checked; the page correctly showed service-unavailable recovery, and the fixture reported `browser tests did not stop environment` after 613.82 seconds. Both mobile policy journeys passed separately; the attempt remains failed. The complete runner now uses complementary Playwright ordinary shards 1/2 and 2/2, each with its own ten-minute environment, followed by the independent global-policy batch. This retains every scenario, existing timeouts and failure propagation. All six runner-selection tests pass. No production backend limit changed, and no failed attempt is reused as a complete pass.

Mobile127 passed the new Linux focused responsive checks but stopped on a redundant null fallback in the added label-measurement test. Removed that fallback; local ESLint, formatting and TypeScript then passed. This remains a failed gate, not a completed qualification.

Senior final review: **PASS — no remaining actionable findings in the reviewed mobile scope.** The reviewer verified new `filters-final-*` captures, confirming MOB-07 resolved at 768px/200% and intact narrow-phone layouts. All MOB-01–07 are resolved.

Mobile128 passed 136 unit files/450 tests, static/security/build/server checks and the focused Linux regressions. Its mobile fulfillment journey hit the 150-second aggregate test limit; redacted trace timing showed completed actions/expectations, the slowest individual expectation about 2.5 seconds, and substantial multi-viewport capture/cleanup overhead. The timeout is raised only for that three-portal/two-mode journey to 240 seconds, preserving per-action/expectation deadlines. This is test infrastructure only. Mobile128 remains a failed overall attempt, even though its other passed scenarios are retained. The final timeout correction requires an explicit successful rerun and current artifact checks; the ordinary full repository commit gate has not passed.

Mobile128's completed result was 152/154 browser journeys passed, with two aggregate timeouts: fulfillment at 150 seconds and the policy/export/deletion/print journey at 180 seconds. The latter snapshot was already on its final expected unavailable-policy recovery page. The policy journey now permits 300 seconds overall while preserving its individual action/assertion deadlines. Local formatting, ESLint and TypeScript pass for both timeout-only corrections. These do not change runtime code, coverage or scenario assertions. Separate source-bound reruns and image checks are required; no complete gate pass is inferred from the partial run.

Mobile129 passed current Go lint/gosec/live vulnerability checks, repository checks, all 450 frontend unit tests, dependency audit, builds and ten focused desktop/mobile fulfillment/layout regressions. The fulfillment timeout repair is verified. Its image scan then failed on seven fixable Perl advisories in Debian Bookworm's `perl-base` u3. Both frontend targets now request the official `5.36.0-7+deb12u4` package alongside the existing PCRE2 security pin; see the [Debian Perl tracker](https://security-tracker.debian.org/tracker/source-package/perl). Fresh images, scans and container checks are required. Mobile130 refused to start because its predecessor failed, leaving the server candidate unchanged; no policy rerun or artifact pass is inferred.

## Final prepared candidate qualification

Mobile131 completed successfully: current repository checks, Go lint/standalone gosec/live govulncheck, frontend formatting/types/lint/audit, the policy journey on both desktop and mobile, both rebuilt application images, both live image scans and non-root/read-only container smoke checks. The patched images report no fixable HIGH/CRITICAL findings under the existing scanner policy; this is not a claim of vulnerability absence.

| Evidence | Result |
| --- | --- |
| Senior mobile design review, MOB-01–07 and admin focus delta | PASS |
| Frontend units/coverage, mobile129 | 136 files / 450 tests PASS at existing coverage thresholds |
| Full browser attempt, mobile128 | 152/154 PASS; two aggregate timeouts, overall attempt FAILED |
| Fulfillment and responsive regression rerun, mobile129 | 5 desktop + 5 mobile PASS |
| Policy/export/deletion recovery rerun, mobile131 | Desktop + mobile PASS |
| Chromium / WebKit focused narrow/enlarged-text checks | 8 / 4 PASS |
| Current dependency audit, mobile131 | Zero reported vulnerabilities |
| Storefront/admin patched images, mobile131 | Builds, security scans and isolated runtime smoke PASS |
| Complete repository backend/production gate | NOT RUN for this candidate |
| Commit / push / deployment | Pending; no production change |

Application and lockfile bytes are identical across mobile128/129/131. The only later differences are the two aggregate test timeouts, the official Perl security package pin and this record. Private manifests, logs, source-continuity and image/scan receipts preserve this binding in `.cache/mobile131/` and `/srv/playora-qualification/mobile131/`; earlier failures remain failures. Every browser scenario has a passing result across the source-bound complete attempt and focused reruns, but this is not represented as a single full-suite pass.

The security lockfile/image patch and browser-runner repair select the full gate under `AGENTS.md` and `scripts/commit_gate.py`. Committing with the completed bounded qualification requires an explicit one-use owner exception; no earlier login/webmail exception is reused. Normal tracked hook/default gates remain unchanged. Production rollout, physical-device acceptance and off-host recovery remain separate.
