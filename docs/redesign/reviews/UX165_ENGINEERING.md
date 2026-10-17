# UX165 engineering review

Status: scoped engineering review passed; broader role audit paused at the owner's request on 18 October 2026. Baseline application is signed `20fe17e`; repository HEAD at review start is documentation-only `95f094a`. Historical checkpoints below retain their original pending/failed states; the final scoped verdict at the end reconciles them. This report is not full-suite or live-provider qualification.

## Isolation and evidence

The interactive environment uses a new local Docker Compose project, `playora-ux165`, containing only the pinned TiDB, Mailpit, SeaweedFS and scanner dependencies. It never starts the normal development API/worker or loads the backend `.env`, because that file may contain production merchant configuration. Synthetic service credentials remain in private `.cache/ux165/engineering/` files. Existing Docker resources are not removed, stopped or reused.

The real API is the existing `TestBrowserEnvironment`, using its freshly migrated test database, independent synthetic identities, local SMTP, application services, SQL allocation, jobs and isolated provider implementation. A recorded Go overlay only extends the fixture lifetime to three hours, configures exact local customer/admin/booster origins, disables automatic outgoing transfers to match production. Customer deletion remains disabled. These are test configuration changes, not application authentication or payment bypasses. The underlying repository source is not altered by the overlay.

The separate rendered-review harness freezes all three actual SSR/client builds. Each reviewer has an exact-response synthetic API dataset, blocked external traffic, request and source hashes, screenshots and traces. These observations qualify rendered UI behavior only; they do not demonstrate backend persistence, permissions, funds movement or real email delivery. Missing fixtures and setup failures are recorded separately from product defects.

Private evidence paths:

- `.cache/ux165/engineering/dependencies.log`: isolated dependency startup.
- `.cache/ux165/engineering/run-interactive.py`: bounded real API and three-portal launcher.
- `.cache/ux165/engineering/interactive/source.json`: original and overlaid source hashes and configuration scope (once started).
- `.cache/ux165/engineering/interactive/`: private API/front-end logs and stop receipt.
- `.cache/ux165/engineering/snapshots/ux165-baseline/`: 443 frozen runtime files plus manifest.
- `.cache/ux165/engineering/evidence/<reviewer>/`: separate browser observations and traces.

## Confirmed findings

### ENG-01 — secure chat forms absent from the real browser fixture

Severity: medium testing gap, not an observed production failure.

`backend/internal/app/server.go` correctly registers `conversations.NewWithVault(client, auth, cfg.Vault, nil)`. The real browser fixture in `backend/internal/integration/browser_test.go` still registers `conversations.New(f.client, service, nil)`, leaving its form encryption keyring nil. The existing browser resale/fulfillment helpers now send secure chat forms; their protected response/reveal paths therefore cannot work in that fixture even though production is configured correctly.

Proposed correction: use the fixture's already-created `ring` in `NewWithVault`. Keep a meaningful real API browser regression that requests a protected form, has the intended synthetic recipient respond, verifies it through the protected reveal path, and checks a different recipient cannot reveal it. Do not label mocked successful form replies as proof of the encrypted persistence path.

The tracked one-line fixture registration is corrected to match production; the reviewer overlay asserts this registration is present. The shared actual API fixture is now running with the corrected registration. Cross-role browser observations are recorded by the responsible customer/admin reviewers; this engineering report does not independently claim their full secure-form journey. The application registration and business rules are unchanged.

## Verification and open limits

- Synthetic fixture contract tests: 9 passed (exact method/path/query/body, missing route and audience rules).
- Frozen build inventory: 443 files copied and hash-compared before/after snapshot.
- Docker was initially stopped; it was started for this task. No pre-existing containers were running at inspection.
- Initial focused Go invocation stopped before tests because the shell had `GOSUMDB=off`; its failed log is retained. The subsequent official-checksum invocation passed conversations, payments, submissions and resale race unit tests; identity was blocked by sandbox local-listener permission. The isolated identity-only retry with listener permission then passed. Both setup failures are retained and are not product defects.
- Six focused SQL scenarios and twelve affected frontend component scenarios passed for the unread correction below. Actual multi-role journeys and final rendered candidate review remain separately recorded by the role reviewers. No full gate was started.
- No production account, mailbox, provider API, customer message, publication, invoice or funds action is part of this review.

### ENG-02 — deployment does not wait for restarted dependencies

Severity: high release-availability defect, supported by the retained UX164 activation failure and current source.

`production/deploy/release.py` quiesces the application, invokes `up -d pd tikv tidb storage object-gateway scanner` and then advances through migration and the application dependency probe. Database schema reads have bounded retries; the recreated scanner/storage dependency startup does not have an equivalent wait. UX164's retained verification reports the first activation as failed and the exact-bundle recovery as passed after scanner readiness. This can cause avoidable fail-closed downtime even when dependency startup would complete normally. The retained failed receipts must remain failed evidence.

Recommended fix: use a bounded Compose `--wait --wait-timeout` for that dependency startup (for example 300 seconds), before migrations and before the existing candidate dependency check. Preserve the actual schema verification, scanner freshness/clean-and-malware checks and temporary storage write/read/delete probe; container readiness alone must not replace them. Test command ordering and fail-closed behavior when the dependency startup times out, and the exact-bundle resume path. No blind DDL retry or automatic old-application restart should be introduced. The stable deployed helper needs the normal reviewed release/configuration procedure if this fix is later shipped; this review does not modify it.

Retained supporting record: `.cache/ux164/server-verification.json`, initial activation `failed_inspect_before_retry`, subsequent recovery `passed`, all eight final service health checks true.

#### ENG-02 fix review

PASS, scoped engineering review: the root's correction adds Compose `--wait --wait-timeout 180` to dependency startup before migration, keeping both the pre-quiescence old-binary storage/scanner probe and the migrated candidate dependency check. The retained release tests exercise successful ordering, timeout before DDL/serving, preservation of the interrupted receipt, and explicit exact-bundle resume. Nine release-lifecycle cases passed; `.cache/ux165/release-readiness-tests.log` and `.cache/ux165/engineering/release-readiness-review.json` bind the observed results to the reviewed files. This is a bounded startup correction, not a guarantee that every slow dependency will finish within 180 seconds. Persistent failure remains fail-closed. No production helper or server was changed by this review.


### ENG-03 / C1-02 — outgoing messages incorrectly count as unread

Severity: medium, reproduced in the actual isolated customer journey and confirmed in backend source.

The previous calculation subtracted a read marker from a thread's latest sequence. That includes the current reader's own messages, so an outgoing-only conversation appeared in the customer overview and unread inbox and could display an unread divider on the sender's text. Simply advancing the marker on send would incorrectly acknowledge older incoming messages the person had never seen.

Implemented correction:

- Centralize unread predicates in `internal/communication`: visible messages from other senders after that reader's audience-specific marker. Query unread existence before inbox/overview/order-list pagination; never update the read marker as a side effect of sending.
- Return additive `first_unread_sequence` metadata alongside the accurate count. Fetch and place the divider at that explicit incoming cursor, because incoming and outgoing messages can be interleaved. The updated frontend accepts an omitted field from an older API/fixture during transition and uses the historical calculation only when omitted. New API responses always include the field. Old cached frontend code cannot benefit from the corrected cursor until it reloads the updated application.
- Include the order's permitted fulfillment coordination thread in customer/admin order-list unread badges as well as ordinary and linked pre-sales threads. Existing ownership, assignment and audience permissions are preserved.
- Keep internal notes outside customer cursors, counts, message results and private metadata. Empty unread results return count/cursor zero.

Focused verification passed:

- `TestUnreadExcludesOwnMessagesWithoutAcknowledgingIncoming`: own-only messages, interleaved replies, internal notes, exact first cursor, no accidental marker writes, incremental explicit reads, unread inbox, customer overview and order badges.
- `TestCoordinationUnreadAndBoosterMessageFormLabels`: coordination order badge, assigned booster outgoing messages, form-response unread semantics and privacy-safe labels.
- Retained regression cases for discovery filtering before pagination/private audiences, accepted order prices/private unread, bounded/revoked customer overview and conversation visibility/idempotency/reads. All six cases passed together with the race detector in an isolated TiDB database: `.cache/ux165/engineering/unread-integration-r1.log` (27.6 seconds).
- Three frontend support files passed twelve component cases, including explicit cursor versus later outgoing messages, outgoing-only history, paging/recovery and existing privacy/error behavior: `.cache/ux165/engineering/unread-component-r2.log`.
- Domain race unit checks: `.cache/ux165/engineering/unread-unit.log`. Scoped golangci (zero issues) and standalone gosec passed: `unread-lint-r2.log`, `unread-gosec.log`. Initial linter invocation encountered inherited `GOSUMDB=off` before analysis; the retry used the repository's official checksum setting. That setup failure remains retained.
- TypeScript, focused ESLint and generated contract consistency passed: `types-r1.log`, `frontend-lint-r2.log`, `contract-r1.log`. The initial ESLint result found two callback-style violations in the new tests; corrected without changing behavior. Both initial and successful logs remain.

Browser regression source is maintained in `tests/e2e/unread-fixtures.ts`, called by the persisted support journey. It deliberately keeps the buyer away from chat while arranging messages through the local authenticated API, then checks the zero own-message badge and actual incoming divider in the rendered conversation. **Its new end-to-end execution is still pending a fresh corrected API fixture; the currently shared reviewer API remains frozen.** The passing domain/component results must not be called browser end-to-end evidence.

### ENG-04 — assigned booster appears as generic support

Severity: low clarity/privacy-safe attribution defect, confirmed in the isolated coordination flow.

Message and form-reply fallback labels previously differed and used generic PLAYORA support/staff when a booster had no explicit staff alias. They now share one role-aware helper: an unaliased booster is `Assigned booster`; administrator/owner fallback remains `PLAYORA support`; an explicit staff alias remains unchanged. No private email, legal name or sender ID is exposed to the customer. Meaningful integration coverage checks both ordinary messages and secure-form response messages, plus explicit alias preservation. The table-driven helper test also covers administrator/owner behavior.

### ENG-05 — seller browser journey still assumes removed ownership workflow

Severity: medium testing drift; not a new production ownership requirement.

`tests/e2e/submissions.spec.ts` still required ownership notes, expected a separate save step before submitting, and used outdated navigation/status labels. Maintained the journey for the current product: optional notes, required seller authority, one-click save-and-submit, server-required game field focus, return to the overview, clarification and resubmission, agreement-pending state, and Messages & photos. The existing privacy/withdrawal checks remain. TypeScript and focused lint pass. **Execution of this maintained complete browser scenario remains pending; it was not silently marked passed.**

## Current engineering verdict

The confirmed unread/attribution defects are corrected with focused real-database and component/security evidence. Release dependency waiting has an independent scoped review and retained lifecycle tests. The actual browser fixture now enables encrypted forms as production does. Final candidate rendered review and the maintained persisted support/seller browser regressions are still required before calling this review complete. No production deployment, full gate, real email, invoice or funds action was performed.

## 18 October resumed review

The interrupted interactive processes were gone and Docker was stopped. Only the existing `playora-ux165` services were restarted. A read-only metadata check confirmed the original synthetic schema survives, but its process-only authentication and vault keys were not persisted. Reusing the old sessions or replacing encryption keys would not be a valid continuation, so a fresh isolated schema and fresh normal sign-ins are used. The prior screenshots, traces, receipts and database were preserved. Later-stage prerequisites must be identified as local authenticated fixture setup rather than replayed manual observations.

Current source is frozen in `.cache/ux165/candidate2/source.json` (1,913 source files); the frontend's three portal builds passed and its independent render snapshot contains 370 runtime files. The scanner's real freshness, clean-file and malware controls passed again before role testing. The four-hour bounded real API, local worker and three-portal frontend are in `engineering/interactive-r2`; outgoing provider transfers are disabled in this interactive review. The `real-browser-r2.mjs` normal sign-in helper waits for a new Mailpit message ID to avoid reusing an older code. No production data or environment was loaded.

The two pending browser specs are running separately with fresh per-device databases at local port 4190. Their private source receipt records only test URL/port substitutions from the frozen source; the application build is unchanged. This keeps the role-review environment at 4173 available and does not repeat the passed backend scenarios or start the full gate. Results are pending and must not be inferred from successful setup.

### Resumed focused browser results

The maintained support/unread journey passed on desktop and mobile against the corrected current API (`.cache/ux165/e2e-r2/{desktop,mobile}/browser.log`). This includes reconnect recovery, attachment retry, staff-note privacy, explicit incoming unread placement, outgoing-only unread exclusion, rendered inbox styling/target checks and accessibility assertions. These are persisted local backend journeys, not response mocks.

The seller scenario initially stopped on preexisting stale navigation labels. Its first correction exposed an ambiguous link (navigation and page action both say “Sell an account”) and the newer `?section=details` draft route. The maintained spec now scopes the page action to the main landmark, follows “Choose …” / “Continue to account details”, asserts the actual details route and extracts the record ID from the URL pathname. Initial failures remain in `e2e-r2` and `e2e-r3`; they are test drift, not demonstrated product failures.

Only the seller scenario was rerun after these corrections. Desktop passed in 15.4 seconds and mobile in 15.6 seconds; both backend fixture exits were zero (`.cache/ux165/e2e-r4/results.json`). The journey covers optional notes/required authority, missing required game field focus and inline error, saved submission, administrator clarification, customer correction/resubmission, review approval without commercial acceptance, private messages, withdrawal and other-customer/admin-access denials. The retry uses the same frozen application bytes, with its exact maintained test-source hash and local-only port substitution recorded separately.

Engineering checkpoint: the six retained race-enabled SQL scenarios, focused static/security/component evidence, release-wait lifecycle tests and now all four pending desktop/mobile support/seller browser cases are passed. The interactive r2 environment remains running for the independent cross-role handoffs; this engineering checkpoint does not certify role journeys that other reviewers have not completed. No full gate, deployment, production mutation, live email, invoice or funds action occurred.

### C3 chat tab-switch investigation — harness timing error, not a reproduced product defect

The retained `ux165-r3-c3-order-tabs/review.zip` shows the draft surviving the tab switch. After Send, the review script's unrestricted `getByText(message)` matched the still-disabled composer textarea at trace call 215. It then reloaded the document approximately one millisecond later, before the send completed. No persisted-message assertion or successful POST had been observed. That reload discarded the in-flight page work; the empty history after reload is not evidence that switching order tabs silently deletes a sent message.

The corrected actual-API experiment separately observes the successful POST and a `.message-bubble` before reloading. Chromium and WebKit at 390 px both passed: draft survives Messages → Progress & sessions → Messages; a controlled 700 ms send delay leaves the pending draft visible; a successful response produces the message bubble and clears the composer; reload preserves the message. Both browser error and external-request lists are empty. Evidence: `.cache/ux165/engineering/evidence/ux165-r3-chat-tab-corrected-{chromium,webkit}/`. This uses the existing root-owned isolated r3 runtime and synthetic C3 account, not live data. No chat application change was justified. The original failed trace is retained and is not relabelled passed.

### C3-04 / C4-03 — distinguish a timing hold from other delivery or payout blockers

The seller payout projection discarded the authoritative due date returned by `sellerEligible` and exposed only `eligibility_hold`. An additive optional `manual_recording.eligible_after` now returns that date only when every non-time prerequisite passed and the existing timing check is the sole current hold. It remains omitted for unfulfilled or unacknowledged delivery, an active service case, missing or unsettled payment, outstanding refund and all other rejected prerequisites. The existing eligibility predicate, accepted timing, owner-only recording, recent verification, idempotency and actual-transfer requirements are unchanged. This is an earliest eligibility recheck time, not a promised transfer date; eligibility is still re-evaluated at recording.

The delivery projection also gains the root's privacy-safe `active_case` boolean after its existing order authorization boundary. It contains no case details and lets the UI explain why protected access is held. The retained chat-form domain scenario now checks false before a case, true while it is active, and false after its accepted resolution. The protected reveal denial itself remains mandatory.

Only the two affected isolated TiDB race scenarios are being rerun in `.cache/ux165/payout-focused-r4/`; the earlier four-case payout/access pass remains retained in `payout-focused-r3`. Schema, production runtime and financial settings are unchanged. UI rendering and wording are reviewed separately by the root and senior designer.

Both affected race scenarios passed (exit 0, 12.3 seconds): the new payout timing test and the extended protected-delivery active-case test. The payout test observes no date before fulfillment or acknowledgement, the exact accepted inspection deadline when it is the only hold, refusal to record a payment before that deadline, and removal of the date immediately after opening a dispute. The delivery test confirms its active-case indicator follows the actual case lifecycle while preserving the reveal guard. Private source hashes, output and result are in `payout-focused-r4/{source.json,test.log,result.json}`. The current interactive r3 backend is intentionally frozen and does not serve these newly added fields; this result is separate controlled-clock domain evidence, not a claim that the interactive UI already exercised the new fields.

Scoped golangci checks for payments/resale passed with zero findings, and standalone gosec for the same packages passed. Logs: `engineering/holds-lint-r3-retry.log` and `holds-gosec-r3.log`. The initial sandbox linter attempt failed during package loading before analysis (`holds-lint-r3.log`); the retry had compiler-cache access. Generated API contracts were synchronized. No full gate was invoked, and the root-owned interactive r3 process was left running.

## Final scoped engineering review after the owner paused the wider audit

**PASS for the inspected implementation scope; no new release blocker found.** This is an independent source/evidence review of the already identified corrections, not another exploration wave. No additional application changes or repeated test runs were needed. The final staged focused hook, latest independent rendered review, signed artifact/image qualification and production preflight remain the release operator's responsibilities. Paused customer/admin/booster coverage must remain marked incomplete in the shared route/state matrix.

The inspected boundary includes sender-aware unread counts/cursors and order badges, privacy-safe booster labels, manual payout timing metadata, the active-case delivery projection and controls, exact quote cents, fixture alignment and the bounded deployment dependency wait. Existing membership and portal checks remain at the callers of the shared unread predicate. Customer counts/cursors exclude internal messages and private sender identifiers. Sending does not acknowledge older incoming messages; counts are filtered before pagination. Quote conversion uses exact decimal parsing and integer arithmetic, with authoritative preview/issuance still required. Payout and delivery changes expose explanatory state rather than weakening financial eligibility, owner recording, recent verification, payment confirmation or protected-access checks.

The retained six race-enabled unread/privacy SQL scenarios and scoped component/security checks still bind to unchanged source. The two new payout-date/active-case scenarios bind exactly to the current implementation and API schema; all six hashes in `payout-focused-r4/source.json` matched at this review. The nine dependency lifecycle cases also bind exactly to the current helper and tests. Previously pending persisted support/seller desktop/mobile cases passed in their scoped continuations, as recorded above. The 47 current delivery/forms/payout/review component cases passed. The root's final hook will provide current aggregate lightweight qualification; none of these results is a full-gate claim.

The reviewed 46-file source/evidence manifest is `.cache/ux165/engineering/release-scope-review-r5.json` (SHA-256 `3ca2b49574ff9fae24fe3104e64260a720c50e27a76407f2dbd5946287d05139`). Key implementation fingerprints:

| Source | SHA-256 |
| --- | --- |
| `backend/internal/communication/unread.go` | `41a789325c752255aa9af0082636eb93bd565c969a3031158e691903694d6592` |
| `backend/internal/payments/manual_payout.go` | `e28849aa2ab707ad78a04e8eda28de588d9288d4bb96a5d294cf264131b23e45` |
| `backend/internal/resale/delivery.go` | `2ae46e00a09259c473fd2a6680738bf6c81eb77a39edd3368704fd968a62fe27` |
| `frontend/app/orders/quote-validation.ts` | `72b680522c77717dd690b66b4b96bd1aeee81627c73e49bd6f47573e55c24ec9` |
| `production/deploy/release.py` | `7449cbf8b978f1480d839a1723a5a8ef1140ff2f9e276a8aaf223a078684ab6e` |

### Production helper adoption assessment

Deploying application images alone will not apply ENG-02 because production uses the stable `99f60bd` host deployment directory. The safe bounded adoption is to preserve that directory and its Compose/configuration/import graph, and replace only `deploy/release.py` with the exact verified candidate source during the approved activation operation. The current candidate helper differs from source `20fe17e` only by the bounded dependency wait. `manage.py`, `artifacts.py`, `state.py` and `smoke.py` are byte-identical to `20fe17e` in the reviewed checkout.

Before adopting, require the live helper's hash to equal the previously approved `20fe17e` bytes (`8ca3c178d1e8c0c45aa0a826de08064babcebb5aa3bc39a911ab74ae48e8eaa3`), verify the candidate bytes against the final signed source, preserve the previous helper privately, and record before/after runtime manifests. A mismatch requires investigation rather than overwriting a newer local change. Use an atomic replacement preserving the established owner/mode. Every other runtime/configuration file and secret remains unchanged.

For candidate preflight, loading that exact candidate `release.py` through an isolated `importlib` module is compatible with the stable imports. Assert the resolved `manage`, `artifacts`, `state` and `smoke` module locations and `manage.ROOT` still point to the stable deployment directory; do not put the candidate production tree ahead of it. Invoke actual activation with the default runner or the exact `manage.run` function: an arbitrary runner wrapper would skip the helper's `runner is run` validation branch. Prefer a fresh interpreter after adoption so no stale imported helper survives. The existing signature, current-schema, serialization, backup/recovery, dependency probe, failure receipt and exact-bundle resume checks remain mandatory. The 180-second health wait is a finite startup allowance, not proof that a particular vendor will always become healthy within that time.

This review did not connect to production, change a host helper, grant or prepare a recovery exception, deploy, start the full gate, send mail, create a real invoice or move funds. No completed production deployment is implied.

### Focused hook test-source correction

The normal focused hook completed its backend security/race/build stages, then ESLint rejected three non-null assertions in the new quote-editor component test. The root replaced them with explicit missing-element guards. Independent inspection of this sole source delta is **PASS**: a missing quote-line element now fails with a clear error; the exact positive/reduction cent values, preview invalidation, invalid-field focus and absence of an extra API request are still asserted. Application code and the other 45 files in the scoped engineering manifest are unchanged. This is test-source lint remediation, not a newly fixed production defect or authority to call the interrupted hook passed.

The original r5 receipt is preserved. Updated receipt `.cache/ux165/engineering/release-scope-review-r6.json` has SHA-256 `fade5a03050bd5ab90ec50536408f41af32c0f53631771fbb48f7e659fee00a2`; the reviewed `frontend/app/orders/quote-editor.test.tsx` hash is `21b2a7c84064b7ccfd5d5c36e950768ec36685ab1edab95214bd4f0ff06f3a35`. The root is running targeted format/lint/component checks and the normal focused hook retry. This reviewer did not repeat passed backend, integration or rendered checks, resume the broader audit, or perform any deployment.
