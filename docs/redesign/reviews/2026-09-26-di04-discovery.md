# DI04 discovery — scoped senior design review

Base: `61ba66248738f54c114a62ca8d63372b597a13be`. Reviewer: `/root/di04_design_review`, separate senior UI/UX designer. Scope: P01/P02/G01–G06 homepage, directory and persistent game hub changes, shared statistics, featured offers, service selection and embedded account browsing. DI05/DI06/DI10 and later specialist flows remain outside this phase exit.

## Round 1 — FAIL

| Finding | Impact | Correction |
| --- | --- | --- |
| UX01 · selected-service return | Back to choose a service appeared below featured offers and could be missed. | Moved the small return link directly after statistics, before selected-service offers. |
| UX02 · mobile artwork | WoW and Dota faces were obscured by copy at narrow sizes. | Dedicated mobile upper artwork zone, overlaid copy below it, and released WoW mobile focal position at 5%. |

## Round 2 — PASS

The reviewer verified the corrections in the running production preview and captures at 1280/768/320 CSS pixels. All six game images were checked at 320×900. Native anchors/focus, service selection/history, embedded accounts, direct paused access, directory search, metric failure, featured offers and the manually controlled review carousel were reviewed. The separately detected directory card heading skip was corrected with level-two directory headings and level-three homepage headings. Explicit verdict: **PASS — no remaining actionable findings in the DI04 review scope.**

## Round 3 — final methodology addendum — PASS

Final primary diff review found a heading skip inside the expanded statistics explanation. Changed the labels to H2 while preserving their compact typography. The senior reviewer inspected current-build home/game expanded-state captures at 1280/320. All four full-page axe checks passed. The first game desktop capture was above the expanded body; a direct expanded-element capture supplied the missing rendered evidence. Explicit final verdict: **PASS — the prior DI04 verdict remains valid.** Readable wrapping and no overlap were confirmed.

## Evidence and limits

- Scoped isolated browser rerun: 24 desktop plus 24 mobile journeys passed, including six game artwork fixtures, shared form/navigation regression, review carousel boundaries, motion and accessibility. Final full tracked gate remains a separate delivery requirement.
- Ignored evidence: `frontend/.cache/di04-*.png`, including `di04-method-{home,game}-{1280,320}.png` and `di04-method-game-1280-expanded.png`; focused methodology report `/tmp/playora-di04-methodology.json`.
- Running preview at local port4176 used the actual production build and anonymous public responses copied from isolated local fixtures. Review-carousel presentation data was explicitly synthetic. No credentials, live payment or runtime game publication was used.
- CUA became unavailable for the narrow final methodology addendum; current-build captures and corresponding axe evidence supplied that review. Earlier live interaction review remains valid. Tool capture failures were not classified as application defects.
- Physical devices, screen readers, real funds, public asset licensing and owner acceptance remain separate. No whole-product or launch approval. DI06 activity and later features were not certified. PASS means no actionable finding in the reviewed scope, not proof of defect-free software.

## Round 4 — full-regression corrections — PASS (27 September)

The complete browser suite exposed transient text contrast during the local service entrance and omitted published support hours. Removed opacity from the entrance while keeping its small translation and reduced-motion behavior. Restored optional configured hours beneath the FAQ contact action. The catalog list also now displays slugs so staff can distinguish valid catalogs sharing a display name.

The same senior reviewer inspected actual production-build captures at1280/768/320 for all three changes. Hours wrap without overlap, text remains opaque, and catalog slugs fit within cards. Order/fulfillment accessibility, policy publication and catalog editing/publishing browser journeys passed. Motion JSON records settled opacity1, not an in-flight measurement; source inspection confirms the animation no longer changes opacity. Explicit final verdict: **PASS — no remaining actionable findings in this DI04 addendum.**

Additional ignored evidence: `frontend/.cache/di04-contact-{1280,768,320}.png`, `di04-motion-readable-{1280,768,320}.png`, `/tmp/playora-di04-review-motion.json`, and `frontend/test-results/desktop/catalog-admin-staff-builds-0fb17-game-through-the-generic-UI-desktop/di04-admin-identities-{1280,768,320}.png`. Same physical-device, assistive-technology and launch limits apply.
