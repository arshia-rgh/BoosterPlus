# Design direction — PLAYORA

> 23 September revision: homepage/game navigation follows [HOMEPAGE_GAME_HUB_REVISION.md](HOMEPAGE_GAME_HUB_REVISION.md), superseding earlier MLBB-first or global-service entry guidance. Shop/news discovery is now owner-requested design scope.

21 September 2026 · Proposed design for review, not an implementation authorization

## The experience

PLAYORA should feel like entering a beautiful game world, then working with a dependable service. The storefront can be atmospheric. Choosing a service, paying, reading messages and managing work should be calm and precise. The same brand connects these experiences; they do not need the same visual density.

**Direction: deep green, warm pale text, a clear mint action color, cinematic art, generous spacing, familiar controls.** Keep the accepted sans-serif interface and occasional expressive serif headline. Do not import the exports’ all-caps terminal vocabulary, always-on HUD, decorative security meters or financial spectacle.

The exports are suggestions. Their positive contribution is mood: forest-green depth, recognizable game worlds, outlined cards and a clear game selector. The redesign improves the structure rather than copying their layouts. The owner confirmed visual inspiration only and no expansion of business scope.

## Source-by-source disposition

| Owner reference | Keep as inspiration | Redesign or omit |
| --- | --- | --- |
| `homepage 1.html` | Green depth, game discovery, artwork framing | Replace crowded top strips, fake liquidity, HUD and irrelevant navigation with one clear entry path |
| `homepage 2.html` | Large editorial headline, generous hero, illustrated game families | Shorter home page, no cashback/affiliate/shop/tournament scope; no unsupported claims or invented stats |
| `mlbb.html` | Current → target comparison, game-specific visual identity | Goal/mode/preferences grouping; estimate distinct from final price; no hardware-cloak or publisher API promise |
| `wow.html` | Service categories rather than forcing every game into rank boosting | Service-first fields, explicit scheduling; no guaranteed loot or assumed current expansion data |
| `lol.html` | Region, queue and role context | Current configured ladder; no MMR injection or ban warranty |
| `valorant.html` | Clear competitive-game identity | Configured rank/RR, exact play mode; no live anti-cheat monitoring claim |
| `dota 2.html` | MMR goal rather than rank-only controls | Validate the configured range, avoid assumed match outcomes |
| `wild drift.html` | Mobile-game progression context | Display title Wild Rift; original filename preserved; no copied seasonal marks or fortitude rules |
| `custom page.html` | Visible goal and summary | Progressive options, clear review boundary, no twelve-pillar claim wall |
| `user.html` | Consolidated active work | Minimal action-first overview; separate order/payment/case states; no deposit, wallet or cashback |
| `booster.html` | Professional work context | Assigned-order portal and calendar; no talent marketplace, public telemetry dossiers or auto-payout compensation |
| `admin.html` | A separate operational workspace | Real queues and permissions, no invented four-tier authority or security surveillance metrics |
| `bakhsh haye nav bar.html` | Potential visual grouping only | Tournaments, wagers, scrims and escrow leaderboard excluded from current product |

The reference HTML content is preserved; CRLF line endings and trailing whitespace were normalized to satisfy the repository diff gate. Original bytes remain in the ignored local `.cache/redesign/stitch-originals/` backup. Their content is not approved public copy. External CDN/image/font dependencies are part of those references only; the new atlas uses local assets and no third-party script.

## Navigation architecture

### Storefront

Desktop: PLAYORA → Games → Accounts → Sell an account → How it works; Support and Sign in/My account on the right. Game pages have local navigation: Custom boost, Fixed packages, Reviews, Questions. Do not put the full game list, every product category and account tools in one header.

Mobile: logo, Menu, Sign in/My account. Menu is a labeled, dismissible drawer/panel with the same destinations. No custom scrollbar. Search belongs in game/account browsing where its scope is clear. Only add global search after its actual searchable corpus and permission rules are defined.

Footer: service explanation, support/contact, versioned terms/payment/account-sale/privacy policies, motion/sound preferences. Avoid fabricated office details or business entity names.

### Customer and seller

Overview, Orders, Messages, My sales; secondary Saved items, Notifications, Reviews, Availability alerts; account settings/security/preferences/privacy grouped below. A seller is the same customer identity with an additional task area, not a wallet role. Detail screens have breadcrumbs and return to their prior filtered list position.

The overview answers: **What needs me now? What is happening? Where do I ask?** Remove zero-content dashboard cards and financial lifetime totals unless there is a genuine user task for them.

### Booster

Overview, Assigned orders, Calendar, Messages, Security. No unassigned customer browsing, pricing controls or earnings wallet. The assignment page places readiness and the next session before optional history.

### Administration

Workspace: Overview, Orders, Messages, Calendars, Customers & staff. Manage: Catalog, Accounts, Submissions, Coupons, Reviews. Operations: Finance, Reports, Content, Privacy, Media, Alerts, Tasks. Owner-only entries are scoped by capability. Avoid a flat navigation list at production desktop widths; group and allow module search.

Finance is a separate view switch: Payments, Service cases, Seller payouts, Policy, Reconciliation. Do not mix a refund and a seller payout into one outgoing-money form.

The atlas’s responsive menu is a reviewable navigation specimen; the final implementation must include the role-specific destinations and focus behavior described here. It does not grant roles or simulate authorization.

## Composition by task

| Task | Desktop composition | Narrow composition |
| --- | --- | --- |
| Discover | Wide landscape hero; clear headline/action; three-column game grid | Cropped landscape with strong text scrim; one-column game cards |
| Configure | Goal/mode/preferences column + bounded summary | Single-column fields; summary and action below; optional compact summary disclosure |
| Review/pay | Quiet main panel; order summary and exact terms nearby | One reading sequence: scope → amount → terms → action |
| Track an order | Next-action panel, tabbed records, activity rail | Next action first; wrapping/scrollable labeled tabs; history follows |
| Chat | Optional conversation list, thread, bounded context | Separate list/thread; composer remains above software keyboard |
| Sell | Stage header + focused form/offer + private help | One stage at a time, visible Back/save state |
| Admin triage | Filtered queue with useful columns and detail workspace | Labeled record cards; detail opens separately |
| Catalog editor | Section navigation, editable content, preview/release action | Section chooser; full-width editor; preview separate from typing |

## Motion and sound direction — design only

Home retains the rank transformation concept and game-character showcase, but motion is a supporting layer. Use one active scene, clean background separation, planted feet and readable labels outside the character silhouette. Never animate a whole page of competing subjects. Character biographies are unnecessary.

The previously requested cameo, skill line and punch sounds remain **design options awaiting review in this new direction**, not an automatic continuation of the old roadmap. Proposed cameo placement: a quiet gap between discovery sections, once per visit, no overlap with navigation, forms, chat or cookie/consent UI; skip entirely on reduced motion. Sound off by default, explicit opt-in, no audio on payment, confirmation, destructive or security actions. No global click interception. Do not claim authentic game assets or reuse rights are qualified.

The new atlas uses still images for layout review and lightweight hover/focus transitions. A still is not presented as finished character animation. Motion timing, trigger and fallback requirements are in DESIGN_SYSTEM.md; production motion implementation remains paused.

## Design decisions to review

1. Is the cinematic storefront plus quiet workspace balance right for PLAYORA?
2. Are custom estimates and direct package purchases clearly different within five seconds?
3. Can a customer identify the next action in the order without reading the entire history?
4. Does the chat feel like a familiar conversation rather than an administrative form?
5. Does the admin queue prioritize actual decisions while keeping every tool reachable?

These are human review questions, not claims that a particular design is objectively “best” or already usability-tested.
