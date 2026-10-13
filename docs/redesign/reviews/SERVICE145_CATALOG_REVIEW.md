# Service145 catalog design review

Date: 13 October 2026. Reviewer: `/root/service145_senior_design`, a separate senior UI/UX reviewer. Implementation base: `d85f52b`; production remains separately qualified. This review is limited to the current MLBB catalog authoring and customer-selection changes, generated fixed-package covers/cards, and their affected shared controls. It does not certify live catalog publication, provider transactions or production deployment.

## Evidence and limits

- Read `AGENTS.md`, `docs/redesign/DESIGN_CHANGE_GATE.md`, `docs/mlbb-catalog-setup.md`, prepared catalog data and the changed component source.
- Independently viewed rendered screenshots under `frontend/.cache/service145/results/` for the form and import at 320, 768 and 1280 pixels, and package cards at 1280 pixels. Screenshots use the real changed components and experience CSS in an isolated synthetic preview.
- The implementation agent reports four passing focused browser cases covering accessibility scanning, horizontal overflow, hero/location relationships, blur validation, stale import rejection, review/apply/discard, export equality and artwork loading. The reviewer read the corresponding `frontend/tests/e2e/mlbb-catalog.spec.ts`; these executions are implementation-provided evidence, not independent reviewer interaction.
- Independent browser interaction is unavailable: the reviewer tools exposed no browser, and native Firefox access was denied. The reviewer did not access a live admin tab or perform a production mutation. Visual review of supplied captures remains possible; this limitation must accompany the final verdict.
- Primary-agent manual evidence reports Glory 62→75, Kagura matching Mid Lane, and adding Miya clearing/disabling the lane. This is attributed evidence.
- No whole-site review, real-device/screen-reader test, live Google/email sign-in or payment qualification is claimed.

## Source review corrections verified

- Distinguish playing lanes from hero classes and geographic play locations from numeric account Zone IDs.
- Preserve selected radio text through search; return focus to search after removing a selected chip.
- Rank/star grouping follows progression metadata. Mythic-tier customers enter absolute stars, with clear tier bounds and neutral validation after leaving an input.
- Rank-specific editor explanation is limited to rank references.
- Import is local unsaved authoring, checks game and source revision, resets review status, exposes names and replacement scope, and explains recovery. Normal saving, concurrent-revision checks, preview, publication and MFA remain separate.
- The legacy fixed package now has a meaningful variant label.
- Automatic lane matching no longer introduces an unrequested price adjustment; prepared pricing retains the disclosed hero and together-play adjustments.

## Rendered round 1 — FAIL

### S145-01 — P1 — Hero search fieldset is split into unrelated columns

**Screen/selector:** Custom boost, `.catalog-choices-searchable`, at 1280 and 768 pixels.

**Reproduction:** In the supplied form captures, select Kagura, clear the query, and inspect Preferred heroes. The selected-count text, search label, actual search input, selected chip, options scroller and match count occupy separate grid columns. The search label has the border/padding of an option, while its input is visually detached. At 320 pixels the controls stack, but the search label remains styled as a selectable option.

**Impact:** The key discovery control is difficult to recognize and uses only a small fraction of available width for the 133-hero list. This is a rendered CSS collision, not a hypothesized defect. The generic `.experience .catalog-choices` grid and label rules affect the new fieldset structure.

**Required outcome:** Stack count, search label/input, selected chips and result count in a coherent field; make only `.catalog-choice-options` a choice grid/scroller. Restrict option-label treatment to actual option labels. Verify desktop, tablet, phone, selection/removal, filtering and focus after the correction.

### S145-02 — P2 — Import actions have browser-default sizing and run into labels

**Screen/selector:** Admin configuration import, new raw buttons and `label[for="catalog-import"]`, all supplied sizes.

**Reproduction:** Expand import/export and review a valid isolated draft. Export saved configuration, Review import, Use in unsaved draft and Cancel import render as small default gray buttons. Export directly touches the next textarea label; the two final actions also touch. On the 320-pixel capture the buttons are approximately 20 pixels high.

**Impact:** Primary and secondary actions lack the established hierarchy and sufficiently large touch targets, especially on phones. The new `button-quiet` class is not an established standalone button treatment.

**Required outcome:** Use the existing styled action controls or complete `.button`/secondary treatment, with separate label layout and spaced wrapping action groups. Maintain at least 44-pixel touch targets and visible keyboard focus; retain disabled, error, review, apply and discard behavior.

### S145-03 — P2 — Fixed-package cards bury prices beneath full agreement copy

**Screen/selector:** Fixed-package grid, `.game-card`, supplied 1280-pixel capture.

**Reproduction:** View the package grid. Full delivery/start-condition/eligibility paragraphs appear above the amount, making each approximately 350-by-930-pixel card much taller than its width. A visitor must read/scan a dense paragraph to reach each price.

**Impact:** The offer grid is hard to compare and conflicts with the owner's compact square-service-card direction. The generated artwork is clearly framed and coherent with the green theme; the issue is the text/price hierarchy.

**Required outcome:** Preserve complete agreement wording on the package detail view. In the grid, show a concise scope summary (start/target, mode and timing), prominent price and clear offer action. Capture the revised package grid at 320, 768 and 1280 pixels; current package captures are only at 1280 because the test captures them after the viewport loop.

## Rendered round 2 — PASS

The reviewer independently opened the corrected form, import and package-grid screenshots at each of 320, 768 and 1280 pixels using the image-viewing tool. Source changes and the focused browser assertions were reread. The first-round screenshots are retained under `.cache/service145/review-round1/results/`; corrected captures are under `frontend/.cache/service145/results/`, in the desktop/mobile scenario directories.

| Finding | Verification | Status |
| --- | --- | --- |
| S145-01 | Count, search label/input, selected chips, bounded options grid and match count now stack in a clear sequence. The hero options use the available width at desktop/tablet and one column at 320 pixels. Search labels no longer look like option cards. Selected Kagura remains visible separately from the scroller. Source scopes the grid and option-label styles; focused assertions check stacking geometry. | Resolved |
| S145-02 | Import/export/review/apply/cancel have the existing green primary/outlined secondary treatment and separated labels/actions. Phone actions wrap without collision. Source gives the touched actions 44-pixel minimum height; the implementation also corrected secondary hover contrast found by its accessibility scan. | Resolved |
| S145-03 | Each package now presents name and price prominently, followed by scope/mode and timing, a bounded three-line description excerpt, and its offer action. Full agreement copy remains on the detail view. Revised grids show three columns at 1280, two at 768 and one at 320; square artwork remains clearly framed at all three widths. | Resolved |

The isolated import fixture's separate disabled Discard button is a fixture control, not the application's existing Review & publish control. It is not evidence of an unstyled production discard action. Actual imported contents still require normal saved-preview review and publication.

The implementation agent reports all four updated desktop/mobile browser cases passing, including geometry, accessibility scans, no overflow, relationship behavior, selected-chip focus, blur errors, stale import rejection, apply/discard, exact exported data and all artwork loading. The reviewer read these assertions but did not execute browser interactions independently because the browser-access restriction remains.

## Final verdict

**PASS — no remaining actionable findings in this changed visual/interaction scope on the reviewed evidence.** This is an independent rendered-capture/source review supported by attributed implementation-agent interaction checks, not a claim of independent hands-on browser or screen-reader testing. The three first-round findings are resolved. No application files were edited by this reviewer, and no production publication, payment or other live mutation was performed.

Preserve the evidence limits above in qualification reporting. This scoped pass does not certify provider behavior, unseen live admin changes, real-device behavior, unrelated routes or absence of undiscovered defects.
