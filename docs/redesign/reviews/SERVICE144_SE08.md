# Service144: SE08 service tiles and custom-boost shortcut review

Date: 12 October 2026. Reviewer: separate senior UI/UX agent `/root/service_release_designer`.

**PASS — no remaining actionable findings in the reviewed SE08 scope after five rendered rounds. SE-T01–02 are closed.** Earlier failures remain recorded below; this is scoped UI evidence, not complete release or production qualification.

## Candidate

Frozen `service144-r7`, isolated `service144-review8`, manifest `c406fcb87fdebc95fc56e566599302207ef5b2eed72a6483170520e207648561`.

Scoped to changed square-media service grids, fixed-package-first discovery, and bounded custom-boost shortcut/chooser. No broad website redesign or backend/API pass is implied.

## SE-T01 — chooser extends below the usable phone viewport, medium — closed

At390×844 with200% text and the signed-in header, the sticky custom-service chooser begins at y518.6px. Its65dvh maximum height allows a bottom of1067.2px. Tab focuses **Play together** at y860.6–953.2 and **Close service choices** at942.4–1066.0, outside the844px viewport. Internal scrolling does not make those controls visible because the container itself extends below the screen.

Required: bound the chooser to the actual space remaining below the header/action, or use a nonsticky/in-flow/dialog presentation when insufficient room remains. Keyboard focus must be visible for every service and the close action. Retain Escape return to the trigger and do not overlap the orders/support control.

Evidence: `designer-sticky-zoom-r1-geometry.json` and `tab-0/1/2-viewport.png` in the review8 evidence directory. The same clipped visual configuration appears in the phone Chromium/WebKit200% screenshots.

## SE-T02 — account artwork fallback retains the old rectangle, low — closed

At320px a failed account image becomes a286×190.66px placeholder with computed3:2 aspect, while loaded account images and other services' failure placeholders are square. The legacy `.market-card > .account-image-placeholder` has equal specificity and wins later in the cascade; its extended width/negative margins also differ from the intended bounded media presentation.

Required: apply the complete shared square dimensions/aspect/margins to both loaded account media and fallback, using effective specificity. The correction should work for absent images and failed image requests.

Evidence: `designer-tile-fallback-r2-accounts-unavailable-art` and measured geometry. The first fallback helper stopped at its true dimension failure; the second captures the actual fallback before asserting.

## Second rendered round

Frozen `service144-r8` / `service144-review9`, manifest `13efd0ecf7b54510ffc3fe24402390c4d24f77a63a6a3b47d0c58c1d271ac7d5`.

SE-T02 closes:320px account fallback now254×254px with square aspect and bounded margins. Package/news/shop fallback remains square.

SE-T01 improves substantially: the chooser is bounded to y518.6–828 in the844px viewport. However, native keyboard focus scrolling still places Play together's bottom at831.2 and Close service choices at847.0; the latter loses its bottom19px behind the chooser clipping edge. The screenshot confirms the button/focus ring is cut, even though its label is now readable. Ensure every focused target is completely visible inside the actual chooser scrollport. Consider removing the inherited game-body scroll margin from this nested scroll container and/or explicitly ensuring the focused item is within its scrollable bounds.

Evidence: review9 `designer-sticky-zoom-r1-{geometry.json,tab-0,tab-1,tab-2}` and `designer-tile-fallback-r2-*`. Earlier offscreen-keyboard evidence remains unchanged in review8.

## Third rendered round

Frozen `service144-r9` / `service144-review10`, manifest `a76a360ba66a8b2b6373d0d731329f1aa5a5bea34b6b5adac9562dd325db9aec`.

The chooser now reveals each focused choice locally and overrides the inherited game-body scroll margin. Chromium390px/200% passes: all three focused controls fit inside the chooser scrollport and viewport.

At320px WebKit/200%, the large header and wrapped action leave only119.4px for the chooser, but individual choices are125.6–158.6px tall. First choice is cut at the bottom; the second and Close are cut at the top. Local scrolling cannot make a control taller than its scrollport fully visible. Introduce an insufficient-space fallback, such as an appropriately sized dialog or nonsticky flow, and avoid forcing the trigger word into a one-letter line. Keep the whole selectable label, focus indicator and close control reachable even with long real service names.

Evidence: review10 `designer-sticky-final-chromium-390-*`, `designer-sticky-final2-webkit-320-*`, and corresponding geometry JSON. Safari ordinary Tab skips links by default in this synthetic browser; the corrected helper uses its full-keyboard Alt+Tab path and confirms all actual chooser controls receive focus. The clipping remains with that corrected keyboard setup, so it is a product finding rather than a skipped-link test artifact.

## Fourth rendered round

Frozen `service144-r10` / `service144-review11`, manifest `69624f91697f8308f6b2aa17869cf527ea01626c69b3efdd38cb630fa8d763ac`.

The insufficient-space fallback now passes320px WebKit/200% text. Choices move into normal page flow; all service and Close targets remain fully visible below the signed-in header when focused. Close and Escape restore the visible trigger; selecting Play together reaches its form while retaining the game context and hiding the shortcut. The390px Chromium100% regression retains a bounded chooser and passes the same complete cycle.

The remaining low-severity label issue noted in round3 persists: the trigger displays **Configur / e / custom / boost** because its decorative icon and padding leave too little room for the word. Give the trigger's label enough width for whole-word wrapping at this size without reducing text scaling or clipping. The interaction and focus part of SE-T01 is verified closed; only this visual remainder awaits correction.

Evidence: review11 `designer-chooser-cycle-webkit-320-200-*`, `designer-chooser-cycle-chromium-390-100-*`, and `designer-sticky-final2-webkit-320-*`. Geometry assertions cover actual viewport and sticky-header boundaries, not just DOM visibility.

## Fifth rendered round and final verdict

Frozen `service144-r11` / `service144-review12`, manifest `a1b8e3eb1ab2c19aa649c416f4ecbfd636ace56e81695bae22ace815d59a9010`.

SE-T01 closes. At320px WebKit/200% text, the trigger now reads **Configure / custom boost** with whole words, complete label and visible focus outline. The decorative icon is suppressed at the narrow width. The insufficient-space in-flow fallback still works; all choices remain fully visible below the header as the page scrolls. Close and Escape restore the visible trigger, and selecting Play together opens its local game service form with the game context retained and shortcut absent.

The390px Chromium100% cycle also passes against this exact build and retains its normal bounded chooser. No horizontal overflow, uncaught page errors or attempted external requests occurred in these final cycles. Geometry assertions check every focused action against the viewport and visible header. SE-T02 remains closed by the unchanged square fallback evidence from review9.

Final evidence: review12 `designer-chooser-cycle-webkit-320-200-*` and `designer-chooser-cycle-chromium-390-100-*`, including full/viewport images, geometry, fixture hashes, trace and review JSON. The scoped gate is **PASS**. Synthetic browser/device/AT/API limitations below remain.

## Historical first-round observations and qualification limits

This block records the original review8 state. It does not override the final PASS or reopen the findings closed above.

- Four fixture entries for packages, news, shop and accounts render one column at320/390px, two at820px and three at1440px. Actual card media computes square; loaded source images remain contained. Grid hierarchy retains title, price/status and action below the media. F05 package artwork is closed separately in `SERVICE144_SE05.md`.
- Fixed packages precede custom boosting in All boosting.
- Shortcut starts after the metrics region, remains inside game-body bounds and stops before the footer. It is absent in the custom form and news/shop/account services; paused boosting removes it.
- The one-service link targets that exact custom form. Multiple services render named choices, focus the first on open, and Escape restores trigger focus.
- Authenticated390px WebKit normal-size sticky position starts at115.4px, matching the customer header bottom. The initial Chromium broad layout run completed before asynchronous activity UI appeared; it is not used as evidence for the authenticated offset.
- In the first round, missing artwork returned a stable square placeholder on320px for packages/news/shop while surrounding content remained readable. Account fallback was still open as SE-T02 then; round2 closed it.
- At viewport height560px, shortcut switches to static positioning.
- No horizontal document overflow appeared in first-round views. The200% chooser issue was retained for correction and is closed by the later rounds above.

Evidence: `.cache/flow-review141/evidence/service144-review8/designer-tiles-*`, `designer-sticky-zoom-r1-*`, and `designer-tile-fallback-r1-*`. Helper: `service144-tiles.mjs`, using four synthetic records per service and exact API fixtures. Tablet820px and narrow320px Chromium runs also preserve the signed-in header offset, footer bound, and service/form exclusions. Corrected-chooser rechecks were pending at that point; rounds2–5 record their results and final closure.

All traffic was restricted to isolated local origins. Real API filters/pagination, publication, image rendition/storage, real devices, assistive technology, owner permissions, payments and production deployment are not certified by this report.
