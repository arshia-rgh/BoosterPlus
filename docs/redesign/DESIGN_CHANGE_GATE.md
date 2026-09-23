# Required design change gate

Owner instruction, 24 September 2026. Applies throughout the design-first phase to changes in the design atlas, visual assets, screen/flow specifications and interaction designs. Application work and R10/R11 remain paused. This review supplements the existing repository checks; it never replaces them or owner acceptance.

## Required review loop

1. Define the changed scope before editing: affected screens, shared components, states and flows; acceptance criteria; files/diff against the preceding delivered commit. Shared-component changes require representative affected contexts, not a fresh audit of every unrelated feature.
2. Spawn a separate **senior UI/UX designer** agent for this change. Give it that scope, current owner instructions, a running local preview and relevant evidence. The reviewer reviews and reports; the implementing agent makes fixes. Do not self-certify in place of spawning the reviewer.
3. Review the rendered changes, not just code. Cover desktop, atlas Phone/Tablet modes and a genuinely narrow browser viewport when responsiveness is affected. Review touched keyboard/focus, motion, scrolling, loading/failure/empty and signed-in/out states as applicable. Check the boundary between the product preview and design workspace. Never use real private data in the prototype.
4. The reviewer returns **FAIL — findings**, **BLOCKED — missing evidence**, or **PASS — no remaining actionable findings in this scope**. Each finding has an ID, severity, screen/selector, reproduction steps/dimensions, user impact and required outcome. Separate observations from hypotheses and optional future ideas.
5. Fix each actionable finding, rerun the relevant checks, and send the updated diff/evidence back to the same senior reviewer. Repeat as many rounds as needed. The reviewer verifies fixes and checks for regressions caused by them. Do not broaden into unrelated redesigns or stop after an arbitrary number of rounds.
6. Pass only when every scoped actionable finding is resolved and the reviewer explicitly confirms it. Missing browser/device/tool access is a qualification limit, never evidence of success. If required review is blocked, record it and do not claim the gate passed. Passing means no issues found in this review, not a guarantee that no undiscovered issue exists.
7. Record the scope, reviewer identity, rounds/findings/fixes, actual viewport/state checks, final verdict and remaining limits in a dated file under `docs/redesign/reviews/`; summarize in `docs/progress.md`. Then run the existing proportionate checks, review the staged diff, commit/push directly to main and verify origin/main.

## Reviewer handoff template

- Scope and user acceptance criteria:
- Base commit and changed files:
- Preview URL and screen/state paths:
- Evidence and exact canvas/browser dimensions:
- Prior-round finding IDs and fixes:
- Required response: verdict; findings with repro/impact/required outcome; verified fixes; evidence limits.

Review only changed designs and affected shared behavior. Preserve business rules and green visual direction. The existing Git hook runs automated checks; it cannot spawn or replace this agent review. The primary agent is responsible for completing and recording this mandatory workflow before committing each design stage.
