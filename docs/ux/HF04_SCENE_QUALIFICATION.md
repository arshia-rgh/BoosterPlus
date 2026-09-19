# HF04 scene qualification

Implementation delivered as `3537aa563c149952e69a84420bcd2e9bc56880f1` and verified on origin/main. Required frontend/root gate: 186 component tests and 68 Chromium journeys passed, along with security, build, budget and container checks. Focused WebKit and isolated Linux Firefox: 10 cases each passed. Owner/physical-device review remains open.

## Implementation

All fighting-spirit choices use the same continuous-field renderer: Miya (Mobile Legends), Illidan (World of Warcraft), and Ahri (League of Legends). Separate woodland, ruined-temple and spirit-grove environments frame each character. The accepted green theme, fonts, hero and rank scene are retained. No character biographies, automatic carousel, game-availability implication or new rendering dependency.

Native SVG clocks drive coherent upper-body sway and character-specific secondary motion. The copy is stationary. Black-matte keying replaces translucent screen blending against detailed environments. Matching backdrops and characters crossfade together; the current scene stays visible while a replacement settles, and canceled selections cannot become current later. Only the displayed scene animates. Offscreen/hidden pause, shared preferences, reduced motion, five-second asset deadlines and still/decorative fallbacks remain explicit.

## Automated and visual evidence

The focused `miya-motion.spec.ts` is catalog-driven despite its historical name. Each game gets a 20-second stationary recording, native-scroll pass, opposite-pose pixel comparison, transfer report, pause/preference checks, offscreen/OS-reduced behavior, accessibility scan and failed-asset coverage. `scene-switching.spec.ts` adds delayed/canceled selections and stalled-field/missing-background cases. Final logs use `.cache/hf04-motion-<engine>.log`; retained captures/reports live under `.cache/hf04-evidence/`.

Existing movement thresholds remain >6 CSS pixels of head travel and <0.75 pixels of foot movement. Ahri's region requires warm face-pixel selection to exclude pale tails and green background inside the same rectangle; a simple bright-pixel centroid was not tracking her head reliably. The renderer retains the same 48-unit primary scale for all three characters. Ahri's focused Chromium measurement is 16.51px desktop / 9.33px phone head travel with zero foot travel.

Scene transfer totals (poster, shared primary field, secondary field, background):

| Scene | Bytes | Combined cap |
| --- | ---: | ---: |
| Miya | 323152 | 350000 |
| Illidan | 334538 | 350000 |
| Ahri | 294655 | 350000 |

The existing Miya character-only cap remains 210000 bytes; other characters are below 250000, and each new background is below 125000. First-page checks assert the showcase has not eagerly loaded its artwork. Local RAF timing is recorded for investigation, not treated as a physical-device FPS guarantee.

Settled desktop and phone captures were inspected for composition, readable copy, wrapped selectors, solid character shading and the absence of matte rectangles. Pose captures check anatomy, edge clipping and planted feet. The required frontend/root hook also reruns the wider route and security/accessibility regression suite. Delivery status and any failures/retries are recorded in `docs/progress.md`; this document does not claim pending gates passed.

## Remaining acceptance

Owner review of the feel of the motion and physical-device testing remain necessary. This is an idle treatment of approved character artwork, not an authentic skeletal game animation. Very dark pixels can be affected by matte keying; future source replacements must be reviewed against their environments. HF04A cameo, HF04B voice/punch audio, HF05 final acceptance and held R10/R11 are not delivered by this scene stage.

Future implementation instructions: [agent guide](CHARACTER_MOTION_AGENT_GUIDE.md) and `frontend/app/home/README.motion.md`. Background masters, prompt summaries and exact derivative commands: `docs/brand/playora/scenes/README.md`.

## macOS Firefox startup limitation

This host runs macOS 27. Direct Playwright Firefox startup fails before loading the site with “Could not find profile folder,” including after reinstalling the pinned browser and using disposable profile locations. The symptoms match [Mozilla bug 2060476](https://bugzilla.mozilla.org/show_bug.cgi?id=2060476). No privacy permission, real browser profile or sandbox setting was changed. Linux Firefox qualification uses the same repository tests and pinned frontend build in a disposable image; it is not a claim that this Mac's Firefox automation now works.

To reproduce that alternative, copy `frontend/Dockerfile` to an ignored temporary Dockerfile and append:

```dockerfile
FROM build AS hf04-browser-check
RUN npx playwright install --with-deps firefox
ENV API_ORIGIN=http://127.0.0.1:9 PLAYWRIGHT_ENGINE=firefox
```

Build with `frontend/` as the context (its Docker ignore rules exclude runtime environment files), target `hf04-browser-check`, then run the two focused specs inside the image with `--network none`. No host ports, backend configuration, credentials or database are needed. Retain logs/captures in an output-only directory. Exact local build/run evidence uses `.cache/hf04-firefox-linux-*` and `.cache/hf04-evidence/firefox-linux/`.
