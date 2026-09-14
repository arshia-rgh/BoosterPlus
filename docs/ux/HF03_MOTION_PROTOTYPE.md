# HF03 — Miya motion prototype

14 September 2026. The initial prototype (`22f7afc68266505ec58f5b888678f910f128b047`) passed the tracked gate but was rejected by the owner as too difficult to perceive. HF03 is reopened for the correction described below; review it before advancing to HF04. R10/R11 remain held. This prototype does not complete the multi-game, cameo or sound stages.

## Revised design

The Mobile Legends showcase now uses the existing green/gold Miya illustration. The Iori art remains in the accepted rank scene. The hero stays free of a foreground character. Game selectors, heading and catalog action remain stationary, with no biography or invented offering.

The original small torso/hair ripples were insufficient at normal desktop and phone sizes. The correction replaces that localized breath with a coherent 6.4-second weight shift through the head, shoulders and bow. Displacement tapers through the hips to neutral above the feet. The face moves with the upper body instead of warping as an independent patch. A wider ponytail field follows on the same loop with later peaks, giving secondary movement without steadily drifting out of phase.

The weight shift spans −24 to +24 source pixels horizontally at the head/shoulders, rather than leaving the entire head still. This corresponds to about 18px total at a 608px-tall desktop stage and 9–10px at a 304–323px phone stage. Vertical movement is smaller (±9.6 source pixels). Quarter-cycle splines carry velocity through the neutral pose and ease only at the directional extremes, avoiding four stop/start beats per loop. The hair field spans approximately −19 to +26 source pixels before its spatial falloff. These are design amplitudes, not claims of measured device FPS or owner approval.

The unchanged native-scroll contribution remains at most ±4 CSS px (clamped to ±3px on phones); stationary idle motion is independent of scrolling. Heading, selectors and catalog action do not move.

The page uses screen compositing to blend the accepted black-background master into the dark green scene. This is a presentation treatment, not a claim of transparent source artwork. The original PNG remains unchanged. The new 768×1152 JPEG is a size/encoding derivative made with macOS `sips` at quality 82, not a regenerated character.

## Rendering decision

The first generated layered atlas and its alpha correction both failed real-transparency checks; those rejected outputs remain in ignored cache. The externally sourced model did not match the selected look and would add an unsuitable raw payload. Instead, this prototype tests continuous deformation of the accepted artwork, using native SVG animation without a new framework or 3D runtime.

The weight-shift filter covers the character above the planted feet; the hair pass remains localized. Both merge back over the original image, with boundaries beyond the visible moving silhouette/falloff. The revised upper-body region is larger than the rejected torso-only prototype, so rendering cost must be remeasured. The first pass excludes the stationary feet. Peak-pose inspection caught edge clipping and a duplicate bow sliver; padded filter/view bounds and a black source matte now allow the silhouette to move beyond the original image edge without exposing its unmoved underlayer. This method is appropriate for a quiet idle illustration; it **cannot** supply the cameo's walk cycle, skill or spoken line. HF04A still needs those real assets.

The implementation follows the native [SVG displacement model](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap) and [SVG animation clock controls](https://developer.mozilla.org/en-US/docs/Web/API/SVGSVGElement/pauseAnimations). SVG clocks begin only when the scene is visible and all motion assets are available. There is no continuous JavaScript drawing/render loop; scroll and resize schedule at most one pending frame.

## Visitor behavior and failures

- Scene media begins loading within 200px of the showcase. Only the selected scene mounts; no eager Miya request occurs on the opening screen.
- A nearby Pause/Resume control uses the existing shared motion preference. Explicit reduction survives scene switches and ordinary navigation; OS reduction remains authoritative.
- The local control preserves its position when the rank section above changes height. Firefox exposed a page jump in the initial prototype; the fix preserves the clicked control's viewport anchor. Integer rounding accounts for WebKit's scroll-coordinate quantization.
- Offscreen and hidden-tab states freeze the SVG clock. Returning onscreen resumes the existing clock without catching up. Cleanup removes observers, event handlers and pending frames.
- Reduced motion renders the unchanged poster with no deformation. CSS also disables the filter immediately on a live OS preference change.
- Failed motion fields retain the still illustration; failed artwork produces the existing quiet decorative fallback. Catalog navigation remains usable. A stalled optional field cannot delay a shopping action.
- The pre-existing WoW/LoL motion remains provisional for HF04. Readiness-aware crossfades and complete slow/rapid-switch polish also remain there.

## Payload and measurement

| Item | Bytes / limit |
| --- | --- |
| Miya JPEG | 200,155 |
| Both SVG fields | 1,288 |
| New lazy scene transfer | 201,443 / 210,000 browser-test limit |
| Existing Iori + Illidan + Ahri JPEG baseline | 549,832 |
| All four retained JPEG assets | 749,987 |
| Active three-game showcase JPEG inventory (Miya, Illidan, Ahri) | 626,342 |

The 200KB new scene is an explicit deferred addition; it is not hidden by calling it part of the old 550KB baseline. Existing 12KiB homepage JS, 8KiB homepage CSS, 4KiB shared CSS and hero media limits remain unchanged and are enforced by the normal build. No new dependencies or runtime video codecs were introduced.

The browser spec records 20 seconds of stationary animation, a native down/up scroll pass, deterministic opposite peak poses, a static counterpart, state transitions and local timing/resource JSON. Runs use the pinned browsers with desktop and phone-sized emulation and recording enabled, without network/CPU throttling. RAF intervals measure callback scheduling under this test load, not physical-device presentation FPS or a guarantee of smoothness everywhere. The initial full-region WebKit desktop sample had 524 frames with p95 45ms; a bounded-region sample had 805 frames with p95 37ms. Concurrent recording and browser emulation affect these numbers. Final engine/device measurements are retained with each run rather than pooled into a universal claim.

## Initial prototype evidence (historical; not visual acceptance)

Component coverage includes waiting for media, missing poster/field failures, visible/offscreen/hidden lifecycle, one-time SVG starts, cleanup, reduced mode and unchanged game selection semantics. Browser coverage includes lazy transfer, the 210KB media limit, advancing internal motion, stable stage size, pause persistence through game switches, restored scroll anchor, native scroll, OS reduction, missing media, usable navigation and axe accessibility checks.

Local evidence is under `.cache/hf03-evidence/{chromium,firefox,webkit}/`: desktop/mobile normal and static screenshots, pose pairs, performance JSON and recorded browser videos. `.cache/hf03-evidence/chromium/miya-desktop.webm` and `miya-mobile.webm` are the final Chromium review clips. Required full frontend regression evidence is `.cache/hf03-commit.log`; the gate uses isolated TiDB/SMTP/payment fixtures. No live account/payment change is involved. The final pass counts and commit receipt belong in `docs/progress.md`.

Rendered desktop/mobile stills were reviewed. A pixel comparison of the Firefox pose pair localized changes to the torso/hair; the face and feet outside those regions remained unchanged. Normal-speed recordings are available for owner review. Physical iOS/Android, human screen-reader and final visual acceptance remain HF05 work; passing automated checks does not complete those reviews.


Final qualification: 186 component tests in 62 files, all 60 Chromium route/policy journeys, both frontend builds and unchanged budgets, audit/contracts, root repository/secret checks, image scans and read-only container smoke passed. The final application also passed the focused Firefox and WebKit desktop/mobile motion scenarios. Final RAF p95 samples were about 18.3ms in Chromium, 10ms in Firefox, and 41ms desktop / 29ms mobile in WebKit; these are local recorded scheduling samples with the limitations above. WebKit has the highest measured rendering cost and remains a focus for physical-device review.

The first gate's email failures were not ignored: a captured synthetic email arrived 53 seconds after its request. The complete rerun retained the 20-second delivery check and passed; read-only 15-second aggregate queue samples showed no sustained email backlog during that rerun. The specific cause of the earlier delay was not established. No backend logic, email budget or timeout was changed to obtain a pass.


## Motion correction review

Revisited the rendered [boosting.pro homepage](https://boosting.pro/) in the in-app browser. Its character video is a muted five-second loop; the broader silhouette/pose movement is the relevant reference, not simply whether a few pixels change. PLAYORA still uses a deforming illustration, not that site's video or an equivalent articulated 3D animation. No new runtime, media dependency or externally hosted artwork was introduced.

The correction uses the tracked frontend/root gate and focused Firefox/WebKit motion scenarios, with fresh actual-size desktop/mobile evidence under `.cache/hf03-motion-correction/`. The browser check now compares the visible bright-pixel centers of the head and feet in deterministic opposite poses, normalized to CSS pixels. It requires more than 6px head movement and less than 0.75px foot movement; the earlier head-static implementation cannot satisfy it. Final WebKit samples measured 13.15px desktop / 6.77px phone head-center travel and zero foot-center travel. These crop-based measurements differ from maximum point displacement; both intentionally preserve actual display size. Tests still cover the 20-second loop, transfer budget, pause/reduced/offscreen lifecycle, stable controls and failed media. The initial prototype's pass counts and recordings above do not qualify this correction. Physical-device smoothness and the owner's visual judgment remain open. HF04 and all later refinement stages are held pending review of this correction; R10/R11 remain separately held.
