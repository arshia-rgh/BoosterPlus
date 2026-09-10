# R01 — Storefront visual foundation

The homepage now uses an emerald/graphite palette, cream typography, antique-gold highlights, original fantasy artwork and a native-scroll MLBB rank journey. This is the first visual milestone in [the remaining roadmap](../REMAINING_ROADMAP.md). The dedicated admin application is R02; customer/catalog/booster route redesign is R03. Root `production/` remains deployment-only and is unchanged here.

## Experience and implementation

`frontend/app/home/page.tsx` owns the homepage composition; `home.css` defines scoped visual tokens and reusable buttons, links, section headings, cards and motion controls. The existing global header/footer receive compatible styling and a staff-access link. Existing route URLs, sign-in, authorization and API contracts are retained.

The hero leads to the real catalog. Custom boosting and package panels explain existing purchase models without inventing offers or prices. The remaining sections explain ordering, account communication and FAQs. Checkout and resale remain clearly marked as being prepared. Featured live listings, published review feeds and admin-managed homepage content remain part of R03/R07/R09 after their data/publishing workflows are ready.

The rank scene shows the same illustrative player moving from Warrior to Mythical Glory. Original SVG rank-inspired emblems are not official game badges, and decorative stars are not a literal account statistic. The names are consistent with [Google Play's MLBB rank guide](https://play.google.com/store/apps/editorial?hl=en_US&id=mc_games_editorial_evergreen_postinstall_how_ranks_works_mobile_legends_gamehub_fcp); the final season-specific catalog and approved game assets still require content qualification.

`motion.ts` maps ordinary scroll position to paused Web Animations. A 1,100 CSS-pixel desktop journey (700 on narrow screens) reveals the starting profile, blends the frame/emblem, changes the rank label without overlapping text, sweeps a soft highlight, then settles into the gold profile. All stages reverse with scroll. The page does not intercept wheel input or run a perpetual animation loop. Resize/pageshow/visibility changes recompute position; effects and observers are cleaned up on navigation or preference changes.

Other sections receive bounded translation reveals; interactive elements receive hover/focus feedback. Text keeps full opacity throughout these effects so contrast does not degrade during motion. The decorative profile can fade because equivalent rank-journey information remains in accessible text outside the decorative layer. Native `details` elements provide keyboard-accessible FAQs without JavaScript.

The System/Reduced control respects the operating-system reduction setting. Explicit reduction persists locally, synchronizes across tabs, and works in memory if storage fails. Reduced motion or unavailable animation APIs keep readable before/after cards. Viewports at most 650 pixels tall use static cards instead of pinning. No-JavaScript pages retain content, links, FAQs and static profiles. Missing hero artwork leaves the solid/gradient background and real HTML text intact.

## Artwork provenance

The two JPEG hero assets in `frontend/public/artwork/` derive from one original built-in image-generation output produced for this project on 10 September 2026. Prompt direction: a monumental jade/antique-gold winged crest above a ruined arena, emerald crystal, stormy teal atmosphere, the crest on the right and dark negative space on the left; no text, watermark, game logo or existing character. The desktop export is 1536×1024, and the mobile export is 768×512. Conversion used macOS `sips`; the original generation was preserved. Only the optimized project-owned exports are served. SVG emblems and avatar are original code in `emblem.tsx`. No remote font, image, analytics or animation dependency is introduced.

## Enforced budgets and reproducible checks

Every production build runs `npm run budget:home`:

| Asset | Maximum |
| --- | --- |
| Homepage JavaScript | 12 KiB gzip |
| Homepage CSS | 8 KiB gzip |
| Shared root CSS | 4 KiB gzip |
| Desktop hero | 400,000 bytes |
| Mobile hero | 120,000 bytes |

The checker fails for missing/ambiguous assets or exceeded budgets. The homepage browser check also limits fetched resource bodies to 1 MiB, allows no cross-origin resources or CSP violations, checks that only one responsive hero variant loads, and requires measured CLS ≤0.1. The final hosted app must still qualify field Core Web Vitals and representative slower hardware/network profiles; an unthrottled localhost result is not production performance evidence.

From `frontend/`:

```sh
make dev          # Existing local app at http://127.0.0.1:5173
make test-home    # Builds with budgets, then desktop/mobile homepage tests on isolated SSR port 4173
make budget-home  # Checks the last build's assets; fails if no build exists
make pre-commit   # Full frontend gate, including all existing authenticated journeys
```

The complete repository stage gate remains root `make pre-commit`, including backend security, race/TiDB integration, frontend browser checks and container scans. Do not substitute the focused homepage command for it.

Browser tests save hero, five rank positions and static full-page screenshots under ignored `frontend/.cache/`. They check forward/reverse/fast scrolling, resize/landscape, navigation restoration/deep links, motion preferences/OS changes, keyboard FAQs, no-JS/failed artwork, overflow, accessibility, transfer/CLS/CSP and a short real-scroll frame sample. `home-lab-desktop.json` and `home-lab-mobile.json` describe each local run. Unit tests cover preference storage failures, progress bounds, unsupported animation APIs and cleanup. See [progress](progress.md) for measured results and limitations.

If the long-lived development TiDB accumulates slow fixture setup, use a disposable test instance on the explicitly allowed local port 14001. The allowlist still rejects arbitrary hosts, ordinary database ports and unregistered loopback endpoints. For example, with the development storage/scanner/mail services running:

```sh
docker run -d --name boosterplus-r01-test-tidb --cpus=2 --memory=3g \
  --security-opt=no-new-privileges:true -p 127.0.0.1:14001:4000 \
  pingcap/tidb:v8.5.7@sha256:41708a564e47e96d346fed433c3b9bc40d1950fdcc9c768812daeff6aadd930c \
  --store=unistore --path=/tmp/r01-tidb --host=0.0.0.0 --status=10080
TEST_DATABASE_DSN='root@tcp(127.0.0.1:14001)/mysql' make pre-commit
# Only this newly created disposable test container; no development volumes.
docker rm -f boosterplus-r01-test-tidb
```

Wait for the MySQL greeting before running the gate. The same environment variable must also be present for `git commit`, since the hook always reruns the full gate. This is local test infrastructure only, not a production TiDB topology.
