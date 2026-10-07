# Character scenes

The fighting-spirit showcase uses one continuous-field SVG renderer, not sliced body parts or a video player. Read `docs/ux/CHARACTER_MOTION_AGENT_GUIDE.md` before adding a game. Scene selection is decorative: publishing a scene does not publish a purchasable game in the backend catalog.

## Current recipes

| Game / scene                  | Primary sway / cycle | Secondary motion                                                                  | Background                                                 |
| ----------------------------- | -------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Mobile Legends / `miya`       | 48 / 6.4 s           | Ponytail follows the upper-body weight shift; crown, bow and feet remain coherent | Moonlit woodland and elven ruins                           |
| World of Warcraft / `illidan` | 48 / 7.2 s           | Opposing soft wing-tip flex; avoid stretching face or wing roots                  | Dark ruined temple, distant fortress and subdued fel light |
| League of Legends / `ahri`    | 48 / 6.8 s           | Tail follow-through; protect face, hand, orb and feet                             | Jade spirit grove, shrine and pond                         |

Values are displacement scales in the artwork coordinate system, not CSS pixels. Keep game-specific values in `scene-catalog.ts`.

## Files and rendering

- `characters.tsx`: nearby loading, selectors and scene transition lifecycle.
- `scene-character.tsx`: shared image loading, bounded failure handling, SVG pose and matte compositing.
- `scene-catalog.ts`: game labels, unique IDs, cycle, primary scale and secondary field bounds.
- `character-motion.ts`: native SVG clock control, visibility and shared motion preference.
- `characters.css`: scene composition, responsive layout, background and crossfade.
- `miya.tsx`: compatibility wrapper; do not create a separate engine here.
- `public/characters/<id>-768.jpg`: existing black-matte portrait, rendered in 1024 × 1536 coordinates.
- `public/characters/miya-breath-field.svg`: shared standing-weight field despite its historical filename.
- `public/characters/<id>-…-field.svg`: character-specific hair, wings or tail field.
- `public/scenes/<id>.jpg`: separate environment. Masters and provenance live in `docs/brand/playora/scenes/`.

Neutral displacement is RGB 50%,50%,50%. Red controls horizontal travel; green controls vertical travel. Taper displacement through the hips and leave the feet neutral. Use soft gradients, never hard anatomical cuts. Match the secondary processing bounds to the painted field; larger regions cost more to render.

The renderer pads the source matte before movement so the original silhouette cannot show through at shifted edges. Luminance-derived alpha removes near-black matte: slope 64, intercept −1. Animated keying stays inside the pose filter because WebKit may cache an outer filter and stop repainting nested movement. Static artwork uses a separate outer filter. This is black-matte keying, not a genuine transparent source. Check very dark armor/interior details against the actual background; blindly applying it to a differently lit source can remove shading. Genuine alpha artwork needs a deliberate renderer adaptation, not an unreviewed asset replacement.

The viewBox and filters extend beyond the source. Inspect both extreme poses for clipped crowns, weapons, tails, duplicated edges and bottom seams. Do not change the legacy rank-section Iori rendering as a side effect.

## Loading and motion behavior

Only near-viewport scenes load. Incoming artwork/background/fields settle before the current scene is replaced. Each asset has a five-second readiness deadline. Missing motion fields produce a still, a missing background preserves the dark scene surface, and a missing portrait produces a decorative fallback. Navigation must remain usable.

The replacement fades over 550 ms; the old layer is removed after 600 ms. Rapid choices discard stale incoming layers. Only the displayed scene runs its native animation clock; outgoing layers freeze. No continuous React state updates or JavaScript animation loop. Hidden/offscreen scenes pause. OS reduced motion disables movement and crossfades automatically. The owner removed on-page motion controls on 7 October 2026; do not reintroduce them.

## Budget and qualification

Current combined poster + two fields + background transfers: Miya 323,152 bytes; Illidan 334,538; Ahri 294,655. Each scene must stay below 350,000 bytes, each background below 125,000. Preserve Miya's existing 210,000-byte character-only cap; other scenes have a 250,000-byte character cap. No eager three-game download, additional animation library, WebGL runtime or embedded remote player.

`tests/e2e/miya-motion.spec.ts` iterates the scene catalog despite its historical filename. It records stationary motion, native scrolling, actual opposite-pose pixels, asset transfers, device motion changes, offscreen behavior, reduced motion and failures. Add a meaningful head/feet analysis region for a new silhouette. Preserve the >6 CSS-pixel head travel and <0.75-pixel foot travel assertions; never lower them to hide an imperceptible or sliding character.

Build before direct browser checks. Run the focused scene and switching specs in Chromium, Firefox and WebKit sequentially. Review settled desktop/phone stills and real-time recordings: a changing animation-clock value alone does not prove good motion. Run `make pre-commit` in `frontend/` plus repository checks before delivery; the tracked staged-path hook selects this scope automatically for UI changes. See the agent guide for commands and acceptance requirements.
