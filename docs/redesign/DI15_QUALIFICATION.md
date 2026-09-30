# DI15 — integrated application qualification

30 September 2026. **DI00–DI15 implementation and automated qualification delivered; owner review pending.** No production activation, owner acceptance or R10/R11 authorization is implied.

## Qualification boundary

The accepted inventory has 115 views plus 15 bounded shop/news addendum views, 31 accepted journeys plus six addendum journeys, and 55 legacy route contracts. `implementation-matrix.json` binds screens to owned phase evidence; `journey-evidence.json` retains accepted exception/done guards and actual browser/domain scenario references. `JOURNEY_QUALIFICATION.md` distinguishes browser-visible paths from lower-layer authority, financial and concurrency branches. The inventory validator runs in the root gate; inventory validity alone never means scenario execution passed.

Senior integrated review and fix rounds are in `reviews/2026-09-28-di14-di15-integrated.md`. New short-height/enlarged-text checks use 320×450 at 100%/200% root font size, nine control hit points, readable ordinary words, selected-tab reflow, axe and viewport screenshots. Phase-local captures additionally cover 1440/768/393/320, source return/drafts, loading/failure/access loss and published configuration. Root text enlargement is explicitly not actual browser zoom or physical keyboard testing.

## Aggregate gate

Complete tracked hook PASS (gate6). Normal tracked-hook selection has been restored (`FOCUSED_UNTIL_DI15 = False`). The complete unchanged `make pre-commit` ran through the tracked hook, including repository/secret/workflow/contract checks, backend format/module/generated/vet/golangci/standalone gosec/live govulncheck/race/TiDB/migration/build/container checks, frontend format/types/lint/unit/route coverage/audit/build/server/browser/container checks and existing production configuration/staging regressions. A missing dependency, failed test or unreachable scanner is not a pass. The final receipt below records its results.

All financial scenarios use provider fixtures; `PAYMENTS_ENABLED` remains a pause switch, never a success bypass. Test databases and storage are isolated. The development database and live provider credentials are not used for destructive tests.

## Performance evidence

Final measured receipts are below. The unchanged home/experience build gates enforce transferred asset budgets. Browser home qualification records measured layout shift, load/render/frame timing, resources and CSP behavior. Additional JSON receipts record game-service navigation, admin quote preview and shop review latency plus document/resource metrics. These are local fixture observations with automation overhead, possible warm caches and no field percentile/SLA claim. Zero resource transfer values can indicate cache/unexposed values, not zero network work.

API scaling is bounded by server pagination/projection and tested authority/concurrency boundaries. Discovery explicitly asserts six-game public listing uses two batched Ent queries; article browse batches released revisions rather than performing one query per row. These measurements do not qualify distributed production load or real network latency.

## Owner review and retained launch work

Physical touch/virtual keyboard, actual screen-reader operation and true browser zoom across devices remain human/device qualification gaps. Automated focus, semantic accessibility and enlarged-text evidence are supporting checks. Actual domains, OAuth/email delivery, content/policy/art rights, merchant activation and controlled real payments/refunds/payouts remain in held `final-launch.md`, together with topology, TLS/gateway, remote CI/provenance, backup/restore, incident monitoring and release/rollback evidence.

No public games/prices/shop products/articles/retention terms were fabricated or activated by qualification. Owner visual/product acceptance remains the next step after the final implementation/qualification receipt. R10/R11 do not start automatically.

## Correction history before final aggregate pass

The entries below preserve the status at each attempt; the final delivery receipt supersedes their pending next steps, not their failures.

The first full gate passed backend security/race/generated/build checks, all38 migrations and the complete TiDB suite in946.997s, plus backend/scanner image checks. Frontend453 local cases and nine server cases passed. Both browser projects passed53/55 ordinary scenarios and both policy scenarios, but shop authoring assumed its item was on the first unfiltered page after pagination fixtures, and the support test retained an obsolete fixed-height composer expectation. This gate **failed**; containers/staging did not run afterward. Shop authoring now preserves an explicit search through creation/return. Short chat tests scroll/focus Send and require full viewport bounds, nine unobscured control points, retained draft and>=190px history; they do not shrink history or skip accessibility checks.

Senior review also found DI15-UX04: Back/Forward could restore committed shop/news results without restoring visible search/author fields. Fields now follow changes to their own committed URL value, preserving unsaved typing through unrelated filters. Unit/browser history scenarios verify both directions. Normal-text chat toolbar actions wrap naturally instead of each forcing a full row; enlarged-text legibility remains required. Final rendered review and repeated complete gate are pending.

The isolated TiDB emitted memory-pressure warnings at its4GiB container/3400MiB internal limit. The complete integration run still passed; capacity was raised to6GiB/5GiB for subsequent qualification, and idle development TiDB was stopped with its exact ID saved for restoration. No schema, business data, test assertion or timeout was altered by this resource adjustment. All temporarily stopped services must be restored after qualification.

Focused correction run1 passed all four desktop journeys and three mobile journeys. Mobile shop exposed a genuine acknowledgement race: typing again while a preceding search navigation commits could be overwritten by URL synchronization. Submitted-query snapshots now preserve newer typing for matching PUSH acknowledgements; POP history and different committed values restore fields. Seven unit cases include delayed superseding submissions, retained drafts and subsequent Back/Forward. A fresh browser/build run follows; the earlier failed run is retained. No timeout or assertion was relaxed.

Correction build2 passed all four focused desktop journeys(58.3s) and four mobile journeys(53.6s), covering shop/news history and publication, fulfillment and support. Short-chat Send is fully reachable and retains its draft; normal/text200 captures and history restore are refreshed. Seven focused filter cases, strict lint/types and both production builds passed. Full aggregate repetition remains required.

30 September resumption: full gate2 passed backend integration1091.813s,38migrations,security/build/image checks and frontend457local tests/137 files, audit, builds and nine server cases. Docker became unavailable during desktop browser execution (service-unavailable UI, database EOF/connection-refused, then mobile setup refused). This is a failed/incomplete gate; no DI15 commit was created. Docker and local mail/storage/scanner were recovered, and a new disposable TiDB6GiB/four-CPU instance was created on14001 with no development data volume. Source is unchanged since the scoped correction PASS; the complete gate is being repeated.

Gate3 passed complete backend integration917.736s,38migrations and backend/scanner scans plus457 frontend cases, then failed the live npm audit on newly catalogued brace-expansion and morgan advisories. The compatible lockfile-only remediation updates brace-expansion1.1.18→1.1.21,2.1.4→2.1.7,5.0.9→5.0.12 and morgan1.12.0→1.12.1, retaining parent versions and integrity-pinned registry artifacts. No override, advisory suppression or audit threshold change. The audit now reports zero findings; clean-install/full requalification follows. Primary advisory references: [brace expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [recursive parsing](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [comma parsing](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), [morgan](https://github.com/advisories/GHSA-9f6g-j8ch-79g4).

Gate4 passed the complete backend suite(1013.069s TiDB),38migrations,457 local frontend cases/137 files, nine server cases, both builds, audit and all114 browser scenarios:55ordinary desktop2.8m/mobile2.9m and two policy cases desktop33.2s/mobile37.5s. All five image scans and both frontend non-root/read-only container smokes passed. The final staging dependency probe then failed closed on stale scanner definitions; no commit was created. The qualification-only ClamAV cache was refreshed with the official updater; signed daily database28139 reports30September06:24UTC and verifies successfully. A diagnostic read initially mounted a literal `:ro` directory instead of using Docker's `readonly` option, so it inspected packaged definitions; the corrected mount verified the actual updated cache. Scanner freshness limits and application code are unchanged. Isolated staging repetition and the complete tracked hook remain required.

The fresh integrated senior UI review by `/root/di15_final_design_review` is PASS for the reviewed application scope, independently checking refreshed captures and114 browser receipts. No actionable finding remains; physical-device/AT/true-zoom/owner limits persist. This UI verdict does not turn the failed aggregate staging run into a pass.

The unchanged isolated staging retry passed explicit migrations, TLS storage/scanner checks, HTTPS routing/cache/headers, email sign-in/cookies/role/CSRF boundaries, dependency outage/recovery and graceful shutdown. Log: `.cache/qualification/di15-staging-retry.log`. Full hook repetition follows.

## Final delivery receipt — 30 September 2026

Implementation `3cda0cb9ad424e6b04de46880179c232a0c1f6cc` passed the unchanged complete tracked hook in `.cache/qualification/di15-full-gate6.log`, was pushed directly to `origin/main`, and its remote SHA matched. DI14 delivery is `0cd103323b1c60ca49fe9461d15b0aabe320330d`. Normal hook selection is restored; root/project pre-commit and CI retain their full gates. Earlier failed attempts are historical failures, not superseded passes.

Gate5 failed early on HTTP403 from the official Go vulnerability database; the owner restored network access and gate6 passed the live scan. Before that retry, the unchanged isolated staging regression passed after refreshing the qualification-only scanner definitions. The full gate6 repeated that staging check successfully. No check, timeout, freshness limit or security threshold was relaxed.

| Check | Final executed result |
| --- | --- |
| Traceability | 130 phase-verified views, 37 layer-mapped journeys and 55 legacy route contracts; a mapping is not 37 continuous browser journeys |
| Backend | Formatting/modules/generated code/vet/golangci/standalone gosec/race/build passed; live govulncheck zero reachable findings, one advisory only in an unused required-module path |
| TiDB | Complete race integration 983.469s; 38 ordered explicit SQL migrations validated |
| Frontend | 457 local cases/137 files; 447 tracked cases and ten held, unshipped cameo experiment cases; 100% instrumented-route coverage, not whole-application coverage |
| Browser | Chromium desktop 55 ordinary + 2 policy and mobile 55 ordinary + 2 policy: 114 passing scenarios |
| Builds and server | Both production frontend builds, existing asset budgets and nine server tests passed |
| Containers | Five image scans passed the configured no-fixable-HIGH/CRITICAL gate; storefront/admin non-root read-only smoke passed |
| Isolated staging | Explicit migrations, TLS storage/scanner, HTTPS/cache/headers, email/cookies/role/CSRF boundaries, dependency outage/recovery and graceful shutdown passed |
| Senior UI review | Final integrated PASS; no remaining actionable findings in reviewed runtime captures/source/logs |

All previously running services recorded in the two restoration manifests were restored by exact ID and verified running. The disposable qualification TiDB is stopped. Held untracked cameo/prototype experiments are preserved and excluded from delivery. No real provider transaction, production migration or public activation was performed.

### Measured local performance

- Desktop homepage: 928,926 transferred bytes, LCP 96ms, CLS 0, 0 observed CSP violations and 0 remote resources.
- Mobile homepage: 660,871 transferred bytes, LCP 80ms, CLS 0, 0 observed CSP violations and 0 remote resources.

| Local interaction (includes automation/assertion overhead) | Desktop ms | Mobile ms |
| --- | --- | --- |
| game-service | 275.4 | 55.3 |
| admin-quote | 115.0 | 114.1 |
| shop-review | 30.2 | 37.6 |

These are local unthrottled fixture observations, not field percentiles or service guarantees. Warm caches and unexposed transfer values affect measurements. Document/resource metrics belong to the last document navigation, not necessarily the measured SPA transition. Raw receipts remain in ignored frontend `.cache/home-lab-*.json`, `.cache/di15-performance-*.json` and runtime PNG captures.

### Exact locally qualified artifacts

These are local Docker image IDs, not registry release digests or remote CI provenance. Requalify release artifacts under held R10/R11.

| Image | Local ID |
| --- | --- |
| boosterplus-backend:local | `sha256:1cc4c400d314ab93bca94e1dca2f325735a0a00771de82ff111e012cba87c338` |
| boosterplus-frontend:local | `sha256:18ae615062fca2aaa70d099a95041ca2d37324c14c3207fd70c1efc6c0609998` |
| boosterplus-admin:local | `sha256:9a341158129d48c32c9588a8f55e39d4ff7dfd214166598789a1eb22690e4ec6` |
| boosterplus-scanner:local | `sha256:1cabf38cb99a7acf42fc02fe3b56e4e44e76a798c88403a1079392a2b9bb08d8` |
| boosterplus-gateway:local | `sha256:234d955fea6e225b151a83f79a371ba43daa7c921bfc05c809e273f5f9f44575` |

Owner review is next. Physical-device/virtual-keyboard/assistive-technology/true-zoom qualification, live merchant money movement and real identity/domain/operational release qualification remain explicitly open. R10/R11 stay ON HOLD.
