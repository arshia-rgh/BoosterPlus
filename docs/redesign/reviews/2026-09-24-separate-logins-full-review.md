# Separate portal sign-in and full design re-review

Owner request · 24 September 2026 · Base `e906a31`. Design-only changes; application work and R10/R11 remain paused.

## Scope and reviewers

Added separate customer, admin and booster entry/verification experiences, then repeated a full current-atlas review across the 115 views and principal journeys. The owner explicitly requested the full audit; this is broader than the ordinary changed-scope gate.

- `/root/login_review`: senior UI/UX review of all identity templates, separate portal journeys, errors, enrollment, recovery, exact staff editor returns and cross-portal rejection.
- `/root/public_review_v2`: senior review of 33 public/game/payment/system entries, embedded discovery/service paths, homepage and game shells.
- `/root/panels_review_v2`: senior review of all 72 customer/seller/booster/admin entries, conversations, staff decisions and retained record workspaces.

## Changes and review rounds

Separate entry screens I09 and I10 complement customer I01. Google/email → authenticator/recovery remain explicitly admin or booster throughout, including cancellation, expiry and enrollment. Staff sign-in has no public signup, customer activity overlay or shared customer-session assumption. Unsafe or cross-portal return destinations fall back to the correct portal home. F09 and F31 shortcuts preserve the portal context. See [the complete contract](../SEPARATE_PORTAL_SIGN_IN.md).

| Finding | Severity | Reproduction / impact | Correction |
| --- | --- | --- | --- |
| PUB2-01 | Medium | Game-root navbar sign-in created `G01/undefined/P05`; return lost the original destination | Preserve exact game root, selected service or nested step through identity verification; refresh navbar destination during local game navigation |
| PAN2-01 | Medium | A31 treated Attempts3 as status; A09 treated target actor as status | Explicit semantic rows; Failed status and labeled attempts; Action/All actions audit filter |
| PAN2-02 | Medium | Media “View proof” opened an order with no media return; payment task link implied specific payment detail | Name the linked order and preserve Back to media; name the payment review queue accurately |
| PAN2-03 | High | Customer and booster views described different audiences and relabeled the same message author | Separate Private support and Assigned booster conversations; consistent authors/history; distinct drafts and explicit internal-note exclusions; selected fill follows the active thread |
| PAN2-04 | Medium | Review moderation lacked actual review content and allowed publication despite in-progress order | Fictional rating/text/date/alias and eligibility evidence; publication held until record conflict resolved; source return from related order |
| AUTH-01 | Medium | With customer preview signed in, hidden order corner had zero geometry; focus avoidance moved staff forms under the pointer, losing clicks | Skip focus-avoidance scrolling when the corner is hidden; recheck setup checkbox and staff editor controls |
| AUTH-02 | Medium | Invalid-code states removed the input and required first-factor restart; loading/failure copy exposed instructions | Keep recoverable errors on the current form, same-step retry, honest progress/rate limits, disabled waiting submission and explicit new-code recovery |
| AUTH-03 | Low | Bare staff verification entries were branded Customer portal and implied customer MFA | Neutral staff-portal chooser with separate admin/booster entries |

Round 1 identified the public return and four panel findings; root fixed them and requested fresh rendered reviews. Round 2 added the remaining audit-filter label and AUTH-01 pointer/focus regression. Root corrected both, versioned assets to `login-3`, and requested final rechecks. Round 3 caught a stale navbar href after local game navigation and an unconditional first-tab highlight; both were corrected in `login-4`, including the affected policy selector. Round 4 refined booster-only conversation guidance, then identity review required concrete recoverable error/loading states and neutral unscoped staff entry. These are in `login-6`; `login-7` also disables Google advance links while waiting and labels expired-code resets as reviewer-only previews. No findings are waived; final verdicts follow below.

## Evidence and verdicts

- Public/game: **PASS — no remaining actionable findings**, including exact root/service/nested-form identity returns and selected-policy styling.
- Panels: **PASS — no remaining actionable findings**, including all PAN2 corrections, distinct thread/audience drafts and source returns.
- Identity: **PASS — no remaining actionable findings**, AUTH-01–AUTH-03 independently rechecked in `login-7`.

Initial sweeps: public 33 entries × three atlas widths and 161 named public state presentations; panel 72 entries × three atlas widths. No overflow or duplicate visible H1 found in those sweeps. Both reviewers also repeated their full 33/72 inventories at actual 390 × 844 with one visible H1 and no horizontal overflow. Task rechecks covered quote edits, exact checkout context, filters, expired invoices, private/booster/internal conversation boundaries, seller validation and deletion prerequisites. Captured console errors were empty. Temporary viewport overrides were reset. Layout passes alone are not usability acceptance.

Identity evidence: 11 explicitly scoped defaults at actual 390 × 844 plus desktop/Tablet/Phone rendered task review; all 62 identity state presentations had one visible H1, no horizontal overflow and no instruction-placeholder copy after correction. Verified admin email/MFA/recovery; booster Google cancellation/enrollment; invalid code → same-step retry → assigned workspace; expired-code recovery retaining A36 return; disabled Google progression during waiting; retained example email after failed requests; neutral bare staff chooser; customer-to-admin return rejection; exact A36 draft return and F09/F31 portal-scoped shortcuts. Console errors empty, viewport reset.

Automated checks passed: design integrity (115 views, 31 journeys, 55 current routes, 573 named state treatments), JavaScript syntax, formatting, route/fixture and new portal/list/conversation assertions, repository policy/secret scan, contract equality, workflow lint and diff checks. The tracked hook enforces the repository gate again at commit. The 573 count is inventory coverage, not a claim that all 573 states were re-exercised independently this stage.

## Qualification limits

This static design uses fictional records, memory-only drafts and illustrative verification steps. No provider calls, emails, sessions, permissions, messages, uploads or real payments are performed. Proposed `/admin/login` and `/booster/login` routes are not implemented runtime authentication. Session/callback/challenge isolation and real access tests remain later implementation work. Generic secondary states, previously documented shop/news downstream decisions, owner visual acceptance, physical-device behavior and assistive-technology evaluation remain explicit limits. A scoped pass means no actionable issues found by this review, not a guarantee against undiscovered issues.
