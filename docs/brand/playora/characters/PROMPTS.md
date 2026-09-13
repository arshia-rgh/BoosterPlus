# Character generation provenance — UX05

Generated with the built-in image_gen tool. Chosen source PNGs were copied unchanged into this directory. No external reference file or live service was used for the three new portraits. Each initial prompt was the template below with its corresponding subject substituted verbatim, followed by the background edit below using the initial result as its edit target.

## Initial template

Use case: stylized-concept. Asset type: single full-body character portrait for PLAYORA's dark forest-green gaming website, to be animated in a decorative showcase. Subject: {subject} Premium highly detailed cinematic game concept art, realistic polished painted materials, restrained sage-green rim lighting and aged-gold accents to fit a forest-green palette while preserving iconic costume colors. Three-quarter stance facing slightly left. Whole character including feet, hair, wings/tails/weapons must fit fully inside the frame with a generous margin. Actual isolated silhouette against completely uniform pure black RGB 0,0,0 background; opaque PNG is intended. NO gradients, fog, floor, backdrop, background lighting, shadows, border, frame, text, logo, watermark or checkerboard. Keep background perfectly black all the way to the silhouette, including openings between limbs. Portrait canvas. One character only. Beautiful face and anatomy, carefully crafted hands and game-related equipment. This will be a standalone compositing asset; do not create a page mockup.

## Subjects

**Iori:** Iori Yagami as Chou's King of Fighters collaboration skin in Mobile Legends. Adult male fighter, iconic red hair hanging over one eye, white open-collar shirt, short dark jacket, red trousers with the iconic leg strap, imposing confident stance, one hand raised with a restrained violet flame. Recognizable accurate character identity and costume.

**Illidan:** Illidan Stormrage from World of Warcraft. Adult night elf demon hunter, curved horns, long black hair, dark blindfold, glowing restrained green tattoos, enormous folded demonic wings, two ornate warglaives, powerful poised stance. Recognizable accurate character identity.

**Ahri:** Ahri from League of Legends. Adult nine-tailed fox mage with elegant fox ears, long dark hair, iconic red-and-white outfit with gold ornaments, nine graceful pale fox tails arranged behind her, one restrained glowing blue-green orb. Recognizable accurate character identity. Elegant and poised, nonsexual presentation.

## Exact background edit for each portrait

Use case: precise-object-edit. Preserve this exact character's face, full-body pose, costume, anatomy, hair, hands, weapon/tails/wings, every detail and the current portrait composition and dimensions. Remove all surrounding gradient, colored smoke, fog, lighting, halo and shadows. Replace ALL background around and between character parts with perfectly flat pure black RGB 0,0,0 right up to the silhouette. The background must be a completely solid black void, including between legs and arms and weapon openings. Preserve magic confined to the hand-held flame/orb or weapon itself. No new objects, no text, no vignette, no studio lighting in background, no checkerboard. Opaque PNG on solid black is intentional for web compositing. Only replace the background.

## Selected outputs

| File | Built-in output filename |
| --- | --- |
| iori.png | exec-2f8e73a1-285d-4081-8905-2638f0b4db43.png |
| illidan.png | exec-e4552e4c-81b3-4197-a09b-41f3f2ac20fa.png |
| ahri.png | exec-98defb93-1f5c-4185-bf1a-80858d092d62.png |
| miya.png (optional, not shipped to browsers) | exec-af6cc0a5-9828-4f50-8851-45862d40383a.png |

The optional Miya portrait was generated earlier as a full-body silver-haired archer. A failed alpha/checkerboard attempt was discarded. Its final background edit prompt was:

Use case: precise-object-edit. Preserve this exact full-body silver-haired Miya elf archer, face, armor, ornate bow, clothing, pose, composition and image dimensions. Replace ALL background around and between character/bow parts with perfectly flat pure black RGB 0,0,0. This request is for an opaque black background, no alpha needed. Absolutely no gradient, halo, fog, floor, vignette, shadows or checkerboard. Background pixels must be entirely black right up to the silhouette. Keep fine hair and every character detail; no typography. Output a polished isolated character on pure black for a dark forest-green web scene.

All selected outputs are opaque 1024 × 1536 PNGs. Web derivatives use `sips -Z 1152 -s format jpeg -s formatOptions 78` (768 × 1152), without repainting or cropping. Runtime SVG masks/filter handle compositing and animation. The generated depictions are illustrative interpretations, not official game assets.
