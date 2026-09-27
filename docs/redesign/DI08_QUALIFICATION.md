# DI08 booster workspace qualification — delivered

27 September 2026. Base: DI07 receipt `c0d074dbf2079ca9363e6ea67b4cefcf677a1398`. DI08 is applied; delivery requires scoped designer approval and the unchanged complete gate. DI09–DI15 remain authorized. Final launch remains held.

## Applied scope

The isolated booster portal has a real assigned-work dashboard, server-filtered queue and persistent assignment record with Overview, Progress, Messages & proof, Sessions or Game access. Record identity/status/progress remain visible; query filters and dashboard/calendar return origins survive navigation. Ordinary drafts remain in memory across visited sections and recoverable connection failure; protected access unmounts when hidden. Permission changes clear private details and drafts, and explicit recovery waits for fresh authority before remounting content.

Queue and upcoming-session projections enforce current assignment and current settled contract before pagination. Search is bounded literal game metadata or exact order reference, never customer finance or private messages. The queue includes the next confirmed session. Advisory readiness reuses execution prerequisites; start/resume still rechecks authoritative guards in the mutation transaction. The legacy authorized booster conversation route resolves into its assignment-local Messages.

Calendar shows proposed versus confirmed sessions, configured zones and UTC offsets. Availability is a single reviewed date or a finite weekly series of at most twelve explicit dates within the existing ninety-day horizon. Removing a preview date creates an exception; removing a published date preserves the existing confirmed-booking guard. Every date remains editable for daylight-saving disambiguation. A series is one atomic transaction; full-payload-bound idempotency prevents changed-payload retries or partial publication. Unknown outcomes freeze the reviewed payload for deliberate same-key retry. No new recurrence scheduler or automatic booking is implied; existing SQL-owned availability rows are reused without migration.

## Evidence and corrections

- Focused TiDB race integration passed (19.242s, then 21.550s with concurrent same-key retry): ownership/customer denial, expired readiness, together-session prerequisites, stale assignment/current-contract exclusion, completed work, more than fifty queue/session rows, literal search/cursors, atomic rollback, changed-payload rejection, date exceptions and concurrent duplicate-safe publication.
- Go compilation, strict frontend types, ESLint and both production builds pass at intermediate revisions. Go lint/standalone gosec caught exported-type documentation and formatting; both were corrected and passed. Final applied checks remain required after review fixes.
- Initial component run: one old route fixture lacked router context after the new authorized conversation redirect. It now checks the unavailable staff boundary inside a router; dedicated redirect tests verify correct assignment routing and reject unshared, wrong-kind or unsafe references. Subsequent suite passed 335 local cases. Additional history/access/date-input cases are being qualified; held experiments remain excluded from commits.
- First real-API desktop/mobile journey exposed selected-tab contrast and the stronger assignment-level permission reset. Contrast was fixed. The second run verified cleared data but caught stale cached assignment remount during explicit recovery; recovery now waits for its fresh response before showing privileged components. Failed attempts are not qualification passes. Logs: `/tmp/playora-di08-focused-browser.log`, `/tmp/playora-di08-focused-browser-2.log`.
- Senior designer round 1 found six actionable issues: selected tab contrast, agenda metadata spacing, staff account wording, filter history mismatch, long-name overflow and narrow datetime clipping. Corrections are applied; round 2 is pending. See `reviews/2026-09-27-di08-booster.md`.

Synthetic previews supplement real-API tests; neither qualifies real funds movement, physical-device keyboards or owner visual acceptance. No merchant credentials, held cameo/audio assets or production data are used. Complete integrated journey acceptance remains DI14/DI15.

## Latest checks and review blocker

After the six UI corrections and the fresh-authority recovery regression, strict types, ESLint, both production builds and 341 local component cases pass (331 tracked plus ten held experiments). Go lint and standalone gosec pass; concurrent same-key calendar publication is included in the passing 21.550s TiDB run. The third browser attempt reached resumed sharing, then found the legacy redirect incorrectly requested a nonexistent booster-prefixed conversation API. It now uses the shared conversation endpoint with the existing booster portal header; the redirect unit assertion is corrected and the real-API journey is rerunning. Log: `/tmp/playora-di08-focused-browser-3.log`.

Independent designer round 2 is **BLOCKED**, not PASS: automatic approval review could not complete the browser command because of the account usage limit. A follow-up confirmed the same blocker. No required review is bypassed; DI08 remains uncommitted and undelivered, with the complete tracked gate still required after final review. DI09–DI15 are not claimed complete.

## Focused final automated result

The fifth real-API run passes both complete desktop/mobile fulfillment journeys (23.7s/24.5s browser runs), covering both execution modes, private game access, shared proof/media, revoked/resumed coordination, explicit fresh-authority recovery, authorized legacy redirect, progress, administrator-reviewed completion and split-date availability publication/session confirmation. Log: `/tmp/playora-di08-focused-browser-5.log`. The fourth attempt had already passed the corrected security/navigation sections but used the Overview completion wording while remaining in Progress; its assertion now checks the existing Progress message “Completion is awaiting administrator review.” The completion/role checks remain intact. Earlier failed attempts are retained.

Go vet and generated-code verification also pass. Contract validation and repository/secret/workflow checks pass. A final formatting check found only the redirect-test assertion layout; it was formatted without behavior changes. These results do not replace the blocked designer gate or the pending complete pre-commit gate.

## Independent final review restored

Senior designer round 2 resumed successfully and returned **PASS**, with all six findings resolved, 33 clean accessibility samples, no overflow at four viewport sizes, and successful draft/access/retry/navigation checks. See the scoped review for exact evidence and limits. All application checks listed above precede an unchanged complete tracked commit hook; delivery remains pending until that hook and direct-main push succeed.


DI08 first full tracked hook passed backend security, race tests and complete TiDB integration (538.612s), 30 migrations and container scans, then stopped at the unchanged frontend route coverage threshold: the new booster homepage route had no route-boundary test. All 341 component cases passed, but coverage did not. Added a route test asserting the booster capability boundary, homepage content and metadata; no thresholds or UI behavior changed. The unchanged complete gate must pass on retry. Docker initially needed restarting before the hook could start; no application failure or completed gate is inferred from that preflight.


DI08 second complete hook passed all backend checks (TiDB race integration 548.119s), 342 component cases and restored 100% route coverage, then failed the same outdated booster landing-page text assertion on desktop and mobile. All preceding MFA/portal-denial checks passed; the rendered destination correctly showed the new booster dashboard. Replaced only the obsolete placeholder-text assertion with checks for the actual dashboard heading, next-session region and assignment link; retained every authentication/authorization assertion. Both device suites reported 51 other ordinary journey passes. A focused real-API sign-in rerun and third unchanged complete hook are required; neither failed full hook is a delivery pass.


The corrected booster sign-in journey now passes against real isolated APIs on desktop and mobile (2.0s each), including all unchanged MFA and cross-portal denial assertions plus the actual dashboard destination checks. Log: `/tmp/playora-di08-identity-browser.log`. The third complete tracked hook follows; no application/UI change was required for this assertion correction.


## Delivery receipt

Implementation `6aa13d67e9e6b123db62011c5c5ead1887d31f30` passed the third unchanged complete tracked hook and was pushed directly to `origin/main`, with the remote SHA verified. Complete gate evidence: `/tmp/playora-di08-resource-gate-3.log`. Live Go vulnerability checks, golangci-lint and standalone gosec, generated-code checks, race units and TiDB integration (564.925s), 30 SQL migrations, 342 local component cases (332 tracked plus ten held experiments), unchanged 100% route coverage, 106 desktop/mobile browser journeys, dependency/build/container checks and isolated TLS deployment regressions all passed. The earlier route-coverage and obsolete browser assertion failures and their corrections remain recorded above.

The independent scoped senior designer verdict is PASS. All five DI08-owned views are verified; B05's legacy authorized conversation URL resolves into assignment-local Messages. Full design-matched journey acceptance remains DI14/DI15. No held experiments, secrets or runtime captures were committed. DI09–DI15 continue as authorized; R10/R11 and final launch remain held.
