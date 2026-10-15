> Historical first exploration. Superseded by the owner’s instruction to keep the current green theme and add champagne details only. See [current direction](README.md).

# PLAYORA color direction study

15 October 2026 · Design proposals only · Owner choice pending

The owner requested complementary colors because the current interface uses too much green. This study keeps PLAYORA's mint identity, typography, game imagery and page structure, and compares three complementary palettes on the current components. It changes no production code, configuration, prices, availability or policies.

## Recommendation

**Choose Glacier: mint + ice blue, with dark slate surfaces.** It gives headings, selected navigation and service icons a distinct supporting color without competing with mint purchase/confirm actions. Neutral cards make long customer and staff sessions easier to scan. All three independent reviewer agents preferred it across the mixed storefront/operations scope.

**Iris** is the close alternative if stronger gaming character matters more than a restrained operational feel. **Champagne** is the warmest, most editorial direction; use its gold sparingly so it does not resemble a warning or make every item feel promoted. These are design judgments, not measured conversion or usability outcomes.

| Direction | Page background | Cards | Raised surfaces | Supporting accent | Character |
| --- | --- | --- | --- | --- | --- |
| Glacier | `#0B1018` | `#141C28` | `#1C2736` | `#8EC5FF` | Clear, cool, balanced |
| Iris | `#101018` | `#1B1926` | `#252235` | `#C2AAFF` | Expressive, gaming-oriented |
| Champagne | `#131313` | `#1E201F` | `#292C29` | `#E7C78A` | Warm, quiet, premium |

All options share mint `#89EFB0` for primary actions, off-white `#F3F6F8` for main text and neutral `#B5BEC9` for secondary text. The logo and artwork retain their existing colors. Muted does not mean faint: essential descriptions and input outlines remain legible.

## What the benchmark suggests

The problem is the amount of green across large surfaces, rather than the absence of another vivid color. Adding colored badges to the same green background would leave that problem intact. The proposed hierarchy is:

1. Neutral, layered dark surfaces provide most of the interface.
2. Mint identifies the brand and the principal action.
3. One supporting accent identifies selected navigation, service icons and occasional headline emphasis.
4. Ordinary utility actions stay neutral; artwork keeps its natural colors.
5. Status colors retain separate meanings and always include readable labels or icons.

### Sources and limits

| Primary source | Evidence used | Design implication |
| --- | --- | --- |
| [Razer](https://www.razer.com/) | Rendered current desktop page: neutral black/gray navigation, white hierarchy, green actions and naturally colored campaign artwork | A green brand can remain recognizable without tinting every surface green |
| [NVIDIA GeForce](https://www.nvidia.com/en-us/geforce/) | Senior visual review of the rendered current page: dark neutral shell and green actions alongside colorful game imagery | Keep shell and action roles consistent while letting each game's artwork vary |
| [Boosting.pro](https://boosting.pro/) | Public text retrieved; browser render timed out | Service/product hierarchy reference only, not evidence of current visual styling |
| [Boosting Factory](https://www.boostingfactory.com/) | Public text retrieved; interactive browser reached a challenge | Service presentation context only; no claim of a successful visual audit |
| [Eloking](https://eloking.com/) | First-party service/order/support structure reviewed by the product agent | Compare short service-selection paths and clear support discovery; marketing claims not independently verified |
| [Eneba](https://www.eneba.com/us/) | First-party marketplace category content; full visual review unavailable | Marketplace organization context, not visual proof |
| [USWDS theme tokens](https://designsystem.digital.gov/design-tokens/color/theme-tokens/) and [state tokens](https://designsystem.digital.gov/design-tokens/color/state-tokens/) | Separation of theme roles from feedback roles | Define colors by function rather than scattering new hex values across pages |
| [Carbon color overview](https://www.carbondesignsystem.com/building-blocks/foundations/color/overview) | Layered surfaces and functional token roles | Establish reusable background/card/raised/border roles |
| [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | Authoritative accessibility guidance | Check actual rendered combinations, visible control boundaries and non-color cues |

Research was selective and task-specific, not an exhaustive audit of every boosting website. Competitor visual observations do not establish their accessibility or conversion performance. Dynamic artwork and hover/focus states require contextual checks; a passing token pair alone cannot certify a whole page.

## Preview the proposals

From the repository root, with the existing frontend dependencies installed:

```sh
node docs/redesign/color-study-2026-10-15/serve.mjs
```

Open [the local color studio](http://127.0.0.1:4196/). It runs on loopback only. Switch between Glacier, Iris, Champagne and the current theme, and between desktop and phone. Each option is available on:

- Homepage, including the service descriptions and game selection.
- Mobile Legends game hero and service cards.
- Published Mobile Legends fixed packages, including artwork and price hierarchy.
- Customer overview.
- Admin order queue.
- Pro assigned-work panel.
- An explicitly illustrative chat/status/error/verification sample using existing component styling.

Compare the same page and scroll position before changing palette. The preview uses actual React components and local artwork. Its catalog is a public snapshot; accounts, orders and activity figures are synthetic. The current-theme option means current styling on this same fixture, not a recording of a live authenticated session. The chat/modal sampler illustrates color roles only; it does not qualify authentication, protected forms or message delivery.

The outer studio and inner product have distinct landmarks and boundaries. The preview's background, dialogs and feedback stay inside its frame. Navigation cannot open real product pages, and all API data is intercepted locally. No real credentials should be entered.

### Saved previews

[Open the side-by-side contact sheet](comparison.html), or view [the exported comparison image](previews/comparison.jpg).

| Direction | Homepage | Game services | Customer | Admin |
| --- | --- | --- | --- | --- |
| Glacier | [Preview](previews/glacier-home.jpg) | [Preview](previews/glacier-game.jpg) | [Preview](previews/glacier-customer.jpg) | [Preview](previews/glacier-admin.jpg) |
| Iris | [Preview](previews/iris-home.jpg) | [Preview](previews/iris-game.jpg) | [Preview](previews/iris-customer.jpg) | [Preview](previews/iris-admin.jpg) |
| Champagne | [Preview](previews/champagne-home.jpg) | [Preview](previews/champagne-game.jpg) | [Preview](previews/champagne-customer.jpg) | [Preview](previews/champagne-admin.jpg) |

Recreate the 12 desktop captures and comparison with the local server running:

```sh
node docs/redesign/color-study-2026-10-15/capture.mjs
```

The capture script checks runtime errors, horizontal overflow and attempted mutations. Broader rendered review, accessibility, responsive controls and fix/review evidence are recorded in [the senior design gate](../reviews/COLOR156_2026-10-15.md). This is focused design qualification, not a full application test run.

## Rules for a later implementation

Owner selection is required before applying a direction to the application. The implementation should replace scattered colors with semantic theme tokens, then verify actual public/customer/admin/pro routes and every relevant loading, empty, error, hover, keyboard and dialog state. The prototype's final CSS overrides are a comparison mechanism, not a proposed production architecture.

Keep primary actions mint and utility actions neutral. Preserve red error, amber warning, green success and blue information meanings with text/icons. Do not use gold or purple as payment-status semantics. Do not recolor game artwork or turn all headings into accent text. Preserve readable typography, image scrims, normal authentication and reduced-motion preferences. No new animation, feature or business-rule change is proposed here.

The next decision is the owner's preferred palette, including any desired hybrid details; production work follows that choice.
