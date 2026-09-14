# Character media sourcing

14 September 2026. The owner has no local audio/skill files and authorized finding them. These are research candidates, not qualified runtime assets. Keep final media local to PLAYORA once selected; do not embed a third-party player's transient signed URL as a production dependency.

| Source | What was verified | Remaining work |
| --- | --- | --- |
| [MLBB Tools audio browser](https://mlbb.tools/audio) | Rendered browser provides hero/category filters and playable voice/showcase entries. Chou has skin-six showcase candidates; one selection exposed a decoded audio resource of about 10.77 seconds. | Verify skin identity and audition the actual impact. A showcase clip is not automatically a clean, short button punch. The site labels its material as Moonton-owned fan reference. |
| [Miya model viewer](https://mlbb.tools/heroes/miya/model) | Rendered controls and a downloaded GLB expose `city_action`, `city_special_idle_01` and `city_idle`; see prototype results below. | Skin-thumbnail mapping and theme fit need review. No walk or combat skill is verified. The raw model is unsuitable as an added homepage runtime payload. |
| [Chou model viewer](https://mlbb.tools/heroes/chou/model) | Page describes multiple skin models and animations. | Verify Iori mapping and model/animation availability before selection. |
| [Official Miya spotlight](https://www.youtube.com/watch?v=mluQwhjQEIA) | Official MLBB skill demonstration reference. | Use to compare movement/skill identity; it is not an exported transparent character asset. |
| [Miya voice references](https://mobile-legends.fandom.com/wiki/Miya/Audio) | Indexed page names short individual voice files. | Direct page access returned 403; no file acquired from this source. |
| [Chou voice references](https://mobile-legends.fandom.com/wiki/Chou/Audio) | Indexed page distinguishes skin variants. | Direct page access returned 403; no file acquired from this source. |
| [Iori/Chou transcript reference](https://www.zennindo.com/2022/01/chou-iori-yagami-quotes.html) | Transcriptions and embedded voice videos distinguish the crossover character. | Not a verified isolated impact sound. |

Normal in-app browser access to MLBB Tools succeeded after direct scripted requests were denied. Do not circumvent access restrictions or treat third-party “no copyright” titles as proof of rights. No credentials or transient media tokens belong in this document. A browser download was attempted for one showcase candidate; no local output has yet been verified, so acquisition is not marked complete.

HF03 must still compare coherent internal motion with the existing still-art rendering. HF04A needs a recognizable ability and genuine locomotion at actual cameo size. HF04B needs a clean, quiet impact that survives repeated-button listening tests. Do not replace these requirements with a generic beep, rigid image sliding or an unverified skin voice.


## HF03 prototype experiments

The public Miya viewer supplied a GLB saved only in ignored research cache at `.cache/hf-media-research/miya-skin02.glb`. Binary-header/JSON inspection confirms GLB v2, 8,711,332 bytes, five meshes, five skins and embedded image resources. It exposes the three animations above. The rendered selected Skin 02 appears in Christmas colors despite its thumbnail suggesting a different costume; this candidate fails the proposed green/gold art fit. Neither the skin label nor an idle animation establishes a matching recognizable combat ability. No 3D runtime or new application dependency was added.

The built-in image-generation tool prepared a body/ponytail atlas from `docs/brand/playora/characters/miya.png`, followed by one targeted transparency correction. Both outputs are **rejected**: PNG IHDR inspection reports 1448×1086 RGB (color type 2), with a painted checkerboard and no alpha channel. They must not be included in public assets or called clean animation layers. The original master is unchanged. Local rejected experiments are `.cache/hf-media-research/miya-atlas-rejected-opaque.png` and `miya-atlas-alpha-retry-rejected.png`. No CLI/API fallback was invoked.

Prompt for the first built-in generation:

> Use case: precise-object-edit. Asset type: a TWO-PANEL layered character atlas for a premium green PLAYORA game website. Reference/edit target is the supplied green-and-gold elf archer Miya illustration. Preserve her exact face, elaborate green/gold armor, long bow, pose, entire feet and silver hair style. Make a wide 2048 by 1536 RGBA PNG with a GENUINELY TRANSPARENT background, no checkerboard painted in, no text, no shadows outside the character. Two equal 1024 by 1536 panels, edge to edge. LEFT PANEL: the complete unchanged full-body archer at the exact reference coordinates but REMOVE ONLY the trailing high ponytail behind the head/right shoulder, retain crown, fringe and hair around the face; reconstruct the hidden shoulder/quiver/armor under that ponytail cleanly. All other details and pose identical. RIGHT PANEL: ONLY the removed long silver high ponytail (root at approximately x=505,y=48 of its own panel, tip around x=700,y=495) on transparency, in exactly the reference coordinates in its own panel, extended slightly under the crown for natural hidden overlap. No head, no ear, no face, no armor, no bow in right panel. When these two panels are overlaid at the same origin they must reconstruct the single reference figure seamlessly. This is a layered animation preparation asset, so accurate shared registration matters much more than inventing new composition. Clean hair alpha, sharp premium game illustration, no black fringe, no bottom crop. Do not duplicate the ponytail on the body layer.

Targeted correction prompt:

> Use case: background-extraction. Edit only the background of this two-panel game-character atlas. REMOVE the entire painted gray/white checkerboard. Deliver a PNG with actual alpha transparency everywhere outside the archer and separate ponytail. Do not render a visual checkerboard or any replacement background. Preserve both subjects, their exact pixel positions, size, colors and layout. Real transparent RGBA output is essential for compositing. No other changes.

## Short voice candidate

Filtering the rendered MLBB Tools audio page to Miya and searching “My aim is true” returned one matching voice result. Its native audio element decoded `voice/miya/vo_1011_029.mp3` with a 1.891247-second duration and readyState 4. This verifies availability and decoding in that browser, not a human listening review or final skin/ability pairing. Direct download returned HTTP 400; the browser download action did not yield a verified local output. No voice file was added to the application, and preview playback was stopped. The source labels the line; transcript/audio agreement still needs listening qualification.

Next asset work remains: a correctly registered alpha-layer set or a qualified authored loop, a coherent walk/skill sequence, a locally acquired matching voice, and an isolated verified Iori/Chou impact. Rejected atlas exports and a readable source page are not completion of those deliverables. Continue sourcing as requested by the owner; do not ask them to supply files they already said they do not have.
