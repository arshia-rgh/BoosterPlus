# PLAYORA: current green + champagne details

15 October 2026 · Revised design preview · No application changes

## Owner direction

Keep the current PLAYORA theme exactly as the base. Add champagne across selected details so the site is not only green. The earlier charcoal/slate palette replacements changed too much; they are superseded by this additive treatment.

The original green backgrounds, cards, image overlays, typography, normal text, logo, primary buttons and status colors stay unchanged. Champagne `#E7C78A` is a supporting accent, not a new background or a second primary-button color.

| Context | Champagne details | Original styling retained |
| --- | --- | --- |
| Homepage | Emphasized headline words, section labels, service-icon strokes and small decorative outlines | Green artwork/scrims, section surfaces, green buttons and statistics |
| Game services and packages | Service symbols, secondary explore/back links | Green cards, package artwork, white prices/titles, purchase/configure buttons |
| Customer overview | Next-action links, section overline, thin selected-navigation marker | Green panels, navigation fill, ordinary labels and body copy |
| Admin/pro | Selected-navigation marker, section overline and selected contextual links/icons | Green tables/forms/cards, normal row text, primary actions |
| Chat/state sample | Protected-form badge detail | Message surfaces, input styles, validation/status colors and verification actions |

The intended overall impression remains green. Do not increase the amount of gold across operational rows simply to match the homepage. Avoid gold paragraphs, full card outlines, prices or all sidebar labels. Existing mint-filled controls keep their readable original labels.

## Compare the revision

Run from the repository root, with frontend dependencies installed:

```sh
node docs/redesign/color-study-2026-10-15/serve.mjs
```

[Open the revised studio](http://127.0.0.1:4196/?palette=green-champagne&page=home&size=desktop). Toggle **Current theme** and **Green + champagne** without losing the current scroll position. Seven preview choices cover homepage, MLBB services, boost packages, customer, admin, pro and illustrative chat/verification states. Desktop and phone controls remain available.

The preview uses current React components and artwork, a public catalog snapshot and synthetic account/order/activity data. API calls are intercepted locally. Navigation does not perform live actions. Do not enter real codes in the illustrative verification sample.

| Page | Original green | Green + champagne |
| --- | --- | --- |
| Homepage | [Preview](previews/accent/current-home.jpg) | [Preview](previews/accent/green-champagne-home.jpg) |
| Game page | [Preview](previews/accent/current-game.jpg) | [Preview](previews/accent/green-champagne-game.jpg) |
| Customer | [Preview](previews/accent/current-customer.jpg) | [Preview](previews/accent/green-champagne-customer.jpg) |
| Admin | [Preview](previews/accent/current-admin.jpg) | [Preview](previews/accent/green-champagne-admin.jpg) |

## Qualification and implementation boundary

`champagne-accent.css` is an isolated preview layer. The older three replacement palettes match only their explicit historical modes and cannot affect this new direction. No frontend application file or deployment configuration changes in this revision.

The maintained focused check compares all rendered element backgrounds/images and typography, primary-button colors, semantic status/error colors and image scrims before and after enabling champagne. All14 combinations (seven contexts ×1440/390px) passed. It also checks overflow/runtime errors and prevents real API mutations. Run it with the local preview server active:

```sh
node docs/redesign/color-study-2026-10-15/verify-accent.mjs
```

See [senior scoped review](../reviews/ACCENT157_2026-10-15.md) for rendered feedback and final verdict. The full application suite is not part of this design-only revision. Real-route integration and affected checks follow if the owner approves this preview for implementation.

## Earlier research

[Initial benchmark and three-palette exploration](INITIAL_STUDY.md) is retained as historical evidence. Its neutral-surface recommendation is not the current direction. The owner’s preference for existing green surfaces governs the revised proposal. Earlier screenshots and source hashes remain available at the original commit `da42c20`; they are not the final preview.
