# Homepage and game hubs — owner revision

23 September 2026 · Design only · Visual acceptance pending

This revision replaces the homepage’s MLBB-first structure. Every game has equal prominence. The production catalog is not being changed. The green identity, landscape hero and fonts remain. Application development, the old cameo work and R10/R11 remain held.

## Homepage P01

Order: quiet hero → activity → Boost → Accounts → Shop → Crypto payments → News and guides → game selection → utility footer. The hero has short copy and no browse/find buttons. Homepage navigation has the brand, support and sign-in; remove Games, Accounts, Sell an account and How it works. Remove fighting-spirit content.

Each service introduction has one “Choose your game” action targeting `#P01/games`. Native page scrolling, a soft scroll when permitted, and focus on the destination heading make the destination understandable to keyboard and screen-reader users. Repeated clicks must still scroll when the hash already matches. No forced scroll capture or motion gate.

Game cards have equally sized image areas, names and available-service tags. Tags describe capabilities, not separate small click targets. The full available card opens the game’s service chooser. A paused card has a dimmed image, readable status text, no link and no keyboard activation. Missing services are omitted, not advertised as selectable. Catalog order and availability in this artifact are fictional examples. Dedicated art for VALORANT, Dota 2 and Wild Rift remains a clearly marked placeholder.

## Game hubs G01–G06

Game artwork, name, short description and statistics remain in the document across service selection. The game navbar has only the logo, Support and Sign in; remove Games, Accounts, Sell an account and How it works here too. The header scrolls normally rather than taking over the viewport.

The initial view has large service cards for supported categories and the featured rail. It has no combined service feed and no “All services” control. Selecting a card replaces the chooser with only that service and its related offers. A small “Back to choose service” link returns to the cards. Buying/selling entry actions live inside Accounts, not in the navbar. Existing P12/S02 destinations remain design templates; per-game downstream content/context is a later design pass.

Selection remains URL-backed (`#G01/boost`, `/accounts`, `/shop`, `/news`); the bare game hash restores the chooser. Browser Back restores the previous view. Invalid and legacy `/all` fragments show the chooser. When a focused chooser card becomes hidden, focus moves to the selected service heading; the back link restores focus to the chooser heading. Hidden panels leave layout and the accessibility tree. Short entry transitions respect reduced motion.

Featured offers sit above ordinary service content, with a restrained green border/glow rather than flashing. The initial view shows features across categories; selecting a service shows related featured items only. The offer action selects its service. News uses an editorial “Editor’s pick” badge, not a false discount. Empty promotion inventory should omit the rail. Promotions never override paused availability.

Production offer anatomy: title, category, exact scope, original/current price for a real discount, currency, expiry with timezone if applicable, verified remaining quantity if applicable, eligibility and availability, and clear detail action. Do not invent prices, stock, timers or urgency. The current design uses descriptive sample promotions without live commercial claims. Paused direct-entry views retain information and existing-order access but cannot initiate new purchases.

## Statistics and claims

The prototype labels metrics as illustrative. Active orders means paid orders in fulfillment; completed orders excludes cancellations. Win rate applies only to eligible completed win/loss boosting matches in the stated period and must include a sample size and calculation definition before publication. It is not a promised customer outcome. Do not mix account/shop transactions into win rate; non-match games need a meaningful alternative metric. WoW uses completed objectives instead of a match win rate in its hub.

Loading reserves the metric area; unavailable values use “—”; stale values show the last-update time and stop claiming to be live. Publish no fabricated counter, generic security guarantee, instant-confirmation promise or guaranteed win rate. Provider and network verification determine payment timing.

## Newly requested design scope

Shop and news were explicitly requested in this revision; this supersedes their prior exclusion as unsolicited Stitch concepts. It does not introduce a wallet, escrow, automatic seller compensation or new runtime functionality.

The homepage and hub now cover their discovery and overview. Detailed shop product, delivery, refund/exception and staff catalog flows, and news article/search/editorial publication flows still require their own design passes before development. Open decisions: eligible goods, delivery methods, regional requirements, fulfillment rules and editorial content/ownership. Do not imply those downstream screens or business terms have been finalized by this change.

Seller proceeds remain direct crypto under the accepted offer, supporting either purchase-before-resale or payout-after-sale. Custom boosts require a final staff quote; fixed packages have defined prices without individual quote approval. Payment confirmation never bypasses verification.

## Review path

Open P01, inspect the section order, activate each of the five Choose your game links and inspect the final catalog. Open any active game, choose a service → Back to choose service → browser Back, and verify the game introduction stays intact. Inspect a game without Shop and the paused Wild Rift card. Review at desktop, tablet and narrow phone widths. This is a homepage/hub design revision, not acceptance of all older screens or authorization to implement.

## Homepage section entrances

Five service introductions now have native SVG/CSS icon compositions. Boost uses a lightning bolt, chevrons and two speed passes; Accounts uses a profile, exchange and verification marks; Shop uses a bag and sparkles; Payments uses a dollar symbol surrounded by BTC/ETH/USDT/LTC-style typographic marks; News uses an article and update marks. These are decorative design symbols, not a statement of supported assets, fiat checkout or provider integration. Real checkout remains authoritative for supported currencies/networks.

At 18% visibility, each section plays one short entrance per page render: gentle text/card rise, icon scale/rotation, staggered small badges and a soft halo. Motion settles within about 2.2 seconds; there are no infinite loops, audio or scroll interception. All content is visible if observation is unavailable. Decorative art is hidden from assistive technology and does not intercept clicks. System reduced-motion and the atlas Reduced motion preview show static ornaments. The observer disconnects on screen changes. Artwork uses no new downloads or external libraries.
