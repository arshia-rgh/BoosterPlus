# DI03 — discovery and content qualification

26 September 2026. **Delivered.** Implementation `8f891532578eb7522b4bc3708fcf39193a2437ca` is pushed and verified at `origin/main`. Base: `6abe96536ec4e3cd0c0ae6ec89bf8f543a5bf697`. DI04–DI15 remain subsequent application stages. R10/R11 remain held in `final-launch.md`.

## Delivered scope

- Versioned per-game Boost/Accounts/Shop/News capabilities. Legacy catalogs keep their existing boost/account behavior. Unimplemented Shop/News cannot be activated; their runtime promotion adapters remain DI11/DI12 work.
- Direct new boost orders, resale reservations, seller intake, estimates/discount checks, reorder, favorites and availability notifications consult released capability policy. Existing order idempotent retries and purchased snapshots remain intact.
- Reviewed package/account promotions pin target and coupon revisions. Publication and protected draft preview check current evidence. Public discovery omits disabled/future/expired/exhausted or obsolete promotions. Package prices/capacity and coupon claims retain their existing transactional authority. Anonymous offer projections are indicative and reserve nothing; account coupon discounts are not advertised because account checkout does not implement them.
- Bounded public game/site metric endpoints, `no-store`, rate limits and a four-second overall read budget. Published policy defines sample threshold, reporting period and freshness. Counts require the order's settled active contract; active counts exclude open service cases; completions use distinct currently completed orders with qualifying events in the labeled interval. Unpaid/cancelled records are excluded. Insufficient samples omit values and sample sizes; missing match evidence never produces a win rate.
- Homepage introductions in approved order and structured legal sections, preserving optional legacy compatibility and immutable accepted policy revisions. Staff controls reuse catalog revisions and content publication authorization.
- Explicit SQL migration 27 adds aggregate query indexes. Ent schema mappings/generated query metadata mirror SQL; no Ent/Atlas migration or startup DDL is introduced.

## Verification evidence

- Focused backend unit tests passed for catalog, site content, public metrics, orders and availability; affected resale/submission packages compiled.
- Isolated TiDB/race discovery suite passed, most recent run 19.729 seconds (`/tmp/playora-di03-focused.log`). Includes pause/new-purchase denial, existing replay, account intake/reservation denial, historical listing visibility, active/time/capacity/coupon projections, private definition suppression, publication failure/authorization, immutable content history, actual public HTTP contracts, completion deduplication, period boundaries, game isolation, unpaid/cancelled/disputed exclusions, small-sample suppression, cancelled read failure, two-query catalog release batching, migration 26→27/rollback/readiness.
- Root repository/secret/workflow/contract/whitespace checks passed. The attempted unchanged complete gate passed formatting, module tidy, script checks, generated code, vet, golangci-lint (zero issues) and standalone gosec before stopping at govulncheck.
- The initial complete gate stopped at HTTP 403 from the official vulnerability database; its official storage mirror also failed. After the owner's request to retry, the unchanged `make vuln` passed against `https://vuln.go.dev`: zero vulnerabilities affecting code or imported packages; one module-only advisory with no affected call path. Log: `/tmp/playora-di03-vuln-retry.log`. No database snapshot, suppression or skipped check was used. The subsequent unchanged complete hook also passed the live scan before commit.
- Frontend strict types/lint and 265 local unit/component cases passed with unchanged 100% route coverage, including the final validation-copy test. The local total includes ten pre-existing held cameo tests, which are not part of this stage's tracked changes.
- Complete frontend `make pre-commit` passed (`/tmp/playora-di03-frontend-gate.log`): formatting/contracts, types, lint, 265 local component cases and coverage, dependency audit, both builds, nine server cases, 86 desktop/mobile browser journeys, both container builds/scans and read-only non-root SSR smoke. Both frontend builds passed. Changed real browser journeys passed desktop and mobile, with 1280/768/320 reflow/accessibility checks, staff publication/history, valid/error/retained-draft states, account selector outage/retry, and historical legal sections. Current evidence is under ignored `frontend/test-results/di03-*`; the complete frontend rerun refreshed the friendly validation copy on desktop and mobile.
- Diff review corrected an additional availability edge case: a game favorite remains available if Accounts is active while Boost is paused; service/package favorites still follow Boost. New isolated TiDB assertions cover save/list and all-services-off behavior; the final complete integration suite passed with this correction.
- The first browser attempt caught a generated offer key that violated the existing catalog key grammar. Fixed to a stable underscore/alphanumeric key and added a matching parser/component assertion. Both changed catalog journeys passed on the next run. The initial failure remains recorded in `/tmp/playora-di03-browser-attempt1.log`.

## Senior designer gate

Reviewer `/root/di03_design_review` raised four scoped findings: optional toggle draft loss; validation reported as an outage; minor-unit account prices; policy-kind changes losing keyboard focus. Fixes retain values, register actionable field summaries, use the normal currency formatter and keep stable editor-only row identities. Follow-up visual review found no further layout issue; it requested plain validation copy instead of schema jargon. Fresh desktop/mobile evidence verified the plain copy and visible focus. The reviewer returned **PASS — no remaining actionable findings in the DI03 review scope**. See [review rounds and limits](reviews/2026-09-26-di03-discovery.md).

## Complete gate and delivery

The unchanged tracked hook passed at `/tmp/playora-di03-resource-gate.log`, exit 0:

- Root repository policy/secret scan, workflow lint, API parity and whitespace.
- Go formatting, module tidy/verification, script checks, Ent generated-code parity, vet, golangci-lint (zero issues), standalone gosec and live govulncheck.
- Race-enabled unit tests and complete isolated TiDB/storage/scanner integration suite: **457.767 seconds**, including the final favorite-availability correction. All 27 SQL migrations validated; CLI/server/worker builds and backend Compose validation passed.
- Backend/scanner image builds and required vulnerability scans; frontend formatting/contracts/types/lint, **265 local cases** (255 tracked plus ten held experiments), unchanged route coverage, dependency audit, both builds and nine server tests.
- **86 browser journeys**: 42 ordinary + one policy test on desktop and mobile, with no retries/skips. Both frontend images, required vulnerability scans and read-only non-root container smoke passed.
- Existing production configuration/security checks, gateway image scan and isolated deployment regression: explicit migrations, TLS/headers, real local email sign-in, secure cookies, role/CSRF boundaries, TLS storage, scanner, dependency outage/recovery and graceful shutdown. This regression does not resume R10/R11.

The staged diff was reviewed; no credentials, runtime captures, held prototypes or cameo files were included. `git diff --check` and its staged counterpart passed. Implementation was committed directly on main, pushed, and the remote SHA matched `8f891532578eb7522b4bc3708fcf39193a2437ca`. Test services were stopped and prior development-service states restored.

## Boundary and subsequent phases

DI03 supplies shared data contracts and scoped staff controls. The homepage/game-hub presentation is DI04; complete staff workspace and policy presentation remain owned by DI09/DI13. The implementation matrix now lists both public projection operations; no dependent screen is declared complete just because its contract exists. Shop/news target adapters remain explicitly assigned to DI11/DI12.

DI14–DI15 integrated qualification and owner acceptance remain separate. No physical-device, assistive-technology, live Google or real-funds qualification is claimed. Final launch remains held.
