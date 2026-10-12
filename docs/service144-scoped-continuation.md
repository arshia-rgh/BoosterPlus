# Service144: owner-requested scoped qualification

The owner requested fixing the full6 browser failures, rerunning the failed browser cases and continuing checks that had not run, without repeating passed backend tests. This is evidence reuse for unchanged source, not a test waiver or a complete-suite pass.

## Baseline and retained results

- Base: `6b2cfb959b169ed89bbd47e133ff552f3fcae976`.
- Full6 staged tree: `6a6b93f65a921e5b5d2f4886d01995dc0d586ee5`.
- Candidate manifest: `313b432e897102a01b4bbd750d535f9ae229d5ca6abd895335071d468d645409` (176 files).
- Failed complete log: `c40bba097e6c8d232ccdc0a4ca0c5b9bebc0b8579c332f08ab0dfb6be842b709`.

Full6 completed the backend gate, including race unit tests, security/static/generated-code checks, the database integration suite (4548.233 seconds), migration checks, builds and backend/scanner image checks. Frontend contracts, formatting, type checking, lint, 800 unit tests, audit, three application builds, server and portal tests also passed. Browser qualification had 152 passes and 10 failures: five journeys failed on each device project. Full6 is still a failed run and did not create a commit.

## Corrections and retry boundary

The changed files are the five affected browser specs. Application code, dependencies, migrations and reviewed r14 UI remain unchanged:

1. Catalog: enter ordinary currency amounts using the current labels; explicitly define fixed contents, excluded fields and customer delivery information. Verify the customer cannot edit the included boost specification. Retain delivery eligibility, coupon, publication/version conflict and availability assertions.
2. Game shell: select the named custom-boost action and verify its destination, preserving persistent game identity, focus, navigation and accessibility assertions.
3. Layout: the real fixture has no Google provider, so verify its one available email consent link, unavailable-provider explanation, keyboard access and underlining. Retain responsive/recovery and accessibility checks. This does not qualify live Google login.
4. News: use the current cover-image labels; preserve private-before-publication visibility, editing, preview, publication, correction and unpublish assertions.
5. Orders: declare the fixture's fixed package contents before publication; collect only its declared delivery instructions. Preserve slow-hydration protection, agreements, history and custom-order journeys.

The retry selects these exact five test titles on desktop and mobile. Browser fixture startup uses its disposable database and local mail sink; it does not rerun the backend business suite. Unchanged passing browser cases remain bound to the baseline. Original screenshots, traces, failure logs and source are retained.

## Remaining checks and commit binding

After the browser retry passes, complete frontend image builds/scans and container smoke, then the unexecuted production gate: deployment/tooling tests, gateway build/scan, staging, runtime configuration, current infrastructure audit and the separate self-hosted real-TiKV qualification. The latter verifies the production database/storage stack and was not reached in full6; the passed backend fixture suite is not restarted.

Qualification evidence must identify the actual application files and corrected tests, exact commands, exit status and log hashes. A narrowly bound normal-hook continuation may reuse only that completed evidence, while refreshing repository and required security checks. Missing, failed, changed or unrelated evidence must refuse reuse. Clean checkouts keep ordinary gates; no general skip flag is introduced.

Focused browser result: all ten originally failing cases now pass. The first retry retained eight passes (game shell, layout, news and orders on both devices); its catalog failures remain recorded. The catalog-only follow-up passed desktop (1.5 minutes) and mobile (1.7 minutes), with corrected test manifest `1cedc64c2861231aa9b84aba5c814439691d5941b8f5fed493c7ca921fd977b1`. Four already-passing journeys were not repeated. Together with the unchanged 152 baseline cases, the browser coverage is now qualified across the exact retained sources; full6 itself remains failed.

Historical continuation start: the unexecuted frontend image/container and production checks started in `service144/continuation1`. A completed aggregate proof will bind each real result and source hash. Commit, push and release are not completed yet.

Preserve independent identities/MFA, payment policy revision3, checkout enabled, outgoing transfers/deletion disabled and private webmail. No external mail, provider invoice, funds action or live policy publication is authorized. Off-host recovery is absent; schema41 does not by itself prove old-image compatibility with newly saved catalog, article and account structures. Prepare the exact signed release and recovery decision before activation.

The frontend image/security phase and container smoke passed (logs `68c31f29260a1b0c188bafcafd11c08eb0836e9417b4d2d8051763793f727fc7` and `4f767c8a8534797fd83b2055e991935ce9af1ad733812d16431e4dc88bb8db17`). Production tooling tests and gateway build/scan passed before the private orchestration review found its four-hour outer limit was shorter than the existing six-hour database limit. Only the unfinished isolated production process group was gracefully interrupted before any real-TiKV business suite started; staging cleanup completed and original logs/receipt remain. The production-only continuation uses a seven-hour outer deadline, retaining both completed frontend phases and all earlier backend/browser evidence. No application, production configuration or test assertion changed for this runner correction. The original interrupted attempt remains unpassed; `production-retry1-state.json` and `remaining-3-retry1.log` are the current remaining-check status/log.

The current production continuation passed staging migrations, TLS storage/scanner boundaries, three-host routing, host-only identities, CSRF, dependency outage/recovery and graceful shutdown. All pinned runtime configuration checks passed. Infrastructure scan completed with519 previously owner-accepted findings and zero unaccepted findings; this is not a clean scan. The previously unexecuted real-TiKV qualification is now the remaining stage. Its inner six-hour limit and five-minute grace are preserved; only the outer private runner was corrected.

Historical production-retry1 commands (superseded below):

```sh
ssh -l playora playora 'cat /srv/playora-qualification/service144/continuation1/production-retry1-state.json'
ssh -l playora playora 'tail -n 50 /srv/playora-qualification/service144/continuation1/remaining-3-retry1.log'
```

The main log identifies the separate private per-scenario database log once that stage starts. `production_qualification` means running, not passed. The source-bound completion artifact will be `remaining-proof-production-retry1.json`; the one-use hook proof hash intentionally remains unset until all remaining checks actually pass.

## Database-only correction and retry

The owner explicitly requested correcting the isolated database setup, rerunning only that remaining production database stage, and then continuing the release. The failed production-retry1 log is `0d24353050e08ac7e5b188b8a754c1677655faeecf2da72daf138f441c07b996`; its incomplete proof is `f6160bf03a0a15e75d2289fab18362e736a9eed40b2174f558b69676029f5dda`. Deployment/tooling, gateway build/scan, staging, runtime configuration and the519accepted-finding infrastructure audit completed before the failure and are retained. The real-TiKV business suite had not started.

The first schema-index operation failed because accelerated index backfill required100GiB of local scratch space while about13GiB was available. The subsequent retry correctly refused migration14's incomplete state. TiDB's documented minimum `tidb_ddl_disk_quota` is100GiB, so setting a smaller quota would not fix it. The fixture now creates a separate private initializer with `tidb_ddl_enable_fast_reorg = OFF`, using normal index backfill on its fresh disposable cluster. Production initialization bytes, live database settings, migration SQL/checksums, privilege checks, real TiKV, TLS and business assertions remain unchanged. This is semantic/security qualification on reduced resources, not production DDL capacity evidence. See [TiDB system variables](https://docs.pingcap.com/tidb/stable/system-variables#tidb_ddl_disk_quota-new-in-v630).

The correction changes only `production/deploy/self_hosted_test.py` and its focused fixture tests, manifest `4d4a87229001f0b429c1d6fdacf7985afb0528e8d8c9e6d96e36fb5ba65bf12f`. Seven fixture regressions passed locally; only the two new fixture cases ran on the server and passed. The original two source files and failed service diagnostics were copied into private `database-retry1/before` before applying the delta. The previously successful stages are not restarted.

First database-only attempt: `make -C production self-hosted-test`, with the existing six-hour suite timeout and seven-hour outer bound. It subsequently failed at setup as recorded below. The normal commit-hook continuation refuses missing/failing evidence, binds the changed fixture files and retains the original failed production result without rewriting it as a complete pass.

```sh
ssh -l playora playora 'cat /srv/playora-qualification/service144/continuation1/database-retry1/state.json'
ssh -l playora playora 'tail -n 50 /srv/playora-qualification/service144/continuation1/database-retry1/database.log'
```

These are retained first-attempt commands. The failed `database-retry1/proof.json` is preserved, not a completed qualification proof. Commit/push, signed release and deployment remain unfinished.


### Paired fixture settings and current retry

The first fixture correction exposed TiDB8.5's second prerequisite: distributed index tasks cannot run with fast reorganization disabled. The actual service error was `Unsupported tidb_enable_dist_task setting. To utilize distributed task execution, please enable tidb_ddl_enable_fast_reorg first.` This was another migration14 setup failure, before business tests. Retain failed attempt1's state (`926a4348ca52b9d5e8a66ba478b79c261a0af4218ca253f10713af17e49d586c`), database log (`d332834657a5d0b15e1d7713850bcb4a135fba74db42e2ad764a7cb45ef427c3`), partial proof (`5eb2e4383b741cf7e616dbfaa80219345b41e6b35325d721d16e13af50d7cab8`) and private service diagnostics (`045e65c23b91e0bb6a3cec6d72ffde12493065b977e1584ba1d8554c602b8e55`). No partial migration journal was cleared or reused.

`database-retry2` provisions another disposable cluster. Its private initializer first sets `tidb_enable_dist_task = OFF`, then `tidb_ddl_enable_fast_reorg = OFF`, selecting ordinary transactional backfill with both dependent settings consistent. The two-file patch manifest is `7f293edac6dd04baba20db1a048ec4e197650c5907d2d7feffe0329f2872158b`. Both changed fixture cases passed locally and on the server; the unchanged broader fixture tests are retained from the first correction. Runtime application, dependency, schema and production configuration bytes remain unchanged.

Only the remaining production database target is running. Earlier failed evidence is hash-bound into the new proof; all completed qualification stages remain retained. Current status is in progress, not passed. Inspect this attempt with:

```sh
ssh -l playora playora 'cat /srv/playora-qualification/service144/continuation1/database-retry2/state.json'
ssh -l playora playora 'tail -n 50 /srv/playora-qualification/service144/continuation1/database-retry2/database.log'
```

The successful completion artifact, if the checks pass, will be `database-retry2/proof.json`. The normal-hook proof hash remains deliberately pending until that actual result exists.


### Release continuation boundary

The paired-setting correction has now passed migrations and history verification, TLS private S3/scanner checks and restart regression; real-TiKV business scenarios have started. Root repository/secret/contract/workflow checks and six continuation-safety tests pass. The candidate inventory remains186files, excludes the three held prototype files and preserves all qualified application/dependency/migration bytes.

An exact-source private continuation is prepared under `service144/continuation1/release-preparation`. It waits for a successful database-retry2 proof, retains every original failure, then runs the normal tracked hook's owner-approved continuation with fresh repository, lint, standalone gosec and dependency checks. A successful hook may commit the186-file candidate on main; the local coordinator verifies the bundle and source byte-for-byte and refuses any concurrent local/remote change before a normal, non-forced push. Only then may exact-commit lightweight CI and the five-image release build/scan/signature sequence run. An uncertain or failed write is not automatically repeated. No successful commit, CI, signature or activation is claimed in advance.

The continuation stops at a signed candidate. Live preflight and the exact recovery decision still precede activation. The database schema stays41, but newly stored catalog relations, delivery ranges, package presets, article image rows and listing covers are not proven safe with old application code. Do not treat a matching schema number as sufficient rollback compatibility. Off-host recovery remains absent; preserve the current signed3a9f694 release and all mounted configuration without claiming it can safely interpret every newly saved document. Current identities/MFA, payment revision3, checkout enabled, outgoing transfers/deletion disabled and private webmail remain unchanged. No external email or live financial test is included.


### Service144 scoped qualification completed

The corrected real-TiKV database run completed successfully. Migration/history, TLS private storage/scanner, restart regression and the business suite passed. Completed aggregate proof SHA256: `93e6ea9f7cac50122545ac8957b08ce6525d3fe251d903ee3ccedbdb728abc45`; business log SHA256: `27f2e78ec7470a6606d5af3b5ae2c43127015dadca09fd30f89c90a6e0acd5f1`. This combines the actual database-retry2 result with unchanged earlier backend/frontend/browser/image/container/staging/configuration/security evidence; original failed attempts remain failed. No previously passed business/browser suite was restarted. The normal tracked commit hook retains fresh repository, lint/gosec/dependency checks and refuses changed or incomplete evidence. Signed release, deployment preflight, recovery decision and live activation remain separate and pending.


## Signed release deployed — 12 October 2026

The remaining database run passed 275 top-level scenarios, with zero failures/skips, in 12242.344 seconds. It also completed migration/history, private TLS S3/scanner and restart checks. The aggregate completed proof remains `93e6ea9f7cac50122545ac8957b08ce6525d3fe251d903ee3ccedbdb728abc45`. Earlier passed suites were retained, not restarted; original failed and interrupted attempts remain preserved. The normal tracked hook's exact continuation refreshed repository, lint, standalone gosec and dependency checks before committing the 186-file candidate.

Implementation commit `72ed5947fddf5859899d8c3e2b4f9e73c62177d9`, tree `f3c6a0367a2d20cd3c2694e5e696bee094bf5233`, was verified and pushed directly to main. The three held prototypes remained excluded. Exact [lightweight CI 38254809607](https://github.com/arshia-rgh/BoosterPlus/actions/runs/38254809607) and [five-image release 38256446741](https://github.com/arshia-rgh/BoosterPlus/actions/runs/38256446741) passed. The release manifest SHA256 is `7bd6f56e9e22a61d215dcbbc07263b58a2ff2627f7d999067b1ad644b97e648d`; its signature, provenance and SBOM bindings verified. The existing infrastructure findings remain 519 specifically accepted findings, not fixed vulnerabilities.

A partial signed-bundle transfer stopped before registry authentication or any live operation. Its evidence is preserved; existing files were verified and only missing files transferred. The completed read-only preflight validated configuration, immutable images, schema 41/history and unchanged private inputs. Preflight receipt SHA256: `c3b2c88ec4a1a5f6916485648b557d38c516d88883c5da320aa6b388673801fa`.

After reviewing that concrete candidate, the owner answered **“Deploy 72ed594 with this recovery risk”** to the explicit absent-off-host-backup/forward-fix recovery question. The protected decision binds the exact base, target, preflight and signed bundle. That one-release approval is consumed. It does not establish a backup, qualify old-application compatibility with newly written structures, waive future recovery requirements or authorize external messages/funds tests. The previous signed release remains retained as evidence; do not blindly revert after new catalog/article/account data has been saved.

Deployment completed at 2026-10-12 13:56:09 UTC. Current manifest: `/srv/playora/releases/72ed594/deployment.env`. The normal serialized release journal is complete, schema 41 and migration checksums verify, and all six application services use their signed images and are healthy. Website/admin/Pro HTTPS routing, host-only identities, redirects and security headers passed. Mailserver/private webmail health and the SSH-only HTTPS login passed. Stable 99f60bd mounted runtime/configuration hashes remain unchanged; ephemeral registry credentials were removed.

Checkout remains enabled, outgoing payments remain disabled, and existing deletion holds, MFA/independent identities, payment-policy revision 3 and private mail access are preserved. No live catalog, package price, option relationship, policy or staff invitation was published by deployment. No test email, invoice or transfer was initiated.

All 12 post-deployment read-only Chromium/WebKit cases passed at 320px and 1440px across customer/admin/booster sign-in pages: terms links, visible keyboard focus, automated accessibility and 200% text overflow. Browser result SHA256: `6204edb0dc0cccbc2546a27aacc178d7fe47d30d04d23280bce511737c4449df`. These are live public entry checks, not authenticated live journeys or real provider acceptance. The production receipt manifest SHA256 is `09954a756442948f3a110c01116bbcc4b5f4d9f0a0b13a4f206c55bb56c20340`; evidence stays private under `.cache/service144/continuation1/release-preparation/` and the matching server qualification directory. The authoritative activation evidence is the complete release journal and `deployment-state.json`; the runner wrapper's inherited static `activated:false` field is not an activation result.

### Owner configuration after deployment

Use `docs/mlbb-catalog-setup.md` for the reviewed editor workflow. The audited live MLBB definition uses manual review without a price plan; publishing prices and examples is needed for numeric estimates. Configure and publish requested hours, win-rate input type, explicit region/server and hero/role mappings, fixed-offer contents and skin categories through normal admin review. The incomplete legacy fixed offer refuses new purchases until its contents are fully specified; historical orders remain intact. New booster access is provisioned under Customers & staff → Add a staff account → Booster workspace → Create staff access, then the booster signs in and enrolls their own authenticator. No invitation email is automatically sent by that operation.
