# Preview frame and game artwork review — 24 September 2026

Base: `ef56121`. Design-only stage. Reviewer: separate senior UI/UX designer agent `/root/design_change_gate`. Scope: website/workspace containment, corner activity panel placement and sizing, all six game hero compositions, and the new design review gate. Shared-frame navigation/scrolling gets representative regression checks; unrelated page content is outside this review.

## Rounds

| Finding | User impact | Fix | Verification |
| --- | --- | --- | --- |
| Baseline: viewport-fixed backdrop and order panel outside canvas | Product visuals escape the website border and cover atlas space | Clipped, isolated `previewFrame` owns backdrop, scrolling `canvas` and absolute corner layer; atlas specifications remain outside | Frame-relative bounds and parent/clipping checks; Phone/Tablet/Fluid |
| Baseline: generic cover crop on six game heroes | Characters are cropped differently at each size | Intrinsic-ratio full-source image, side-by-side copy on wide frames, stacked narrow layout | All six images preserve their source ratio; no extra crop or distortion |
| D01 · P2 | Frame bottom/support initially below the visible browser | Flex workspace allocates remaining viewport height; panel body bounded by frame height | Round 2: 1280 × 720 frame ends at 700px and expanded support stays visible |
| D02 · P2 | Cold image load moves title/stats | Accurate source width/height on each hero image reserves image geometry | Reviewer verified attributes and ratio reservation |
| D03 · P2 | Tablet art pushes game identity and Back out of view | Put game title/intro and Back above the full image in stacked layout | Round 2: title visible first in Tablet and all six actual phone game pages |

The review gate itself requires spawning a separate senior designer, scoped evidence, repeated fix/review rounds and an explicit final verdict; the reviewer confirmed it captures the owner's requested workflow. Automated hook checks remain separate.

## Evidence and limits

Implementer: six games × Phone 390 / Tablet 768 / Fluid 1240 canvas checks; image ratio error below 0.0001, `object-fit:contain`, no horizontal canvas overflow, background clip parent correct, corner inside frame. Expanded phone panel and Escape/collapse inspected. Design integrity: 113 screens / 30 flows / 55 routes / 555 states, JavaScript syntax, Prettier and repository checks passed during review.

Reviewer browser checks: actual 390 × 844 frame 425.4–832px; expanded panel 451.2–808px, support visible. Short desktop 1100 × 600 frame 263.8–580px; expanded panel 286.1–552.5px. Escape collapses and returns focus. All six phone game titles visible before art, no horizontal overflow, source ratios retained. Browser viewport override reset.

Primary regression checks: homepage game-selector scroll and nested MLBB boost form stay inside the frame; outer scroll 0. Corner support opens C11 and resets inner scroll. Footer background pause/resume works; Reduced motion disables ambient animation; Visitor hides panel. P01/I01/C11/C05/A01/P17 at Phone width each have one H1, footer, no horizontal canvas overflow and contained order panel. Keyboard PageDown scrolls the focused canvas; specifications stay outside the frame. Browser console errors empty.

Final reviewer verdict: **PASS — no remaining actionable findings in the changed scope.** Reviewer explicitly closed D01/D02/D03 after two implementation review rounds; primary navigation/motion results completed the integration evidence. No claim of physical-device or owner acceptance. Original source crops (such as Jett's waist-up art) are preserved; this stage adds no new art or rights qualification. Exceptionally short browser windows may require workspace scrolling to preserve a usable minimum preview height.
