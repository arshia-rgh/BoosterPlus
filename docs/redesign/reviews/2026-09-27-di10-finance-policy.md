# DI10C independent senior UI/UX design review

Reviewer: `/root/di10_finance_policy_review`. Date: 27 September 2026.
Base: `53f530a`. Scope: changed incoming payment evidence (A15), saved policy preview/publication (A18), and affected local Finance navigation. Files: `finance.tsx`, `model.ts`, `policy-editor.tsx`, `policy-preview.tsx`, `policy-workspace.tsx`, `incoming-evidence.tsx`, `workspace.css` under `frontend/app/payments/`.

Full A16/A17/A19 and production qualification are outside this increment. No live merchant calls or real data were used. Preview: `http://127.0.0.1:4186/admin/finance` with synthetic API.

## Round 1 — FAIL, three scoped findings

- **DI10C-01 (moderate, A15→Reconciliation focus):** At 1440×1000, open provider payment 123 evidence, activate “Use payment 123 for reconciliation.” The local view changes but the named reconciliation region does not receive focus. The unchanged Playwright `toBeFocused` assertion fails after 5 seconds. Keyboard/screen-reader context can remain on a now-hidden trigger. Required outcome: wait until the target local view is visible, then focus the named section. Preserve prefilled exact ID. Original failure: `/tmp/playora-di10c-review/evidence.json`; script `/tmp/playora-di10c-designer-review.mjs`.
- **DI10C-02 (moderate, A18 runtime indicators):** Policy runtime line displays merchant configuration and checkout only. Accepted `screens.json` A18 explicitly requires independent outgoing enabled/disabled status; `outgoing_enabled` is parsed but unused in this UI. Required outcome: read-only outgoing state beside the other runtime indicators, with unknown/unavailable when missing rather than inferring false.
- **DI10C-03 (minor, leave guard action separation):** At1440×1000, edit policy, switch to Payments, choose another module. The visible/focused leave guard works, but Stay and Discard action buttons meet edge-to-edge and read like a merged control. Required outcome: use shared action layout/gap and verify narrow layout. Evidence: `/tmp/playora-di10c-review/recovery/leave-guard-hidden-policy.png`.

## Verified unaffected scope

At1440×1000,768×1000,320×700: exact crypto strings remain separate from USD order pricing; full fractional precision retained; observed network and distinct latest-check/observation timestamps shown; stale prior evidence explicitly disclosed after provider failure; evidence expands with native details behavior. No horizontal overflow or axe violations in these captures.

At all three widths: saved policy→private saved-revision customer preview→explicit review checkbox→publish. Publish disabled before acknowledgement. Preview receives focus. Unsaved local edits disable saved preview. Green visual direction and persistent Finance identity retained.

At1440×1000: local policy draft survives Finance section changes; leave guard remains visible/focused after switching to Payments; Stay preserves draft. Write503 preserves draft; subsequent read503 disables editing without dropping draft; retry restores editing. Controlled newer GET revision preserves local draft, disables stale writes, supplies current-version comparison and explicit discard to adopt newer saved policy. Read403 removes editor. Write403 displays permission error and retains non-secret draft while synthetic GET remains authorized; no claim of server authorization qualification.

Evidence directories: `/tmp/playora-di10c-review/policy/` (six captures + JSON), `/tmp/playora-di10c-review/recovery/` (six captures + JSON), `/tmp/playora-di10c-review/evidence-layout/` (three captures + JSON). Review used rendered screenshots and browser assertions, not source review alone. Policy fixtures have no approved real terms and synthetic server mutation does not qualify publication rules.

## Tool notes and limits

First harness invocation used implicit context unsupported by axe; corrected to explicit browser context before successful checks. A proposed diagnostic replacement of failed focus assertion was rejected by automatic approval review as weakening the gate; the original failed assertion was preserved unchanged, and unaffected policy/layout checks ran in separate scripts. This did not block review or count as a pass. No application files edited by reviewer; no commits. Headless local Chromium only; physical devices, screen-reader speech, all back-end authorization, full finance stages and real funds movement remain outside this scope.

Pending: rendered re-review of implementing agent fixes before final scoped verdict.

## Round 2 — PASS, no remaining actionable findings in the scoped changes

Rebuilt/restarted preview verified after all three fixes, on the same local URL.

- **DI10C-01 resolved:** original `toBeFocused` assertion retained unchanged, now passes at1440×1000,768×1000,320×700. Evidence action prefilled exact provider ID123, selected local Reconciliation, focused its named section, and kept Finance identity. The implementing fix consumes the focus request only after the target view is visible.
- **DI10C-02 resolved:** rendered policy independently states merchant configured, checkout disabled, and outgoing payments disabled. A browser-intercepted response omitting `outgoing_enabled` renders “Outgoing payments: status unavailable,” not disabled. This does not change runtime switches or publish synthetic status as real configuration.
- **DI10C-03 resolved:** leave guard now uses shared action spacing. Measured horizontal separation8px at1440; actions stack with8px vertical separation at320, both44px high. Guard still focuses correctly from a different Finance section; Stay retains policy edits.

Regression rerun: evidence, reconciliation and policy edit/preview at all three widths; saved draft→preview→review→publish and local draft retention all pass. Twelve captures in `/tmp/playora-di10c-review/round2/` and three in `/tmp/playora-di10c-review/round2-extra/`; all recorded captures have no axe violations or horizontal overflow. Screenshots were visually inspected, including narrow reconciliation and both guard layouts. Original round-one failure evidence remains intact. Scripts: `/tmp/playora-di10c-designer-round2.mjs` and `/tmp/playora-di10c-status-guard-round2.mjs`.

Final verdict: **PASS — no remaining actionable findings in the changed A15/A18 and affected Finance navigation scope.** This is scoped design evidence, not completion of A16/A17/A19, all DI10, physical-device qualification, server authorization qualification, real payment qualification, owner acceptance or launch authorization. Synthetic mode restored to normal; all reviewer browser processes closed.

## Round 3 — narrow lint-refactor regression, PASS

Following the lint-compliance change from effect state reset to a consumed-request ref, independently reran the original reconciliation `toBeFocused` assertion unchanged at1440×1000,768×1000,320×700 against the rebuilt preview. All passed. Exact provider ID123 stayed prefilled. Subsequent ordinary Payments→Reconciliation navigation kept focus on the selected navigation button and did not steal focus into the section; editing the reason also retained input focus. A second evidence action correctly issued a new focus request and cleared the prior reason. No overflow. Captures and JSON: `/tmp/playora-di10c-review/round3-focus/`; script: `/tmp/playora-di10c-focus-round3.mjs`. Narrow screenshot visually inspected; no layout change observed. No other runtime changes reviewed in this round.

**Final scoped verdict remains PASS — no remaining actionable findings in changed A15/A18 and affected Finance navigation.** Earlier scope exclusions and limits remain. Reviewer browser closed.
