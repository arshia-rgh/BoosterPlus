# Homepage and game hubs — owner revision

23 September 2026 · Design only · Visual acceptance pending

This revision replaces the homepage’s MLBB-first structure. Every game has equal prominence. The production catalog is not being changed. The green identity, landscape hero and fonts remain. Application development, the old cameo work and R10/R11 remain held.

## Homepage P01

Order: quiet hero → activity → Boost → Accounts → Shop → Crypto payments → News and guides → game selection → utility footer. The hero has short copy and no browse/find buttons. Homepage navigation has the brand, support and sign-in; remove Games, Accounts, Sell an account and How it works. Remove fighting-spirit content.

Each service introduction has one “Choose your game” action targeting `#P01/games`. Native page scrolling, a soft scroll when permitted, and focus on the destination heading make the destination understandable to keyboard and screen-reader users. Repeated clicks must still scroll when the hash already matches. No forced scroll capture or motion gate.

Game cards have equally sized image areas, names and available-service tags. Tags describe capabilities, not separate small click targets. The full available card opens the game’s all-services view. A paused card has a dimmed image, readable status text, no link and no keyboard activation. Missing services are omitted, not advertised as selectable. Catalog order and availability in this artifact are fictional examples. Dedicated art for VALORANT, Dota 2 and Wild Rift remains a clearly marked placeholder.

## Game hubs G01–G06

Game artwork, name, short description and statistics remain in the document as service selection changes. The header is not fixed across the full viewport: it scrolls normally so mobile content remains usable. Service navigation sits immediately after the introduction. All services is the initial selection and is always available as a reset. Only supported categories appear.

Links store selection in `#G01/boost`, `/accounts`, `/shop`, `/news` or `/all`. Browser Back restores the selection. Switching keeps the header mounted and keyboard focus on the selected navigation link. Hidden sections leave both layout and the accessibility tree. Visible sections enter with a short 8px/opacity transition; reduced motion removes animation. Invalid or unsupported service fragments fall back to All services.

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

Open P01, inspect the section order, activate each of the five Choose your game links and inspect the final catalog. Open any active game, switch service → All services → browser Back, and verify the game introduction stays intact. Inspect a game without Shop and the paused Wild Rift card. Review at desktop, tablet and narrow phone widths. This is a homepage/hub design revision, not acceptance of all older screens or authorization to implement.
