# DI11A shop-authoring senior design gate

Base: `1301aeb8345db146d3ec89365a144f8aef6b6db0`. Reviewer: independent senior UI/UX designer agent `/root/di11_shop_design_review`. Implementer: `/root`. Date: 28 September 2026.

## Scope

Private shop list/create and persistent product editor at `/admin/shop` and `/admin/shop/:id`, new admin navigation entry, local sections, drafts/stock edits, saved preview/publication, capacity review, lifecycle controls, validation, revision conflicts, access/transport recovery and named list returns. Optional field validation added to the shared Select is exercised by the shop; existing callers remain unchanged without its optional name. Preserve green brand and separate administrator authentication. No public discovery, purchase, fulfillment, availability/promotion completion or final launch acceptance is claimed.

## Review rounds

1. **FAIL.** R1-01: stock drafts and busy writes were absent from the departure guard; corrected with parent-observed stock dirty/busy state and retained stock sections. R1-02: reviewer initially described history HTTP 401/403 as retaining the editor; that assertion was corrected after tracing the existing API session-loss events, which already clear those responses. Explicit denied-record clearing was added for remaining 404/domain/mocked denial paths. R1-03: added a selectable paginated game filter; authoritative purchasable-availability filtering remains explicitly required in DI11B, not represented by misleading historical stock totals. R1-04: replaced raw paths with local correction links, control focus and associated field errors; include saved-preview issues as well as write errors. New-product cancellation/departure also preserves user choice.
2. **FAIL after responsive renders.** R2-01: distinguish a pristine empty catalog from filtered no results. R2-02: group/style the game filter below the Products heading. Added scoped spacing between product title and state. Existing game/section/status context, form fit, preview and capacity layout were otherwise readable.
3. **FAIL after error-state renders.** R1-04 follow-up: several summary links had indistinguishable generic labels; add the exact field name and variant/recipient position. R3-01: separate Stay/Discard controls using the existing action group. Apply the same treatment to new-product cancellation. Capture a settled empty state rather than a transient loading state.
4. **PASS — no remaining actionable findings in the DI11A shop-authoring scope.** Reviewer verified all corrections in current code, component evidence and refreshed rendered desktop/narrow captures. No findings remain open within the bounded increment.

## Evidence and limits

The real local application was built and exercised against isolated API/TiDB/SMTP fixtures. All seven editor sections were captured at 1440×900, 768×900 and 393×900 CSS viewports, with additional default desktop/mobile list, validation summary, field correction and leave-confirmation captures. Saved preview is shown inside the staff record. The final focused Chromium journey passed desktop in 11.9 seconds and mobile in 8.8 seconds; every editor section passed axe and document-overflow assertions. Thirteen new route/component cases cover the changed guards, revisions, confirmation, filters, error recovery and field navigation. Ignored captures: `frontend/.cache/shop-*`; final browser log: `.cache/qualification/di11-shop-browser-approved-tree.log`.

The reviewer inspected captured renders and automated behavior evidence; this is not physical-device or manual screen-reader qualification, a full-repository gate pass, complete SH06/SH07 acceptance or launch approval. Public availability, promotion/eligibility, complete media/public-preview parity, purchase and manual fulfillment remain required under `DI11_QUALIFICATION.md` before DI11 completion. The complete repository gate remains scheduled for DI15 under the owner's revised cadence.
