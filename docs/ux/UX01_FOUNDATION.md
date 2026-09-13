# UX01 — PLAYORA layout and motion foundation

Implementation stage started with owner authorization on 13 September 2026. This document records the shared conventions and the character storyboard; the customer-navigation and chat redesigns follow in UX02/UX03. R10/R11 remain held.

## Reproduced issue and scope

The previous account header produced a 351px document at a 320px viewport. Measured with Chromium against the local production build; the before image is `frontend/.cache/ux01-before-account-320.png`. The new header wraps, with the less frequent explanatory link omitted at mobile widths. Automated checks cover 320, 390, 768 and 1440px, synthetic long headings, enlarged text and visible control bounds. Layout fixes contain long text instead of hiding overflow at the document root.

Signed-in customer/booster screens no longer repeat the promotional banner. A shared `PageHeader` provides compact task titles. Forms, buttons, labels, legends, status badges, lists and tables share wrapping, spacing and focus conventions. Privacy's secondary heading describes its content instead of repeating the page title. Existing admin drawers, disclosure elements and semantic navigation retain native behavior; new navigation/chat compositions are later stages.

## Component rules

| Surface | Rule |
| --- | --- |
| Branding | `BrandLogo` shares the approved green P/play and segmented O identity between storefront and admin. Outlined SVG variants support dark, light and monochrome use without font downloads. The tiny inset O stroke is omitted at interface sizes for legibility. The original raster masters remain available. |
| Page header | One h1 per task, optional short eyebrow, optional wrapping action group. Workspace title scale is 1.75–2.5rem; marketing keeps its existing scale. |
| Actions | Minimum 44px button height, compact internal gap, wrapping labels and explicit focus outline. Existing submit/busy/disabled semantics remain. Grouped actions do not acquire large repeated vertical margins. |
| Fields | Container and control min-width zero; one column on narrow screens; 1rem control text; long labels and legends wrap. Inputs retain browser validation and linked labels/help. |
| Status and feedback | At least .875rem task metadata; status text remains explicit. Errors wrap. Empty live regions remain empty, and no decorative animation delays feedback. |
| Disclosure / drawers / tabs | Native details/summary and dialog behavior; clear focus rings; wrapping navigation links with current-page state. UX02/UX03 will add task-specific navigation rather than unrelated generic widgets. |
| Tables and lists | Long identities shrink/wrap within their cell or row. Genuine tables scroll inside their region; ordinary page content does not scroll sideways. |
| Green theme | Existing homepage colors and Inter/Georgia choices retained; shared accent is sage green. Page-specific semantic colors still distinguish errors and internal notes. |

Public-facing frontend labels and page metadata use PLAYORA. Internal module/package names, storage preference keys and historical backend records remain compatible. Backend email/sender/Google/provider identities are tracked separately in UX02/final-launch; this stage does not claim those external identities changed.

## MLBB character storyboard for UX05

This is a composition specification, not a delivered character animation. The existing rank transition still runs its original keyframes. Prepare a character cutout with separate torso, hair/cape, weapon/light and environment layers before animating the storyboard. A flattened social PNG is not that asset.

| Progress | Desktop composition | Mobile composition | Stable content |
| --- | --- | --- | --- |
| 0% | MLBB character at outer right, three-quarter pose, foreground slightly low; soft idle breath/cloth | Smaller character below the headline, clear of CTA | Intro, navigation and CTA visible immediately |
| 25% | Character rises gently and shifts toward the rank scene; architecture moves at lower amplitude | Short upward transition beside the profile card; fewer atmosphere layers | Low-rank profile and labels fully readable |
| 50% | Torso/weapon pose settles, green light briefly follows the profile transition | Restrained weapon/light movement; no camera zoom | Current/target rank explanation stays fixed |
| 75% | Character eases outward, equipment highlight fades; high-rank profile takes focus | Character moves to the scene edge; no crossing over copy | High-rank label, scope explanation and action remain readable |
| 100% | Character settles at outer edge as service cards enter | Static edge pose; scene releases into ordinary page scroll | All package/service controls available without a wait |

Scroll position drives reversible scene progress; idle breathing/cloth has its own bounded timeline and cannot move the scroll pose. Native wheel, touch and keyboard scrolling remain in control. The shared `ui/motion.ts` now owns preferences and scroll scheduling; it coalesces events, clamps progress, repositions on resize/history return, avoids hidden-tab work and cleans up on disposal. Existing preference keys remain compatible.

Before UX05 completion, produce visual storyboard frames and the actual prepared character layers, review them at desktop/mobile sizes, then qualify intermediate frames, reverse scroll, reduced motion, pause, slow/missing assets and cleanup. Measure transfer/frame pacing on named devices and preserve the current budgets. The social illustration does not activate unavailable games or establish publisher permission.

## Verification evidence

Frontend unit tests include the existing rank/fallback/preference scenarios and a new shared-binding regression for event coalescing, hidden-tab cancellation, current-position resume and disposal. The browser layout regression exercises real rendered entry routes, enlarged text, long content, header overlap and axe checks. Existing authenticated desktop/mobile journeys remain required to qualify role boundaries and domain workflows.

Rendered review files under `frontend/.cache/ux01-*` are generated evidence, not runtime assets. Screenshots and a passing axe result do not certify every interaction; remaining customer shell, chat, order and operational redesigns stay assigned to their roadmap stages. Every stage still requires the full root/backend/frontend/production pre-commit before a direct-main commit.
