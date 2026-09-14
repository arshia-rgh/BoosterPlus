# PLAYORA homepage refinement roadmap

Restore the original ascension artwork as the hero's only illustration, and turn “Find your fighting spirit.” into a quieter, genuinely animated game showcase. Preserve PLAYORA's green identity, accepted fonts and rank transformation. The improvement should come from composition, convincing character motion and less competing content.

**Status: implementation approved by the owner on 14 September 2026; HF02 and HF02A delivered; HF03 prototype delivered as `22f7afc`.** UX01–UX10's previous automated qualification remains recorded, but visual acceptance is reopened. HF01 includes two fresh running-site specialist reviews; HF02–HF05, including the added HF02A catalog/configuration corrections, HF04A character cameo and HF04B site-wide button audio, are authorized. R10/R11 remain on hold with their full scope in [final-launch.md](../../final-launch.md).

## 1. Design decision

The recommended opening is the existing landscape and winged crest, without Iori or a substitute character over it. “YOUR NEXT LEVEL.” and the action group should have a clear shared left alignment and a quiet backdrop. The artwork already supplies the fantasy atmosphere; it does not need another foreground subject.

The character section should contain the heading, a compact manual game selector, one animated character and one catalog action. Remove character names, slogans and descriptive paragraphs. Retain several games through recognizable artwork and game names, without suggesting that illustration selection makes an unpublished service available.

Motion should remain visible when scrolling stops. Require coherent internal movement—breathing and a small appropriate cloth, hair, wing or tail movement—with an optional restrained shift of the whole figure. A rigid painting bobbing up and down is a useful prototype baseline, but is not the completed animation. Text and controls stay still.

These are art-direction judgments supported by the inspection below, not a claim that research proves a particular design will convert better. The final appearance must be judged in context and at normal playback speed.

The expanded brief adds a small character cameo after an early downward scroll: enter from the right, perform a recognizable skill, speak one short line in the character's voice, then move softly across the page and disappear left. It also adds an Iori Yagami/Chou punch sound to enabled button activations throughout the website. The recommended presentation is a brief, infrequent cameo and an opt-in sound theme, with separate voice/effects controls. These additions do not put a large character back over the opening hero.

## 2. Evidence and research findings

The review combines an independent senior visual-design audit, an independent UX research review, current PLAYORA screenshots and source inspection, rendered desktop observation of the requested reference, and primary accessibility/rendering guidance. The detailed working findings are in [the visual review](research/HOMEPAGE_DESIGN_REVIEW.md) and [the UX research](research/HOMEPAGE_UX_RESEARCH.md).

### Current PLAYORA findings

| Finding | Evidence | Consequence | Design response |
| --- | --- | --- | --- |
| Two foreground subjects collide | The desktop hero capture shows Iori covering the winged crest; `page.tsx` renders both the ascension picture and a separate hero character | The crest appears attached to Iori, and white clothing/red trousers/purple fire dominate the accepted green landscape | Remove the hero character and rebalance the original crop |
| Character detail competes with the section's purpose | `CharacterShowcase` renders eyebrow, heading, description, selectors, name, slogan, action and availability copy | Too many text levels for an atmospheric scene; the name does not help choose a service | Keep heading, controls and one action; remove biography and its reserved caption space |
| Idle motion is too weak to establish the requested effect | `characters.css` scales the upper slice by 0.6%; whole-rig movement is primarily driven by scroll | Passing transform assertions does not establish a softly living character at rest | Prototype a coherent organic loop; judge it with stationary recordings |
| Current asset treatment is fragile | SVG filters derive transparency from opaque black-backed paintings, with overlapping body clips and a masked appendage | Hard anatomy cuts and dark edges need close visual review; more amplitude may expose defects | Prepare clean independent layers or qualify a proper loop; do not just increase existing mask deformation |
| Mobile puts decoration before context | `.world-stage` is 31rem tall and has `order: -1` below 750px | The section title and scene controls arrive after a large decorative image | Put heading and selectors first, then a bounded art stage and action |
| The stage is visually heavy | Black background, oval radius and a large radial mask in `.world-stage` | The character can feel contained in a separate black shape instead of belonging to the page | Blend the figure into a restrained green atmosphere and inspect all silhouette edges |

Local captures inspected include `frontend/.cache/home-desktop.png`, `home-mobile.png`, and desktop/mobile character captures. These are prior synthetic qualification evidence, not a new usability study. Capture crops alone do not establish that an image is clipped in every live state; the implementation must inspect the entire frame and motion envelope.

### Fresh running-site review before implementation

Both specialists subsequently reviewed the current running application at `http://127.0.0.1:4173`, using separate native Chrome and Firefox tabs against an isolated fixture API. This second pass adds direct interaction evidence to the earlier screenshot/source research. The storefront and admin builds were served together; successful route responses do not mean every route received a visual review. The findings are recorded in [the live senior design review](research/LIVE_DESIGN_REVIEW.md) and [the live senior UX review](research/LIVE_UX_REVIEW.md).

The designer inspected the homepage, rank scene, custom/fixed pathway cards, how-it-works section, games index and a loaded game detail, then confirmed a resolved package page after the owner unlocked the workstation. The researcher inspected custom configuration through its order-stage check and sign-in handoff, customer/staff sign-in, and the empty marketplace with its filter drawer. Captured desktop windows were approximately 971×768 in Chrome and 1320×768 in Firefox, including browser chrome. The resumed Firefox pass used verified Responsive Design Mode settings of 320×480 and 390×844 for signed-out staff/customer and marketplace states. These are desktop responsive simulations, not physical-phone qualification. No order, account, payment or message was submitted.

| ID / priority | New observed issue and evidence | Planned correction | Required verification |
| --- | --- | --- | --- |
| LR01 / P1 layout | After selecting Solo and checking a short custom form, scrolling toward the manual-price-review result makes the sticky configuration summary overlap the full-width result card. The card boundaries collide; text occlusion was not established | Contain the sticky summary within the configuration region, or place results in a deliberate grid alongside it. Give subsequent full-width results their own unobstructed row. Do not hide the collision with z-index | Manual review, numeric estimate, invalid inputs, short/long forms, changed answers, all scroll positions, narrow widths and text enlargement show no intersecting panels |
| LR02 / P2 state clarity | The returned result says selections are valid and need manual price review, while the summary still tells the visitor to check selections for an estimate | Give summary, result and next action a common presentation state: unchecked, checking, estimated, manual review, invalid, unavailable, or changed since checking. Keep the distinction between a provisional estimate and an accepted quote | Check → manual review/estimate → edit → recheck and request failure. Stale estimates must not appear current, and review requirements remain explicit |
| LR03 / P2 navigation | Both homepage custom and fixed-package actions lead to the generic `/games` index. Clicking “Browse published packages” loses the chosen path | Preserve custom/package intent in navigation and through game selection, then reveal the relevant published service group. Use a visible path label/filter and a way to change it | Follow both homepage paths with one/multiple games, no matching offering, paused offering, browser back and reload. Never fabricate an available package or hardcode a fixture slug |
| LR04 / P2 hierarchy | The filled green favorite action is prominent above service selection/configuration on the inspected game, custom-service and resolved fixed-package views | Make favorites a compact secondary utility near the title. Bring the service choice or configuration's next action into the primary visual position, retaining accessible naming, package price clarity and save feedback | Actual-size before/after game/service/package captures; favorite save/error/sign-in-required behavior and keyboard order still work |
| LR05 / P2 missing-art layout | The game without artwork allocates a large illustrated-hero-sized box to one monogram, pushing useful service content lower | Use a compact monogram/title composition when meaningful art is absent. Keep a separate full-art layout for games with published artwork | Real-art, missing-art and failed-art states; long title/description and narrow widths. The fixture does not prove launch artwork is absent |
| LR06 / P2 navigation | The header places “Accounts” beside “Account,” referring to marketplace browsing and a personal workspace. At 390px, “How it works” disappears without a replacement menu on internal routes | Prefer “Game accounts” and “My account,” preserving each destination. Consider “Sign in” only if session state supports it without a flash. Retain narrow-screen access to “How it works” through a compact menu or another deliberate global destination | Public/signed-in and narrow headers; distinguish game-account shopping from personal orders, and reach the explanation from an internal route by keyboard/touch |
| LR07 / P2 orientation | On games index/detail, the visible Games navigation item lacks an obvious current-section treatment | Add restrained green section emphasis and accurate current-page semantics. A detail page may show Games as its parent section without claiming the index itself is the current page | Index/detail, marketplace and account routes; visible active state, accessibility semantics, keyboard focus and forced-colors review |
| LR08 / P2 stage handoff | Continue advances the form but clears the checked result and leaves the same Mode/Coupon/“Check selections” controls when no extra order fields exist. Checking again reveals the request and sign-in block | Make the current stage, heading/focus target and next action clear. Preserve required order-stage/server validation; do not bypass it to hide the repeated-check experience | Zero/additional order-field configurations, back/edit/recheck, signed-out sign-in return and preserved choices; no duplicate request or unexplained empty stage |
| LR09 / P2 empty state | The marketplace has no applied filters and no fixture inventory, but says no accounts match “these filters” | Distinguish unfiltered empty inventory from filtered no matches using the actual result/filter context. Offer an appropriate existing catalog/availability path without promising arrival dates | Empty inventory, filtered zero results, cleared filters, load failure and loaded inventory; never claim global stock is empty merely because one filtered query returned none |
| LR10 / P3 staff entry | At the short 320×480 staff sign-in view, introductory/first-owner setup guidance occupies the initial view before the email form | Put ordinary staff sign-in first and make first-owner setup secondary help or disclosure; keep its instructions available and preserve MFA/verification requirements | First-owner and returning-staff comprehension, short viewport/text enlargement, keyboard order and disclosure access; no authentication-flow change |

P1 identifies a reproduced layout defect to fix before renewed acceptance, not a demonstrated security or transaction failure. P2 items are evidence-backed clarity/hierarchy recommendations; comprehension benefits still need review. These targeted corrections belong in HF02A before the extra cameo/audio polish.

Source inspection corroborates the two identical `/games` links and the favorite ordering/absent-art block in `home/page.tsx` and `catalog/public.tsx`, static summary guidance in `experience/selection-summary.tsx`, a sticky summary alongside full-width form rows in `experience/experience.css`, and unconditional empty-result wording in `resale/market.tsx`. These observations help locate the work; the implementation must reproduce the overlap at a measured viewport before changing the layout.

**Resolved and still-open checks:** the resumed pass confirmed package navigation and order-stage progression work; LR08 concerns guidance, not a broken Continue button. The 390px marketplace filter drawer closed on Escape and returned focus correctly, and the inspected narrow sign-in content did not show horizontal clipping. Google sign-in was unavailable in fixture configuration, not proven broken. The early Warrior profile still needs start/middle/end legibility review; one quiet frame is not a contrast failure or permission to replace the accepted transformation. Narrow homepage/motion controls, authenticated workflows, actual email/MFA exchanges and physical-device behavior remain unqualified by this pass. Chrome developed stale-capture/window-control limitations after package inspection; those were not treated as blank-page defects. Keep these remaining checks in HF05, distinct from the successful Firefox responsive observations.

The test catalog's duplicate synthetic names, short forms and sample pricing are fixture content, not production defects. Fresh captures exist in the review conversation; no standalone screenshot files were exported during this pass. Implementation should save reproducible before/after evidence with measured viewports and representative published MLBB configuration.

### Reference comparison

| Reference | Verified observation | Apply to PLAYORA | Exclude from the proposal |
| --- | --- | --- | --- |
| [Boosting.pro homepage][1] | Rendered desktop scene has dark green game artwork, a horned character on the right and service text on the left. Its character scene uses a muted autoplaying looped WebM; observed intrinsic size 1920×600 and duration 5 seconds, with advancing playback time | Treat it as a reference for calm animated artwork with stable text. Evaluate actual internal character motion, not only scroll displacement | Its auto-advancing hero carousel, branding, media, product claims and dense storefront taxonomy |
| [Elo-Boost homepage][2] | Retrieved public content leads with an outcome and primary rank action, then groups services by game | Keep the first decision simple and put explanation where it helps a transaction | Its commercial promises, wallet/subscription mechanics and unverified performance claims |
| [Boosting Factory homepage][3] | Retrieved content emphasizes choosing a game and game destinations | Use game names for recognizable controls and keep actual catalog navigation clear | A large catalog menu that exceeds PLAYORA's published offering scope |

The five-second reference duration is measured media metadata, not a recommended PLAYORA timing. The observation does not establish the source animation's rig, authorship, easing, mobile behavior or frame rate. Competitor text retrieval cannot prove visual quality or conversion performance. Their private dashboards and checkout outcomes are outside this focused review.

### Primary guidance translated into design requirements

Continuous automatic motion needs an accessible stop mechanism when WCAG's conditions apply. Place a discoverable “Pause animation” control beside the scene and connect it to the existing motion preference. System reduced motion should show a resolved still before any moving frame. Nonessential scroll animation must also be suppressible; this is distinct from the automatic-motion criterion. [W3C automatic motion][4], [W3C interaction animation][5], [MDN reduced motion][6]

Keep native, named buttons with a visible selected state for decorative scene choice. The existing `aria-pressed` approach is sufficient; an ARIA tab interface is unnecessary unless the design becomes an actual set of content panels. Retain keyboard activation and focus, and remove the biography live region. [W3C button pattern][7], [W3C tab pattern][8]

Preserve 44px minimum control targets as the project's design standard, allow labels to wrap, and verify narrow reflow and text-spacing overrides. Use restrained transform/opacity animation where appropriate, then measure actual painting and frame behavior; an SVG filter is not automatically cheap because it uses a transform. [W3C target size][9], [W3C reflow][10], [W3C text spacing][11], [web.dev animation guidance][12]

## 3. Hero composition specification

### Preferred composition: original artwork alone

- Remove the hero's Iori overlay on desktop and mobile, including its ghosted narrow-screen variation. Do not delete the source character assets, which may still serve the showcase or other approved artwork.
- Preserve the ascension landscape, crest, current green/gold atmosphere, fonts, headline and primary catalog action. Keep the existing secondary rank-journey link when that scene is enabled.
- Use the shared content rail for the eyebrow, headline, body and primary action. On wide screens, start with approximately 46% of the content width for copy and the remaining space for the crest/landscape. Tune the background crop rather than moving the crest into the text.
- Keep the current large type, but tune maximum width and breakpoint wrapping. Neither headline line nor italic accent should collide with the focal crest, controls or viewport edge.
- Use a localized left contrast veil. Preserve depth and detail in the right-hand landscape rather than darkening the entire image until it disappears.
- Quiet or remove coordinate ornaments if they compete with the main action. Preserve owner-published notices and meaningful content; this is not permission to hide commercial terms or replace governed homepage content with invented promises.
- On mobile, prioritize headline, short explanation and primary action. Choose a deliberate landscape crop for each width; do not impose a fixed viewport height that clips enlarged text or forces decorative metadata ahead of navigation.
- When the configured background is absent, keep a clean green surface with the same useful hierarchy. Both background states need screenshots.

### Alternatives considered

| Option | Assessment | Decision |
| --- | --- | --- |
| Original background alone | Directly addresses the reported mismatch, reduces competing focal points and retains accepted artwork | Recommended default |
| Replace Iori with Miya or another MLBB cutout in the hero | Could improve thematic fit, but still competes with the crest and requires another composition review | Keep as an alternative only if the background-only review fails |
| Add a full animated hero video | Adds another moving scene and media cost before the existing rank journey | Excluded from this refinement |

The opening should establish the brand calmly, the rank scene should demonstrate progression, and the later showcase should provide character life. Avoid making all three scenes compete for attention at once.

## 4. Character showcase specification

### Content and layout

Keep “Find your fighting spirit.” as the single major heading. Remove the current eyebrow, introductory paragraph, character name and slogan. Keep a small “Game showcase” label with the controls where needed to distinguish art selection from service navigation. Use one “Browse available games” link to the real published catalog; it remains the same destination when a different character is selected. This explicit wording is intentional while the illustrated games exceed purchasable games.

On desktop, start with a 42/58 copy-to-art split inside the existing content rail. The controls should be close to the heading, and the action should have clear breathing room without the old caption's empty minimum height. On mobile, use **heading → game selectors → artwork → catalog action**, matching DOM order. Labels remain complete; controls wrap instead of becoming a horizontal scroll strip.

Start the mobile art stage at 18–24rem, then tune against each complete silhouette. Reserve a stable stage for selection changes. Faces, important hands and identifying features stay inside the safe area at both movement extremes. Wings and tails can extend toward the art boundary if intentional, but must not cut through text or controls. A soft grounded shadow or green atmosphere may connect the character to the page; avoid a visible black oval.

### Character direction

| Game | Recommended prototype direction | Required quality review |
| --- | --- | --- |
| Mobile Legends | Compare the existing Miya master with Iori in the showcase only; Miya is the leading candidate for the forest/green art direction | Recognizable MLBB identity, convincing face/hands, coherent lighting, uncluttered silhouette; do not merely move the rejected hero cutout elsewhere and call it fixed |
| World of Warcraft | Retain Illidan as the leading candidate, with restrained breathing and wing-edge movement | Horn/wing clearance, stable anatomy, controlled green glow |
| League of Legends | Retain Ahri as the leading candidate, with restrained hair/tail movement | Clean tail overlap, no warped face or detached limb, controlled red/white accents |

Character identity is an internal art-direction choice, not visible biography copy. Preserve multiple-game representation. Final selection depends on a rendered contact sheet at actual desktop/mobile sizes; no replacement should be declared superior solely from its name. Reuse approved masters where they pass quality review; prepare new layers only where necessary. Keep provenance and editable sources with brand assets, and ship optimized derivatives rather than social masters.

### Interaction states

Selection is manual. The clicked button updates its selected state immediately; the latest requested scene wins even when images load out of order. Keep the previous resolved artwork until the replacement is ready, then crossfade in the same frame. If an incoming asset fails, preserve navigation and selected game context with a quiet decorative fallback. No error toast or retry wall is needed for optional art.

Do not auto-advance games, move keyboard focus, announce character lore or turn artwork into an unexpected link. Decorative art remains outside the accessibility tree. Test rapid selection, clicking the already-selected game, selection during pause, selection during loading, route changes, back navigation and resource failure.

## 5. Motion design and delivery choice

### Required visual result

The character should feel alive while a visitor reads a stationary page. The loop must have a coherent body/shoulder breath and one small secondary movement suited to the figure. Keep the head and face stable enough to avoid a rubbery or floating-sticker effect. Cloth, hair, wing or tail should settle with a slight delay relative to the body, rather than all moving on the same axis at the same time.

The following values are **initial PLAYORA tuning ranges**, not measurements from competitors or final acceptance by themselves:

| Layer or event | Starting direction | Constraint |
| --- | --- | --- |
| Organic idle | A seamless 6–8 second breathing cycle; 7–10 second secondary detail cycle | No visible anatomy cut, deformation, jump at the loop seam or unnaturally flapping appendage |
| Optional whole-figure support | 0–6px total travel desktop; 0–3px mobile; ease gently at reversals | Not the complete animation; grounded poses may need no whole-body drift |
| Entrance | 300–450ms opacity settle; optional translation no more than 6px | Content/action available immediately; no dramatic fly-in or repeated reveal on small scroll reversals |
| Native-scroll depth | At most 4–8px additional total scene travel as a starting range | Separate from idle motion; no scroll capture, sticky trap, forced speed or timeline-dependent navigation |
| Game switch | 180–260ms crossfade after asset readiness | Stable stage, no white flash, no lingering double silhouette; reduced mode can switch instantly |
| Atmosphere | Static radial light, or very restrained detail opacity | No flashing aura, full-screen particle storm, animated large blur or glow over text |

Motion envelopes combine: verify the worst case when idle and scroll offsets coincide. Copy, controls, focus indicators and stage dimensions never move with the artwork. Pause offscreen and in hidden tabs; resuming must not fast-forward or override explicit user pause. Honor reduced motion from the first render and during a running session.

### Prototype before choosing the rendering method

| Method | Benefits | Risks and qualification | Decision |
| --- | --- | --- | --- |
| Prepared independent character layers with CSS/SVG transforms | Fine control, editable timing, can fit the existing frontend without a new runtime | Needs clean alpha, overlap beneath moving parts and believable pivots; reject hard horizontal slices through anatomy | Preferred first prototype |
| Original seamless animated video loop with poster | Can produce the organic appearance observed in the reference | Must have an actual authored asset; qualify muted inline playback, codec support, denied autoplay, reduced motion, lifecycle, decoding and bytes | Alternative if layers fail the visual standard; do not assume a video-generation tool or usable clip already exists |
| Continuous SVG displacement of accepted artwork | Smooth bounded torso/hair fields avoid cut edges; native clock, no new runtime | New HF03 alternative after alpha-layer generation failed; evaluate visible deformation and cross-engine render cost | Prototype implemented; see [HF03 report](HF03_MOTION_PROTOTYPE.md) |
| Whole still-image translation | Cheap and useful to compare movement amplitude | Does not supply internal character life | Supporting effect or explicit fallback only |
| Full 3D engine / large animation framework | Greater capability than needed here | Additional dependency, assets and runtime complexity | Excluded unless the narrow prototype proves a concrete need and the plan is revised |

Prepare one polished MLBB loop first and review it alongside the static pose before producing all three. Do not repeat a flawed mask treatment across the entire set. A fallback still keeps the site usable when animation cannot run; it must not be presented as completion of the normal-motion brief.

## 6. Small character cameo and site-wide sound theme

### Specialist assessment

The cameo can make PLAYORA more distinctive if it behaves like a short game moment rather than a persistent assistant. Keep the skill, spoken line and full-width exit; constrain its size and frequency so it does not interrupt shopping or reading. Repeated punch audio is more likely to become tiring than a single cameo, so make it quiet, optional and easy to stop. The detailed specialist opinions are recorded in [the cameo design review](research/CAMEO_DESIGN_REVIEW.md) and [the audio UX research](research/CAMEO_AUDIO_UX_RESEARCH.md).

The following controls and timing are approved design targets, not yet implemented features. This consolidated specification resolves the specialists' alternative tuning suggestions. The all-buttons sound scope includes storefront, customer, seller, booster, administrator and owner interfaces across both React builds. The visual cameo is a homepage experience; it should not wander through checkout, chat, sign-in or staff workspaces.

### Character, placement and trigger

Prototype a miniature MLBB character first. Miya is the leading green-theme candidate; retain an Iori/Chou variant for comparison if its silhouette and skill read more clearly at small size. Use the actual selected character's recognizable ability and matching voice asset. Do not combine Miya artwork with an Iori voice or invent a lore-specific skill to fill an asset gap. The button punch theme remains Iori/Chou regardless of the cameo character.

Start at approximately 80–112 CSS px character height on desktop and 56–80px on narrow phones. Keep its head, hands and ability readable, and confine the particle/skill envelope to roughly 1.5 times the figure's footprint. Use a green/sage rim light to connect the figure with PLAYORA, preserving identifying character colors. A thumbnail-sized contact sheet and normal-speed skill clip decide the final character; details that look good in a large poster may disappear here.

Use a dedicated shallow stage at the lower hero/next-section boundary, reserved in layout before loading. Arm the cameo after a modest downward scroll—initial tuning target 160–240 CSS px—and start only when that safe stage is visible. This avoids tying the event to a fragile exact scroll pixel or drawing over the hero actions. The stage spans the available page width, clips only the decorative entrance/exit, and cannot create horizontal page scrolling. On small screens, scale the figure and speech treatment to that width while retaining the right-to-left journey.

The art is noninteractive and must not capture pointer events. Pause/dismiss controls sit outside the moving layer, remain keyboard-accessible and have proper touch targets. Do not fly over focused controls, dialogs, menus, cookie notices, chat overlays or form fields. If no safe area is available, defer the cameo rather than playing behind a modal or covering a task. If the visitor scrolls past the stage, end the cameo quietly instead of attaching it to the viewport and chasing them.

### Proposed one-shot storyboard

| Beat | Starting timing | Visual and audio design |
| --- | --- | --- |
| Enter | 0–0.8s | Character walks/glides from just beyond the right edge to around 80% of stage width; soft ease, no pop-in |
| Anticipate | 0.8–1.3s | Small stance change and a readable wind-up; keep feet/body coherent |
| Use ability | 1.3–2.2s | One recognizable skill into a small decorative target or effect inside the stage; no attack on actual buttons, no fake order damage, no screen shake or full-page flash |
| Speak and recover | About 2.2–4.5s | One short character line, ideally 1–2.5 seconds, with a matching small speech caption; separate voice from the loudest impact so both remain clear |
| Cross and leave | About 4.5–8s | Move softly left across the stage and disappear beyond its left edge; a restrained trail fades with the figure |

Timings may shift to fit the real voice and skill asset. The crossing needs coherent walk/run motion synchronized with displacement, or genuine character-appropriate flight; translating a rigid sprite with skating feet fails the brief. This is a time-based sequence triggered by scroll, not speech repeatedly scrubbed forward/backward with wheel movement. Reversing the page must not repeat the attack or restart the line. One cameo per browsing session by default, with an explicit replay action; no timer-based recurrence or new cameo on each route return. Define this as the current tab's session, retaining consumption across reload/navigation where session storage is available; use an in-memory guard when storage fails. Mark the automatic event consumed when it starts or is deliberately dismissed. Only one cameo may run, and other decorative character activity should quiet while it is in view.

Keep captions within the stage, near the speaking character during the stationary speaking beat. Do not drag a paragraph across the screen with the exit. The line is available as text even with sound disabled; retain an accessible transcript/replay control without an unsolicited live-region announcement over a screen reader. Reduced-motion mode omits the automatic traversal and attack; offer the still character and optional line playback without requiring animation. Dismissal stops the whole event immediately and does not steal focus. Leaving the stage, hiding the tab or navigating ends and consumes the event; return does not unexpectedly resume a spoken sentence. Explicit replay starts a fresh sequence.

### Audio behavior and visitor controls

Start silent. Provide a discoverable “Enable game sounds” action with a brief preview, then expose a master mute/volume control plus independent “Button sounds” and “Character voice” settings. Enable audio only through an explicit visitor action; a saved preference records intent but does not guarantee the browser has permitted playback on a new page. Scrolling is not a reliable audio-unlock gesture. Handle suspended audio contexts and rejected playback without delaying navigation or displaying a blocking error. [MDN autoplay][13], [MDN user activation][14], [Chrome autoplay policy][15]

With audio off or denied, run the permitted visual cameo with its caption. Do not queue the missed line and unexpectedly play it on a later unrelated click. An explicit replay/voice action may request playback again. Mute must stop active voice and effects, cancel pending clips and remain silent itself. Motion and audio are independent preferences: reduced motion does not mean that a person cannot choose to hear the line.

Audio control is a user-experience requirement even for short clips; do not design around being just under a duration threshold. Keep site-level audio control available independently of device volume. WCAG specifically addresses automatically playing audio longer than three seconds; a longer continuous combination of effects and dialogue needs consideration, not only each file in isolation. [W3C audio control][16]

Preferences should survive ordinary navigation and work when local storage is blocked using an in-memory fallback. Both frontend builds need the same preference behavior; if served on separate origins, they each need their own explicit opt-in because browser storage is origin-scoped. An optional staff quiet preset is useful, but do not silently omit admin buttons from the requested sound feature.

### Every-button punch feedback

Use a short, clean Iori/Chou-inspired impact as the preview direction: approximately 60–140ms, low-volume attack with a quick decay and no repeated voice grunt. If a usable exact game sample is supplied or sourced for the project, compare it with the brief and document that asset. An original impact can be auditioned as an alternative; it must not be presented as the original game's sound. The requested Iori/Chou punch identity remains the target: an original replacement needs explicit owner acceptance in the audio prototype review, not a silent substitution at completion.

When button sounds are enabled, apply the selected punch to every eligible enabled button action in both builds, including icon buttons, dialogs, pagination, scene selectors, chat send and staff actions. Include links styled and used as buttons. Text selection, typing, hover, scrolling, disabled/inert controls, programmatic state updates and clicks on blank page space are not button activations. Audio settings that mute or reduce sound are silent exceptions; sound preview is explicit.

Play once for the semantic activation, including keyboard and assistive-technology activation. Avoid separate pointer-down and click sounds, nested-icon duplicates and a second sound when form submission follows a click. The sound means “button activated,” never “payment succeeded” or “message delivered”; validation and operation results keep their existing visible/accessibility feedback. Never await audio before executing an action, changing routes or opening provider checkout.

Use a shared effect service with limited concurrent playback and a short cooldown, initially 70–100ms, to prevent rapid-click bursts from stacking or clipping. Actions still execute according to their own existing guards; only excess sounds are dropped. Keep voice intelligible by reducing effects during the short line, and stop all playback when the tab is hidden or the experience unmounts. Do not collect button labels, entered text, payment details or account data for this decorative feature.

### Asset and prototype requirements

The current public/brand asset inventory contains character stills but no game voice, punch audio or skill video files. The requested “own voice” and exact punch sound are therefore asset work, not something already delivered. Before implementation claims completion, record the chosen character/skin, skill, line language and transcript, exact source or commissioned original, permitted project use, formats, duration and size. Preview the real clip with the animation; no placeholder beep, generic speech synthesis or unidentified voice substitute counts as the requested character voice.

The final spoken line and exact sample remain to be selected during the media prototype. This does not block the hero/layout implementation. Keep audio assets local to the application rather than embedding a third-party player, and add explicit lazy-media transfer/decode budgets before the new assets are adopted. Prepare both a static fallback and a proper moving skill sequence; an idle float with a generic glowing circle does not qualify as a recognizable ability.

### Added acceptance scenarios

| Scenario | Required result |
| --- | --- |
| Early scroll, reverse scroll, restore/back | Starts only in its visible safe stage; one event, one attack, one line; no unexpected replay after restored scroll or route return |
| Full-width exit and small screens | Clear right-to-left path and disappearance at 320/390/768/1440px and landscape; no horizontal overflow, covered text or unreachable controls |
| Speech and ability | Real selected-character asset, matching transcript, readable skill at actual size, intelligible dialogue, no flashing or abrupt exit |
| Silent first visit and denied audio | Captioned experience works; no unhandled playback rejection, repeated permission prompt, delayed sound or blocked action |
| Pause, dismiss, mute and reduced motion | Stop immediately; no continued sound after dismissal, hidden tab or navigation; static accessible option remains available |
| Button coverage | Inventory/test enabled native, custom, icon, submit and button-link controls across public/account/seller/booster/admin/owner routes; pointer, touch, keyboard and screen-reader activation produce exactly one effect for each ordinary eligible activation when audio is ready/on, and at most one under fallback/burst limits |
| Button errors and bursts | Validation failure still has clear feedback; async failure never sounds like success; disabled controls stay silent; rapid clicks do not stack audio or change action idempotency |
| Voice/click mix and preference persistence | Separate categories work, effects do not mask speech, mute cancels queued work; navigation, reload, multiple tabs, storage denial and separate frontend origins handled explicitly |
| Performance | No new eager media burden on the hero; measure cameo art plus active voice/effect bytes, decode time, memory and frame behavior; failed media leaves tasks usable |

Human listening review should include both a first discovery visit and five minutes of repetitive chat/admin use. Record whether the punch becomes tiring, the voice stays intelligible and mute is easy to find. Test physical iOS/Android playback and interruption behavior when devices are available; desktop browser emulation alone cannot qualify those audio conditions.

## 7. Performance and accessibility constraints

Retain the existing homepage gates: homepage JavaScript at most 12KiB gzip, homepage CSS at most 8KiB gzip, shared root CSS at most 4KiB gzip; ascension assets at most 400,000 bytes desktop and 120,000 bytes mobile. These limits come from `frontend/scripts/check-home-budget.mjs`. Do not raise them merely to fit new motion.

Lazy-load below-fold character assets near the showcase. Removing the hero overlay must not be followed by eagerly loading all showcase layers elsewhere. Only the active scene should animate or decode continuously. Keep a poster/static state, explicit dimensions and responsive source selection. Compare initial-page and scene-entry transfers separately so deferred media is not hidden from the report.

For the first layered prototype, use the current three-character raster total of approximately 550KB as a comparison baseline, not a silently expanded budget. If a video alternative is needed, add an explicit incremental media budget and benchmark in the prototype report before adopting that pipeline; existing gates do not automatically qualify a new video. A tooling/dependency change invokes the full repository gate under repository policy.

Measure the same viewport, browser, cache and throttling conditions before and after. Record layout shift, loading cost, paint/compositing behavior and frame consistency during at least 20 seconds of active idle and a scroll pass. Maintain no scene-switch layout shift in deterministic tests. Previous local CLS 0 and short frame samples do not certify this changed animation or all devices.

Use a visible pause/resume action near the showcase, synchronized with the existing global motion controls. Explicit pause must survive scene changes according to the existing preference model; resuming must respect a system reduced-motion preference. Pausing cannot require holding focus or hovering. No flicker or rapid flashing is allowed. Native scrolling, keyboard interaction, readable contrast and focus remain primary behaviors.

## 8. Implementation phases after approval

| Phase | Scope and concrete deliverables | Exit condition | Status |
| --- | --- | --- | --- |
| **HF01 — Research and design direction** | Current-state audit, reference comparison, hero decision, content structure, motion storyboard and qualification plan | New roadmap and independent reviews available for owner review | Delivered; implementation approved |
| **HF02 — Hero and showcase composition** | Remove hero overlay, tune original artwork crop/alignment, simplify showcase content, fix mobile order and stable stage; prepare game-art contact sheet | Same-size before/after stills at desktop/mobile/short landscape; no clipped copy or missing navigation; frontend and root gates pass | Delivered as `8c1b81b` |
| **HF02A — Catalog and configuration clarity** | Reproduce/fix LR01–LR10: summary/result containment and current-state copy, preserved custom/package intent, secondary favorites, compact missing-art layout, clear responsive navigation, explicit form handoff, accurate empty states and quieter staff setup guidance | Measured-viewport before/after evidence and short/long/error/manual-review/estimated/changed-state tests; path intent survives game choice/back/reload; public sign-in/MFA entry preserved; frontend/root gates pass | Delivered as `91771cd` |
| **HF03 — Character motion prototype** | One properly prepared MLBB character with organic loop, static pose, pause/reduced/lifecycle states; compare layered method against the reference's visual intent | 20-second stationary and scroll recordings, seamless/internal motion review, budget report; use the result to select the rendering method | Delivered as `22f7afc`; final owner visual acceptance remains HF05 |
| **HF04 — Multi-game motion and state polish** | Extend the qualified method to WoW and LoL, refine scene switching, contrast/edges/atmosphere, failed/slow media handling | Each game passes the same visual standard and state tests; no automatic rotation or unavailable checkout implication | Not started |
| **HF04A — Small character cameo** | Choose/prototype the miniature character, recognizable skill, captioned voice beat and full-width right-to-left exit; safe stage, one-shot lifecycle, replay/dismiss/reduced states | Real skill and voice assets integrated and reviewed in the actual-size desktop/mobile sequence; trigger, interruption and fallback matrix passes | Not started |
| **HF04B — Site-wide punch audio** | Shared opt-in audio preferences/service in both frontend builds, auditioned Iori/Chou punch feedback for all eligible buttons, voice/effects mixing and blocked-playback recovery | Cross-route button inventory and keyboard/touch checks, silent-first/mute/persistence/burst tests, real media budget and listening review pass | Not started |
| **HF05 — Qualification and owner review** | Cross-browser/state matrix, responsive stills, normal-speed clips, resource traces and review handoff | Required gates and scoped visual checks pass; report actual human/device coverage; owner explicitly accepts the result | Not started |

The prototype milestone supplies reviewable evidence early; it is not permission to stop after a rough animation and mark the roadmap complete. The owner has approved implementation. Use the established main-branch delivery rules and commit/push completed verified stages. UI-only commits use frontend pre-commit plus root checks; backend/deployment/tooling changes retain their full gate, and final UX qualification retains the complete repository gate. Do not resume R10/R11 through regression testing.

## 9. Acceptance matrix

| Area | Required checks and evidence |
| --- | --- |
| Hero alignment | 320, 360, 390, 768, 1024 and 1440px captures; short landscape; 200% text enlargement; accepted background visible, no foreground Iori, no overlap, usable primary/secondary actions |
| Showcase hierarchy | Heading and selectors precede artwork on mobile; no character biography/slogan/name block or leftover caption gap; one explicit catalog destination |
| Character quality | Actual-size and 2× edge review of each face, hand, cloth, wing/tail; no black halo, severed silhouette, double edge or anatomy seam at any extreme |
| Stationary motion | At least 20 seconds at normal speed per character, covering two or more full cycles; internal movement perceptible, calm and seamless without scrolling |
| Scroll behavior | Slow/fast/reverse scroll; combined idle/scroll extremes; rank transformation retains labels and low-to-high checkpoints; navigation never waits for motion |
| Switching | Every game by pointer, touch and keyboard; rapid A→B→C, duplicate selection, slow decode, failed asset, pause while loading, and route cleanup; latest choice wins with stable layout/focus |
| Accessibility | Named native controls, selected state, visible focus, 44px targets, contrast, 320px reflow, text spacing, no repeated decorative announcements; first-load and live-change reduced motion; persistent pause behavior |
| Resource lifecycle | No offscreen/hidden-tab continuous animation; no replay storm on return; no leaked listeners or stale scene updates after unmount; denied media playback keeps a usable still |
| Performance | Existing budgets pass; initial and lazy transfers reported separately; fixed stage prevents switch-induced layout shift; idle/scroll traces compared on identical conditions |
| Content and security regression | Real catalog destination remains authoritative; governed homepage text/background-off states preserved; no new service claims or personal information in media/telemetry; existing auth/payment behavior unchanged |
| Catalog/form findings | LR01–LR10 verified with realistic/minimal configurations, zero/additional order-stage questions, published/paused/empty offerings, filtered versus unfiltered results, favorite errors, path-intent history, measured scroll checkpoints and accessible current-state feedback |
| Browser and device review | Chromium, Firefox and WebKit screenshots and motion checks; physical phone and human screen-reader task results recorded only if actually performed |

Human review should answer three practical questions: Is the service and next action obvious on the opening screen? Does the character look gently alive while the page is still? Does selecting WoW artwork imply a purchasable WoW service? Record misunderstandings and adjust hierarchy or labels. These are usability tasks, not claims that a few opinions establish conversion uplift.

The handoff must include before/after hero stills, a short mobile page walkthrough, three stationary character clips, a scroll clip and a reduced-motion still. Also include one complete cameo recording with its voice/caption, a silent version and a button-sound preview plus cross-route coverage results. Passing automated checks alone does not close visual acceptance. Do not claim “best ever,” universal 60fps, real-device coverage or final launch readiness without evidence.

## 10. Scope retained and held

This refinement covers the opening hero, character showcase, the observed catalog/configuration/navigation corrections LR01–LR10, homepage cameo, shared button audio/preferences across both frontend builds, necessary motion/audio integration and regression evidence. Preserve the approved rank-progression behavior; if the shared character component changes, verify its rank-scene usage rather than silently breaking or expanding that scene. Account/chat/admin workflows retain their business behavior; their new button feedback and preference controls require fresh scoped regression checks. A newly discovered regression can be recorded and corrected within its authorized scope, but this is not another unrestricted site redesign.

The original artwork, green theme, fonts, PLAYORA logo and social masters remain accepted inputs. Payment/provider integration, production gateways, deployment activation and R10/R11 are not resumed. [The original UX roadmap](../../UI_UX_ROADMAP.md) remains the historical delivery record; this document governs the approved homepage refinement.

## Sources

All pages were accessed on 14 September 2026. Live pages can change. The competitor findings above distinguish rendered observation from retrieved content; local implementation evidence is identified separately.

1. Boosting.pro, [homepage and rendered character scene][1].
2. Elo-Boost.net, [homepage][2].
3. Boosting Factory, [homepage][3].
4. W3C WAI, [Understanding SC 2.2.2: Pause, Stop, Hide][4], Level A.
5. W3C WAI, [Understanding SC 2.3.3: Animation from Interactions][5], Level AAA.
6. MDN Web Docs, [prefers-reduced-motion][6].
7. W3C WAI, [ARIA Authoring Practices: Button Pattern][7].
8. W3C WAI, [ARIA Authoring Practices: Tabs Pattern][8].
9. W3C WAI, [Understanding SC 2.5.8: Target Size (Minimum)][9].
10. W3C WAI, [Understanding SC 1.4.10: Reflow][10].
11. W3C WAI, [Understanding SC 1.4.12: Text Spacing][11].
12. web.dev, [How to create high-performance CSS animations][12].
13. MDN Web Docs, [Autoplay guide for media and Web Audio APIs][13].
14. MDN Web Docs, [User activation][14].
15. Chrome for Developers, [Autoplay policy in Chrome][15].
16. W3C WAI, [Understanding SC 1.4.2: Audio Control][16], Level A.

[1]: https://boosting.pro/
[2]: https://elo-boost.net/
[3]: https://www.boostingfactory.com/
[4]: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
[5]: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
[6]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
[7]: https://www.w3.org/WAI/ARIA/apg/patterns/button/
[8]: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
[9]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
[10]: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
[11]: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
[12]: https://web.dev/articles/animations-guide
[13]: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
[14]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation
[15]: https://developer.chrome.com/blog/autoplay/
[16]: https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html

## HF02 implementation evidence

The hero now uses the original ascension scene alone. The showcase has one heading, labeled game selectors and a catalog action; character biographies are removed. Its mobile reading order is heading/selectors, stable 18–24rem art stage, then action. Desktop uses a 42/58 composition. See [the existing-art contact sheet](HF02_ART_CONTACT_SHEET.md) for HF03 candidates.

Regression captures cover 320, 360, 390, 768, 1024, 1440 and 844×390 viewports and 200% root text sizing; `.cache/hf02-hero-*` and `.cache/hf02-showcase-*` under frontend hold the local evidence. Earlier matching desktop/mobile stills are preserved in root `.cache/hf02-before/`; there are no invented baseline captures at the other widths. The tracked hook must qualify the final staged source before delivery; see `docs/progress.md`. Existing internal-motion rendering remains provisional for HF03/HF04. No cameo, voice or punch asset is delivered by HF02.
