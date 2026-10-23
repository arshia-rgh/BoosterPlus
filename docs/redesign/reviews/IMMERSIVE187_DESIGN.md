# IMMERSIVE187 — full-image service preview

Scope: standalone preview of five homepage service panels and four Mobile Legends service cards, after the owner's request to fill the entire card with artwork and place text over it. Base application commit `790e5220bb6f7a82277919c868c644a9f5e8e251` (live application f4ce4dd). Production implementation is not part of this stage. Other authors' discount/migration51/prototype/cameo files are unchanged.

Preview: `http://127.0.0.1:4203/`; source `docs/ux/previews/immersive-services-2026-10-23/`.

Independent reviewer: `/root/immersive187_design`, senior UI/UX designer; no implementation edits by reviewer.

## Initial direction

Full-bleed cinematic imagery, bottom-aligned concise copy and a deep green gradient. Retain green/champagne, existing five homepage pictures, requested service order, numbered tabs, arrows and adjacent artwork previews; no automatic advance. Four distinct MLBB scenes in a two-column desktop/tablet grid and a single-column phone grid. Preserve recognizable subjects, keyboard focus and at least 44-pixel navigation controls. No new motion toggle, fake statistics, prices or guarantees.

## Round 1 — changes required

Reviewed all five homepage scenes at desktop, tablet and phone widths; all four MLBB cards at desktop and mobile; studio boundaries and keyboard evidence.

| ID | Finding | Resolution |
| --- | --- | --- |
| I187-01 | Phone artwork ended in a visible horizontal seam above the copy. | Feather the image into an image-backed lower surface; preserve full-card artwork and readable text. |
| I187-02 | At 820px the account hero collection cropped Kagura's face. | Preserve the complete illustration at narrow card widths instead of the desktop cover crop. |
| I187-03 | Adjacent homepage peeks showed a blank upper region. | Anchor the absolute image with `inset: 0`. |

Capture corrections, not product defects: homepage captures initially caught the short entry animation before full opacity; subsequent screenshots fast-forward finite animations. Some full-page captures retained the skip-link focus; intentional keyboard-focus evidence is kept separately.

## Round 2 and final manual verification — PASS

The second server render verified I187-01 and I187-02, all five scenes and MLBB cards at 1440/820/390/320px, settled text and responsive studio controls. Both server preview rounds passed 27 scoped scenarios and eight automated WCAG A/AA audits. No horizontal overflow or missing artwork was observed. Keyboard arrows/Home/End, Choose your game navigation and OS reduced motion passed.

I187-03 was fixed after round2. Two final server-capture approval attempts timed out before execution; a new browser-tab request also timed out. No rejected action was assumed to be successful and no security control was bypassed. A normal refresh of the already-authorized preview tab succeeded, and the final manual screenshot verified the peeks fill their full rounded frames. Evidence: `.cache/immersive187/manual-final/home-desktop.png`.

Final independent verdict:

> PASS for the isolated preview. Both adjacent artwork peeks now fill their rounded frames from top to bottom. Round2 renders verify continuous mobile image-to-copy blending, preserved Kagura face at 820px, complete BTC/ETH/USDT arc at 320/390px, legible settled text, consistent MLBB card alignment, clear green CTAs and focus states. Earlier three design findings are resolved; no remaining actionable issue found in this preview scope.

## Boundary and evidence

This is a design-preview pass, not production qualification or owner acceptance. No live API, purchase, message, invoice, funds, catalog or policy changes. No full gate or local automated tests. The preview intentionally limits purchasing/sign-in actions to a studio notice. All generated illustrations are concepts, not official game screenshots. Real device, assistive-technology and production integration checks remain for a future authorized implementation.

Rendered evidence and original failed/time-out attempts remain in `.cache/immersive187/` and `/srv/playora-qualification/immersive187-preview/`. The server renderer was temporary, private and closed after each run. Original generated images remain at their source paths; committed preview JPEGs and exact prompts are documented in the preview's README and artwork-prompts.json.

## Repository save check

The first documentation-only commit hook passed its 24 helper cases, then stopped because the isolated checkout represented its ignored tool directory as a symlink. The setup was corrected to a real ignored directory with the existing scanner/linter binaries; the original failed log is retained. This does not change the preview or weaken the repository check. The normal documentation hook is rerun before saving this stage.
