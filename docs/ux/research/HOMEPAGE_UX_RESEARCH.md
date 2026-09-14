# Homepage refinement — UX research

Research date: 14 September 2026. This is a planning note, not an implemented change or an acceptance certificate. The owner has reopened the hero and character showcase after UX10 review. R10/R11 remain held.

## Question and method

How can PLAYORA make its first impression cleaner and make the game characters feel gently alive, while preserving the green theme, accepted type, original background and existing purchase paths?

This research uses the current implementation, prior qualification notes, three primary competitor homepages and W3C/browser-platform guidance. Competitor findings below come from retrieved page content, not from checkout access, usability tests or measured conversion. The main roadmap's separate rendered-browser review supplies visual and motion observations of boosting.pro. No specific animation library, skeletal rig, frame rate or easing is inferred from a static page or text extraction.

Reviewed local material: `AGENTS.md`, `docs/ux/UX05_DISCOVERY.md`, `docs/ux/UX10_QUALIFICATION.md`, `frontend/app/home/characters.tsx` and `frontend/app/home/characters.css`.

## Comparative findings

| Reference | Verified content observation | Implication for PLAYORA | Limit |
| --- | --- | --- | --- |
| [Boosting.pro](https://boosting.pro/) | The homepage organizes game destinations alongside service entries, followed by featured products. Its extracted content includes slide navigation and separate game links. | Treat the user's reference as a brief for the *feel of the character movement*. Keep PLAYORA's actual service navigation clear and separate from decorative scene switching. | Text retrieval cannot establish which layers move or their timing. Retrieved content also includes old news; this is not evidence of current operational quality. |
| [Elo-Boost.net](https://elo-boost.net/) | The page leads with a short rank outcome and primary rank CTA, then groups services by game. A later section explains configuration, payment and dashboard progress/chat. | A concise hero can communicate the outcome and next action while the artwork sets atmosphere. Explain transactional steps where they support a decision, instead of filling the character scene with biography. | No claim about performance, conversion, fulfillment quality or audited accessibility. Do not import its prices, promises, wallet or subscription model. |
| [Boosting Factory](https://www.boostingfactory.com/) | The retrieved homepage starts with a game-selection heading and a list of game destinations. | Game names are a more useful navigational label than character biographies. Give real catalog navigation a clear identity. | A long list suited to its catalog would be unnecessary for PLAYORA's current launch scope. Service existence here does not establish availability in PLAYORA. |

These examples support a design hypothesis, not a proven commercial result: one clear action and a recognizable game context should be easier to understand than multiple competing headlines, decorative character captions and ambiguous selectors. Validate that hypothesis with the proposed user tasks below.

## Information hierarchy recommendation

**Hero:** lead with the existing outcome headline, a short service explanation and the primary catalog/configuration action. Use the accepted original ascension image as the sole scene. Removing the Iori overlay is the strongest starting proposal because it directly addresses the owner's stated mismatch and lets the existing background composition breathe. Do not fill the freed area with another character by default. The primary button, secondary link and heading should share a deliberate alignment; the final crop and contrast treatment need rendered desktop and mobile review.

**Character section:** retain “Find your fighting spirit.”, a compact game selector and one clear route to available services. Remove character names, biography/tagline paragraphs and their live announcement. If a short contextual sentence is needed, it should explain the interaction or service scope, not the character's lore. Avoid replacing deleted paragraphs with equivalent filler.

Keep game artwork from multiple games. A scene choice is an aesthetic choice; it must not imply that the corresponding game is available to buy. Use a compact persistent label such as “Game showcase” around its controls and keep the destination CTA explicit, for example “Browse available games.” This is proposed copy for review. Never display an invented “Coming soon” commitment. If future scene controls become catalog navigation, that is a separate behavior change and must follow published catalog availability.

On narrow screens, put the section heading and game controls before the artwork, followed by the action. Current CSS places a 31rem art stage before the copy; that can push both the section's identity and the controls beyond the initial view. Reserve a stable stage that fits the narrow layout, retaining faces and meaningful silhouettes without squeezing the text. Do not make reading the heading require scrolling past a nearly full screen of decoration.

## Motion recommendation

The desired quality is a calm, continuous sense of life. It should remain perceptible while the visitor stops scrolling, so scroll-only translation does not meet the brief. It should also avoid visibly bending a flat painting at a hard mask seam.

Use a short motion prototype to compare the current articulation with an art-directed version. Internal organic movement is required: restrained breathing and a secondary detail appropriate to the selected figure, such as cloth, wing or tail. A small whole-figure drift can supplement that movement; bobbing one rigid image alone is not the complete deliverable. The precise amplitude and cycle are design decisions to tune against the reference and recorded local playback, not research-derived constants. Do not claim a 3D rig or full game animation unless those assets are actually used.

The parent task's rendered-browser inspection subsequently verified an actual muted, autoplaying looped WebM in boosting.pro's desktop scene: 1920×600 intrinsic dimensions and a five-second duration, with advancing playback time. That observation supports evaluating a genuinely animated character loop, not merely copying a still-image transform. It does not require PLAYORA to adopt the same delivery format: prepared, professionally composed animation layers or a well-qualified video asset remain alternatives to prototype within the existing performance and motion-control constraints.

Keep the heading, selectors and CTA stationary. Soft idle movement is the main effect; native-scroll response can provide a small additional depth cue, without scroll hijacking, forced snapping, sticky trapping or a long animated entrance. Switching games should be manual, immediate in its feedback and visually settled without a flash or sudden frame resize. Repeated fast switches must finish on the last requested scene. No auto-advancing character carousel is needed.

Prefer transforms and opacity and verify the actual rendering path. Browser guidance cautions that expensive painting, including blur effects, can undermine animation; indiscriminate `will-change` is also not a solution. This supports a measured comparison of the current SVG filtering/masks against cleaner prepared layers. A new library or video pipeline is not justified solely to create gentle motion. [Chrome team's animation guidance](https://web.dev/articles/animations-guide)

## Accessibility decisions

- **Automatic motion:** a repeating decorative animation lasting beyond five seconds alongside content needs a pause, stop or hide mechanism when the criterion applies. Give the existing global motion setting an obvious way to stop the scene without retaining keyboard focus or requiring a hover. Stopping only while offscreen does not give the reader control while viewing it. [W3C WCAG 2.2.2, Level A](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- **Scroll and interaction motion:** retain the ability to disable nonessential interaction-triggered movement. This is the separate AAA criterion; do not mislabel it as the AA requirement for automatic animation. Native page scrolling remains usable in all modes. [W3C WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- **System preferences:** honor `prefers-reduced-motion` before the first animated frame and respond to preference changes. For these decorative characters, a stable still pose is the clearest reduced-motion treatment; user actions and selected states remain visible. [MDN reduced-motion reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- **Game controls:** the existing native pressed buttons are a defensible simple pattern for scene selection. Preserve names and pressed state, Space/Enter activation and visible focus. The selected character art can remain decorative because the selected game is already expressed in text. No announcement of lore is necessary. [W3C button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
- **Avoid decorative ARIA tabs:** tabs describe associated content panels. Only adopt that pattern if the new design actually becomes a tabbed content interface; then implement its full keyboard and panel relationship contract. Styling buttons as a segmented selector does not require changing them into tabs. [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- **Responsive controls:** retain the project's 44px touch-target design, which is more generous than the WCAG 2.2 AA target-size baseline. Keep names readable instead of relying exclusively on unfamiliar game icons. [W3C target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Text resilience:** verify 320 CSS px reflow and text-spacing overrides without overlap, clipping, hidden controls or horizontal page scrolling. A short scene still needs resilient text layout. [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [W3C text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

## Proposed acceptance scenarios

| Scenario | Evidence to collect / expected result |
| --- | --- |
| First impression | A first-time reviewer identifies the service and the primary next action without scrolling or interpreting character lore. Record their answer; do not substitute an automated pass for comprehension. |
| Hero composition | Desktop, narrow phone and short landscape captures show the accepted background, readable outcome/CTA, deliberate shared alignment and no Iori overlay. Compare before/after at identical viewports. |
| Idle character | A 15–20 second recording with no scrolling shows smooth, restrained movement, no visible cut seam, no sharp loop restart and no unstable silhouette. Owner/designer judges the result at normal playback speed. |
| Scene switching | Keyboard and touch can choose every game, see the selected state and reach the catalog action. Rapid switches, slow loads and failed art preserve focus, layout and last selection. |
| Availability comprehension | Ask a reviewer whether choosing WoW art means a WoW service is available. If they infer availability from the scene alone, improve the labels and navigation distinction. |
| Scroll control | Slow, rapid and reverse native scroll does not trap the page or displace controls. Content remains readable while animation runs. |
| Motion preference | System reduced motion on initial load, a mid-session system change and explicit global stop all suppress decorative loops and parallax. Refresh/navigation preserves the intended existing preference behavior. |
| Offscreen and hidden tab | The scene suspends unnecessary work when not visible and resumes without a large jump when visible again. Explicit user stop remains stopped. |
| Responsive stress | 320/360/390/768/1024/1440 widths, short landscape, enlarged text and spacing overrides show readable controls, no overlap, preserved focal art and no page-level horizontal overflow. |
| Slow or missing resources | Blocking characters or disabling JavaScript leaves the service navigation and primary action functional. Reserved art dimensions prevent a layout jump. |
| Performance | Compare local traces and bytes before/after on the same engine/device conditions; inspect paint/compositing and frame consistency. Preserve established budgets. Do not label short headless sampling as physical-device FPS or deployed field performance. |

Use the existing frontend and root gates for the later UI implementation stages, plus focused visual/motion review. Existing backend functionality is outside this refinement. Real-device and human screen-reader limitations from UX10 remain explicit until those reviews actually occur.

## Evidence limits

This note does not certify competitor business claims, measure conversion, rank designs objectively or qualify live production. Rendered visual comparison and owner review are still necessary. One attempted additional page on LCP optimization failed retrieval and is intentionally not used as evidence. Recommendations are scoped to the two requested homepage areas; they do not reopen payment, admin workflows or deferred production work.
