# Design assets and sourcing

The atlas reuses five existing PLAYORA assets for private local design review. Copies are local to `design/assets/` so this artifact is independent of the frontend dev server.

| Design asset | Existing source | Role |
| --- | --- | --- |
| `ascension.jpg` | `frontend/public/artwork/ascension-1536.jpg` | Cinematic hero and generic scene placeholder |
| `logo.svg` | `frontend/public/brand/playora-dark.svg` | Existing green-compatible PLAYORA wordmark |
| `miya.jpg` | `frontend/public/scenes/miya.jpg` | MLBB scene/layout reference |
| `illidan.jpg` | `frontend/public/scenes/illidan.jpg` | WoW scene/layout reference |
| `ahri.jpg` | `frontend/public/scenes/ahri.jpg` | League scene/layout reference |

No new bitmap generation or media extraction was necessary to establish this layout direction. Existing asset provenance/publication rights are not newly qualified by copying them into the design artifact. See the existing brand/media records before any public release.

VALORANT, Dota 2 and Wild Rift templates use a generic PLAYORA landscape or type-based card until suitable game-specific art is selected. They do not reuse Miya as a character from another game. Listing gallery areas are deliberately labeled composition placeholders, not evidence for real accounts.

Before implementation: select final per-game scene/background crops, approved rank emblems from the current catalog, sanitized account-listing fixture screenshots, empty-state icons and exact font files/licenses if self-hosting. Preserve readable text zones at desktop and phone crops. Supply alt text only when imagery conveys information; purely decorative atmosphere is silent.

Character movement, cameo animation, voice and punch audio need separate matching assets, provenance and human motion/audio review. Unfinished prior experiments remain paused and are not imported into this atlas. Still scenes here do not claim completed motion delivery.

The raw Stitch exports still reference remote Google-hosted imagery, Google fonts and Tailwind CDN. Preserve them as supplied references. Do not ship that export HTML or its unsupported public copy as application code. The new atlas has a restrictive CSP, no external runtime dependency and no network/API integrations.
