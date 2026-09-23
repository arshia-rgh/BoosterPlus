# Shared experience — 23 September owner revision

Design-only review. Application development and final launch R10/R11 remain held. This supersedes the earlier homepage/game notes where placement or navigation differs.

## Navigation, help and page atmosphere

Remove Games, Accounts, Sell an account and How it works from the top navigation on every screen. Keep logo, support and identity actions. Workspace sidebars and the narrow Workspace menu retain task navigation; these are not marketing navigation.

Every footer contains Contact us, Help/FAQ, order support, service terms, privacy, refund/cancellation terms, My account and accessibility/motion controls. Contact routes to the existing support design; no invented email, office address or social account. Policy destinations remain owner-content templates, not newly authored legal terms.

The original homepage ascension image is the backdrop on non-game screens. Every game uses its own specific image for hero, discovery card and background. A slow 24-second scale/translation gives atmosphere without moving text; Pause background motion in the footer stops it everywhere for the current preview session. The OS reduced-motion preference always disables it. Contrast comes from dark surfaces and overlays, not blur over text. Artwork source inventory is in ASSETS.md and the asset manifest.

## Homepage additions

Community cards scroll horizontally using arrow buttons, touch or keyboard focus. Arrow controls disable at the ends, announce movement and use reduced-motion-aware scrolling. No autoplay. Fictional comments are explicitly labeled; actual customer reviews require publication consent and moderation before use. FAQs use native disclosures with clear support links. Both additions precede the bottom game selector, retaining the agreed final discovery destination.

## Games, offers and embedded flows

Order: game hero → stats → limited-offer rail → large service chooser → game FAQ → footer. When a service is selected, a small return link precedes its filtered offers and workspace. Only boost/account/shop offers appear here. News has no empty promotion rail. The old bottom “Worth a closer look” section is removed.

Offers distinguish limited quantity, limited time and discounted examples. This prototype contains no real price, stock or expiry; publication requires verified values and conditions. Hide expired/exhausted offers or label unavailable without a purchase action. Hide the rail when no offers qualify; never duplicate it below service content. A paused game has no active promotional rail or new-order form, including direct nested links.

Nested design fragments preserve the game shell: `#G01/boost/P04` for the custom form, `#G01/accounts/P12` for listings, and subsequent review/auth/payment previews within the same game. The hero, name, stats and backdrop remain in the DOM. Only the inner workspace changes. Back returns to the service, then chooser. Fields are held in detached in-memory view nodes for preview Back/Forward; nothing is sent or stored persistently. Switching the identity preview to Visitor clears those cached nodes. Real draft validation, expiry and cross-session recovery remain implementation work.

The MLBB example has existing full account/configuration templates. Other games use their own request templates; account inventory is an explicit empty example rather than mislabeled MLBB ranks. Their final game-specific intake/catalog rules remain undecided. Shop/news detailed downstream screens retain their previously documented pending design scope. My account, order history and support are deliberate exits from the game shell.

## Signed-in corner activity panel

Use the atlas “Preview as” selector: Visitor, Signed-in customer, no ongoing orders, or updates unavailable. This is an explicit visual fixture and never authenticates a user. Visitor mode has no panel.

A compact lower-right launcher displays ongoing orders and keeps Chat with support visible. Opening it expands a nonmodal, blurred-surface panel above content (z-index 80), below the specification drawer. It shows a sample boost’s status, current milestone, completed/agreed milestones and last update, plus a handover order. Clicking an order opens its My account view and collapses the panel. Support opens Messages. Escape collapses with focus returned to the launcher. The panel does not lock scrolling, trap focus or blur the whole site. No idle auto-open or flashing progress.

On phones the panel fits the viewport, caps its scrollable body height and retains its collapse and support controls. The page has bottom clearance so final controls remain reachable. Empty state links to history; unavailable state gives an order-workspace recovery path without inventing zero progress. Stale production data must show a recorded timestamp rather than claim live game telemetry. Never reveal another user’s orders; runtime authorization and revoked-session cleanup still require implementation/qualification. No credentials, chat excerpts or financial secrets belong in the compact preview.

## Review

Check homepage arrows and FAQ disclosures; game offer placement and service filtering; custom-form/listing navigation while the hero persists; form Back/Forward; paused-game direct entry; footer links and ambient pause; visitor vs signed-in/empty/error panel; order and support navigation. Inspect desktop and phone, keyboard focus and reduced motion. No passing design check constitutes application or live-payment qualification.
