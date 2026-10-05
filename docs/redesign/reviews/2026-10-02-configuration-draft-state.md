# Configuration draft state review

Scope: `catalog/dynamic-form.tsx` and its selection-retention regression/fixture.
No production copy, layout, pricing, authorization or consent rules change.

The server order journey selected Solo but submitted an empty mode. Investigation
found that any saved configuration, including a draft for another offering,
changed the active form's key and remounted it. An unrelated client storage
snapshot could therefore discard current selections. The new regression fails
against the original implementation.

## Review rounds

Reviewer: senior UI/UX designer `/root/launch_overflow_review`, 2 October 2026.

1. Initial proposal keyed the form only by currently applicable saved drafts.
   The reviewer raised **DRAFT-01**: starting from a valid restored draft, editing
   it, then receiving an unrelated snapshot still changed that key to fresh and
   lost the edits. A new parameterized regression reproduced this failure.
2. Retain the identity of the last accepted relevant draft. Unrelated or expired
   snapshots no longer replace that identity; a newly applicable draft still
   restores its permitted choices. Both fresh and previously restored cases now
   retain edits. Component regressions passed.
3. Reviewed rendered browser-test screenshots at 320×800, 768×800 and1280×800.
   Solo remained selected and in the summary without clipping or overlap.
   The real-browser fixture scenario passed, including document-width and axe
   assertions. Primary CUA interaction confirmed Play mode → Coupon code →
   Check selections keyboard focus after the restored/edit/unrelated sequence.

Final verdict: **PASS — no remaining actionable findings in this scope.**

The reviewer's own browser connection was unavailable in this follow-up, so
round3 used supplied screenshots and the primary agent's interaction evidence.
Local rendered qualification used macOS Chromium/Node26. Ubuntu server
qualification, backend submission, physical devices, assistive technology and
broader launch readiness remain separate requirements. No server/full-gate or
production acceptance is inferred from this scoped review.

## Follow-up: initial hydration readiness

The server repeat exposed a separate first-load race: a server-rendered selector
could receive a choice before React was ready to retain it. Configuration inputs
and validation now remain natively disabled until hydration. A visible status
says “Preparing your form…”; a no-JavaScript explanation states the requirement.
The submit handler also checks readiness. This follow-up adds loading copy and
does not change pricing, authorization or consent.

The senior reviewer found no actionable issue in the code/accessibility review:
the fieldset covers editable controls and validation, and later order actions
remain unavailable until validation. The first visual follow-up did not complete
and was not counted as a pass. A fresh senior reviewer,
`/root/hydration_visual_closeout`, inspected all four desktop/mobile preparing
and ready screenshots on 2 October 2026. The status is legible, disabled controls
remain readable, neither state clips or overlaps, and Solo appears consistently
in the ready selector and summary. **PASS — no actionable scoped findings.**
Native disabling, no-JavaScript handling and persistence rely on the separately
recorded code review and tests; the screenshots alone do not verify behavior.

Server run `playora-hydration7.service` passed type checking, lint, 13 focused
component tests, both builds and the complete desktop/mobile order scenario.
The regression deliberately delays scripts and verifies disabled-to-ready state
and retained Solo selection. Its existing 150-second deadline is unchanged.
Preparing/ready screenshots for both devices are preserved under the server's
`frontend/test-results/{desktop,mobile}-batch-0/` order result directories and
copied locally under `/private/tmp/playora-hydration-review/`.
