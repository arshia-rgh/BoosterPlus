# UX165 — multi-role product and software review

Owner request, 16 October 2026: five independent customer agents, one admin/owner agent and one booster agent explore their complete current flow families. A senior product manager, senior UI/UX designer, senior UX researcher and senior software engineer collect evidence, decide corrections, review them and verify the final result. Execute agents in waves within the available concurrency limit; maintain separate identities and evidence.

Baseline application: signed20fe17e, repository95f094a (deployment documentation). Preserve user-owned untracked `docs/ux/prototypes/` and `frontend/app/home/cameo/`. The live application remains unchanged during this exercise.

## Method and boundaries

- Use current route manifests and product rules, with a finite route/state/action inventory. Do not call historical atlas coverage or an unlimited set of input permutations complete.
- Five customer personas each replay customer flow families, with additional depth in custom boosting, fixed packages/shop, account selling, account buying, and recovery/support respectively. Admin and booster reviews include their actual cross-role handoffs.
- Use isolated synthetic accounts, database, mail sink, storage and provider fixtures for persisted workflows. Use frozen actual frontend builds and exact synthetic API responses for deliberately failed/rare branches; label that evidence as frontend-only.
- Never introduce an authentication/payment bypass in the production application. Preserve independent portal identities, consent, staff MFA, financial rules, accepted terms, secure chat-form audience controls and disabled customer deletion.
- No live customer-data mutation, real email, provider invoice, crypto transfer, catalog/policy publication or production activation is authorized by this review.
- Keep every observed defect, inferred concern, fixture/setup fault and untested limitation distinct. Each defect needs reproduction, expected/actual result, severity, route/state, browser/viewport and evidence.
- Product/design/research triage observed findings. Fix confirmed issues, add meaningful regressions, perform senior rendered fix/review round trips and recheck the affected handoffs. Use standing focused checks; do not start the complete repository gate.

## Participants and coordination

| Role | Focus | Status |
| --- | --- | --- |
| Customer1 | All customer families; custom boost and quote/order lifecycle depth | Paused: representative C01–C20 attempts recorded; actual co-play confirmation/chat complete; remaining branches in checkpoint |
| Customer2 | All customer families; fixed packages and manual shop depth | Paused: actual purchase/shop delivery/case/protected reply retained; new fixed receipt, case decision and common gaps not executed |
| Customer3 | All customer families; seller proposal/listing/commission depth | Paused: actual seller response/destination/inspection hold retained; eight finite common-passport gaps recorded |
| Customer4 | All customer families; account purchase/delivery/disputes depth | Paused: representative C01–C20 attempts recorded; actual delivery/case/review/export checked; case/review staff resolution remains |
| Customer5 | All customer families; sign-in/recovery/support/preferences depth | Paused: first-wave support/settings/estimate/draft observations retained; staff form and transaction continuations not executed |
| Admin/owner | Authoring, quotes, work assignment, support, resale, finance and governance | Paused: actual authoring/cross-role delivery/case actions retained; governance/finance/operations branches incomplete |
| Booster | Invitation/authentication, assigned work, progress/chat/calendar/security | Paused: B01–B09 bounded ledger saved; co-play confirmation, returning MFA and session revocation checked; B07 copy fix with root |
| Senior product manager | Current inventory, handoffs, severity and acceptance | Inventory and triage checkpoints retained; broad final coverage acceptance not claimed |
| Senior UI/UX designer | Rendered usability/layout decisions and correction review | Candidate2–4 scoped passes retained; final new-fix review continues without broad exploration |
| Senior UX researcher | Task rubric, evidence quality and role feedback | Dated synthesis retained; unfinished family gaps explicitly frozen rather than passed |
| Senior software engineer | Isolated environment, runtime/contracts/security and findings | Focused fixes/real-database/browser evidence retained; release-scoped verification continues |

The owner stopped broader exploration on 18 October and requested deployment of the fixes found so far. [The paused checkpoint](redesign/reviews/UX165_PAUSED_CHECKPOINT.md) records each role's persisted versus rendered-fixture observations, exact unfinished work, confirmed findings, harness failures and safe resumption instructions. It supersedes earlier scheduled-handoff language below without deleting historical evidence.

Detailed current coverage and findings will be linked here as evidence is produced. No finding is considered fixed until its actual changed source and relevant recheck are recorded. No current test or deployment pass is claimed by this plan.

## First review corrections (in progress)

- C1-01: recovery copy now distinguishes optional customer MFA from required staff MFA. Three-portal regression passes.
- A-PRICE01: quote prices and optional adjustments use decimal currency input; exact integer cents remain the API contract. Excess precision, zero/negative total, exponent notation and invalid line totals are rejected without rounding. Existing browser journey updated to human-readable prices.
- A-SEARCH01 / A-COPY01: shorter full-width staff search and one page heading per affected admin workspace; final rendered verification pending.
- C3-01: upload/download error summaries no longer inherit unrelated parent submission errors; targeted regression passes.
- C3-02: administrators are directed to prepare seller proposals themselves; owner-only payout guidance is preserved. Focused regression passes.
- ENG-01: real browser fixture registers the same encrypted chat-form vault as the production server; no production auth/payment bypass.
- ENG-02: release dependencies must become healthy within a bounded wait before migration/probes. Nine lifecycle/recovery cases pass; senior engineer independently reviewed.

Local setup evidence retains a scanner freshness failure and a listener setup failure. Neither is an application test pass. The actual isolated API now serves three local hostname-separated panels, with synthetic identities, local Mailpit and provider fixtures. Upload qualification remains pending fresh scanner definitions; actual local customer sign-in/conversation persistence has begun. No production data changed.

- C2-01: fixed-package progress now counts only editable delivery fields and omits repeated presets from the summary. Published package contents remain visible; no pricing/scope change. Twenty-five selection/dynamic-form journey cases passed.
- C4-01: marketplace price/currency errors now persist under the field, carry accessible descriptions and move focus to the problem. Exact filter conversion and draft retention remain.

The scanner blocker was resolved by copying only public signed definition files read-only from the existing production scanner into the isolated scanner volume. Production was not modified. Freshness, clean-file and EICAR positive controls passed; original failed readiness evidence is retained. The actual local admin has published a synthetic MLBB catalog and provider-fixture payment policy through normal UI/MFA. Customer2 created fixed/shop orders through the UI and completed the real isolated webhook/inbox/worker allocation path; external checkout navigation was intercepted and no live payment occurred. Seller/buyer/custom/booster handoffs continue.

- A-ASSIGN01: empty eligible-booster lists now explain active status and authenticator enrollment, offer an explicit refresh and prevent an empty assignment attempt. Regression passed.
- A-COPY02: coordination guidance now points to administrator-requested protected chat fields instead of the removed standalone secure-access flow.
- B-OVERVIEW01: booster page title now describes the work overview; the upcoming-session card retains its distinct title.
- C5-01: customers without MFA see an explicit no-recovery-codes state and a local Security setup link. Enrolled account recovery behavior remains unchanged. Thirty-three relevant identity/staff/route cases passed.

All eleven requested roles have now been instantiated as distinct agents. They run in waves because only three agent slots are available alongside the coordinator. Initial page-family reviews are not a substitute for persisted handoffs; those remain explicitly tracked in each role ledger.

- B-O02: product-approved calendar simplification hides repeated-hour choices only for exact UTC, removes duplicate readbacks and the redundant visible outer legend, and retains non-UTC choices plus all server scheduling checks. Session inputs now receive the currently selected effective zone so UTC→Europe/London reveals those choices correctly. Eleven focused calendar cases passed; final rendered review is pending.
- C1-02: an actual customer saw their own sent message counted as unread. Engineering is correcting sender-aware counts/filtering and first-unread positioning without advancing read markers for unseen incoming messages. This is not closed yet.
- B-O03: product approved a distinct privacy-safe booster sender fallback, with configured aliases preserved. Engineering implementation/recheck is pending.

Candidate1 is a separate frozen frontend build connected to the ongoing isolated API; it preserves the original three portal URLs and normal sessions through browser-local resolution. It does not change the live site or the ongoing baseline server. The current API is intentionally frozen, so corrected unread/label backend behavior is qualified separately by fresh isolated tests.

- D-HEADING01: a read-only axe pass on eleven changed mobile page families found that removing the duplicate admin inbox heading left its results heading at the wrong level. The source now uses h2 for admin results and h3 under the customer's conversation heading, with focused regressions. Candidate1 retains the original finding; candidate2 must verify the correction. The other ten checked screens had no axe violations or document overflow in that pass.

## Continuation — 18 October 2026

The earlier bounded fixture processes stopped during the interruption. Their evidence remains retained. Random in-memory authentication and vault keys were not saved, so old sessions and encrypted test data cannot be resumed safely. A fresh uniquely recorded current-source fixture is being prepared for the unfinished handoffs; previous persisted results are not discarded or relabeled as new executions. No production data or configuration changes are involved.

- D-INBOX01: the senior rendered review found that generic prose-link styles overrode inbox row text, underlining subjects, metadata and dates. A narrow inbox-only specificity rule restores readable row text and keeps semantic links, mobile grid rules, hover and keyboard-focus affordances. A real-browser regression now checks the row style and minimum target height; candidate2 review remains pending.
- C4-02: the current synthetic MLBB fixture now directs sensitive account access to support-requested protected fields in order chat. The old dedicated-handoff wording was inherited from an historical prepared catalog. The historical approved draft and live catalogs are untouched; this is fixture/reference maintenance, not a live content publication.
- D-MODULE01: the second senior render found that the separate sidebar module-search placeholder was clipped. It now says “Search modules…” while retaining the accessible “Find a module” label and actual filtering. This small correction requires its own final rendered check because candidate2 was already frozen.

Remaining priority chains are paid account delivery and inspection, seller payout recording, co-play booking, customer cases/reviews, protected sharing revocation, and the new backend unread behavior in a rendered browser. Final product/research synthesis will distinguish observed families, partial branches and external/physical-device limits.

Continuation checks: 62 affected component cases in 12 files passed, and repository policy/secret/contract/workflow checks passed. The nine release-lifecycle cases passed from their correct working directory; the initial module invocation failed on a Python import before execution and is retained as a runner error. These are focused results, not a full-gate pass. The fresh four-hour fixture and frozen three-portal candidate2 build are ready; original synthetic records are retained but not reused with replacement keys.

The corrected support/unread browser journey passed on desktop and mobile against a fresh API. The seller journey initially stopped at additional outdated navigation labels/URL assumptions; only that scenario was corrected and retried, passing on both sizes. Failed attempts remain recorded. The senior design review approved the changed surfaces with 39 Chromium/WebKit responsive observations and scoped interaction/delta checks.

The reviewer-owned r2 process ended when its agent completed, interrupting handoffs before their remaining actions. This is a local harness lifecycle fault, not a site outage. Root now owns the bounded r3 process for the remaining agent waves. R2 evidence is retained, and prerequisites are replayed explicitly in the new database without reusing sessions/keys or bypassing authentication.

- A-MESSAGES01: the administrator reported redundant seller-chat section labeling. Senior design agreed to remove only the generic visible “Messages & photos” heading, retaining the selected tab, accessible fieldset label, privacy guidance and distinct conversation title. The narrow source correction awaits its own rendered recheck; full-page sticky-position artifacts are not independently classified as defects.

### Receiving-role findings in the resumed handoffs

The actual r3 seller answered the staff-requested protected form through normal fresh email verification. Staff reviewed that reply and prepared separate buyer access only after verified fixture payment. The buyer revealed/masked, reloaded and acknowledged delivery with explicit consent, then opened a separately recorded dispute. Profile/forms/receipt exports downloaded successfully; protected form answers were excluded. These are actual isolated persistence observations, not live transactions. The shared seven-day inspection rule was not shortened.

- C3-04: the seller's prominent status said “Awaiting manual payout” despite an inspection eligibility hold. The source now distinguishes a hold from current eligibility and staff-recorded completion. An additive optional `eligible_after` exposes only the exact date already returned by authoritative eligibility checks when time is the sole blocker; disputes and missing prerequisites do not get a predicted eligibility date. No financial rule or schema changed. The frontend never treats reaching that date as proof of eligibility.
- C4-03: an active buyer case correctly blocked protected reveal, but Delivery still suggested access was ready. The authorized delivery projection now carries a privacy-safe `active_case` flag. The UI explains the case hold, links to the existing case section and omits misleading access/acknowledgement actions. Returning to Delivery refreshes the current status. The actual access guards remain unchanged.
- C1-03: the customer Reviews page displayed identical H1 and H2 titles consecutively. Keep the page title and accessible list section, removing only the redundant customer body heading; the administrator's distinct moderation heading remains.
- Suspected chat draft loss was a tester timing error: the script matched text still inside the pending textarea and reloaded before sending completed. Corrected Chromium and WebKit observations waited for the message POST and rendered bubble, including controlled latency and tab switching; persistence passed. Original failed evidence remains. No chat source correction was made for that hypothesis.

Four focused real-database payout/access cases passed (`.cache/ux165/payout-focused-r3`), followed by two changed timing/case-projection cases with the race detector (`payout-focused-r4`). Forty-seven relevant frontend component cases in five files passed for the latest changes. New rendered senior review and receiving-role rechecks are still required; these results are not a complete-suite pass or production authorization.

## Owner pause and confirmed-fix release — 18 October 2026

The owner explicitly stopped broader exploration. [The frozen checkpoint](redesign/reviews/UX165_PAUSED_CHECKPOINT.md) records each actor's checked, frontend-fixture and unfinished flows. Outstanding C2/C3/C5/admin/booster branches and final broad product/research synthesis are paused, not release prerequisites and not passed. The root-owned real fixture stopped cleanly with both processes exiting0; process-only keys are gone, so future work must use a fresh isolated fixture. Existing evidence remains intact.

B07-COPY01 is corrected: customers are told to propose a session and await confirmation; staff/boosters are told to review and confirm or cancel. Required player details and current-session enforcement stay unchanged. This is the final confirmed discovery included, not a reopening of the audit.

The final senior engineering review returned scoped PASS, bound to46 exact source files in `.cache/ux165/engineering/release-scope-review-r5.json`. It found no additional blocker and did not repeat passed integration cases. The production helper correction must be adopted from the signed candidate independently of application images, preserving its prior bytes and all other stable deployment files. Final scoped design, the normal focused commit hook, signed artifact qualification and server preflight follow. No full gate or new external transaction is authorized. Deployment was requested; the prior release's no-off-host exception is consumed, so activation still requires the exact qualified candidate's recovery decision.

The laptop received403 from both official Go vulnerability feeds; the authorized server received200 from both. The focused security scan will use an ephemeral localhost-only SSH SOCKS route to the original live `https://vuln.go.dev` endpoint with TLS verification intact. This changes transport only, not the scan database, coverage or pass criteria. The route is removed after the normal hook; no application/server configuration changes.

Final changed-source design closure: candidate7 passed30 Chromium1440/320 and WebKit390 rendered states plus six focused interactions. All33 changed application UI files match the frozen source; unchanged candidate2–4 results are retained. Seller chat privacy/heading, payout timing/hold/receipt, delivery case guidance, customer review hierarchy and role-specific session guidance are closed. Earlier mock-response/selector failures and WebKit pointer-focus expectations remain recorded; keyboard activation/Escape returns focus correctly. No application change was needed during final review. The broad audit remains paused.

The first normal focused hook passed backend static, lint, standalone gosec, live govuln, race-unit and build checks, then stopped at three forbidden non-null assertions in the new quote test. The test now explicitly rejects missing controls; no application logic changed. The original failed hook/source manifest are retained under `.cache/ux165/release-final/attempt1/`. Targeted test lint and execution precede the corrected normal hook; the failed attempt is not counted as a pass.
