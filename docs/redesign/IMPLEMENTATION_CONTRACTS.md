# DI00 — implementation contracts

**Historical design/qualification baseline.** For current behavior and the ongoing review, use the [UX165 route and flow inventory](reviews/UX165_COVERAGE.md) and [current implementation progress](../progress.md). The later delivered changes supersede conflicting details below: customer/admin/booster identities and portals are independent; credentials are exchanged through admin-requested chat forms; consignment publication does not require credential handover; buy-first still requires actual seller-payment evidence; seller payouts are recorded manually by the owner; customer deletion remains disabled. Earlier qualification receipts certify only their recorded versions, not the current application.

25 September 2026. Application implementation is authorized through DI15. R10/R11 remain held. Baseline: accepted atlas at `2923885`, roadmap at `2972498`. This contract and the [shop/news addendum](SHOP_NEWS_ADDENDUM.md) specify implementation details without changing the accepted visual direction. The [traceability matrix](implementation-matrix.json) tracks each accepted screen's route, API family, permission, state coverage and delivery phase. `implementation-routes.json` preserves every existing route.

## Portal and route boundaries

Keep two React builds and one frontend dependency graph: storefront serves public, customer and the separately laid-out booster portal; admin remains a separate build. `make -C frontend dev` starts both through the existing launcher; `dev-storefront` and `dev-admin` start individual builds. `make -C backend dev-up` supplies local dependencies and explicit development migrations. No third build or production routing change is needed for DI00.

| Audience | Entry | Home | Permitted identity | Session rule |
| --- | --- | --- | --- | --- |
| Customer | `/login` | `/account` | Authenticated account, subject to suspension and ownership | Customer session never confers staff capabilities |
| Booster | `/booster/login` | `/booster` | Existing booster/admin/owner role, explicitly authenticated here | Fresh first factor and MFA every sign-in; assignment guards on records |
| Admin | `/admin/login` | `/admin` | Existing admin/owner role, explicitly authenticated here | Fresh first factor and MFA; owner-only controls remain owner-only |

Authentication will use `/api/v1/auth/portals/{portal}/…` for the session, email, Google, logout and MFA operations. `portal` is a strict enum, not an arbitrary return URL. Existing `/auth/…` aliases may serve customer migration only; they must not accept a staff cookie or silently create a staff session. An unfinished legacy challenge is restarted; existing enrollment/identity records are retained. Migration invalidates ambiguous legacy staff sessions; fresh sign-in is the recovery.

Separate browser-binding and session cookies per audience use Secure/HttpOnly/SameSite and the existing production host-prefix policy. Server sessions and challenges store their audience. The caller supplies an explicit portal context to shared endpoints, but that value is never authorization: server endpoint policy, selected cookie's stored audience, role, resource ownership and recent verification must all agree. Never search other cookies when the requested session is missing. Admin/booster-prefixed endpoints have a fixed required audience. Customer order APIs require customer audience, even for a staff member acting as a customer. Shared media/session/profile endpoints define allowed audiences explicitly in the API contract.

Google state/nonce/PKCE, email code, MFA pending state and recovery all bind to the same browser and audience. First-factor-only staff sessions cannot read staff data. Account suspension and authentication-version changes invalidate every portal. Local logout affects only its portal; revoke-all is explicit. SSR/private cache and client query keys include audience and user; sign-out/revocation closes streams and clears private state.

Return paths are relative, parsed and allowlisted for their portal. Reject protocol-relative URLs, external origins, encoded traversal, wrong-portal routes and token/secret query values. Unknown/unsafe returns use that portal's home. Return after reauthentication restores the screen and safe draft, never auto-executes a payment, reveal, publication or role mutation.

## Persistent URL and state contract

- Public game root `/games/:slug` owns the hero, statistics, offers and background. Children `/boost`, `/accounts`, `/shop`, `/news` select a service; a small Back link returns to the chooser. Existing `/services/:service`, `/packages/:pack` and `/reviews` remain children of the same mounted game layout.
- New accounts `/games/:slug/accounts/:id`, shop `/games/:slug/shop/:product` and articles `/games/:slug/news/:article` retain that game. Review/recipient steps use a bounded `step` parameter; the server decides whether the requested step is valid. Back restores nonsensitive selections. An order confirmation can deliberately enter `/orders/:id` with a clear My account destination.
- `/accounts` remains a cross-game compatibility discovery entry that asks for a game; filtered links select the appropriate game. `/accounts/:id` resolves the listing's game and redirects to its canonical game-local detail only after public availability validation. It never reveals unpublished listings. `/sell` and `/sell/:id` remain the customer's sales workspace; `/sell/new?game=…` preserves validated game intent. Unknown/retired listings have a useful unavailable view, not a redirect loop.
- Customer `/orders/:id?section=overview|messages|progress|payment|help`, booster `/booster/orders/:id?section=…` and admin `/admin/orders/:id?section=…` render local sections under a persistent record layout. Unsupported sections fall back to Overview; unavailable actions explain their prerequisite. Accounts use Delivery, shop uses Delivery, boosts use Progress; no inappropriate rank/booking tabs.
- List state uses allowlisted `q`, `status`, `game`, `page`/cursor parameters. Back-to-list carries validated state, not arbitrary URLs. Changing a filter resets pagination. Refresh/deep links preserve section; browser Back/Forward restores content and relevant scroll/focus without submitting.
- Drafts are keyed by portal/user/record/version and scope (public message versus internal note). Nonsensitive checkout intent can survive an authentication round trip; private credentials, MFA codes, recovery codes and recipient secrets never enter URL/localStorage or a generic draft cache. Private drafts are memory-only unless an authorized server draft endpoint is deliberately implemented. Logout/access loss clears them.
- Customer panel identity never persists into staff pages. Activity is customer-scoped, bounded and stale-aware; nonmodal on desktop, modal on narrow expansion with inert background, Escape and focus restoration. A collapsed element cannot capture wheel/touch events. No customer activity during staff authentication.

## Shared contracts, backfills and public claims

| Resource | Contract | Upgrade/guard |
| --- | --- | --- |
| Game capabilities | Published capability set, paused reason, service availability and game-specific content/art focal data | Default from currently published supported services; new shop/news remain off until configured |
| Promotions | Explicit target/version, start/end UTC, optional capacity basis, approved displayed price/discount, ordering | Never derive scarcity from clicks; authoritative purchase revalidation; historic orders immutable |
| Public metrics | Aggregated eligible record counts, period, sample size, refreshed time; source-owned definitions | No private IDs; configurable minimum sample/freshness thresholds; missing evidence renders unavailable, not zero |
| Homepage/policies | Versioned typed content, publication history and policy version references | Read old versions; migration must not rewrite terms already accepted by an order |
| Shop | Explicit shop order kind and immutable product/recipient/price/terms snapshot | Reviewed SQL migration; every order-kind switch audited across finance, activity, privacy, reports and notifications |
| Articles | Versioned draft and publication, slug/game/type, sanitized content, scheduling job | Public reads use published revision only; private preview never shares public cache |

Metrics: active orders count paid orders actually in fulfillment; completions exclude cancelled orders; win rate counts recorded eligible match wins divided by eligible completed matches over the labeled period, with sample size. Shop, account sales and non-match objectives are excluded. Games without a match metric use an appropriate objective statistic or omit the metric. Do not infer a win-rate promise from a historical percentage. Freshness and sample thresholds are configurable policy, not invented claims.

Content/rendering budgets reuse the current checked frontend home/experience budgets and existing accessibility thresholds. New image/route bundles must be measured against those budgets; increases require documented reason and review, not disabling the gate. Record representative 320/390/768/1440 widths, short viewport, reduced motion, 200% zoom, keyboard and touch behavior. Query additions use bounded pages/projections; add query-count and concurrency evidence when extending overview or promotions.

## Integration and test ownership

The matrix's API paths are existing contracts unless tagged `proposed`. Exact API operation methods and payloads for new domains will be added to OpenAPI before their implementation; names in this design contract are not promises of deployed endpoints. Existing APIs retain their security/state behavior unless a reviewed migration explicitly changes them.

Each matrix row inherits every named state in `screens.json`, plus loading, empty, validation, access loss and recoverable failure applicable to its resources. The row records scenario labels to turn into component/browser/API coverage, not assertions that tests have already passed. All rows start `planned`. DI14 accepts complete F01–F31 plus SN01–SN06; DI15 independently requalifies. Completion requires evidence links and actual verified commits.

Schema changes use hand-authored versioned SQL and explicit Cobra commands. Verify an isolated old database upgrade, concurrent state changes and readable historical records before replacing any contract. Do not issue production migration commands in this stage. No real payment or outgoing transfer is needed to implement tests; use isolated fixtures and preserve R11 live qualification.

## Publication decisions kept separate from engineering

The owner approved manual shop fulfillment and staff-managed editorial. Product families, regions, prices, recipient requirements, delivery/cancellation/refund terms and exact retention/contact content remain owner-entered publication data. No catalog fixture becomes a live offer. The implementation provides validated configuration and fails publication closed when required terms are missing; this avoids blocking unrelated engineering or inventing commercial policy. New visual addenda are included in the final owner walkthrough, with material changes highlighted before activation.
