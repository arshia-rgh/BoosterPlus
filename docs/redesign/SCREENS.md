# PLAYORA screen specifications

Design review edition · 21 September 2026. All monetary values and identities are fictional examples. Screen IDs identify design views, not new implemented routes. Business rules and implementation boundaries remain in README.md.

113 designed views, including subviews of existing routes. Shared behavior in DESIGN_SYSTEM.md and INTERACTIONS.md applies to every view.

## P01 — Your next level starts here.

**Area:** Explore · **Current route:** `/` · **Layout:** hero

Choose your game. Build your boost. Stay connected from the first question to the final result.

### Page anatomy & content

1. **Choose your game** — Mobile Legends is our starting lineup. Other games appear only when their catalog is published.
2. **A clear path to your goal** — Customize → Review your quote → Pay directly → Follow your progress.
3. **Find your fighting spirit** — A quiet, game-specific scene. One active character at a time; readable text stays outside the art.
4. **Prefer a ready-made package?** — Exact scope and a fixed price, with no individual quote approval.
5. **Support throughout your order** — Keep messages, progress and proof together in your private order workspace.

### Actions & destinations

- **Explore games** → [P02](design/index.html#P02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Browse accounts** → [P12](design/index.html#P12). Prototype actions are simulations only; guards must pass in the eventual application.
- **How it works** → [P16](design/index.html#P16). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Catalog unavailable:** We cannot load the game lineup. Retry or contact support.
- **No published games:** New services are being prepared. Get help with a question.
- **Reduced motion:** Static artwork; all content and navigation remain available.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the existing landscape as the hero, never an extra hero character overlay. Hero: 7 columns text/5 columns quiet art at desktop. No fake activity, countdowns, rating totals or publisher partnership claims.

**Journeys:** F01.

## P02 — Find your game.

**Area:** Explore · **Current route:** `/games` · **Layout:** games

Boosting and fixed packages, organized around the way you play.

### Page anatomy & content

1. **Mobile Legends** — Custom rank progression · Play together or on your account
2. **World of Warcraft** — Game template preview · Publish only after services are configured
3. **League of Legends** — Game template preview · Rank and role options come from the catalog
4. **VALORANT** — Game template preview · Competitive goals and region
5. **Dota 2** — Game template preview · Configured MMR goals
6. **Wild Rift** — Game template preview · Configured mark progression

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search games | search |  | Search by game name. |
| Availability | select | All |  |

Allowed options: Availability: All, Available, Coming later.

### Actions & destinations

- **Mobile Legends** → [G01](design/index.html#G01). Prototype actions are simulations only; guards must pass in the eventual application.
- **WoW preview** → [G02](design/index.html#G02). Prototype actions are simulations only; guards must pass in the eventual application.
- **League preview** → [G03](design/index.html#G03). Prototype actions are simulations only; guards must pass in the eventual application.
- **VALORANT preview** → [G04](design/index.html#G04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Dota 2 preview** → [G05](design/index.html#G05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Wild Rift preview** → [G06](design/index.html#G06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No results:** No games match this search. Clear your filters.
- **Loading:** Keep the search and six reserved card spaces visible.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Only Mobile Legends is assumed at launch. Other frames are reusable design specimens, not availability promises.

**Journeys:** F01, F26, F27, F28, F29, F30.

## G01 — Mobile Legends

**Area:** Explore · **Current route:** `/games/:slug` · **Layout:** game

Make your next rank a clear goal.

### Page anatomy & content

1. **Custom boost** — Rank, division, stars, requested win rate, hero and role restrictions. All choices use the current published game configuration.
2. **Fixed packages** — Compare included scope, eligibility, price and availability before choosing.
3. **How it works** — Custom requests receive a final quote after review. Packages can proceed directly to checkout.
4. **Your questions, answered** — Payment timing · Play modes · Delivery estimates · Changes and support

### Actions & destinations

- **Configure a boost** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.
- **View package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ordering paused:** New orders are paused for this game. Existing orders remain available.
- **Archived game:** This game is no longer accepting orders. Browse available games.
- **Missing terms:** This service is not ready to purchase. Contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Game key: mobile-legends. Do not hard-code season numbers, rank ladders, guaranteed win rates or publisher API claims. Launch example.

**Journeys:** F01, F02, F11, F14.

## G02 — World of Warcraft

**Area:** Explore · **Current route:** `/games/:slug` · **Layout:** game

Plan your next adventure.

### Page anatomy & content

1. **Custom boost** — Service first: dungeon, raid, leveling or PvP. Then region, realm, faction where applicable, difficulty, run count and schedule. All choices use the current published game configuration.
2. **Fixed packages** — Compare included scope, eligibility, price and availability before choosing.
3. **How it works** — Custom requests receive a final quote after review. Packages can proceed directly to checkout.
4. **Your questions, answered** — Payment timing · Play modes · Delivery estimates · Changes and support

### Actions & destinations

- **Configure a boost** → [G07](design/index.html#G07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ordering paused:** New orders are paused for this game. Existing orders remain available.
- **Archived game:** This game is no longer accepting orders. Browse available games.
- **Missing terms:** This service is not ready to purchase. Contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Game key: world-of-warcraft. Do not hard-code season numbers, rank ladders, guaranteed win rates or publisher API claims. Future-game design specimen, not a launch activation.

**Journeys:** F26.

## G03 — League of Legends

**Area:** Explore · **Current route:** `/games/:slug` · **Layout:** game

Build a climb around your role.

### Page anatomy & content

1. **Custom boost** — Queue, region, starting and target rank/division/LP, role and champion preferences. All choices use the current published game configuration.
2. **Fixed packages** — Compare included scope, eligibility, price and availability before choosing.
3. **How it works** — Custom requests receive a final quote after review. Packages can proceed directly to checkout.
4. **Your questions, answered** — Payment timing · Play modes · Delivery estimates · Changes and support

### Actions & destinations

- **Configure a boost** → [G08](design/index.html#G08). Prototype actions are simulations only; guards must pass in the eventual application.
- **View package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ordering paused:** New orders are paused for this game. Existing orders remain available.
- **Archived game:** This game is no longer accepting orders. Browse available games.
- **Missing terms:** This service is not ready to purchase. Contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Game key: league-of-legends. Do not hard-code season numbers, rank ladders, guaranteed win rates or publisher API claims. Future-game design specimen, not a launch activation.

**Journeys:** F27.

## G04 — VALORANT

**Area:** Explore · **Current route:** `/games/:slug` · **Layout:** game

Set your next competitive milestone.

### Page anatomy & content

1. **Custom boost** — Region, queue, starting and target rank/RR, play mode and agent preferences. All choices use the current published game configuration.
2. **Fixed packages** — Compare included scope, eligibility, price and availability before choosing.
3. **How it works** — Custom requests receive a final quote after review. Packages can proceed directly to checkout.
4. **Your questions, answered** — Payment timing · Play modes · Delivery estimates · Changes and support

### Actions & destinations

- **Configure a boost** → [G09](design/index.html#G09). Prototype actions are simulations only; guards must pass in the eventual application.
- **View package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ordering paused:** New orders are paused for this game. Existing orders remain available.
- **Archived game:** This game is no longer accepting orders. Browse available games.
- **Missing terms:** This service is not ready to purchase. Contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Game key: valorant. Do not hard-code season numbers, rank ladders, guaranteed win rates or publisher API claims. Future-game design specimen, not a launch activation.

**Journeys:** F28.

## G05 — Dota 2

**Area:** Explore · **Current route:** `/games/:slug` · **Layout:** game

Choose your next MMR milestone.

### Page anatomy & content

1. **Custom boost** — Region, starting and target MMR, party/solo requirements and hero/role preferences. All choices use the current published game configuration.
2. **Fixed packages** — Compare included scope, eligibility, price and availability before choosing.
3. **How it works** — Custom requests receive a final quote after review. Packages can proceed directly to checkout.
4. **Your questions, answered** — Payment timing · Play modes · Delivery estimates · Changes and support

### Actions & destinations

- **Configure a boost** → [G10](design/index.html#G10). Prototype actions are simulations only; guards must pass in the eventual application.
- **View package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ordering paused:** New orders are paused for this game. Existing orders remain available.
- **Archived game:** This game is no longer accepting orders. Browse available games.
- **Missing terms:** This service is not ready to purchase. Contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Game key: dota-2. Do not hard-code season numbers, rank ladders, guaranteed win rates or publisher API claims. Future-game design specimen, not a launch activation.

**Journeys:** F29.

## G06 — Wild Rift

**Area:** Explore · **Current route:** `/games/:slug` · **Layout:** game

A clearer path through the ranks.

### Page anatomy & content

1. **Custom boost** — Region, starting and target rank/marks, role and champion preferences. All choices use the current published game configuration.
2. **Fixed packages** — Compare included scope, eligibility, price and availability before choosing.
3. **How it works** — Custom requests receive a final quote after review. Packages can proceed directly to checkout.
4. **Your questions, answered** — Payment timing · Play modes · Delivery estimates · Changes and support

### Actions & destinations

- **Configure a boost** → [G11](design/index.html#G11). Prototype actions are simulations only; guards must pass in the eventual application.
- **View package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ordering paused:** New orders are paused for this game. Existing orders remain available.
- **Archived game:** This game is no longer accepting orders. Browse available games.
- **Missing terms:** This service is not ready to purchase. Contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Game key: wild-rift. Do not hard-code season numbers, rank ladders, guaranteed win rates or publisher API claims. Future-game design specimen, not a launch activation.

**Journeys:** F30.

## P04 — Build your Mobile Legends boost.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** configure

Start with your goal. You can adjust the details before sending your request.

### Page anatomy & content

1. **01 / Your goal** — Choose a valid progression from the current published rank ladder.
2. **02 / How you want to play** — Play together keeps control of your account with you. On-account play uses a separate secure handoff after payment.
3. **03 / Preferences** — Only show applicable options. Their effect appears in the estimate breakdown.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Region | select | SEA |  |
| Current rank | select | Epic II |  |
| Current stars | number | 3 | Validate against the selected rank. |
| Target rank | select | Legend V |  |
| Play mode | select | Play together |  |
| Requested win rate | number |  | Optional request, not a guarantee. Hide until an approved measurement definition exists. |
| Single hero | select | No preference |  |
| Hero | text |  | Appears only when Single hero is selected; searchable configured list. |
| Single role | select | No preference |  |
| Priority | select | Standard |  |

Allowed options: Region: SEA, EU, NA; Current rank: Epic II, Legend V; Target rank: Legend V, Mythic; Play mode: Play together, On my account; Single hero: No preference, Choose hero; Single role: No preference, Roam, Jungle, Mid, Gold, EXP; Priority: Standard, Priority if available.

### Actions & destinations

- **Review estimate** → [P05](design/index.html#P05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Choose a fixed package instead** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Invalid progression:** Choose a target above your current rank. Your other answers are kept.
- **Manual estimate:** This combination needs a staff quote. You can still send the request.
- **Price unavailable:** We could not calculate an estimate. Retry without losing your choices.
- **Catalog changed:** Options have changed. Review the highlighted selections before continuing.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Current and target selectors stack. Summary follows fields; compact bottom action only if it does not obscure keyboard, errors or footer. Full breakdown expands above the action.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Estimate summary: illustrative USD 48 base + USD 12 play-together option = USD 60. Not live pricing. Summary never labels an estimate payable.

**Journeys:** F01, F18.

## P05 — Review your request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** review

Estimated price — final quote after admin review.

### Page anatomy & content

1. **Your goal** — Mobile Legends · Epic II → Legend V · SEA · Play together
2. **Estimated breakdown** — Base boost: USD 48.00 · Play together: USD 12.00 · Estimated total: USD 60.00. Illustrative design values.
3. **What happens next** — Staff check your requirements and send a final quote. Nothing is charged by submitting this request.
4. **Information needed now** — Collect only fields marked for order submission. Game secrets never belong here.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Player identifier | text | Player#Example | Only if required at order submission. |
| Additional instructions | textarea |  | Optional. Do not include passwords or recovery codes. |
| Rank screenshot | file |  | Optional proof; scanning and rejection states apply. |
| I accept the current service terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Sign in to send request** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Send request · demo** → [P06](design/index.html#P06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit choices** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Signed in:** Send request is available after required fields and current terms are confirmed.
- **Terms changed:** Please review the updated terms before submitting.
- **Submit uncertain:** Checking whether your request was received. Do not create another request.
- **Validation error:** Review the marked fields. Your selections remain saved.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Anonymous submission returns through I01/I02 to this exact selection, revalidated. Preserve only nonsensitive draft answers.

**Journeys:** F01, F08.

## P06 — Your request is with our team.

**Area:** Configure · **Current route:** `/orders/:id` · **Layout:** success

Order PL-1042 · Awaiting review

### Page anatomy & content

1. **What happens next** — Staff review your selections. If they need anything else, you will see it here and in Messages.
2. **Your request** — Epic II → Legend V · Play together · Estimate USD 60.00 (design example).
3. **No payment due yet** — You will review and accept the final quote before paying.

### Actions & destinations

- **Open order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.
- **View all orders** → [C02](design/index.html#C02). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Needs information:** Please answer the staff question in your order to continue review.
- **Rejected:** This request cannot be fulfilled. See the reason and contact support.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01.

## P07 — Rank progress package.

**Area:** Configure · **Current route:** `/games/:slug/packages/:pack` · **Layout:** package

A defined goal, a fixed price and a clear next step.

### Page anatomy & content

1. **Included** — Example package: a configured rank milestone, progress updates and completion evidence.
2. **Before you buy** — Check region, starting rank and play-mode eligibility. Required fulfillment details follow payment.
3. **Price** — USD 48.00 · Design example only. Actual package amount and delivery estimate come from the published offer.
4. **Service terms** — Read the exact scope, exclusions, delivery estimate and cancellation/refund terms.

### Actions & destinations

- **Check eligibility** → [P08](design/index.html#P08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Build a custom boost** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Sold out:** No capacity is available. Ask for an availability alert.
- **Paused:** This package is not accepting new purchases.
- **Changed price:** The package changed. Review its current scope and price.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

No fabricated limited stock, crossed-out prices or most-popular badges. Choose package preserves package intent through sign-in.

**Journeys:** F02.

## P08 — Check your package details.

**Area:** Configure · **Current route:** `/games/:slug/packages/:pack` · **Layout:** form

Confirm the requirements before continuing to payment.

### Page anatomy & content

1. **Package** — Rank progress package · USD 48.00 (design example)
2. **Eligibility** — Show only this package’s required region, rank and play-mode fields.
3. **Before checkout** — Your purchase uses this exact scope and price. Fixed packages do not require a staff quote.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Region | select | SEA |  |
| Current rank | text | Epic II |  |
| Play mode | select | Play together |  |
| Coupon code | text |  | Apply once; show a separate validated discount line. |
| I accept the package and payment terms | checkbox |  |  |

Allowed options: Region: SEA, EU; Play mode: Play together, On my account.

### Actions & destinations

- **Continue to checkout** → [P09](design/index.html#P09). Prototype actions are simulations only; guards must pass in the eventual application.
- **Sign in first** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Ineligible:** This package does not match your starting rank. Choose a compatible package or custom request.
- **Last capacity taken:** This package just became unavailable. You have not been charged.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F02.

## P09 — Choose how to pay.

**Area:** Payments · **Current route:** `/orders/:id` · **Layout:** checkout

One direct cryptocurrency payment for this order.

### Page anatomy & content

1. **Order total** — USD 48.00 · Fixed package example. Show accepted quote amount for a custom order.
2. **Asset and network** — Both must match the invoice. Only merchant-enabled routes appear.
3. **Before creating an invoice** — Show approved fees, minimums, exchange-rate policy and invoice window. No wallet balance or top-up.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Asset and network | select | USDT · TRON (example) |  |
| I have reviewed the payment instructions and fees | checkbox |  |  |

Allowed options: Asset and network: USDT · TRON (example), BTC · Bitcoin (example).

### Actions & destinations

- **Create payment invoice · demo** → [P10](design/index.html#P10). Prototype actions are simulations only; guards must pass in the eventual application.
- **Return to order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Checkout paused:** New checkout is temporarily paused. Your order is unpaid; existing payment checks continue.
- **Below minimum:** This route cannot process the order amount. Choose another supported route.
- **Provider unavailable:** Your order is saved. Retry later; no payment has been recorded.
- **Creation uncertain:** Checking for an existing invoice. Do not create another payment attempt.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Specimen assets are not approved production routes. Never contact the payment provider from this prototype.

**Journeys:** F01, F02, F03, F04.

## P10 — Complete your payment.

**Area:** Payments · **Current route:** `/orders/:id` · **Layout:** invoice

Invoice waiting for payment · 14:32 remaining (static design example)

### Page anatomy & content

1. **Send exactly** — 48.000000 USDT · TRON. Illustrative only; do not send funds.
2. **Payment destination** — DEMO-ADDRESS-NOT-PAYABLE. Separate copy controls for amount, address and memo when required.
3. **Payment progress** — Waiting → Detected → Confirming → Verified. Leaving this page does not cancel checks.
4. **Need help?** — Open a payment case with the invoice reference. A screenshot does not prove payment.

### Actions & destinations

- **View confirming state** → [P11](design/index.html#P11). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open payment help** → [C08](design/index.html#C08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Return to order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Confirming:** Payment detected. Waiting for provider confirmation. Do not pay again.
- **Expired, no funds:** This invoice expired. Check eligibility before creating a new invoice.
- **Underpaid:** The received amount is short. Follow invoice-specific instructions if provided, or contact support.
- **Overpaid:** The order is paid once; the extra amount is under review. No site credit is created.
- **Late payment:** Funds arrived after expiry. Staff are checking availability and the payment.
- **Wrong network:** Contact support with the transaction reference. Recovery is not guaranteed.
- **Status unavailable:** We cannot refresh the status. Keep this invoice reference and avoid a second payment.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

QR area is a visibly non-payable placeholder. Real implementation only displays verified invoice payload. No paid-by-click or I-have-paid button.

**Journeys:** F01, F02, F03, F04.

## P11 — We’re confirming your payment.

**Area:** Payments · **Current route:** `/orders/:id` · **Layout:** success

Your order starts only after payment is verified.

### Page anatomy & content

1. **Payment received** — The provider detected a transfer; confirmations are still pending.
2. **You can leave this page** — Payment reconciliation continues. Check your order for the next action.
3. **Next step** — After verified payment, add any required fulfillment details or coordinate a session.

### Actions & destinations

- **See verified example** → [C04](design/index.html#C04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Return to order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Verified:** Payment verified. Your order is queued; follow the next-step card.
- **Failed:** This payment could not be completed. Review its evidence before another attempt.
- **Duplicate receipt:** Additional funds are under review. The order will only be fulfilled once.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01, F02, F03, F04.

## P12 — Find your next account.

**Area:** Marketplace · **Current route:** `/accounts` · **Layout:** market

Browse reviewed listings with clear details and a direct purchase flow.

### Page anatomy & content

1. **MLBB · Mythic account** — SEA · Rank and cosmetic attributes from the reviewed listing · USD 120.00 (example)
2. **MLBB · Legend account** — EU · View the listing’s included ownership handover · USD 85.00 (example)
3. **More games** — Game options appear only when listings exist. Preserve filters when opening and returning from a listing.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search accounts | search |  |  |
| Game | select | Mobile Legends |  |
| Region | select | All |  |
| Maximum price | number |  | Catalog currency, not a crypto amount. |
| Sort | select | Newest |  |

Allowed options: Game: All games, Mobile Legends; Region: All, SEA, EU; Sort: Newest, Price low to high, Price high to low.

### Actions & destinations

- **Inspect account** → [P13](design/index.html#P13). Prototype actions are simulations only; guards must pass in the eventual application.
- **Sell an account** → [S02](design/index.html#S02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Saved listings** → [C10](design/index.html#C10). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** No accounts match these filters. Clear a filter or request an availability alert.
- **Loading:** Keep applied filters visible with reserved card geometry.
- **Unavailable:** We could not load listings. Retry with your filters preserved.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Filters open in a labeled drawer with Apply/Clear and focus return. Show applied-filter chips above a single-column card list.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F03.

## P13 — Mythic account · Mobile Legends

**Area:** Marketplace · **Current route:** `/accounts/:id` · **Layout:** product

SEA · Listing AC-208 · Available

### Page anatomy & content

1. **Gallery** — Reviewed screenshots with keyboard-accessible previous/next and a dismissible full-screen view.
2. **Account details** — Rank, server, heroes, skins and other published attributes. Never expose email, login secrets or recovery evidence.
3. **What you receive** — Exact included transfer scope, required buyer steps and published delivery conditions.
4. **Price & terms** — USD 120.00 · Design example. Read delivery, cancellation and dispute terms before reserving.

### Actions & destinations

- **Reserve and continue** → [P14](design/index.html#P14). Prototype actions are simulations only; guards must pass in the eventual application.
- **Save listing** → [C10](design/index.html#C10). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask about this account** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Reserved:** Another buyer is checking out. Ask for an availability alert.
- **Sold:** This account has been sold. Browse similar available listings.
- **Gallery failure:** A screenshot could not load. Keep its caption and Retry control.
- **Listing changed:** Review the updated price and included transfer details.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

No seller identity or private submission evidence in public gallery. One unique inventory item, no quantity selector.

**Journeys:** F03, F06, F18.

## P14 — Review your account purchase.

**Area:** Marketplace · **Current route:** `/accounts/:id` · **Layout:** review

A reservation is confirmed only when the server accepts it.

### Page anatomy & content

1. **Your account** — AC-208 · Mythic · SEA · USD 120.00 (illustrative)
2. **Delivery** — After verified payment, staff guide the secure transfer in your order.
3. **Reservation** — Display the actual deadline once reserved. Detected funds must be reconciled before stock release.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| I reviewed the listing, delivery and sale terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Continue to payment** → [P09](design/index.html#P09). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to listing** → [P13](design/index.html#P13). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Reservation conflict:** Another buyer reserved this account first. No invoice was created.
- **Reservation expired:** Check availability again before attempting another payment.
- **Paid after release:** Staff are reviewing your payment; this does not reclaim an account sold to someone else.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F03.

## P15 — What customers say.

**Area:** Explore · **Current route:** `/games/:slug/reviews` · **Layout:** list

Reviews linked to eligible completed orders.

### Page anatomy & content

1. **Review overview** — Show actual rating distribution and count; omit the aggregate when no published reviews exist.
2. **Verified order review** — Example review: “Clear updates throughout the order.” · Example customer alias · Rating 4/5.
3. **How reviews work** — Public moderation reason categories are transparent; refunded-order labels do not disappear.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Rating | select | All |  |

Allowed options: Rating: All, 5, 4, 3, 2, 1.

### Actions & destinations

- **Configure a boost** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.
- **My reviews** → [C15](design/index.html#C15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No reviews:** No published reviews yet. Be the first after an eligible order.
- **Filtered empty:** No reviews match this rating filter.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F19.

## P16 — How PLAYORA works.

**Area:** Explore · **Current route:** `/terms` · **Layout:** policy

Clear choices before you place an order.

### Page anatomy & content

1. **Custom boosting** — Your estimate is reviewed by staff. Accept the final quote before paying.
2. **Fixed packages** — Check scope and eligibility, then proceed directly to payment.
3. **Account buying and selling** — Staff review submissions and oversee documented transfers. Sellers accept a specific offer.
4. **Payments & help** — Direct crypto checkout. Track confirmed funds, request help or a refund review in your order.
5. **Terms and policies** — Version, effective date, service terms, payment/refund rules, account transfer policy, privacy and contact details.

### Actions & destinations

- **Read policy detail** → [P17](design/index.html#P17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Start a request** → [P02](design/index.html#P02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Contact support** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Policy not published:** This policy is not available yet. Do not enable the related purchase action.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Proposed /how-it-works information architecture; current /terms mapping retained until implementation decisions. This copy is product explanation, not approved legal policy.

**Journeys:** F01.

## P17 — Service terms & privacy.

**Area:** Explore · **Current route:** `/terms` · **Layout:** policy

Review the policy that applies to your order.

### Page anatomy & content

1. **Policy navigation** — Service terms · Payment/refund rules · Account sale/delivery · Privacy · Contact
2. **Version information** — Display title, effective date, revision and a link to the current published version.
3. **Policy content** — Readable 68-character measure; headings, in-page contents, print and accessible links. Owner-approved content required.
4. **Your agreement** — Historical accepted versions remain readable from their order; clearly distinguish current from accepted terms.

### Actions & destinations

- **Privacy controls** → [C18](design/index.html#C18). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask a question** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Historical version:** You are reading a historical agreement. Link to the current version without replacing this record.
- **Unavailable:** This policy could not load. Retry; purchase acceptance remains blocked.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F23.

## I01 — Welcome to PLAYORA.

**Area:** Identity · **Current route:** `/login` · **Layout:** auth

Sign in or create your account. No password needed.

### Page anatomy & content

1. **Continue with Google** — Use the approved Google sign-in flow; cancellation returns here with your draft preserved.
2. **Or use your email** — We will send a one-time code. Enter it on the next screen.
3. **Your request is saved** — Show this context only when returning to a nonsensitive saved draft.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Email address | email |  | Use email autocomplete. Do not disclose whether the address already has an account. |

Allowed options: .

### Actions & destinations

- **Continue with Google · demo** → [I02](design/index.html#I02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Send email code · demo** → [I02](design/index.html#I02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to request** → [P05](design/index.html#P05). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Invalid email:** Enter an email address in the format name@example.com.
- **Rate limited:** Too many attempts. Try again after the displayed server-provided delay.
- **Google cancelled:** Sign-in was cancelled. Continue with Google or use email.
- **Google unavailable:** Google sign-in is unavailable. You can use email instead.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01, F02, F03, F08, F09, F11, F25, F26, F27, F28, F29, F30.

## I02 — Check your email.

**Area:** Identity · **Current route:** `/login` · **Layout:** auth

Enter the code sent to p••••@example.com.

### Page anatomy & content

1. **One-time code** — One field with numeric input mode, paste and autofill support. Do not split into inaccessible boxes.
2. **Resend code** — Show the actual cooldown. A new code replaces the previous one.
3. **First visit** — Request acceptance of the published terms only for new accounts or when a fresh agreement is required.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Email code | text |  | Paste is allowed; server controls length and expiry. |
| I accept the current terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Verify · demo** → [P05](design/index.html#P05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Staff verification** → [I03](design/index.html#I03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Change email** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Wrong code:** That code did not work. Check it and try again.
- **Expired:** This code has expired. Request a new one.
- **Already used:** This code was already used. Continue if signed in, or request a new code.
- **Too many attempts:** Code verification is temporarily unavailable. Show the allowed recovery action.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Context-specific return: order draft, saved listing, seller draft, or account overview. Never accept arbitrary external return URLs.

**Journeys:** F01, F02, F03, F08, F09, F10, F11, F26, F27, F28, F29, F30.

## I03 — Verify your staff sign-in.

**Area:** Identity · **Current route:** `/login` · **Layout:** auth

Your authenticator code is required every time you sign in as staff.

### Page anatomy & content

1. **Second verification** — Enter an authenticator-app code after Google or email verification.
2. **Recovery option** — A single-use recovery code can replace the authenticator code. It does not replace first-factor verification.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Authenticator code | text |  | Paste allowed. Never store or include codes in analytics. |

Allowed options: .

### Actions & destinations

- **Verify staff session · demo** → [A01](design/index.html#A01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Use recovery code** → [I05](design/index.html#I05). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Invalid code:** The code could not be verified. Check your authenticator and try again.
- **Session expired:** Sign in with Google or email again before continuing.
- **Enrollment required:** Finish authenticator setup before entering the workspace.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F09.

## I04 — Set up your authenticator.

**Area:** Identity · **Current route:** `/account/security` · **Layout:** auth

Protect your staff access before entering the workspace.

### Page anatomy & content

1. **Connect an authenticator** — QR and manual setup key are private. Mask by default after enrollment; no real secret in designs.
2. **Verify setup** — Enter a code from the app to confirm enrollment.
3. **Save recovery codes** — Show only after confirmation; Download and Copy require deliberate actions and clear screen privacy advice.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Authenticator code | text |  |  |
| I saved my recovery codes securely | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Confirm enrollment · demo** → [I05](design/index.html#I05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to security** → [C17](design/index.html#C17). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Verification failed:** Setup is not complete. Check the code and device time.
- **Interrupted setup:** Restart setup; do not present unconfirmed codes as active.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F09.

## I05 — Recover staff access.

**Area:** Identity · **Current route:** `/login` · **Layout:** auth

Use one unused recovery code after verifying Google or email.

### Page anatomy & content

1. **Recovery code** — Accept paste; a successful code is consumed once.
2. **No codes available** — Contact the owner for a reviewed recovery. Do not offer a public role reset.
3. **After recovery** — Review authenticator setup and remaining codes in Security.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Recovery code | text |  |  |

Allowed options: .

### Actions & destinations

- **Verify recovery · demo** → [C17](design/index.html#C17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Use authenticator instead** → [I03](design/index.html#I03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Used or invalid:** This recovery code could not be used. Try another unused code.
- **Owner review:** Recovery is pending owner review. Staff access remains unavailable.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F09.

## I06 — Confirm it’s you.

**Area:** Identity · **Current route:** `/account/security` · **Layout:** auth

This action requires recent Google/email and authenticator verification.

### Page anatomy & content

1. **Pending action** — Show the exact action, affected record and reason. Preserve nonsensitive draft data.
2. **Two checks** — First reverify Google/email, then authenticator or unused recovery code.
3. **Return safely** — Revalidate record version and permissions before executing the original action.

### Actions & destinations

- **Continue verification** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Cancel and return** → [A01](design/index.html#A01). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Action changed:** This record changed while you were verifying. Review the new details before confirming.
- **Access revoked:** Your permissions no longer allow this action.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Reuse for refunds, seller payouts, staff permissions, private credentials, policy publication and other server-required sensitive actions.

**Journeys:** F05, F17, F21, F22, F23.

## C01 — Good to see you, Player.

**Area:** Customer · **Current route:** `/account` · **Layout:** dashboard

Your next steps, all in one place.

### Page anatomy & content

1. **Needs your attention** — Review quote for PL-1042 · One clear next action.
2. **Active orders** — Game, goal, order state, payment state, next step and last meaningful update.
3. **Messages** — Unread conversations first; show a short safe preview, no credentials.
4. **Your activity** — Recent completed orders and seller submissions. No spending balance.

### Actions & destinations

- **Review quote** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.
- **All orders** → [C02](design/index.html#C02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Messages** → [C11](design/index.html#C11). Prototype actions are simulations only; guards must pass in the eventual application.
- **My sales** → [S01](design/index.html#S01). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **First visit:** Ready for your next goal? Explore games or browse accounts.
- **Partial failure:** Orders could not load. Keep the other modules usable with a local retry.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F10, F25.

## C02 — Your orders.

**Area:** Customer · **Current route:** `/orders` · **Layout:** list

Find the next action without opening every order.

### Page anatomy & content

1. **Order list** — Compact rows with game thumbnail, goal, state, payment label, next action and updated time.
2. **Filter & return** — Search and filters persist in the URL and survive Back. Load more retains scroll position.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search orders | search |  |  |
| Status | select | All |  |

Allowed options: Status: All, Needs your action, Active, Completed, Cancelled.

### Table/card fields

Order / goal → Status → Payment → Next action. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Open order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Start a boost** → [P02](design/index.html#P02). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** No orders yet. Explore games to get started.
- **No match:** No orders match these filters. Clear filters.
- **Load failed:** Your orders could not load. Retry.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01.

## C03 — Your quote is ready.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** order

PL-1042 · Mobile Legends · Epic II → Legend V

### Page anatomy & content

1. **Next step** — Review quote revision 2, including scope and price changes. Accept only the current valid revision.
2. **Final quote** — USD 60.00 (example) · Play together · SEA. Expiry and delivery expectation shown separately.
3. **Order workspace** — Overview · Messages · Progress & proof · Payment · Help. Tabs deep-link and preserve context.
4. **Activity** — Submitted → Staff reviewed → Quote issued. Internal notes never appear here.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| I accept this quote and its linked terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Accept quote & choose payment · demo** → [P09](design/index.html#P09). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask about quote** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **Revise request** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.
- **View progress** → [C05](design/index.html#C05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Payment history** → [C07](design/index.html#C07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Awaiting review:** We are reviewing your request. No payment is due.
- **Needs information:** Staff need more information. Open the highlighted question.
- **Quote superseded:** A newer quote is available. Review it before acceptance.
- **Quote expired:** This quote expired. Ask staff for a renewed quote.
- **Cancelled:** This order is cancelled. Any payment exception remains tracked separately.
- **Rejected:** Show the customer-visible reason and support entry point.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Accept button includes exact amount in production; never assumes consent from navigation. Quote history uses collapsible immutable revisions.

**Journeys:** F01, F15, F20.

## C04 — Let’s get your order ready.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** form

Payment verified · Fulfillment details needed

### Page anatomy & content

1. **Play together** — Collect player tag, server and scheduling preferences; no account password.
2. **On-account mode** — Use a separate secure handoff panel with recent verification. Never put game secrets in chat or local drafts.
3. **Ready to start** — Show missing prerequisites; only staff can move eligible work into progress.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Player tag | text | Player#Example |  |
| Region/server | text | SEA |  |
| Preferred time zone | text | Asia/Tehran |  |
| Coordination notes | textarea |  | No passwords or recovery codes. |

Allowed options: .

### Actions & destinations

- **Save details · demo** → [C05](design/index.html#C05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Choose a session** → [C06](design/index.html#C06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Message the team** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **File scanning:** Your file is being checked. Continue once it is approved.
- **Credential access expired:** Verify again to open the secure handoff.
- **Validation failed:** Review the marked fields; sensitive values are not restored from local storage.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Separate on-account substate includes masked credential input, consent to authorized access, submitted timestamp, replace/revoke and audit notice. No secret sample values.

**Journeys:** F01, F02.

## C05 — Your boost is in progress.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** order

PL-1042 · Play together · Payment verified

### Page anatomy & content

1. **Current progress** — Last staff update: session completed; proof awaiting review. Progress is staff-reported, not fabricated live game telemetry.
2. **Timeline & proof** — Chronological progress, scanned screenshot cards, captions and staff alias. Filter proof without losing timeline.
3. **Order team** — Customer-visible booster alias and staff channel. Private employee details remain hidden.
4. **Completion** — Admin-approved result, evidence and next steps; review eligibility and support window come from policy.

### Actions & destinations

- **Open messages** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **View session** → [C06](design/index.html#C06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Report an issue** → [C08](design/index.html#C08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Write a review** → [C16](design/index.html#C16). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **On hold:** Show the reason, who must act and the next step. Do not display fake progress.
- **Completion under review:** Your booster submitted evidence; staff are reviewing it.
- **Completed:** Show final scope and completion evidence. Keep payment/refund states separate.
- **Evidence unavailable:** This file cannot be opened. Show a retry or contact action.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01, F02, F05, F12, F19.

## C06 — Plan your play session.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** calendar

Times are shown in your selected time zone.

### Page anatomy & content

1. **Upcoming session** — Proposed: 24 September, 19:00–20:00 Asia/Tehran (design sample). Show the corresponding UTC offset.
2. **Availability** — Available slots, duration and owner. Proposed, confirmed, declined and cancelled sessions look distinct.
3. **Changes** — Confirm/reschedule/cancel only permitted states. Keep previous proposals in history.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Time zone | text | Asia/Tehran |  |
| Date | date | 2026-09-24 |  |
| Start time | time | 19:00 |  |
| Message | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Confirm session · demo** → [C05](design/index.html#C05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Propose another time** → [C06](design/index.html#C06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open messages** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Conflict:** That time was just taken. Choose another available slot.
- **DST change:** The UTC offset changes on this date. Confirm the displayed local time.
- **No slots:** No matching slots yet. Send your availability to the team.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Agenda list replaces the dense week grid. Date and timezone remain visible above slots; action follows the selected proposal.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01, F13.

## C07 — Payment & receipts.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** list

Financial history for this order, separate from service progress.

### Page anatomy & content

1. **Accepted total** — Immutable contract total and accepted revision.
2. **Payment attempts** — Expected and received crypto, asset/network, invoice state, expiry and provider reference. No totals across different assets.
3. **Refund records** — Requested → Approved/rejected → Processing → Confirmed/failed. Receipt only when evidence confirms transfer.

### Table/card fields

Attempt → Asset / network → Status → Received. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Open current invoice** → [P10](design/index.html#P10). Prototype actions are simulations only; guards must pass in the eventual application.
- **Request payment help** → [C08](design/index.html#C08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No payment:** No invoice has been created for this order.
- **Refund processing:** Refund approved; transfer confirmation is still pending.
- **Refund failed:** The outgoing transfer needs review. Do not create a duplicate request.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F04, F05.

## C08 — Get help with your order.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** form

Describe what happened. We’ll keep the case linked to your order.

### Page anatomy & content

1. **Choose a reason** — Cancellation request, delivery problem, payment issue or dispute. Show policy eligibility and deadline without inventing them.
2. **Evidence** — Add relevant messages and safe attachments; scanning status appears before submission.
3. **What happens next** — Staff review the request. Submission does not cancel the order or guarantee a refund.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Reason | select | Payment issue |  |
| What happened? | textarea |  | Required; explain the issue and requested resolution. |
| Evidence | file |  |  |

Allowed options: Reason: Payment issue, Cancellation request, Delivery problem, Dispute.

### Actions & destinations

- **Submit case · demo** → [C09](design/index.html#C09). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Outside policy window:** Explain the published eligibility rule and offer ordinary support.
- **Case already open:** Open the existing case instead of submitting a duplicate.
- **Upload rejected:** Remove or replace this file. Keep your written description.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F04, F05.

## C09 — Your case is under review.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** order

Case CASE-12 · Payment issue

### Page anatomy & content

1. **Status & next action** — Staff are reviewing your request. Follow-up questions appear here.
2. **Case timeline** — Requested, evidence added, decision, appeal where allowed and outgoing payment evidence.
3. **Refund recipient** — Collect exact asset/network/address and memo only when needed. Verify changes; never infer a safe address from the sending wallet.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Recipient network | text | Design example only |  |
| Recipient address | text |  | Never use real financial details in this prototype. |
| Memo/tag if required | text |  |  |

Allowed options: .

### Actions & destinations

- **Message about this case** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **View payment record** → [C07](design/index.html#C07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Confirm recipient · demo** → [C09](design/index.html#C09). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Information needed:** Provide the requested information to continue review.
- **Approved:** Show approved amount, fees and exchange-rate basis; money has not yet been sent.
- **Rejected:** Show the reason and eligible appeal action.
- **Refund confirmed:** Show verified receipt, asset/network and amount.
- **Recipient changed:** Fresh verification is required before execution.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F04, F05.

## C10 — Saved for later.

**Area:** Customer · **Current route:** `/favorites` · **Layout:** market

Revisit a package or account without losing your place.

### Page anatomy & content

1. **Saved packages** — Current price and availability; reopening a historical package revalidates its version.
2. **Saved accounts** — Available, reserved, sold and archived labels stay visible.
3. **Reorder** — Start a fresh request with current options and price. Historical terms and payment are not reused.

### Actions & destinations

- **Open saved package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open saved account** → [P13](design/index.html#P13). Prototype actions are simulations only; guards must pass in the eventual application.
- **Reorder a boost** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** Save a package or account to find it here later.
- **Removed:** Removed from saved items. Offer Undo only if the backend supports it.
- **Unavailable item:** This item is no longer available. Browse alternatives.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F18.

## C11 — Messages.

**Area:** Customer · **Current route:** `/support` · **Layout:** inbox

Your conversations with the PLAYORA team.

### Page anatomy & content

1. **Conversation list** — Unread marker, subject, linked order/submission, safe preview and last-message time.
2. **Start a conversation** — Ask before ordering or get help with an existing order.
3. **Message access** — Customer–staff, seller–staff and assigned booster conversations have distinct audiences.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search conversations | search |  |  |
| Show | select | All |  |

Allowed options: Show: All, Unread, Order conversations, Sales, General support.

### Actions & destinations

- **Open conversation** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **New conversation** → [C13](design/index.html#C13). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** No conversations yet. Ask us a question.
- **Offline:** Messages cannot refresh. Existing content remains readable.
- **Unauthorized:** This conversation is not available to your account.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F11.

## C12 — Order PL-1042 · Messages

**Area:** Customer · **Current route:** `/support/:id` · **Layout:** chat

You and PLAYORA support · Customer-visible conversation

### Page anatomy & content

1. **Conversation context** — Epic II → Legend V · Quote ready · Open order
2. **Messages** — Time-grouped messages with author alias and sent/failed status. Preserve reading position when older messages load.
3. **Composer** — Multiline draft, attachment, clear Send button. Enter sends only according to preference; Shift+Enter adds a line.
4. **Reader controls** — New messages button while reading history; never force scroll. Reconnect preserves an unsent draft.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Message | textarea |  | Do not share login credentials here. |

Allowed options: .

### Actions & destinations

- **Open order** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Send demo message** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to inbox** → [C11](design/index.html#C11). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Sending:** Sending… Do not duplicate the message on retry.
- **Send failed:** Message not sent. Retry or edit the same draft.
- **Reconnecting:** Reconnecting. Your unsent message is kept.
- **Attachment scanning:** File is being checked before it can be shared.
- **Attachment rejected:** The file could not be shared. Remove or replace it.
- **Access lost:** This conversation is no longer available. Clear its private content.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

List and thread are separate pages. Thread fills available height; composer stays above the keyboard. Back returns to the same list position. Context collapses to one line.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F11.

## C13 — How can we help?

**Area:** Customer · **Current route:** `/support` · **Layout:** form

Choose a topic and send your question.

### Page anatomy & content

1. **Topic** — Pre-sales, order, account purchase/sale, payment or general support.
2. **Linked item** — Prefill a package, listing, order or submission from the entry point. Do not expose items belonging to others.
3. **Reply location** — You will find the reply in Messages and according to your notification preferences.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Subject | text |  |  |
| Topic | select | Pre-sales |  |
| Message | textarea |  |  |
| Attachment | file |  |  |

Allowed options: Topic: Pre-sales, Order, Account sale, Payment, General.

### Actions & destinations

- **Start conversation · demo** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **Sign in to continue** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Already linked:** There is already a conversation for this order. Open it to keep context together.
- **Could not send:** Your message was not sent. Keep the draft and retry.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F11.

## C14 — Notifications.

**Area:** Customer · **Current route:** `/notifications` · **Layout:** list

Updates that take you to the next action.

### Page anatomy & content

1. **Needs your attention** — Quote ready, information requested, message received, booking changed and case decision.
2. **Activity** — Group by date. Read state is separate from completing the action.
3. **Preferences** — Choose optional email updates; essential service messages remain explained.

### Table/card fields

Update → Received → State. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Open quote update** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open message** → [C12](design/index.html#C12). Prototype actions are simulations only; guards must pass in the eventual application.
- **Notification preferences** → [C19](design/index.html#C19). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** You are all caught up.
- **Target unavailable:** This item is no longer available. Return to notifications.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F20.

## C15 — Your reviews.

**Area:** Customer · **Current route:** `/reviews` · **Layout:** list

Review completed orders and track moderation.

### Page anatomy & content

1. **Eligible orders** — Only orders that meet the published review rules offer a review action.
2. **Submitted reviews** — Rating, text, game/order, published or pending state, edited date and moderation explanation.

### Actions & destinations

- **Write a review** → [C16](design/index.html#C16). Prototype actions are simulations only; guards must pass in the eventual application.
- **View public reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No eligible order:** Reviews become available after an eligible completed order.
- **Pending moderation:** Your review is waiting for moderation.
- **Hidden:** Show the moderation reason and allowed correction or appeal path.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F19.

## C16 — Review your experience.

**Area:** Customer · **Current route:** `/reviews/:id` · **Layout:** form

Order PL-1038 · Verified purchase

### Page anatomy & content

1. **Your rating** — Accessible radio group from 1 to 5; labels include the meaning, not only star icons.
2. **Your experience** — Focus on the service. Warn against including account credentials or personal details.
3. **Public preview** — Show alias, game, rating and text before submission. Explain moderation and eligibility.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Rating | select | 4 |  |
| Review | textarea |  |  |
| I understand this review is public | checkbox |  |  |

Allowed options: Rating: 1, 2, 3, 4, 5.

### Actions & destinations

- **Submit review · demo** → [C15](design/index.html#C15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Cancel** → [C15](design/index.html#C15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Already reviewed:** Open your existing review rather than creating a duplicate.
- **Eligibility changed:** This order is not currently eligible. Show the policy reason.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F01, F19.

## C17 — Security & sign-in.

**Area:** Customer · **Current route:** `/account/security` · **Layout:** form

Manage access to your PLAYORA account.

### Page anatomy & content

1. **Sign-in methods** — Verified email and connected Google identity; linking requires proof of both identities.
2. **Active sessions** — Current session, created time and last active time. Revoke one or all with explicit confirmation.
3. **Staff verification** — Authenticator enrollment, recovery codes and reviewed recovery status. Every staff sign-in requires MFA.

### Table/card fields

Session → Last active → Action. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Set up authenticator** → [I04](design/index.html#I04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Change verified email** → [I07](design/index.html#I07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Review sensitive action** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Session revoked:** This session ended. Sign in again.
- **Google link conflict:** That identity cannot be linked. Do not merge accounts by matching email text.
- **Revoke all confirmation:** You will be signed out on every device, including this one.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F09, F10.

## I07 — Update your sign-in email.

**Area:** Identity · **Current route:** `/account/security` · **Layout:** form

Verify your current access and the new email address.

### Page anatomy & content

1. **Current verification** — Verify the existing identity first. Staff also need recent authenticator verification.
2. **New email** — Send and verify a code for the new address. Do not remove the old method before successful completion.
3. **Confirmation** — Show the verified address and session-revocation outcome. Conflicts remain private.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| New email address | email |  |  |

Allowed options: .

### Actions & destinations

- **Send verification · demo** → [I02](design/index.html#I02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Cancel** → [C17](design/index.html#C17). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Already linked:** This email cannot be used. Contact support if you need help.
- **Verification expired:** Verify your current identity again; the email has not changed.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F10.

## C18 — Your data & privacy.

**Area:** Customer · **Current route:** `/privacy` · **Layout:** form

Export your information and manage a deletion request.

### Page anatomy & content

1. **Download your data** — Choose a category. Clearly show page/cursor continuation and expiration of private downloads.
2. **Request deletion** — Disabled until the owner publishes and enables retention rules. Display the active policy before confirmation.
3. **Request tracking** — Review, holds, live data erasure, pending file purges, retained evidence and backups are distinct states.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Export category | select | Profile |  |
| I reviewed the retention policy and deletion effects | checkbox |  |  |

Allowed options: Export category: Profile, Orders, Messages, Payments, Submissions.

### Actions & destinations

- **View retention terms** → [P17](design/index.html#P17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Preview deletion request** → [C18](design/index.html#C18). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to account** → [C01](design/index.html#C01). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Deletion unavailable:** Account deletion requests are not enabled yet. Contact support.
- **On hold:** Active orders, disputes or policy obligations prevent erasure. Explain the user-visible hold.
- **Pending file purge:** Live profile data is erased; file cleanup is still pending.
- **Completed with retention:** Show what was erased and what evidence/backups remain under the policy.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Cancellation is possible only before irreversible erasure begins. Confirmation names the account and consequences; never promises instant complete deletion.

**Journeys:** F21.

## C19 — Preferences.

**Area:** Customer · **Current route:** `/account/preferences` · **Layout:** form

Keep the experience comfortable for you.

### Page anatomy & content

1. **Notifications** — Separate service updates from optional availability emails. Consent is never prechecked.
2. **Appearance & motion** — System/reduced motion; sound starts off. Explicit sound toggle and volume; no effects on payment or security actions.
3. **Language & time** — English launch. Timezone affects scheduling display, not stored booking time.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Email service updates | checkbox |  |  |
| Optional availability emails | checkbox |  |  |
| Motion | select | Follow system |  |
| Sound effects | select | Off |  |
| Time zone | text | Asia/Tehran |  |

Allowed options: Motion: Follow system, Reduced; Sound effects: Off, On.

### Actions & destinations

- **Save preferences · demo** → [C01](design/index.html#C01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Availability alerts** → [C20](design/index.html#C20). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Save failed:** Preferences were not saved. Keep the selected values.
- **Device limitation:** This browser cannot persist the preference. Keep it for this visit.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F20.

## C20 — Availability alerts.

**Area:** Customer · **Current route:** `/availability` · **Layout:** list

Choose exactly what you want to hear about.

### Page anatomy & content

1. **Subscriptions** — Game/service/listing target, channel, created date and enabled state.
2. **New alert** — Explicit consent with a clear target. Never imply that subscribing reserves stock.
3. **Unsubscribe** — One action affects only the named alert; confirm the result with resubscribe when supported.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Target | text | Mobile Legends package |  |
| Email me when this is available | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Browse games** → [P02](design/index.html#P02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Unsubscribe example** → [C21](design/index.html#C21). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No alerts:** No availability alerts are active.
- **Unavailable target:** This item is archived. You can remove its alert.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F18, F20.

## C21 — Availability email preference.

**Area:** Customer · **Current route:** `/availability/unsubscribe` · **Layout:** success

Manage the alert linked from your email.

### Page anatomy & content

1. **Confirm target** — Identify the subscription without exposing personal account details.
2. **Unsubscribe result** — You will no longer receive this availability alert. Other service messages are unaffected.

### Actions & destinations

- **Manage all alerts** → [C20](design/index.html#C20). Prototype actions are simulations only; guards must pass in the eventual application.
- **Browse games** → [P02](design/index.html#P02). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Invalid or expired link:** This link cannot be used. Sign in to manage alerts.
- **Already unsubscribed:** This alert is already turned off.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F18.

## C22 — Profile settings.

**Area:** Customer · **Current route:** `/account/settings` · **Layout:** form

The name your PLAYORA team sees.

### Page anatomy & content

1. **Profile** — Display name and avatar where supported. Keep verified email in Security.
2. **Public identity** — Explain where an alias appears in reviews; do not expose the private email.
3. **Saved changes** — Show local success beside the action. Failed saves preserve the form.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Display name | text | Player |  |

Allowed options: .

### Actions & destinations

- **Save profile · demo** → [C01](design/index.html#C01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Security** → [C17](design/index.html#C17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Preferences** → [C19](design/index.html#C19). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Invalid name:** Use the published length and content rules.
- **Save conflict:** This profile changed elsewhere. Reload current values before replacing them.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F10.

## S01 — Your account sales.

**Area:** Seller · **Current route:** `/sell` · **Layout:** list

Track each submission, offer, transfer and direct payout separately.

### Page anatomy & content

1. **Needs your attention** — Clarifications and unaccepted offers appear before completed history.
2. **Sales history** — Submission review state, selected commercial model, listing state and payout state have separate labels.

### Table/card fields

Submission → Review → Arrangement → Payout. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Submit an account** → [S02](design/index.html#S02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open submission** → [S03](design/index.html#S03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** Have an account to sell? Submit it for staff review.
- **Withdrawn:** This submission was withdrawn before acceptance. Historical records remain available.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06.

## S02 — Tell us about your account.

**Area:** Seller · **Current route:** `/sell/new` · **Layout:** form

Save a private draft before submitting for review.

### Page anatomy & content

1. **01 / Account details** — Game-specific attributes use the configured seller intake form. Collect region, rank, heroes/skins as applicable.
2. **02 / Ownership & evidence** — Ask for the configured ownership declarations and private proof. Sanitize files before public reuse.
3. **03 / Review & submit** — Preview all nonsecret answers and policy acceptance. Credentials are collected later through secure handoff.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Game | select | Mobile Legends |  |
| Server/region | text | SEA |  |
| Rank | text | Mythic |  |
| Account highlights | textarea |  |  |
| Ownership evidence | file |  |  |
| I confirm I control this account and accept the submission terms | checkbox |  |  |

Allowed options: Game: Mobile Legends.

### Actions & destinations

- **Submit for review · demo** → [S03](design/index.html#S03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Save draft · demo** → [S01](design/index.html#S01). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Draft incomplete:** Your draft is saved. Complete the highlighted fields to submit.
- **Proof scanning:** Wait until the evidence files pass checks.
- **Intake changed:** Review newly required questions before submitting.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07.

## S03 — Submission SA-204.

**Area:** Seller · **Current route:** `/sell/:id` · **Layout:** order

Mobile Legends · Awaiting review

### Page anatomy & content

1. **Review status** — Show the current stage and precisely what the seller needs to do next.
2. **Private evidence** — Staff-only ownership material, upload status and correction requests.
3. **Conversation** — Seller–staff messages only; buyer identity and buyer conversation are never linked here.
4. **Commercial history** — Offers and their immutable accepted terms, superseded revisions and expiry.

### Actions & destinations

- **Review offer** → [S04](design/index.html#S04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Message about submission** → [S07](design/index.html#S07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Start secure transfer** → [S05](design/index.html#S05). Prototype actions are simulations only; guards must pass in the eventual application.
- **View payout** → [S06](design/index.html#S06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **More information needed:** Show each requested clarification with an answer/upload control.
- **Rejected:** Show the customer-visible reason and allowed next action.
- **Withdraw confirmation:** Available before acceptance. Explain what is withdrawn and retain history.
- **Accepted contract:** Ordinary withdrawal is unavailable. Contact staff under the agreed terms.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07.

## S04 — Review your sale offer.

**Area:** Seller · **Current route:** `/sell/:id` · **Layout:** review

Read the exact arrangement before accepting.

### Page anatomy & content

1. **Arrangement** — Consignment: payment becomes due only after the defined buyer delivery/dispute conditions. Buy first: payment becomes due after verified transfer to PLAYORA, before resale.
2. **Your proceeds** — Show agreed amount or commission basis, currency, fees, asset/network, payout deadline and recipient requirements.
3. **Responsibilities** — Transfer criteria, unsold withdrawal, cancellation, dispute handling and buyer-refund effects.
4. **Offer version** — Revision 2 · expiry date/time · comparison against the previous offer. No invented commercial amounts in production.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| I accept this arrangement and its complete terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Accept offer · demo** → [S05](design/index.html#S05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask about terms** → [S07](design/index.html#S07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to submission** → [S03](design/index.html#S03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Buy-first offer:** The offer explicitly buys the account before resale; show its purchase price and transfer-triggered obligation.
- **Expired offer:** Ask for a new offer. Acceptance is unavailable.
- **Superseded:** Review the new revision; the earlier version cannot be accepted.
- **Accepted:** Show the accepted immutable terms and acceptance time.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07.

## S05 — Secure account handover.

**Area:** Seller · **Current route:** `/sell/:id` · **Layout:** form

Complete only the steps required by your accepted offer.

### Page anatomy & content

1. **Transfer checklist** — Each configured ownership/control task: pending, submitted, staff verified or needs correction.
2. **Private handoff** — A recent-verification panel for secrets. Do not expose submitted credentials or copy them into messages.
3. **Review** — Staff verify actual control before listing/payout eligibility. A checked box alone is not transfer evidence.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Transfer note | textarea |  | Do not enter account secrets here. |
| Transfer evidence | file |  |  |

Allowed options: .

### Actions & destinations

- **Submit handover · demo** → [S03](design/index.html#S03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Message staff** → [S07](design/index.html#S07). Prototype actions are simulations only; guards must pass in the eventual application.
- **View payout status** → [S06](design/index.html#S06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Verification required:** Confirm your identity before opening the private handoff.
- **Correction needed:** Show exactly which nonsecret requirement needs attention.
- **Verified:** Ownership handover verified under the accepted offer.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Secure credential form is an isolated subview: masked secret inputs, no browser draft persistence, submit/replace, access audience and audit disclosure.

**Journeys:** F06, F07.

## S06 — Your direct payout.

**Area:** Seller · **Current route:** `/sell/:id` · **Layout:** order

One payout obligation for the accepted sale contract.

### Page anatomy & content

1. **When payment is due** — Consignment: show unmet buyer-delivery/hold conditions. Buy first: show transfer verification and the agreed deadline.
2. **Recipient** — Exact asset/network/address/memo, verified status and a deliberate change request.
3. **Transfer record** — Not due → Approval pending → Processing → Confirmed, or Failed/cancelled. Provider acceptance is not completion.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Asset/network | text | Example route |  |
| Recipient address | text |  | Use no real address in the design prototype. |
| Memo/tag | text |  |  |

Allowed options: .

### Actions & destinations

- **Confirm recipient · demo** → [S06](design/index.html#S06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Ask about payout** → [S07](design/index.html#S07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to sale** → [S03](design/index.html#S03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Not due:** Explain the remaining contract trigger without presenting a withdrawable balance.
- **Blocked by case:** A related case must be resolved before this payout can proceed.
- **Processing:** The transfer is being checked. Do not submit another request.
- **Confirmed:** Show verified transaction evidence, exact asset/network and amount.
- **Failed:** Staff must reconcile the failed or uncertain transfer.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07.

## B01 — Your next session.

**Area:** Booster · **Current route:** `/booster` · **Layout:** dashboard

Focus on assigned work and the next customer action.

### Page anatomy & content

1. **Up next** — Nearest confirmed booking with timezone and an Open order action.
2. **Assigned orders** — Needs details, ready to start, in progress, on hold and completion awaiting staff review.
3. **Your availability** — A compact weekly summary and link to edit. No earnings wallet or automatic compensation.

### Actions & destinations

- **Assigned orders** → [B02](design/index.html#B02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Calendar & availability** → [B04](design/index.html#B04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open active order** → [B03](design/index.html#B03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No assignments:** You have no assigned orders. Keep availability up to date.
- **Access revoked:** Your booster access has ended. Clear private assignment data.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F12.

## B02 — Assigned orders.

**Area:** Booster · **Current route:** `/booster/orders` · **Layout:** list

Only the orders assigned to you.

### Page anatomy & content

1. **Assignment queue** — Game, goal, play mode, next session, allowed action and last update.
2. **Filters** — Active, needs attention, on hold and completed. No browsing unassigned customer orders.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Status | select | Active |  |

Allowed options: Status: Active, Needs attention, On hold, Completed.

### Table/card fields

Order → Mode → Session → Next action. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Open assignment** → [B03](design/index.html#B03). Prototype actions are simulations only; guards must pass in the eventual application.
- **My availability** → [B04](design/index.html#B04). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Reassigned:** This order is no longer assigned to you. Private details are removed.
- **No matching orders:** No assigned orders match your filters.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F12.

## B03 — PL-1042 · Your assignment

**Area:** Booster · **Current route:** `/booster/orders/:id` · **Layout:** order

Mobile Legends · Epic II → Legend V · Play together

### Page anatomy & content

1. **Readiness** — Payment verified, required data present and session confirmed. Missing prerequisites block start.
2. **Progress** — Submit a customer-visible update and scanned proof. Distinguish internal notes if permitted.
3. **Secure access** — On-account orders alone expose audited, recent-verification access to required credentials.
4. **Completion request** — Submit evidence for admin approval. Boosters do not finalize orders, reprice, refund or pay sellers.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Progress update | textarea |  |  |
| Proof screenshot | file |  |  |
| I confirm this evidence matches the assigned scope | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Post progress · demo** → [B03](design/index.html#B03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open customer conversation** → [B05](design/index.html#B05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Propose session** → [B04](design/index.html#B04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Submit completion · demo** → [B03](design/index.html#B03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **On hold:** Show the reason and who can resolve it. No start/resume without guards.
- **Evidence scanning:** Completion is blocked until required evidence is approved.
- **Completion submitted:** Staff are reviewing your completion evidence.
- **Reassigned:** Hide all private order details and stop updates.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F12.

## B04 — Availability & sessions.

**Area:** Booster · **Current route:** `/booster/calendar` · **Layout:** calendar

Plan work in a clearly labeled time zone.

### Page anatomy & content

1. **My availability** — Recurring intervals and exceptions; date-specific overrides do not silently change existing bookings.
2. **Booking proposals** — Accept, decline with a reason, reschedule or cancel where permitted.
3. **Agenda** — Order reference, play mode, local start/end, UTC offset and booking state.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Time zone | text | Asia/Tehran |  |
| Date | date | 2026-09-24 |  |
| From | time | 19:00 |  |
| Until | time | 20:00 |  |

Allowed options: .

### Actions & destinations

- **Save availability · demo** → [B04](design/index.html#B04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open booked order** → [B03](design/index.html#B03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Overlap:** This time overlaps another confirmed session.
- **Stale proposal:** The booking changed. Reload before responding.
- **DST ambiguity:** Choose the explicit offset for this local time.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Agenda-first layout with a date picker; no horizontally compressed seven-column week view.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F12, F13.

## B05 — Assignment messages.

**Area:** Booster · **Current route:** `/booster/support/:id` · **Layout:** chat

Your booster alias is visible to the customer.

### Page anatomy & content

1. **Audience** — Customer-visible order conversation. Keep private staff details and credentials out.
2. **Assignment context** — Order, goal and next session in a compact header.
3. **Access lifecycle** — When assignment is revoked, clear the thread and draft according to privacy rules.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Message | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Send demo update** → [B05](design/index.html#B05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to assignment** → [B03](design/index.html#B03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Access removed:** This conversation is no longer assigned to you.
- **Send failed:** Keep the message draft and retry without duplicates.
- **Closed conversation:** History remains readable if authorized; composing is disabled.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F12.

## A01 — Operations overview.

**Area:** Administration · **Current route:** `/admin` · **Layout:** dashboard

Start with the queues that need a decision.

### Page anatomy & content

1. **Needs attention** — Quote requests, payment exceptions, overdue sessions, seller offers and open cases. Counts come from real queues.
2. **Today’s work** — Confirmed sessions and oldest waiting requests, with clear ownership.
3. **Operations health** — Failed jobs and file-processing issues link to their recovery tools. No fabricated latency or AI risk score.
4. **Staff & audit** — Owner-only access management, recovery review and audit history are distinct modules.

### Actions & destinations

- **Review order queue** → [A02](design/index.html#A02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Support inbox** → [A05](design/index.html#A05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Finance** → [A15](design/index.html#A15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Staff access** → [A08](design/index.html#A08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Audit history** → [A09](design/index.html#A09). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **All clear:** No urgent queue items. Keep module navigation available.
- **Partial outage:** Mark only failed summaries unavailable; do not display them as zero.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F09, F15.

## A02 — Order queue.

**Area:** Administration · **Current route:** `/admin/orders` · **Layout:** list

Review requests, manage fulfillment and resolve exceptions.

### Page anatomy & content

1. **Queue views** — New requests, needs information, quote pending, paid unassigned, active, holds and completed.
2. **Row summary** — Order/customer, game/goal, order state, payment state, assignee, age and next action.
3. **Triage** — Search/filter selection survives opening an order. No destructive bulk transitions.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search order/customer | search |  |  |
| Queue | select | Needs review |  |

Allowed options: Queue: Needs review, Paid unassigned, Active, Holds, All.

### Table/card fields

Order → Customer → State → Payment → Next. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Review PL-1042** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Assignment calendar** → [A07](design/index.html#A07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No match:** No orders match the current filters.
- **Queue changed:** Refresh retains filters and selected context.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F15.

## A03 — Review order PL-1042.

**Area:** Administration · **Current route:** `/admin/orders/:id` · **Layout:** order

Customer request · Mobile Legends · Submitted

### Page anatomy & content

1. **Decision panel** — Request clarification, reject with customer-visible reason, or issue a final quote. Each action states the result.
2. **Immutable request** — Submitted answers, estimate/configuration versions, files and prior revisions.
3. **Fulfillment** — Paid eligibility, booster assignment, credential access, sessions, holds, progress, proof and admin completion.
4. **Separate records** — Customer messages, internal notes, payment attempts, cases and audit events have explicit audiences.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Customer-visible reason/update | textarea |  |  |
| Internal note | textarea |  | Staff only — visually and structurally separate. |
| Assigned booster | select | Unassigned |  |

Allowed options: Assigned booster: Unassigned, Demo booster.

### Actions & destinations

- **Compose final quote** → [A04](design/index.html#A04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Customer conversation** → [A06](design/index.html#A06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Assign session** → [A07](design/index.html#A07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open case** → [A16](design/index.html#A16). Prototype actions are simulations only; guards must pass in the eventual application.
- **Secure access** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Conflict:** Another staff member changed this order. Compare fresh data before retrying.
- **Unpaid:** Fulfillment actions are blocked until qualifying payment is verified.
- **Missing proof:** Completion requires the configured evidence.
- **Hold confirmation:** Reason and next owner are required. Preserve the permitted resume state.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F12, F15, F16.

## A04 — Issue a final quote.

**Area:** Administration · **Current route:** `/admin/orders/:id` · **Layout:** form

Review the customer-facing contract before sending it.

### Page anatomy & content

1. **Quote content** — Scope, itemized adjustments, exact total/currency, delivery expectation, conditions and expiry.
2. **Comparison** — Highlight changes from the request estimate or previous unaccepted revision.
3. **Customer preview** — Show exactly what the customer accepts. Issuing a quote does not charge them.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Scope | textarea | Epic II → Legend V · Play together |  |
| Currency | text | USD |  |
| Total | number | 60.00 | Illustrative only. |
| Delivery expectation | text |  | An estimate unless a defined SLA is approved. |
| Expires at | datetime-local | 2026-09-25T19:00 |  |
| Reason for changes | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Preview quote** → [C03](design/index.html#C03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Issue quote · demo** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to order** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Invalid amount:** Use exact currency precision and a nonnegative permitted total.
- **Stale version:** The order or quote changed. Refresh and compare before issuing.
- **Accepted contract:** Do not edit the accepted total. Use the permitted change/case process.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F15.

## A05 — Support inbox.

**Area:** Administration · **Current route:** `/admin/support` · **Layout:** inbox

Keep customers moving with complete context.

### Page anatomy & content

1. **Queue** — Unread, waiting on staff, waiting on customer, closed; filter by customer/order and permitted assignment.
2. **Triage row** — Subject, audience, linked record, last sender, age and unread state.
3. **Routing** — Open the thread with its linked order/submission, without merging buyer and seller conversations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search conversations | search |  |  |
| Queue | select | Waiting on staff |  |

Allowed options: Queue: Waiting on staff, Unread, Waiting on customer, Closed.

### Actions & destinations

- **Open customer thread** → [A06](design/index.html#A06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open order queue** → [A02](design/index.html#A02). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No waiting threads:** No conversations are waiting in this view.
- **Connection lost:** Keep the current thread readable and show reconnection state.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F16.

## A06 — PL-1042 · Customer conversation

**Area:** Administration · **Current route:** `/admin/support/:id` · **Layout:** chat

Audience: customer and authorized PLAYORA staff

### Page anatomy & content

1. **Context rail** — Linked order, state, accepted total and next action. Private sensitive data stays out of previews.
2. **Reply vs internal note** — Persistent composer mode label and different background. Warn before switching with a draft.
3. **Message tools** — Attachments, failed-send retry, older-history reader anchor and explicit close/reopen where supported.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Composer audience | select | Customer reply |  |
| Message | textarea |  |  |

Allowed options: Composer audience: Customer reply, Internal note.

### Actions & destinations

- **Send customer reply · demo** → [A06](design/index.html#A06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open order** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to inbox** → [A05](design/index.html#A05). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Internal note:** Only authorized staff can read this message. It is never sent to the customer.
- **Send failed:** Keep the draft and attachment references. Retry once with the same identity.
- **Access removed:** Clear the private thread and show a safe return link.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Full-width thread. Context opens as a separate sheet, never overlapping the composer. Audience always visible above Send.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F16.

## A07 — Staff calendars.

**Area:** Administration · **Current route:** `/admin/calendar` · **Layout:** calendar

Assign work with time zones and conflicts visible.

### Page anatomy & content

1. **Calendar** — Filter by booster/date/status; show available intervals and confirmed/proposed bookings separately.
2. **Booking detail** — Order, participants, local time, UTC offset, duration and history.
3. **Changes** — Assignment and scheduling are separate permissions. Changing a slot does not silently reassign the order.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Booster | select | Demo booster |  |
| Time zone | text | Asia/Tehran |  |
| Date | date | 2026-09-24 |  |
| From | time | 19:00 |  |
| Until | time | 20:00 |  |
| Reason for change | textarea |  |  |

Allowed options: Booster: Demo booster.

### Actions & destinations

- **Open linked order** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Save booking · demo** → [A07](design/index.html#A07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Conflict:** The selected booster is unavailable for this interval.
- **Participant changed:** Refresh the booking after a concurrent update.
- **Unassigned order:** Assign an eligible booster before confirming a booster session.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F13.

## A08 — Customers & staff.

**Area:** Administration · **Current route:** `/admin/customers` · **Layout:** list

Identity and access changes stay deliberate.

### Page anatomy & content

1. **Directory** — Search by authorized identifiers; role, suspension and verification states.
2. **Person detail** — Order/support history, active sessions, verified methods and administrative actions.
3. **Owner actions** — Role change, suspend/restore, revoke sessions and staff recovery require explicit confirmation and fresh verification; protect the last owner.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search identities | search |  |  |
| Role | select | All |  |

Allowed options: Role: All, Customer, Booster, Administrator, Owner.

### Table/card fields

Identity → Role → Access → Verification. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Review sensitive action** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Audit history** → [A09](design/index.html#A09). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open customer orders** → [A02](design/index.html#A02). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Owner only:** You cannot change staff permissions.
- **Last owner:** This action would remove the last owner and is blocked.
- **Recovery pending:** Review the recovery evidence through the authorized process.
- **Suspension confirmation:** State that sessions will be revoked and access blocked.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F22.

## A09 — Audit & recovery review.

**Area:** Administration · **Current route:** `/admin` · **Layout:** list

A factual history of sensitive actions.

### Page anatomy & content

1. **Audit record** — Actor, action, target, time, reason and safe metadata. No secrets or raw credential values.
2. **Recovery review** — Pending/approved/rejected requests and their evidence. No bypass of required verification.
3. **Filters** — Actor/action/target/time; read-only records with stable pagination.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Action | text |  |  |
| Target reference | text |  |  |
| From date | date |  |  |

Allowed options: .

### Table/card fields

When → Actor → Action → Target. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Back to staff directory** → [A08](design/index.html#A08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Review recovery · demo** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No records:** No matching events in this time range.
- **Restricted:** Audit/recovery access requires owner permission.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F22.

## A10 — Game catalog.

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** list

Draft and publish each game without changing historical orders.

### Page anatomy & content

1. **Games** — Name, slug, draft status, live revision, availability and last editor.
2. **New game** — Stable slug and name create an unpublished draft.
3. **Release safety** — Forms, rank catalogs, pricing and customer terms publish together after validation.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search games | search |  |  |
| New game name | text |  |  |
| Stable slug | text |  |  |

Allowed options: .

### Table/card fields

Game → Draft → Published → Ordering. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Edit Mobile Legends** → [A11](design/index.html#A11). Prototype actions are simulations only; guards must pass in the eventual application.
- **Create a game · demo** → [A11](design/index.html#A11). Prototype actions are simulations only; guards must pass in the eventual application.
- **Release history** → [A14](design/index.html#A14). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty:** Create the first game as an unpublished draft.
- **Paused:** New orders are paused; historical orders remain readable.
- **Archived:** Archive prevents new sales without removing history.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A11 — Mobile Legends · Game settings

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** editor

Draft revision 5 · Published revision 4

### Page anatomy & content

1. **Game identity** — Name, stable slug, description, artwork/alt text and availability.
2. **Rank & option references** — Ordered rank tiers/divisions/point bounds; stable region, hero and role IDs. Validate relationships.
3. **Seller intake & transfer** — Game-specific seller fields, ownership checks, transfer requirements and review policy.
4. **Service navigation** — Game → Forms → Pricing → Packages → Policies → Preview & publish. Persistent dirty/saved status.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Game name | text | Mobile Legends |  |
| Description | textarea |  |  |
| Artwork asset | text |  |  |
| Artwork alternative text | text |  |  |
| Region options | textarea | SEA; EU; NA |  |

Allowed options: .

### Actions & destinations

- **Edit order form** → [A12](design/index.html#A12). Prototype actions are simulations only; guards must pass in the eventual application.
- **Pricing rules** → [A13](design/index.html#A13). Prototype actions are simulations only; guards must pass in the eventual application.
- **Fixed packages** → [A24](design/index.html#A24). Prototype actions are simulations only; guards must pass in the eventual application.
- **Seller intake** → [A25](design/index.html#A25). Prototype actions are simulations only; guards must pass in the eventual application.
- **Preview & publish** → [A14](design/index.html#A14). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unsaved changes:** Save draft, discard changes deliberately or stay. Never lose edits on navigation.
- **Revision conflict:** Another editor saved this draft. Compare before replacing.
- **Invalid reference:** An option/rank is still used by a field or rule. Resolve the reference first.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A12 — Build the order form.

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** editor

Use meaningful groups and collect each field at the right time.

### Page anatomy & content

1. **Field list** — Stable key, label, type, stage, required status and order. Move up/down alternatives to dragging.
2. **Field properties** — Help, default, bounds, allowed options, collection stage and conditional visibility.
3. **Conditions** — Bounded all/any clauses with typed comparisons; unknown references/cycles block publication.
4. **Live preview** — Estimate, submission and after-payment modes; hidden values cannot silently change pricing.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Field key | text | current_rank |  |
| Label | text | Current rank |  |
| Field type | select | Rank |  |
| Collection stage | select | Estimate |  |
| Help text | textarea |  |  |
| Required | checkbox |  |  |
| Condition field | text |  |  |
| Condition operator | select | Equals |  |

Allowed options: Field type: Select, Multiselect, Boolean, Integer, Decimal, Short text, Long text, Rank, Attachment; Collection stage: Estimate, Order submission, After payment; Condition operator: Equals, In, Greater than, Less than, All, Any.

### Actions & destinations

- **Preview service** → [P04](design/index.html#P04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit pricing** → [A13](design/index.html#A13). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to game** → [A11](design/index.html#A11). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Cycle detected:** These conditions depend on each other. Show the exact field chain.
- **Hidden required field:** A required field cannot be reached. Fix the condition or requirement.
- **Unsupported secret:** Credentials must use the secure handoff, not a generic text field.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A13 — Price estimation rules.

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** editor

Explain every line of the estimate before publishing.

### Page anatomy & content

1. **Rule list** — Base, rank-step costs, option adjustment, multiplier and supported caps/rounding in a defined order.
2. **Rule editor** — Stable rule ID, typed condition, amount/currency, priority and customer-facing line label.
3. **Test cases** — Enter valid and invalid configurations; show the complete calculation trace and expected total.
4. **Commercial guard** — Win-rate rules remain unpublished until measurement, exceptions and remedies are explicitly defined.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Rule label | text | Play together option |  |
| Rule type | select | Fixed adjustment |  |
| Amount | number | 12.00 | Design value, not approved pricing. |
| Applies when | text | play_mode = together |  |
| Test configuration | textarea |  |  |

Allowed options: Rule type: Base amount, Rank step, Fixed adjustment, Multiplier.

### Actions & destinations

- **Preview estimate** → [P05](design/index.html#P05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Review release** → [A14](design/index.html#A14). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to form** → [A12](design/index.html#A12). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Uncovered combination:** This configuration has no valid estimate. Provide a manual-review path or fix the rules.
- **Invalid arithmetic:** Reject incompatible currency, precision, negative or overflowing totals.
- **Rule overlap:** Show which rules apply and why; require deliberate resolution.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A14 — Preview & publish a release.

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** review

Review what changes for new purchases.

### Page anatomy & content

1. **Validation report** — Blocking errors link to fields/rules/policies; warnings stay visible but are not silently suppressed.
2. **Customer preview** — Desktop/mobile views of game, custom estimate, package, seller intake and agreement text.
3. **Change summary** — Current live revision compared with saved draft; historical orders keep their snapshots.
4. **Publication** — Explicit confirmation and required fresh authentication. Show published revision and time afterward.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| I verified ranks, availability, prices and customer promises | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **View customer preview** → [G01](design/index.html#G01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Publish reviewed draft · demo** → [A10](design/index.html#A10). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to editing** → [A11](design/index.html#A11). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Dirty draft:** Save changes before previewing or publishing.
- **Validation failed:** Resolve blocking issues before publication.
- **Stale preview:** The draft changed after preview. Review the current revision.
- **History:** List published revisions with actor/time and immutable snapshots.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A24 — Fixed packages editor.

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** editor

Publish exact scope and price without individual order review.

### Page anatomy & content

1. **Package identity** — Stable key, title, description, included/excluded scope and associated service.
2. **Price & variants** — Exact currency/amount; only explicit priced variants may affect checkout total.
3. **Eligibility & capacity** — Region/rank/play-mode constraints, stock/capacity, ordering pause and delivery estimate.
4. **Purchase terms** — Required fields and versioned agreements; after-payment secrets use secure handoff.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Package title | text | Rank progress package |  |
| Included scope | textarea |  |  |
| Currency | text | USD |  |
| Fixed amount | number | 48.00 |  |
| Capacity | number |  | Empty only when unlimited is explicitly selected. |
| Eligibility conditions | textarea |  |  |
| Delivery expectation | text |  |  |

Allowed options: .

### Actions & destinations

- **Preview package** → [P07](design/index.html#P07). Prototype actions are simulations only; guards must pass in the eventual application.
- **Release review** → [A14](design/index.html#A14). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Incompatible eligibility:** This package references an unavailable option.
- **Capacity invalid:** Capacity cannot conflict with existing reservations.
- **Unpriced option:** Define an explicit variant or use the custom-quote flow.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A25 — Seller intake & transfer rules.

**Area:** Catalog · **Current route:** `/admin/catalog` · **Layout:** editor

Define what staff must verify for this game.

### Page anatomy & content

1. **Submission questions** — Stable keys, field types, required evidence and visibility. All evidence is private until approved for a listing.
2. **Review criteria** — Ownership/control checks and permitted rejection/clarification reasons.
3. **Transfer checklist** — Seller-to-PLAYORA and PLAYORA-to-buyer steps are separate, with explicit proof and acknowledgement.
4. **Sale policies** — Commercial arrangements reference an owner-approved offer; this editor does not invent payout terms.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Question label | text |  |  |
| Evidence required | checkbox |  |  |
| Transfer task | text |  |  |
| Buyer acknowledgement required | checkbox |  |  |
| Review guidance | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Preview seller form** → [S02](design/index.html#S02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Preview handover** → [S05](design/index.html#S05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Release review** → [A14](design/index.html#A14). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Missing ownership criterion:** Publication is blocked until required control checks are defined.
- **Unsafe public field:** Private identity or credentials cannot be marked public.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F14.

## A15 — Payments & exceptions.

**Area:** Finance · **Current route:** `/admin/finance` · **Layout:** list

Use verified provider evidence to explain every payment.

### Page anatomy & content

1. **Payment queue** — Order, attempt, expected/received amount, exact asset/network, provider state, issue and last reconciliation.
2. **Workspace views** — Payments · Service cases · Seller payouts · Policy · Reconciliation.
3. **Actions** — Inspect evidence or request reconciliation. No manual paid toggle.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Filter | select | Needs attention |  |

Allowed options: Filter: Needs attention, All attempts.

### Table/card fields

Order / attempt → Asset / network → Issue → Next action. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Open case** → [A16](design/index.html#A16). Prototype actions are simulations only; guards must pass in the eventual application.
- **Seller payouts** → [A17](design/index.html#A17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Payment policy** → [A18](design/index.html#A18). Prototype actions are simulations only; guards must pass in the eventual application.
- **Reconciliation** → [A19](design/index.html#A19). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Provider unavailable:** Evidence is stale. Show its timestamp; never assume payment success.
- **No exceptions:** No payment attempts need attention in this view.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F17.

## A16 — Service case & refund review.

**Area:** Finance · **Current route:** `/admin/finance` · **Layout:** order

CASE-12 · Customer payment issue

### Page anatomy & content

1. **Evidence** — Order scope, received funds, delivery/proof, conversation and policy version side by side.
2. **Decision** — Approve/reject a remedy with customer-visible explanation; partial/full amount bounded by refundable receipt.
3. **Recipient & execution** — Confirm asset/network/address, fee basis, fresh authentication and the separate outgoing activation switch.
4. **Outcome** — Processing, uncertain, confirmed or failed. Reconcile before a retry; retain decision and appeal history.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Decision | select | Request information |  |
| Amount | text |  | Exact asset precision; never float rounding. |
| Customer explanation | textarea |  |  |
| Internal rationale | textarea |  |  |

Allowed options: Decision: Request information, Approve refund, Reject, Approve rework.

### Actions & destinations

- **Confirm sensitive decision** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Reconcile outgoing transfer** → [A19](design/index.html#A19). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open customer view** → [C09](design/index.html#C09). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Recipient unverified:** Execution is blocked until the recipient is confirmed.
- **Outgoing disabled:** Approval can be recorded where allowed; no funds are sent.
- **Already processing:** Reconcile the current operation instead of creating another.
- **Refund confirmed:** Verified outgoing receipt, amount and network are shown.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F05, F17.

## A17 — Seller payout review.

**Area:** Finance · **Current route:** `/admin/finance` · **Layout:** order

Separate obligations from receipts and customer refunds.

### Page anatomy & content

1. **Obligation** — Accepted offer/model, due trigger, exact seller proceeds, fees and approved route.
2. **Eligibility** — Buy-first transfer verification or consignment buyer-delivery/hold conditions; related cases may block payout.
3. **Recipient** — Verified destination and change history. Any change requires fresh review.
4. **Execution** — Single obligation, explicit approval, recent verification, outgoing-enabled check and reconciled provider evidence.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Approval reason | textarea |  |  |
| I reviewed the recipient, amount and due conditions | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Verify and authorize** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open seller submission** → [A21](design/index.html#A21). Prototype actions are simulations only; guards must pass in the eventual application.
- **Reconcile transfer** → [A19](design/index.html#A19). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Not due:** Show unmet contract conditions.
- **Case hold:** A linked refund/dispute blocks payout eligibility.
- **Uncertain transfer:** Reconcile the existing request before any retry.
- **Confirmed:** Show verified receipt and accepted terms reference.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07, F17.

## A18 — Payment policy.

**Area:** Finance · **Current route:** `/admin/finance` · **Layout:** editor

Publish transparent checkout and remedy terms.

### Page anatomy & content

1. **Runtime status** — Read-only merchant configured, checkout enabled/paused and outgoing enabled/disabled indicators. No secret inputs here.
2. **Routes & fees** — Exact supported asset/network pairs, minimums, processing-fee payer, exchange-rate basis and invoice window.
3. **Remedies** — Cancellation stages, partial completion, dispute/appeal windows, refund fee rules and customer text.
4. **Publish safely** — Saved draft, customer preview, version, explicit publication and recent verification. Existing agreements stay immutable.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Policy title | text |  |  |
| Customer policy text | textarea |  |  |
| Supported routes | textarea |  |  |
| Processing fees paid by | select | Owner decision required |  |
| Exchange-rate policy | textarea |  |  |
| Invoice window (minutes) | number |  |  |
| Remedy terms | textarea |  |  |

Allowed options: Processing fees paid by: Owner decision required, Customer, Merchant.

### Actions & destinations

- **Customer policy preview** → [P17](design/index.html#P17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Verify to publish** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to finance** → [A15](design/index.html#A15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Missing required terms:** Related checkout or remedy actions remain unavailable.
- **Checkout paused:** Existing payments still reconcile. Nothing bypasses payment.
- **Conflict:** Policy changed elsewhere. Review its current revision.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F23.

## A19 — Reconcile provider evidence.

**Area:** Finance · **Current route:** `/admin/finance` · **Layout:** form

Request a fresh check without changing payment facts manually.

### Page anatomy & content

1. **Find record** — Payment or outgoing provider reference, linked order/case/obligation and last check.
2. **Reason** — A human explanation of why a reconciliation is requested.
3. **Result** — Queued, running, evidence updated or failed. No token, secret or raw private response display.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Provider payment/outgoing ID | text |  |  |
| Reason | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Queue reconciliation · demo** → [A15](design/index.html#A15). Prototype actions are simulations only; guards must pass in the eventual application.
- **View background task** → [A31](design/index.html#A31). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unknown reference:** No accessible payment matches this reference.
- **Already queued:** A check is already pending. Show its status.
- **Failed check:** Keep the previous evidence timestamp and offer an allowed retry.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F05, F17.

## A20 — Account submissions.

**Area:** Resale admin · **Current route:** `/admin/submissions` · **Layout:** list

Review ownership before preparing an offer.

### Page anatomy & content

1. **Review queue** — Game, seller reference, evidence status, submitted age and requested action.
2. **Filters** — Submitted, clarification, offer pending, accepted, rejected and withdrawn.
3. **Private data** — Evidence and seller identity stay within authorized review screens.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Search submissions | search |  |  |
| Review state | select | Submitted |  |

Allowed options: Review state: Submitted, Needs information, Offer pending, Accepted, Rejected.

### Table/card fields

Submission → Game → Evidence → State. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Review SA-204** → [A21](design/index.html#A21). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Empty queue:** No submissions are waiting in this view.
- **Evidence unavailable:** Open the submission to request replacement evidence.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06.

## A21 — Review submission SA-204.

**Area:** Resale admin · **Current route:** `/admin/submissions/:id` · **Layout:** order

Mobile Legends · Private seller review

### Page anatomy & content

1. **Ownership review** — Private source evidence, checklist and requests for clarification; mark verified only with evidence.
2. **Commercial offer** — Choose consignment or buy-first; exact proceeds/price, commission, fees, route, due trigger, deadline and transfer responsibilities.
3. **Revision control** — Preview seller terms, issue/supersede/expire with reason. Changed terms require new seller acceptance.
4. **After acceptance** — Verify transfer before publication; create one payout obligation under the selected arrangement.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Arrangement | select | Consignment |  |
| Seller proceeds or purchase price | text |  |  |
| Fees & commission | textarea |  |  |
| Asset/network | text |  |  |
| Due trigger & deadline | textarea |  |  |
| Transfer criteria & dispute terms | textarea |  |  |
| Offer expiry | datetime-local |  |  |

Allowed options: Arrangement: Consignment, Buy first.

### Actions & destinations

- **Preview seller offer** → [S04](design/index.html#S04). Prototype actions are simulations only; guards must pass in the eventual application.
- **Prepare public listing** → [A23](design/index.html#A23). Prototype actions are simulations only; guards must pass in the eventual application.
- **Review payout** → [A17](design/index.html#A17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Message seller** → [A37](design/index.html#A37). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Missing evidence:** Ask for specific additional proof before approval.
- **Offer expired:** Issue a new offer; do not silently extend an accepted contract.
- **Transfer incomplete:** Listing/payout eligibility is blocked by unmet requirements.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07.

## A22 — Account inventory.

**Area:** Resale admin · **Current route:** `/admin/accounts` · **Layout:** list

One listing for each unique account.

### Page anatomy & content

1. **Inventory** — Draft, published, reserved, sold and withdrawn, plus ownership/transfer state.
2. **Reservations** — Order, invoice and deadline; never release detected funds without reconciliation.
3. **Public vs private** — Listing editor exposes only sanitized public information. Source ownership evidence remains separate.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Game | select | All |  |
| Listing state | select | All |  |

Allowed options: Game: All, Mobile Legends; Listing state: All, Draft, Published, Reserved, Sold, Withdrawn.

### Table/card fields

Listing → Game → State → Linked record. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Edit listing** → [A23](design/index.html#A23). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open submissions** → [A20](design/index.html#A20). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No inventory:** Create a listing from an approved, transferred submission.
- **Reservation attention:** Reconcile payment before releasing this reservation.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06.

## A23 — Edit account listing AC-208.

**Area:** Resale admin · **Current route:** `/admin/accounts/:id` · **Layout:** editor

Only reviewed public details belong in the listing.

### Page anatomy & content

1. **Public content** — Game, title, region, rank, configured attributes, description and sanitized screenshots/alt text.
2. **Price & terms** — Exact fixed price/currency, delivery checklist and current sale policy.
3. **Private linkage** — Approved submission, accepted terms and transfer verification. Never publish secret fields.
4. **Publication & delivery** — Preview, publish/pause/withdraw; sold accounts require separate audited buyer transfer. Refunded accounts need control review before relisting.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Title | text | Mythic account · Mobile Legends |  |
| Region | text | SEA |  |
| Price | number | 120.00 |  |
| Public description | textarea |  |  |
| Reviewed screenshots | file |  |  |
| Delivery terms | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Preview listing** → [P13](design/index.html#P13). Prototype actions are simulations only; guards must pass in the eventual application.
- **Publish reviewed listing · demo** → [A22](design/index.html#A22). Prototype actions are simulations only; guards must pass in the eventual application.
- **Buyer delivery** → [A26](design/index.html#A26). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Private information detected:** Remove private identifiers from screenshots before publication.
- **Source not verified:** Complete the ownership transfer checklist first.
- **Reserved:** Price/content changes cannot invalidate an accepted buyer contract.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06, F07.

## A26 — Buyer account delivery.

**Area:** Resale admin · **Current route:** `/admin/orders/:id` · **Layout:** form

Deliver the purchased account through an audited private handoff.

### Page anatomy & content

1. **Readiness** — Qualifying payment, correct inventory reservation and verified control are required.
2. **Transfer steps** — Buyer-specific ownership/control checklist, private credential delivery, rotation and acknowledgement where required.
3. **Completion** — Record evidence and admin completion; track disputes independently. Never share seller conversation.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Delivery summary | textarea |  | Nonsecret customer-visible record. |
| Evidence | file |  |  |
| Required transfer steps verified | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Open secure handoff** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Record delivery · demo** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Buyer view** → [C23](design/index.html#C23). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unpaid:** Delivery is unavailable until payment is verified.
- **Access expired:** Reverify before opening private transfer data.
- **Disputed:** Follow the case decision before changing delivery/relisting state.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F03.

## C23 — Your purchased account.

**Area:** Customer · **Current route:** `/orders/:id` · **Layout:** order

Account AC-208 · Payment verified

### Page anatomy & content

1. **Delivery progress** — Staff preparation, secure handoff, required ownership steps and acknowledgement.
2. **Private access** — Verify your identity to reveal only the purchased account’s delivery material. Mask on exit and do not persist in drafts.
3. **After transfer** — Follow the agreed security/ownership steps and record acknowledgement. Report issues through the linked case.

### Actions & destinations

- **Open secure delivery** → [I08](design/index.html#I08). Prototype actions are simulations only; guards must pass in the eventual application.
- **Acknowledge receipt · demo** → [C05](design/index.html#C05). Prototype actions are simulations only; guards must pass in the eventual application.
- **Report delivery issue** → [C08](design/index.html#C08). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Preparing:** Your account transfer is being prepared.
- **Verification needed:** Confirm your identity before revealing private delivery information.
- **Delivery ready:** Follow the listed transfer steps before acknowledgement.
- **Acknowledged:** Receipt recorded. Published support/dispute terms still apply.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F03, F06.

## A27 — Coupons.

**Area:** Administration · **Current route:** `/admin/coupons` · **Layout:** editor

Discounts with explicit scope and limits.

### Page anatomy & content

1. **Coupon list** — Code, type/value, eligibility, validity window, usage limits and active state.
2. **Edit coupon** — Game/package/service scope, currency where applicable, minimum spend and stacking rules supported by the backend.
3. **Customer outcome** — Valid discount gets its own price line. Expired/ineligible/exhausted codes keep the rest of checkout intact.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Code | text | DESIGN10 |  |
| Type | select | Percentage |  |
| Value | number | 10 |  |
| Eligible scope | text |  |  |
| Starts at | datetime-local |  |  |
| Ends at | datetime-local |  |  |
| Usage limit | number |  |  |

Allowed options: Type: Percentage, Fixed amount.

### Actions & destinations

- **Save draft · demo** → [A27](design/index.html#A27). Prototype actions are simulations only; guards must pass in the eventual application.
- **Preview checkout** → [P08](design/index.html#P08). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Duplicate code:** Choose a unique code.
- **Invalid discount:** Discount cannot exceed permitted totals or use incompatible currency.
- **Usage exhausted:** New applications are blocked; accepted contracts remain unchanged.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F23.

## A28 — Review moderation.

**Area:** Administration · **Current route:** `/admin/reviews` · **Layout:** list

Apply a consistent policy without rewriting customer sentiment.

### Page anatomy & content

1. **Moderation queue** — Rating, safe excerpt, game/order, verified eligibility, flags and age.
2. **Decision** — Publish/hide according to policy with a reason. Keep author correction and audit history.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| State | select | Pending |  |

Allowed options: State: Pending, Published, Hidden.

### Table/card fields

Review → Order → Rating → State. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Review submission** → [A29](design/index.html#A29). Prototype actions are simulations only; guards must pass in the eventual application.
- **Public reviews** → [P15](design/index.html#P15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No pending reviews:** The moderation queue is clear.
- **Eligibility changed:** Review the refund/eligibility label without removing history silently.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F19.

## A29 — Review REV-12.

**Area:** Administration · **Current route:** `/admin/reviews/:id` · **Layout:** review

Inspect content and eligibility before a moderation decision.

### Page anatomy & content

1. **Customer content** — Original text and rating, edit history, safe public alias and order link.
2. **Policy checks** — Personal information, prohibited content and verified-order criteria. A low rating alone is not a reason to hide.
3. **Decision record** — Reason, actor, time and customer-visible explanation where applicable.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Decision reason | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Publish review · demo** → [A28](design/index.html#A28). Prototype actions are simulations only; guards must pass in the eventual application.
- **Request correction · demo** → [A28](design/index.html#A28). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open order** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Conflict:** This review changed after you opened it. Inspect the latest text.
- **Hidden:** Show reason and reinstatement path where allowed.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F19.

## A30 — Reports.

**Area:** Administration · **Current route:** `/admin/reports` · **Layout:** dashboard

Read operational metrics with their definitions and freshness.

### Page anatomy & content

1. **Filters** — Time range/timezone, game and permitted dimensions. Applied filters appear in report/export headings.
2. **Results** — Orders by state, turnaround, cases and financial receipts/refunds separated by currency/asset/network.
3. **Export** — Preview row count and scope, then generate a protected export. No private credentials or secret raw events.
4. **Freshness** — Show generated time and partial/unavailable data explicitly.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| From | date | 2026-09-01 |  |
| To | date | 2026-09-21 |  |
| Time zone | text | Asia/Tehran |  |
| Game | select | All |  |

Allowed options: Game: All, Mobile Legends.

### Actions & destinations

- **Preview export · demo** → [A30](design/index.html#A30). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open payment queue** → [A15](design/index.html#A15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No data:** No records match this time range.
- **Stale preview:** Filters changed. Regenerate the preview before export.
- **Export failed:** Retry the same scoped export without broadening access.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F24.

## A31 — Background task recovery.

**Area:** Administration · **Current route:** `/admin/jobs` · **Layout:** list

Retry only jobs that are safe and eligible.

### Page anatomy & content

1. **Task queue** — Kind, state, attempts, sanitized failure category, next retry and related reference.
2. **Detail** — Show enough context to diagnose, never raw payloads containing private data.
3. **Retry** — Reason required. A retry queues work; it does not claim completion or replay a transfer blindly.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Task kind | text |  |  |
| State | select | Failed |  |
| Retry reason | textarea |  |  |

Allowed options: State: Failed, Pending, Running, Completed.

### Table/card fields

Task → Kind → State → Attempts. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **Queue retry · demo** → [A31](design/index.html#A31). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open related payment** → [A15](design/index.html#A15). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Already running:** This job is already running. Refresh its status.
- **Not retryable:** Explain why retry is not allowed; link to the relevant operational review.
- **Retry queued:** The task was queued. Await its result.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F17, F24.

## A32 — Media directory.

**Area:** Administration · **Current route:** `/admin/media` · **Layout:** list

Review files without confusing private evidence and public artwork.

### Page anatomy & content

1. **File inventory** — Owner/linked record, purpose, visibility, scan state, type/size and uploaded date.
2. **Preview** — Private signed access only for authorized reviewers; rejected files never render inline.
3. **Lifecycle** — Pending scan, available, rejected, quarantined and purge-pending with permitted actions.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Purpose | select | All |  |
| Scan state | select | All |  |

Allowed options: Purpose: All, Order proof, Seller evidence, Public artwork; Scan state: All, Pending, Available, Rejected.

### Table/card fields

File → Purpose → Visibility → State. Rows become labeled cards below 760px; preserve priority and full values.

### Actions & destinations

- **View linked order** → [A03](design/index.html#A03). Prototype actions are simulations only; guards must pass in the eventual application.
- **View submission** → [A21](design/index.html#A21). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Scanning:** The file is not ready to preview.
- **Rejected:** Show a safe rejection reason; request replacement.
- **Purge pending:** File access is blocked while deletion finishes.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F24.

## A33 — Availability alert management.

**Area:** Administration · **Current route:** `/admin/alerts` · **Layout:** list

Manage subscriptions and delivery without exposing unnecessary personal data.

### Page anatomy & content

1. **Subscriptions** — Target, consent state, created date and delivery status; scoped filters.
2. **Availability event** — Show the published availability change and notification outcome. No reservation promise.
3. **Failures** — Safe failure categories, retry through authorized jobs; honor unsubscribe immediately.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Target | text |  |  |
| State | select | Active |  |

Allowed options: State: Active, Unsubscribed, Delivery failed.

### Actions & destinations

- **Review delivery failure** → [A31](design/index.html#A31). Prototype actions are simulations only; guards must pass in the eventual application.
- **Open catalog** → [A10](design/index.html#A10). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **No subscribers:** No active subscriptions for this target.
- **Unsubscribed:** Delivery is disabled for this subscription.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F24.

## A34 — Content & policies.

**Area:** Administration · **Current route:** `/admin/content` · **Layout:** editor

Publish clear, versioned customer information.

### Page anatomy & content

1. **Document list** — Type, title, draft/published revision and effective date.
2. **Editor** — Structured headings, paragraphs, links and approved media; safe rendering and accessible text.
3. **Preview & publish** — Desktop/mobile preview, change summary, effective date and explicit approval. Previous accepted versions remain available.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Document type | select | Service terms |  |
| Title | text |  |  |
| Body | textarea |  |  |
| Effective date | date |  |  |

Allowed options: Document type: Service terms, Payment/refund, Account sale, Privacy, FAQ, Contact.

### Actions & destinations

- **Preview policy** → [P17](design/index.html#P17). Prototype actions are simulations only; guards must pass in the eventual application.
- **Verify to publish** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Missing required policy:** Related purchase or privacy capability stays disabled.
- **Unsaved changes:** Save or deliberately discard before leaving.
- **Version conflict:** Compare the current revision before saving.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F23.

## A35 — Privacy request review.

**Area:** Administration · **Current route:** `/admin/privacy` · **Layout:** order

Owner-only decisions with retention and holds visible.

### Page anatomy & content

1. **Request queue** — Identity reference, request date, state and active holds; private evidence is scoped.
2. **Retention policy** — Explicit owner-entered durations and handling for finance, disputes, audit, support, files and backups. Disabled until published/enabled.
3. **Erasure preview** — Show eligible live records, retained obligations and active order/dispute holds before confirmation.
4. **Completion record** — Live cleanup, pending file purge, retained evidence and backups are reported separately.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Review reason | textarea |  |  |
| Action | select | Review |  |
| I reviewed the current policy, holds and irreversible effects | checkbox |  |  |

Allowed options: Action: Review, Place hold, Release eligible hold, Erase eligible live data, Finalize after file purge.

### Actions & destinations

- **Review sensitive erasure** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit retention policy** → [A36](design/index.html#A36). Prototype actions are simulations only; guards must pass in the eventual application.
- **Customer privacy view** → [C18](design/index.html#C18). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Policy disabled:** Deletion cannot run without an active owner policy.
- **Active hold:** Show the blocking order/dispute/policy category.
- **Erased pending files:** Do not finalize until pending file cleanup is resolved.
- **Completed:** Show the actual completed scope and retained categories; never promise backup erasure without evidence.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F21.

## A36 — Retention policy.

**Area:** Administration · **Current route:** `/admin/privacy` · **Layout:** editor

Enter the owner-approved rules before enabling deletion.

### Page anatomy & content

1. **Policy categories** — Financial records, disputes, audit history, ordinary support messages, files and backup treatment.
2. **Rule meaning** — For each: duration, starting event, hold exceptions, legal/business rationale and deletion method.
3. **Enablement** — Preview affected requests; publish a version with effective date and explicit enablement. No prefilled legal durations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Policy title | text |  |  |
| Financial retention rule | textarea |  |  |
| Dispute retention rule | textarea |  |  |
| Audit retention rule | textarea |  |  |
| Support-message retention rule | textarea |  |  |
| File and backup treatment | textarea |  |  |
| Effective date | date |  |  |
| Enable deletion under this published policy | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Review deletion queue** → [A35](design/index.html#A35). Prototype actions are simulations only; guards must pass in the eventual application.
- **Verify to publish** → [I06](design/index.html#I06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Incomplete rule:** A required category has no explicit rule. Deletion remains disabled.
- **Active obligations:** Publishing a policy never bypasses active order or dispute holds.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F21.

## X01 — This page isn’t available.

**Area:** System · **Current route:** `*` · **Layout:** error

Choose the right recovery without exposing private information.

### Page anatomy & content

1. **Not found** — The requested page cannot be found. Offer a safe return to games or the appropriate workspace.
2. **Not permitted** — Do not reveal another customer’s object existence. Clear cached private content on revocation.
3. **Unavailable** — Service outage: retain nonsensitive drafts and provide Retry. Never show success from a failed request.
4. **Session expired** — Return to passwordless sign-in with a safe local destination.

### Actions & destinations

- **Explore games** → [P02](design/index.html#P02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Sign in** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Contact support** → [C13](design/index.html#C13). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **404:** We could not find that page.
- **403/revoked:** You cannot access this page.
- **Offline:** You appear to be offline. Retry when connected.
- **Maintenance:** This service is temporarily unavailable. Existing orders are not lost.
- **Rate limited:** Too many requests. Show the actual permitted retry time.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F25.

## I08 — Open your private handoff.

**Area:** Identity · **Current route:** `/account/security` · **Layout:** auth

Confirm your identity before viewing private account access.

### Page anatomy & content

1. **Verify access** — Use recent Google or email verification. Staff also require the staff authenticator check where applicable.
2. **Private reveal** — Show only this order or submission’s required secrets. Mask again when leaving the panel.
3. **Safety** — Do not save secrets in local drafts, include them in messages or expose them in notifications.

### Actions & destinations

- **Verify with email · demo** → [I02](design/index.html#I02). Prototype actions are simulations only; guards must pass in the eventual application.
- **Return to delivery** → [C23](design/index.html#C23). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Verification expired:** Verify again to reopen this private handoff.
- **No access:** This handoff is not available to your account.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F03.

## S07 — SA-204 · Private seller messages

**Area:** Seller · **Current route:** `/support/:id` · **Layout:** chat

Only you and authorized PLAYORA staff can read this conversation.

### Page anatomy & content

1. **Submission context** — Mobile Legends · Account submission SA-204 · Offer ready
2. **Seller conversation** — Questions about ownership, offer terms and transfer tasks. Buyer messages and identity never appear.
3. **Composer** — Keep private login material in secure handoff, not ordinary messages.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Message | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Open submission** → [S03](design/index.html#S03). Prototype actions are simulations only; guards must pass in the eventual application.
- **Send demo message** → [S07](design/index.html#S07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Send failed:** Your message was not sent. Keep the draft and retry.
- **Access removed:** Clear the private conversation and return safely.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06.

## A37 — SA-204 · Seller conversation

**Area:** Resale admin · **Current route:** `/admin/support/:id` · **Layout:** chat

Audience: seller and authorized staff. Buyer conversation is separate.

### Page anatomy & content

1. **Submission context** — Private evidence and accepted offer accessible only through the linked submission.
2. **Reply vs note** — Seller reply and internal note remain visually distinct.
3. **Privacy boundary** — No buyer identity, buyer chat or credentials in seller-facing replies.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Message | textarea |  |  |

Allowed options: .

### Actions & destinations

- **Open submission** → [A21](design/index.html#A21). Prototype actions are simulations only; guards must pass in the eventual application.
- **Send seller reply · demo** → [A37](design/index.html#A37). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Internal note:** Visible to authorized staff only.
- **Send failed:** Keep the same draft and retry without duplicates.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F06.

## G07 — Build your World of Warcraft request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** form

Future-game template. Actual options, availability and prices require a published catalog.

### Page anatomy & content

1. **Your goal** — Choose the service and progression supported by this game configuration.
2. **Your preferences** — Only compatible fields appear. Requested outcomes remain subject to the final staff quote.
3. **Estimate** — Show a configured estimate or manual-review state. No placeholder season or commercial guarantee.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Service | select | Dungeon carry |  |
| Region | select | EU |  |
| Realm | text |  |  |
| Character level | number |  |  |
| Target difficulty/key | number |  |  |
| Number of runs | number | 1 |  |
| Play mode | select | Self-play |  |
| Scheduling preference | textarea |  |  |

Allowed options: Service: Dungeon carry, Raid clear, Leveling, PvP rating; Region: EU, US; Play mode: Self-play, On my account.

### Actions & destinations

- **Review request** → [G12](design/index.html#G12). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to game** → [G02](design/index.html#G02). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unsupported combination:** These choices cannot be fulfilled together. Review the highlighted options.
- **Manual estimate:** Staff will quote this configuration after review.
- **Ordering unavailable:** This game has not been enabled for new orders.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F26.

## G12 — Review your World of Warcraft request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** review

Estimated price — final quote after staff review.

### Page anatomy & content

1. **Selected game** — World of Warcraft · Service and validated configuration summary.
2. **Your selections** — Show every selected goal, play mode, option and scheduling preference, with Edit links.
3. **Before sending** — No payment is due. Staff review scope, price and delivery expectations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Additional instructions | textarea |  |  |
| I accept the current service terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Sign in to send** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit selections** → [G07](design/index.html#G07). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Catalog changed:** Review updated choices before sending.
- **Manual estimate:** No amount is promised until the staff quote.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Shared custom-order flow F01 after submission; carry this game context into every order, quote, invoice and fulfillment view. These are future catalog examples.

**Journeys:** F26.

## G08 — Build your League of Legends request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** form

Future-game template. Actual options, availability and prices require a published catalog.

### Page anatomy & content

1. **Your goal** — Choose the service and progression supported by this game configuration.
2. **Your preferences** — Only compatible fields appear. Requested outcomes remain subject to the final staff quote.
3. **Estimate** — Show a configured estimate or manual-review state. No placeholder season or commercial guarantee.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Region | text | EUW |  |
| Queue | select | Solo/Duo |  |
| Current rank / division | text |  |  |
| Current LP | number |  |  |
| Target rank / division | text |  |  |
| Play mode | select | Play together |  |
| Role preference | text |  |  |
| Champion preference | text |  |  |

Allowed options: Queue: Solo/Duo, Flex; Play mode: Play together, On my account.

### Actions & destinations

- **Review request** → [G13](design/index.html#G13). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to game** → [G03](design/index.html#G03). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unsupported combination:** These choices cannot be fulfilled together. Review the highlighted options.
- **Manual estimate:** Staff will quote this configuration after review.
- **Ordering unavailable:** This game has not been enabled for new orders.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F27.

## G13 — Review your League of Legends request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** review

Estimated price — final quote after staff review.

### Page anatomy & content

1. **Selected game** — League of Legends · Service and validated configuration summary.
2. **Your selections** — Show every selected goal, play mode, option and scheduling preference, with Edit links.
3. **Before sending** — No payment is due. Staff review scope, price and delivery expectations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Additional instructions | textarea |  |  |
| I accept the current service terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Sign in to send** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit selections** → [G08](design/index.html#G08). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Catalog changed:** Review updated choices before sending.
- **Manual estimate:** No amount is promised until the staff quote.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Shared custom-order flow F01 after submission; carry this game context into every order, quote, invoice and fulfillment view. These are future catalog examples.

**Journeys:** F27.

## G09 — Build your VALORANT request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** form

Future-game template. Actual options, availability and prices require a published catalog.

### Page anatomy & content

1. **Your goal** — Choose the service and progression supported by this game configuration.
2. **Your preferences** — Only compatible fields appear. Requested outcomes remain subject to the final staff quote.
3. **Estimate** — Show a configured estimate or manual-review state. No placeholder season or commercial guarantee.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Region | text |  |  |
| Current rank | text |  |  |
| Current RR | number |  |  |
| Target rank / RR | text |  |  |
| Play mode | select | Play together |  |
| Agent preference | text |  |  |

Allowed options: Play mode: Play together, On my account.

### Actions & destinations

- **Review request** → [G14](design/index.html#G14). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to game** → [G04](design/index.html#G04). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unsupported combination:** These choices cannot be fulfilled together. Review the highlighted options.
- **Manual estimate:** Staff will quote this configuration after review.
- **Ordering unavailable:** This game has not been enabled for new orders.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F28.

## G14 — Review your VALORANT request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** review

Estimated price — final quote after staff review.

### Page anatomy & content

1. **Selected game** — VALORANT · Service and validated configuration summary.
2. **Your selections** — Show every selected goal, play mode, option and scheduling preference, with Edit links.
3. **Before sending** — No payment is due. Staff review scope, price and delivery expectations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Additional instructions | textarea |  |  |
| I accept the current service terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Sign in to send** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit selections** → [G09](design/index.html#G09). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Catalog changed:** Review updated choices before sending.
- **Manual estimate:** No amount is promised until the staff quote.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Shared custom-order flow F01 after submission; carry this game context into every order, quote, invoice and fulfillment view. These are future catalog examples.

**Journeys:** F28.

## G10 — Build your Dota 2 request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** form

Future-game template. Actual options, availability and prices require a published catalog.

### Page anatomy & content

1. **Your goal** — Choose the service and progression supported by this game configuration.
2. **Your preferences** — Only compatible fields appear. Requested outcomes remain subject to the final staff quote.
3. **Estimate** — Show a configured estimate or manual-review state. No placeholder season or commercial guarantee.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Region | text |  |  |
| Current MMR | number |  |  |
| Target MMR | number |  |  |
| Queue | select | Solo |  |
| Play mode | select | On my account |  |
| Role preference | text |  |  |
| Hero preference | text |  |  |

Allowed options: Queue: Solo, Party where supported; Play mode: On my account, Play together.

### Actions & destinations

- **Review request** → [G15](design/index.html#G15). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to game** → [G05](design/index.html#G05). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unsupported combination:** These choices cannot be fulfilled together. Review the highlighted options.
- **Manual estimate:** Staff will quote this configuration after review.
- **Ordering unavailable:** This game has not been enabled for new orders.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F29.

## G15 — Review your Dota 2 request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** review

Estimated price — final quote after staff review.

### Page anatomy & content

1. **Selected game** — Dota 2 · Service and validated configuration summary.
2. **Your selections** — Show every selected goal, play mode, option and scheduling preference, with Edit links.
3. **Before sending** — No payment is due. Staff review scope, price and delivery expectations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Additional instructions | textarea |  |  |
| I accept the current service terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Sign in to send** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit selections** → [G10](design/index.html#G10). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Catalog changed:** Review updated choices before sending.
- **Manual estimate:** No amount is promised until the staff quote.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Shared custom-order flow F01 after submission; carry this game context into every order, quote, invoice and fulfillment view. These are future catalog examples.

**Journeys:** F29.

## G11 — Build your Wild Rift request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** form

Future-game template. Actual options, availability and prices require a published catalog.

### Page anatomy & content

1. **Your goal** — Choose the service and progression supported by this game configuration.
2. **Your preferences** — Only compatible fields appear. Requested outcomes remain subject to the final staff quote.
3. **Estimate** — Show a configured estimate or manual-review state. No placeholder season or commercial guarantee.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Region | text |  |  |
| Current rank / division | text |  |  |
| Current marks | number |  |  |
| Target rank / marks | text |  |  |
| Play mode | select | Play together |  |
| Role preference | text |  |  |
| Champion preference | text |  |  |

Allowed options: Play mode: Play together, On my account.

### Actions & destinations

- **Review request** → [G16](design/index.html#G16). Prototype actions are simulations only; guards must pass in the eventual application.
- **Back to game** → [G06](design/index.html#G06). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Unsupported combination:** These choices cannot be fulfilled together. Review the highlighted options.
- **Manual estimate:** Staff will quote this configuration after review.
- **Ordering unavailable:** This game has not been enabled for new orders.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Use the common interaction contract; do not invent additional commercial promises.

**Journeys:** F30.

## G16 — Review your Wild Rift request.

**Area:** Configure · **Current route:** `/games/:slug/services/:service` · **Layout:** review

Estimated price — final quote after staff review.

### Page anatomy & content

1. **Selected game** — Wild Rift · Service and validated configuration summary.
2. **Your selections** — Show every selected goal, play mode, option and scheduling preference, with Edit links.
3. **Before sending** — No payment is due. Staff review scope, price and delivery expectations.

### Fields

| Label | Control | Example/default | Help / conditions |
| --- | --- | --- | --- |
| Additional instructions | textarea |  |  |
| I accept the current service terms | checkbox |  |  |

Allowed options: .

### Actions & destinations

- **Sign in to send** → [I01](design/index.html#I01). Prototype actions are simulations only; guards must pass in the eventual application.
- **Edit selections** → [G11](design/index.html#G11). Prototype actions are simulations only; guards must pass in the eventual application.

### States & recovery

- **Catalog changed:** Review updated choices before sending.
- **Manual estimate:** No amount is promised until the staff quote.
- **Loading:** Keep the page title and stable layout. Show progress in the affected region; do not display empty data as a loaded result.
- **Request failed:** The action could not complete. Keep safe input, explain the recovery and retry only after checking whether the prior action succeeded.

### Responsive / accessibility

Stack content in reading order. Keep one primary action; secondary actions remain in the page, never behind hover.
Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.

Shared custom-order flow F01 after submission; carry this game context into every order, quote, invoice and fulfillment view. These are future catalog examples.

**Journeys:** F30.
