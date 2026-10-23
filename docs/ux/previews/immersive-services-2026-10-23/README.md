# Immersive homepage and MLBB services — design preview

Owner review only. This is a standalone static prototype, not an application release. No production UI, catalog, availability, pricing, policy, schema or settings are changed. There is no API, authentication or purchase flow in this preview.

## Open the preview

Serve this directory with a static server, for example:

```sh
python3 -m http.server 4203 --bind 127.0.0.1 --directory docs/ux/previews/immersive-services-2026-10-23
```

- Studio: `http://127.0.0.1:4203/`
- Homepage: `http://127.0.0.1:4203/?page=home&size=desktop`
- MLBB: `http://127.0.0.1:4203/?page=mlbb&size=desktop`
- Phone: change `size=phone`; tablet: `size=tablet`.
- Bare responsive product canvas: `page.html?view=home` or `page.html?view=mlbb`.
- Open a specific homepage selection: `page.html?view=home&scene=payment` (also boost/accounts/shop/news).

The gray studio controls are outside the product frame. All product pictures and backgrounds remain within the frame. Page and size controls work; homepage tabs support Left/Right/Home/End, arrows and adjacent-image peeks. Choose your game scrolls to the MLBB tile, which opens the game preview. MLBB cards demonstrate focus, hover and selected appearance; the studio reports selection without creating orders or entering a real buying flow. Other site actions are labeled as preview selections.

## Design

All five homepage panels use the previously approved pictures as edge-to-edge artwork behind concise copy. Order: Boost services, Accounts, In-game shops, News and guides, Crypto payment. The payment scene retains Bitcoin, Ethereum and USDT. Deep green gradients preserve text readability; champagne detail and green actions retain the existing theme. Dense feature paragraphs are omitted from this visual proposal. Copy changes in the prototype are proposals, not published policies.

Four new MLBB illustrations depict a rank climb, a hero collection, diamonds/pass treasure and a strategy map. A two-column desktop/tablet grid becomes one column on phones. Narrow cards retain the full image composition and feather into an image-backed lower surface instead of cutting off faces. Artwork fills every card boundary. The sample game context uses no invented statistics, prices, promotions, guarantees or customer information; the existing game shell and service behavior are outside this preview's implementation scope.

No automatic carousel advance or new motion toggle. Existing OS reduced-motion preference is respected. Failed image loads leave legible copy on a dark green fallback.

## Artwork provenance

Generated with the built-in `image_gen` tool. Exact four prompts and original output paths are in [artwork-prompts.json](artwork-prompts.json). Preview JPEGs are in `assets/mlbb-*-v1.jpg`; originals remain at the generated-image paths. JPEG conversion changes encoding/size only. These are generated concept illustrations of MLBB subjects, not official screenshots or endorsements. Homepage pictures, game introduction and brand mark are copied unchanged from the approved repository assets.

## Review and limitations

Independent senior designer: `/root/immersive187_design`. Review record: [IMMERSIVE187_DESIGN.md](../../../redesign/reviews/IMMERSIVE187_DESIGN.md).

Server-only static preview checks in rounds 1 and 2 each covered 27 scenarios: all five scenes and the four-card grid at 1440, 820, 390 and 320 pixels; image loading and horizontal overflow; keyboard and choose-game navigation; OS reduced motion; studio page/size controls. Eight WCAG A/AA automated audits per round reported no violations. These are prototype checks, not application or production qualification. No full gate or local automated tests ran.

Round 1 visual review required seamless phone image blending, an uncropped tablet hero collection and full-height side previews. Round 2 verified the first two fixes. The final side-preview CSS fix was inspected through a fresh manual browser capture after server capture requests timed out at the approval service. No failed action was treated as a pass; original evidence remains in `.cache/immersive187/` and `/srv/playora-qualification/immersive187-preview/`. The temporary server renderer closes its localhost listener and browser after each run. No service was installed or exposed publicly.

Owner acceptance and any application implementation/deployment remain pending. The published site remains unchanged.
