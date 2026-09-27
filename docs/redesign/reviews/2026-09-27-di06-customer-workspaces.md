# DI06 scoped senior UI/UX review

27 September 2026. Reviewer: `/root/di06_design_review`. Base: `c2f87e12bb45573a560542c16d62deb1e93fa4bb`. Scope: customer persistent order sections, embedded private/shared messages, scheduling presentation, account next-step links, customer activity and affected shared record/focus behavior. No unrelated redesign or launch qualification.

## Round 1 — FAIL

The reviewer identified actionable regressions: UX01 shared coordination refresh remounted the thread and lost drafts; UX02 hidden older-message requests could leave pagination locked; UX03 the activity sheet restored trigger focus after destination navigation; UX04 recoverable order refresh lost drafts and confirmed customer access loss needed an explicit unavailable branch; UX05 active section contrast and adjacent accepted-total actions; UX06 embedded message history collapsed and conflicted with its composer; UX07 floating activity intercepted relevant controls at narrow sizes; UX08 customer work summary used staff task language; UX09 empty session availability still invited unavailable input. A lighter full-reference disclosure was also suggested.

Fixes retain ordinary drafts in visited local sections, pause hidden chat requests with generation guards, separate dialog dismissal from navigation, hide retained order content during recoverable checks, clear it on revoked authority, give active tabs contrasting ink, space primary actions and provide intrinsic embedded-history height. Activity clearance/focus margins protect composer controls; customer next-step language is separate from staff actions. Full reference remains accessible in a lightweight disclosure.

## Round 2 — FAIL, UX09 remaining

The reviewer verified UX01–UX08 fixes at1280×900,768×1024,320×800 and320×450, including distinct unsent message drafts, adequate history height, focused textarea/Refresh/Send clearance, native-dialog Escape/Close restoration and destination-heading focus. UX09 remained actionable: session time and note inputs appeared without an available window.

The implementer gated dependent fields and submission on a currently selected window, kept availability refresh/local support visible and restricted session-action reason input to relevant active bookings. Unit regression covers empty availability, refreshed windows, selection and invalidation after period changes. Session-event authority handling also prevents repeated denied-fetch loops, with component regressions.

## Round 3 — PASS

The reviewer independently inspected the applied repository production build, using localhost4178 and isolated synthetic fixtures. Exact viewport set:1280×900,768×1024,320×800 and320×450. UX09 is resolved for empty, available, proposed and confirmed bookings; unsent session notes survive local-section changes. UX01–UX08 remain fixed. Recoverable order503 hides the workspace and restores its distinct private draft after recovery. Activity failure/empty/anonymous and unpaid/reversed-order states were rechecked.

21 sampled axe scans (nine overview/messages/activity and12 booking-state samples) reported zero violations. Booking states had no horizontal overflow. Native mobile modal and focused-control checks passed, including320×450. Final reviewer verdict: **PASS — no remaining actionable findings in the reviewed DI06 scope.**

Local evidence: `/tmp/di06-review-applied.json`, `/tmp/di06-review-evidence.json`, `/tmp/di06-review-behavior.json`, `/tmp/di06-review-focus.json`, `/tmp/di06-review-states.json` and matching PNGs. These are runtime artifacts, not repository assets.

The final staged review corrected cancellation guidance to point to Help, where Cases renders Refunds. The senior reviewer verified this source-level copy-only correction and explicitly preserved the scoped PASS.

## Limits

The preview uses synthetic read fixtures. Real API/mutation/authorization qualification and the complete commit gate are separate requirements recorded in `../DI06_QUALIFICATION.md`. Browser viewport simulation does not qualify physical-device keyboards or OS-specific behavior. Owner acceptance and final launch remain held; this PASS means no actionable scoped issue was found, not a guarantee of no undiscovered defects.

## Round 4 - mounting correction follow-up, FAIL then PASS

After the full browser gate exposed duplicate session bootstrap, activity moved into the verified customer shell on workspace routes. The designer confirmed one activity panel, one initial session read on `/account`, and anonymous/booster exclusion; 12 scoped accessibility scans were clean. Public activity to Order history nevertheless left focus on BODY at 320x800 and 320x450 (DI06-UX10).

AccountRouteFocus now handles first client-side workspace entry and delayed destination headings, while preserving normal initial document focus. Three component regressions cover these cases. The reviewer independently verified public activity to order history, support and exact order at 1280x900, 320x800 and 320x450; each destination receives heading focus, workspace navigation remains correct and only one activity panel renders. Final verdict: **PASS - DI06-UX10 resolved; no remaining actionable scoped DI06 findings.** Evidence: `/tmp/di06-review-mount.json`, `/tmp/di06-review-final-focus.json` and matching screenshots. Synthetic preview and physical-device limits still apply.
