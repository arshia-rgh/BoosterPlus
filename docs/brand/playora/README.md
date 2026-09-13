# PLAYORA brand assets

Created 13 September 2026 with the built-in image_gen tool for the owner's rebrand request. These assets establish a proposed direction for review. UX01 delivered the application vector identity; UX05 adds multi-game animation assets; [the UI/UX roadmap](../../../UI_UX_ROADMAP.md#11-playora-brand-foundation-and-rollout) defines the rollout.

| Asset | Native file | Intended use |
| --- | --- | --- |
| Current PLAYORA logo v2 | [playora-logo-v2-dark.png](playora-logo-v2-dark.png), 2172 × 724, opaque PNG | Detailed sage-green portal O and subtle PLAY/ORA separation; same P emblem and green identity. |
| Current character social background | [playora-social-characters.png](playora-social-characters.png), 1672 × 941, opaque PNG | Game-character fantasy composition with Miya (Mobile Legends), Illidan (World of Warcraft) and Ahri (League of Legends), depicted as generated interpretations. |
| Initial green logo (retained) | [playora-logo-dark.png](playora-logo-dark.png), 2172 × 724, opaque PNG | Horizontal P symbol and wordmark on a dark field; ready for standalone brand presentation. The white wordmark reads PLAYORA. |
| Abstract green aurora (retained) | [playora-aurora-background.png](playora-aurora-background.png), 1672 × 941, opaque PNG, approximately 16:9 | Independent text-free landscape background for social artwork, covers and optional complementary marketing use. Quiet central space permits later overlays. |

The proposed identity combines a play opening and rising stroke in the P, sage-green accents, warm off-white lettering and deep forest surfaces matching the existing homepage tokens. The current social direction adds game characters in the existing website’s ruined-temple fantasy atmosphere. The original abstract aurora remains available for quieter decorative uses; the current website background is preserved. The logo’s segmented green O and small inset arc distinguish PLAY from ORA while retaining the spelling PLAYORA.

Use the files separately. Preserve aspect ratio; never stretch the wordmark. The logo is **not transparent** and is not a vector master. Its dark canvas should remain part of a standalone presentation until approved transparent/light/monochrome variants are produced. Both backgrounds have no embedded logo or slogan, so future social compositions can place editable copy independently. Check each crop on the actual platform before publishing; these files are not universal social templates or 4K masters. Keep these full-quality source files out of routine page downloads; web exports and responsive loading are later implementation work.

Visual inspection checked spelling, logo silhouette, padding, final edge quality, background composition and absence of unwanted text. Native size and alpha presence were checked with `sips -g pixelWidth -g pixelHeight -g hasAlpha`. Earlier distressed/checkerboard logo attempts were rejected and are not included here. The selected green PNGs are intentionally opaque. The initial cyan/violet palette was superseded by the owner’s green-theme clarification. No raster modification script was used; the selected built-in outputs were copied unchanged into this directory.

[PROMPTS.md](PROMPTS.md) records the first generation round; [PROMPTS-V2.md](PROMPTS-V2.md) records the exact O refinement and character-art prompts. The second round used the existing green logo as its edit target and `frontend/public/artwork/ascension-1536.jpg` as the social artwork’s style/palette reference, inspected before generation. No external image file was used. These are generated raster design assets, not a claim of trademark clearance or exclusive rights. Asset approval, faithful editable/vector derivatives, icon legibility, contrast, social crops and optimized web exports are explicit UX01/UX05 acceptance items.

The current files were visually checked for the PLAYORA spelling, distinct O, game-character composition, clean edges and usable central overlay space. Heads/equipment and the logo must be rechecked in each social crop; the source framing is not a guarantee for portrait or circular exports. The characters are generated depictions, not official game assets or permission to publish them commercially. Retain the existing publication-rights review, and do not imply WoW/LoL services are available merely because they appear in artwork.

The social PNG is a flattened image, not a rig or animation. The roadmap now requires separate character/environment layers and convincing idle/scroll movement, with native scrolling, static fallbacks and measured performance. No animation was implemented in this asset stage.

The owner explicitly keeps the current overall green website theme, font families and background/art direction. PLAYORA changes its branding and interface details within that identity; the separate green background is reusable social artwork, not a mandatory homepage replacement. Account, chat, checkout and admin surfaces should remain restrained. R10/R11 deployment and launch work stays on hold in [final-launch.md](../../../final-launch.md).


## UX05 character layers

`characters/iori.png`, `characters/illidan.png` and `characters/ahri.png` are 1024 × 1536 generated interpretations of Iori Yagami (Chou/MLBB), Illidan (WoW) and Ahri (LoL). `characters/miya.png` is a retained optional MLBB portrait, not loaded by the application. All are opaque PNGs with solid black backgrounds; attempted alpha generation did not produce real transparency. Runtime 768 × 1152 JPEG derivatives in `frontend/public/characters/` total about 537 KiB, with only Iori loaded initially (about 121 KiB). SVG luminance compositing removes black at render time, and hand-defined masks articulate garment, wing or tail separately from breathing and scroll motion. These are restrained 2D articulated illustrations, not complete skeletal rigs.

The existing social composite, abstract aurora and raster logos are preserved. See [character prompts](characters/PROMPTS.md) for source provenance. The application uses only published service links; illustrative game choice does not assert catalog availability. Native masters are never downloaded by the homepage.


## UX10 social and share kit

The [social kit](social/README.md) now contains independent square, portrait and story PNG masters, editable SVG campaign overlays, a padded symbol avatar and optimized homepage share metadata. The original landscape and abstract aurora remain unchanged. The application vector identity is already delivered in `frontend/public/brand/`; statements above about opaque raster draft logos do not describe those transparent vector lockups. All final evidence and remaining owner/device review items are in `docs/ux/UX10_QUALIFICATION.md`.
