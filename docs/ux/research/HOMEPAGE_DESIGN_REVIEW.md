# PLAYORA homepage refinement: senior visual review

Date: 14 September 2026. Research and proposed design only; no application changes. The owner has not accepted the final visual result of UX01–UX10. R10/R11 remain held.

## Evidence and diagnosis

Inspected `frontend/app/home/page.tsx`, `characters.tsx`, `characters.css`, `home.css`, and existing desktop/mobile hero and three-character screenshots in `frontend/.cache/`. These are captured implementation evidence, not new live usability sessions.

The desktop hero has two competing foreground ideas: the original artwork's large winged crest and an independent Iori figure directly over it. The resulting silhouette makes the crest appear attached to the figure while hiding its center. The photographic detail, bright white shirt, red trousers and purple flame attract attention away from both headline and original green/gold landscape. On mobile the figure becomes a faint duplicate focal point near the actions. Its low opacity does not repair the composition.

The showcase currently includes an eyebrow, heading, supporting paragraph, three selectors, character name, character slogan, action and disclaimer. Character biography copy is unnecessary for choosing a service and the owner explicitly wants it removed. Its fixed caption height also preserves an empty gap after removal unless the layout is adjusted.

The showcase's whole-body transform changes on scroll, but its idle animation only scales the upper slice by 0.6% and moves a separate appendage by less than one degree. Automated transform changes do not establish perceptually successful motion. Independently clipping a flat image into body slices can create visible joint seams. The remedy requires coherent internal breathing and secondary detail motion using clean authored layers; a rigid-image float alone is insufficient.

On narrow screens the current CSS places the fixed-height, 31rem art stage before the heading. A visitor must scroll through a large figure before reaching the section's purpose or selectors. This is a hierarchy problem as well as a size problem.

## Reference interpretation

[Boosting.pro](https://boosting.pro/) is the owner's explicit motion reference. The coordinating agent's rendered-browser inspection verified a muted, autoplaying, looping WebM video with intrinsic dimensions of 1920 × 600, a five-second duration and advancing playback time. A green horned character occupies the right side of a composition with fixed text. This is richer character animation than translating a still image. These observations come from rendered-page and DOM video evidence, not the initial text retrieval. Its product counts, promises and statistics are not PLAYORA content.

The following motion constraints come from primary guidance, while all numerical art-direction values below are proposed PLAYORA tuning ranges:

- [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) explains the need for a user mechanism to stop qualifying persistent automatic movement alongside other content. Keep the existing global motion preference and expose an easy-to-find control near the showcase; stopping only during hover is insufficient.
- [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) supports letting users disable nonessential interaction-triggered animation. Native scrolling must remain usable with motion disabled.
- [web.dev's animation guide](https://web.dev/articles/animations-guide) recommends prioritizing transform/opacity and measuring rendering work. It does not prove that any particular masked image is cheap to render; actual frame and paint evidence is necessary.

## Recommended visual direction

### Hero: restore the original focal point

Use the original ascension background alone. Remove the independently overlaid Iori in both desktop and mobile compositions. Preserve the green/gold atmosphere, typography, headline and primary action. Do not replace him with a different cutout as the default remedy.

Recompose the art by viewport rather than simply centering the same crop everywhere. Desktop gives the crest a clear region on the right while the text remains inside a dark left safe zone. The left margin aligns with the page's main content rail. The text block should have a sensible maximum line length; the existing large type is retained, with wrapping assessed at each width.

Mobile prioritizes headline and primary action above the decorative metadata. Retain enough recognizable landscape/crest to establish the scene, with a localized contrast veil behind the text. Remove or quiet the coordinate ornament if it competes with the action or requires excess vertical space. Avoid forcing a viewport-height hero when text enlargement needs more height. Neither the artwork nor its overlay is allowed to obscure links or create apparent UI content.

The hero does not need continuous character motion. This creates a deliberate sequence: a confident opening composition, the existing rank transformation, then a living multi-game showcase.

### Showcase: an illustrated game selector

Keep “Find your fighting spirit.” as the section's single major message. The preferred visible content is the heading, compact game selectors, character artwork and one “Explore games” action. Remove character names, slogans and biography paragraphs. A short quiet catalog-availability note may remain when necessary to avoid implying that every illustrated game is purchasable. It belongs beside the action, not in a character profile.

Desktop uses approximately 42% copy and 58% art within the existing content rail, with breathing room between copy and silhouette. Avoid a visibly black oval or tall card framing the figure. Blend a restrained green radial atmosphere into the actual page background; no additional starfield or bright flare is required.

On mobile use heading → game selector → artwork → action in both visual and DOM order. An initial art-stage target of 18–24rem should be tested against each silhouette; the stage may grow where necessary to avoid clipping faces, horns or wings. Keep selector labels fully legible, wrap rather than force a miniature strip, and retain at least 44px interactive targets. Keep stage height stable when switching characters.

Use one active character at a time. Do not auto-rotate games or shift focus. Selecting a game changes only the art and selected control, with no implication that it changed a checkout product. Preserve the multiple-game identity. Iori is no longer mandatory; select characters by silhouette, lighting, visual quality and fit with the green atmosphere, with recognizable game identity retained. Illidan's green accents fit naturally; other characters may retain their own colors as controlled accents. Do not tint all skin, cloth and weapons green.

## Motion storyboard for implementation review

Prefer a compact authored layer composition: a stable lower-body silhouette, a coherent torso/breathing group, and one or more clean independent hair, cloth or wing layers with appropriate pivots and overlap. Prepare the asset around movement boundaries instead of cutting rectangular anatomical slices from the existing flattened image. Require an early normal-speed prototype for one character before producing the remaining games. Only retain this approach if the internal motion looks natural, remains crisp and passes the rendering budget.

A genuine short video loop is an alternative when a real qualified asset exists. It needs a seamless loop, stable anatomy and edges, a matching poster, muted inline playback, controlled loading, visibility/reduced-motion handling, and measured transfer/decode/frame costs. Do not add an empty video placeholder, claim a future asset is delivered, or download a competitor's animation as a substitute. Choose the implementation based on visual evidence and existing budgets; the reference's five-second duration and resolution are observations, not required PLAYORA settings.

| Moment | Proposed behavior | Boundaries |
| --- | --- | --- |
| First eligible entrance | A single 300–450ms opacity settle, optionally 6–8px vertical settling | No dramatic fly-in, overshoot, zoom burst or repeated entrance on every scroll reversal |
| Visible idle | A coherent 6–8 second internal breathing loop with natural torso and shoulder relationships | Required, perceptible motion while the page is stationary; stable face and planted anatomy, with no visible joint seam or breathing distortion |
| Secondary life | Restrained hair/cloth/wing movement with a complementary 7–10 second rhythm, using clean independently authored layers or genuine motion in a qualified video | Required internal detail that supports breathing; no hard image slices across anatomy, detached parts or random deformation |
| Supporting drift | Optional whole-figure ease-in-out movement, at most 6px total travel on desktop and 3px on mobile | A supporting effect only; a rigid-image float cannot satisfy the internal-motion deliverable |
| Native scroll | Optional additional 4–8px total scene displacement, with scenery moving more slowly | No scroll capture, scrubbed pose jerk, or combined displacement that moves the face outside its safe frame |
| Game selection | Stable-frame crossfade around 180–260ms after the incoming asset is ready | No blank stage, layout movement, focus jump, automatic switch or two overlapping silhouettes held on screen |
| Hidden tab/offscreen | Pause decorative animation and pending work | Resume calmly from a coherent state; do not catch up on missed motion |
| Reduced motion | A fully resolved static composition; immediate or very short opacity-only selection | No body bob, rotation, parallax, entrance translation or invisible content |
| Asset failure | Keep section heading, controls and action; use quiet background fallback | Never block navigation or show a broken decorative image |

These values are starting ranges, not claims about Boosting.pro. The target is a figure that feels alive during a short stationary viewing, without making the reader chase it. A 20-second recording with the page stationary is required for each character, covering at least two complete cycles of the proposed rhythms; a scroll-only recording or a rigid-image float cannot prove the requested effect.

## Acceptance criteria

1. The opening hero contains no overlaid Iori figure; the original background's focal point, heading and action have clearly separate visual space on desktop and mobile.
2. The showcase contains no visible character name, biography or slogan. It has one clear action and no implication that an unpublished game can be bought.
3. Normal-speed stationary video makes coherent internal breathing and secondary detail movement perceptible for each selected game. A whole-image transform alone fails this criterion. No clipping seam, detached appendage, face deformation, hard edge halo or loop snap is visible at normal size or 2× visual inspection.
4. The motion does not move copy, buttons, focus indicators or section boundaries. Character switches preserve layout and selected-state accessibility.
5. Screenshots cover 320, 390, 768, 1024 and 1440px widths, landscape and 200% text enlargement. Inspect start, middle and extreme motion positions; a center-frame screenshot is insufficient.
6. Keyboard selection, touch targets, contrast, reduced motion, global pause, offscreen pause, hidden-tab pause, failed image and slow image transitions are verified. The decorative image stays out of repetitive screen-reader announcements.
7. Compare loaded bytes, layout shift, paint work and frame timing against the existing homepage budget. Document actual browser/device conditions; desktop automation cannot certify all physical phones or a universal 60fps result.
8. Present side-by-side hero stills and three 20-second stationary showcase clips for owner review before calling the visual refinement accepted. Functional/browser tests remain required, but they cannot substitute for judging composition and movement.

## Delivery boundary

Implement only after the owner approves the new roadmap. The follow-up work should be limited to the homepage hero, multi-game showcase, shared motion behavior where necessary, and their regression evidence. It does not authorize rebuilding accepted account/admin flows or resuming production launch work.
