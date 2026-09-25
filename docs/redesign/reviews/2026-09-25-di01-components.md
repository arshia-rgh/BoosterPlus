# DI01 component completion review

25 September 2026. Senior reviewer: `/root/di01_chrome_review`. Scope: the remaining DI01 shared field validation, button/status/loading variants, cursor navigation, keyboard table-region pattern and representative RecordShell qualification. Public/homepage/commerce redesign and portal authorization are outside this component review.

## Adequacy audit

The reviewer identified four bounded phase-exit gaps: field-linked validation; canonical list/table navigation; missing component variants; inventory/representative qualification. Existing reports already had a named keyboard-scrollable table region; its implementation was extracted rather than replaced with an interactive grid. Existing native dialogs/drawers and durable Feedback were retained; no floating toast system was necessary.

## Round 1 — FAIL

- **C01, P2:** editing the last invalid field removed its highlight but left “Check the highlighted fields.” Fixed the transition to “Changes entered. Submit again to check them.” Only the edited field's issue clears; unresolved issues remain. The server must still validate the next submission.
- **C02, P2:** the action label changed to a busy label without preserved width. Added reusable Button busy/busyLabel state with overlapping reserved label geometry, correct accessible label, disabled activation and aria-busy. Hidden labels are excluded from accessibility.

## Round 2 — PASS

The reviewer inspected refreshed actual-component captures, corrected-field feedback, delayed-save captures and six passing desktop/mobile browser scenarios. Exact button width is asserted before/during a deliberately pending response. Other assertions cover field help/error associations, summary-link focus, correction, retained safe inputs, axe zero violations, 320px/200% root text, arrow-key table scrolling, cursor pending/filter reset, actual GameCatalog pagination/error recovery and RecordShell deep links/Back/Forward/focus/caller-owned drafts.

Captures: 1440×960, 768×1024, 390×844, 320×600, short 768×360 and 320px with 200% root text. The fixture imports actual production components from `frontend/app/`, but its HTML/module live only in `frontend/tests/fixtures/ui-foundations/`; it has no application route, real account, payment or network mutation. The fixture server uses no environment file. Test source: `frontend/tests/e2e/foundation-components.spec.ts`, shared component/unit tests and identity tests.

Final explicit verdict: **PASS — C01 and C02 are resolved; no remaining actionable findings in this component scope.** The reviewer confirmed the bounded component gaps are covered, subject to the inventory and complete repository qualification.

## Limits

The reviewer used independently inspected captures, source and automated interaction evidence because direct browser access was unavailable. No physical-device, real browser zoom or exhaustive whole-application acceptance is claimed. RecordShell remains a qualified primitive; integrating every real order is DI06/DI08/DI09 work. Cursor behavior is used by the actual GameCatalog and tested with synthetic published listing data; existing database/browser journeys remain required by the unchanged full gate.

## Actual workspace integration follow-up — C03

A subsequent real admin Identity/PanelState capture at 768px exposed a collapsed 42px skeleton inside 464px of available flex space. The senior reviewer independently confirmed **FAIL — C03, P2**. The shared skeleton now explicitly fills its available width while retaining max-width containment; its decorative children do not add a second status announcement.

Updated built-app captures at 320/768/1440px show skeleton/available widths of 238/238, 463.94/463.94 and 454/454px, with visible lines, no document overflow and no skeleton animation under reduced motion. `recovery-foundation.spec.ts` holds the actual session request pending and asserts this integration, one parent status and decorative aria-hidden in both desktop/mobile browser projects. Both targeted scenarios passed. The reviewer inspected these captures, metrics, source and test evidence and returned **PASS — C03 is resolved; no remaining finding in this follow-up scope.** Direct-browser/device limits above remain; full repository qualification is separate.
