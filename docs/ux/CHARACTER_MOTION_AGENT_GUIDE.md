# Adding a game's character motion

Use this brief for future AI-agent tasks. Read repository `AGENTS.md`, `frontend/app/home/README.motion.md`, the scene catalog and current renderer first. Preserve PLAYORA's green theme, accepted hero/background, native scrolling and accessible controls. Do not publish products or alter backend availability just because a decorative scene is added.

## Implementation checklist

1. Inspect the approved source character and its provenance. Choose a pose with room for soft upper-body movement and a stable foot position. Keep source masters separate from small public derivatives. Do not claim a generated interpretation is an authentic in-game animation.
2. Prepare artwork for the existing 1024 × 1536 coordinate system. Inspect black-matte keying against the intended background, including dark interior shading. Do not assume transparent-looking pixels actually contain alpha.
3. Create a matching environment: dark low-detail copy space on the left, character space on the right, game-specific environmental detail around the edges. Keep it subordinate to the character and green brand. Record prompt/source, dimensions and exact derivative command in the background provenance README.
4. Add an entry to `scene-catalog.ts`, `/characters/<id>-768.jpg`, `/scenes/<id>.jpg`, and a small neutral-gray displacement SVG for secondary motion. Reuse `SceneCharacter`; do not fork the engine or use the legacy anatomical-slice component.
5. Start with the shared primary field. Tune cycle and scale for recognizable soft travel on a phone, then add delayed hair/wing/tail follow-through. Protect face/held props and planted feet. Limit secondary filter bounds to the useful region. Check opposite poses for tearing, clipping and duplicate silhouettes.
6. Preserve delayed loading, one active clock, old-scene retention until readiness, canceled-selection cleanup, five-second fallback, failed-art/background states, hidden/offscreen pause, OS reduced motion and preference persistence. Do not introduce continuous JavaScript/React animation work.
7. Extend the pixel-analysis regions in the catalog-driven motion spec for the new silhouette. Keep existing perceptibility, planted-foot and transfer thresholds. Add resource names where necessary; never exclude the newly added media from budgets.
8. Review normal-size desktop and phone captures after transitions settle, at least 20 seconds of stationary movement, native down/up scrolling and both extreme poses. Check readable copy, selector focus, no overlap, no matte rectangle and no transparent-looking armor. Test rapid reverse selection, stalled fields, missing backgrounds and missing portraits.
9. Run the focused checks below, then the required frontend/root gate. Record actual pass/failure evidence and physical-device/owner-review limitations in `docs/progress.md`. Review the staged diff for unrelated changes and secrets. Commit and push to `main` through the tracked hook under the repository policy; verify the remote SHA. Do not mark owner acceptance or held launch stages complete.

## Focused local checks

From `frontend/`, after installing the project's pinned dependencies and browsers:

```sh
npm run build:storefront
API_ORIGIN=http://127.0.0.1:9 npx playwright test tests/e2e/miya-motion.spec.ts tests/e2e/scene-switching.spec.ts
API_ORIGIN=http://127.0.0.1:9 PLAYWRIGHT_ENGINE=firefox npx playwright test tests/e2e/miya-motion.spec.ts tests/e2e/scene-switching.spec.ts
API_ORIGIN=http://127.0.0.1:9 PLAYWRIGHT_ENGINE=webkit npx playwright test tests/e2e/miya-motion.spec.ts tests/e2e/scene-switching.spec.ts
```

Run engines sequentially because they use the same local server port. These public-scene checks intentionally use an unavailable local API; the full gate separately exercises authenticated routes with isolated backend fixtures. Do not substitute them for the complete required gate, and never run destructive fixtures against live services.

## Suggested task prompt

“Add an approved character scene for [game] following `docs/ux/CHARACTER_MOTION_AGENT_GUIDE.md` and `frontend/app/home/README.motion.md`. Use [approved source paths], preserve the green theme, and create a matching separate environment with provenance. Reuse the shared renderer, qualify visible soft motion and planted feet on desktop and phone, test loading/failure/accessibility states, keep existing budgets, and deliver through the repository's required checks. Leave product availability and held launch work unchanged.”
