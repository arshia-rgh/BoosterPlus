# PLAYORA — UI/UX improvement roadmap

Status: UX01–UX07 delivered. UX08 admin operations implemented for verification. UX09–UX10 follow; R10/R11 remain held. See `docs/progress.md` for gate evidence.

This is the next product-design roadmap. R10 and R11 are **on hold**, with their complete retained scope in [final-launch.md](final-launch.md). Completing this roadmap does not authorize production work or launch. The owner has authorized implementation; present representative account/chat work early for review.

The owner renamed Booster Plus to **PLAYORA** on 13 September 2026 and requested a new logo and separate reusable background. The latest clarification is binding: **keep the current overall green website theme and change the details; the logo must match it.** This supersedes the earlier permission to explore a different overall theme. Preserve the accepted font families, existing website background/art direction, image quality and low-rank-to-high-rank scroll experience with its accessibility behavior. Improve layout, typography sizing, line height, wrapping, spacing and interaction within that identity. The latest refinement adds game-character social artwork, a detailed O in the logo and richer scroll-driven character animation in the plan. New PLAYORA artwork complements the existing green identity and is available for social media; it does not require replacing the homepage background. Assets and planning are delivered; application rebranding and UX01–UX10 implementation are now authorized.

## 1. Outcomes and constraints

- Customers immediately understand their order status, what happens next, whether they owe a payment, and where to ask for help.
- Chat feels like a conversation: readable history, a readily available composer, clear participants, reliable sending and recovery.
- Account pages show the current task first. Settings, long histories, technical identifiers and uncommon actions have deliberate secondary locations.
- Staff can triage, investigate and act without scrolling through every unrelated module. Dense operational information remains available when needed.
- All public, customer, seller, booster, administrator and owner routes receive a design decision and verification evidence. No function disappears because it is inconvenient to redesign.
- Preserve passwordless Google/email login, staff MFA at every sign-in, recent verification for sensitive actions, authorization, explicit consent, financial evidence and immutable accepted agreements.
- Custom boosting is an estimate until staff quotes and the customer accepts. Fixed packages and available accounts follow direct checkout. No wallet, payment bypass, fabricated counters, fake reviews, inferred win-rate promises or automatic MLBB match tracking.
- The Go API remains authoritative. UI work may include narrowly necessary API changes, with explicit contracts, tests and SQL migrations, but cannot substitute browser state for business decisions.

### 1.1 PLAYORA brand foundation and rollout

**Current assets for review:** [logo v2 with a detailed O](docs/brand/playora/playora-logo-v2-dark.png) and [game-character social background](docs/brand/playora/playora-social-characters.png). The [previous logo](docs/brand/playora/playora-logo-dark.png) and [abstract green aurora](docs/brand/playora/playora-aurora-background.png) remain available; the aurora may be useful for a quiet decorative surface later. See the [asset guide](docs/brand/playora/README.md) for dimensions, usage, limitations and exact generation prompts. These are preserved PNG masters under documentation. UX01 delivered the application vector identity; UX05 adds separate optimized character layers. The logo is an opaque dark lockup, not a transparent/vector export.

**Design direction:** a geometric P with a play opening and rising stroke; a clear PLAYORA wordmark with a sage portal-ring O and slightly increased Y–O spacing to distinguish PLAY from ORA without changing the name; the existing deep forest surfaces, sage-green accents and warm off-white text. Use game-character artwork for the main social direction and retain the abstract green aurora for optional complementary details; keep the current website background by default. Keep account, chat, checkout and admin work surfaces quiet and mostly solid so messages and decisions remain easy to read. A gaming brand should still feel dependable around money, credentials and support.

| Token intent | Proposed starting value | Rule for implementation |
| --- | --- | --- |
| Page background / raised surface | `#09110F` / `#101D19` | Distinguish layers without stacking unnecessary cards or adding noise behind text. |
| Primary / secondary text | `#EEEAE0` / `#AFBEB4` | Validate actual contrast on every surface, including artwork, opacity and disabled states. |
| Sage green / existing warm accent | `#B4E8CB` / `#DFC08A` | Use dark text on bright filled actions where tested; reserve gradients for identity and limited decoration. |
| Status and focus | Dedicated semantic tokens selected in UX01 | Do not reuse brand hue as the only indicator of success, warning, error, unread state or focus. Pair color with text/icon cues. |

These values come from the existing homepage tokens in `frontend/app/home/home.css`; they are the visual baseline, not a completed contrast certification. The older shared stylesheet also has a lime accent (`#C9FB62`); reconcile details during UX01 without replacing the overall green identity. Verify WCAG AA text contrast (4.5:1 ordinary, 3:1 large), non-text controls/focus where applicable and forced-colors behavior during UX01. Interface details must repair hierarchy within the current green theme; richer marketing and character animation follows section 1.2. Keep the current font families; use a deliberate heading/body/metadata scale. Do not stretch the logo lettering into a substitute UI font.

**UX01 identity production:** after approval, create an editable vector master faithful to the chosen mark, transparent dark/light lockups, a monochrome variant, symbol-only avatar, favicon/app icons and documented clear space/minimum sizes. Verify actual alpha and clean edges; never ship a fake checkerboard. Check the wordmark, detailed O and PLAY/ORA separation at navigation size, and the symbol at 16/32 px and inside circular crops. Simplify the O’s inset arc in a small-size variant if needed, preserving its recognizable silhouette; do not animate it as a permanent loading spinner. Raster drafts are usable now at their native sizes, but are not the final responsive logo system. Preserve the source masters and record derivative provenance.

**UX01–UX02 rename inventory:** audit both React builds, headers/footers, account/staff/booster shells, accessible names, sign-in/MFA screens, email sender display names/templates, notification copy, page titles, error pages, manifests, favicons, share metadata, support copy and generated customer-facing documents. Use the spelling PLAYORA consistently. Introduce a shared brand configuration appropriate to the separate builds without coupling backend/frontend dependency graphs. Test rendered labels, emails and metadata, not only string replacement.

A display-name change must not blindly rename Go modules, database names, migration history, environment variables, Docker resources, object keys, API identifiers, cookies or OAuth callbacks. Inventory those separately and change only where necessary with compatibility and regression tests. Retain historical accepted agreements, receipts and audit records accurately. Update current editable business content through its governed publishing workflow; the brand name does not invent a legal entity or amend accepted terms. Domain, support email, Google consent-screen and provider merchant identity changes use owner-provided values; external activation belongs to the held final-launch plan.

**UX05 social and marketing kit:** produce crop-reviewed landscape cover, square post/avatar, portrait post and vertical story derivatives from approved masters. Use platform requirements verified at export time, with generous safe areas for circular avatars, mobile crops and overlaid controls. Keep the background available without embedded text or logos, plus editable overlays for future campaigns. Prepare Open Graph/share assets and export web-optimized responsive versions with explicit dimensions, loading priority and an agreed byte budget; do not serve an oversized social master on every page. Do not claim the current background is 4K or optimized for every platform. No automatic social publishing is authorized.

**UX08 and UX10 consistency:** apply the same accessible component tokens to admin and booster workflows without a decorative hero behind operational tables or chat. Scan all user-facing surfaces for unintended old branding; allow documented historical/internal names. Review desktop/mobile screenshots, light/dark logo placement, reduced motion, reverse scrolling, failed image loading and browser zoom. Retain the current homepage background; any proposed use of the new artwork must fit the existing green art direction and be reviewed in context. Owner review covers logo, background, representative account/chat/admin screens and the complete brand inventory. R10/R11 remain on hold.

### 1.2 Game-character art and rich motion direction

The owner explicitly wants game identity and moving characters, including movement linked to continued scrolling. This is committed design scope for UX01/UX05/UX10, not an optional future idea. The new social composition depicts generated interpretations of Miya (Mobile Legends), Illidan (World of Warcraft) and Ahri (League of Legends) in the website’s forest-green fantasy atmosphere. These are art references, not additions to the live service catalog: MLBB remains the first available game, and only published admin-declared offerings receive purchase links. Preserve the original website background and the separate abstract aurora file.

**Visual story:** make the homepage feel like a progression through a game world. Characters frame the story and guide the eye toward the rank journey and service choices. Keep headline, estimate and CTA positions stable and readable. Use a few strong scenes rather than continuous movement across every surface; customer workspaces remain calm.

| Scene / location | Proposed movement | Stable UX and fallback |
| --- | --- | --- |
| Homepage opening | One foreground MLBB character gently settles into frame, with subtle breathing, hair/cape movement and restrained magical light; distant architecture has a smaller depth offset | Hero text and CTA render immediately. Existing artwork remains visible. A polished static pose serves reduced motion, no JS and failed animation assets. |
| Rank progression scene | Preserve the low-to-high profile transformation. As scroll progress advances, the character moves slightly across/deeper into the scene, equipment glow and pose respond, and foreground/background layers move at different rates | Motion is reversible with scroll. Rank labels and explanation remain readable at every checkpoint. Never imply that a fictional illustration is a real customer result. |
| Transition into service discovery | Character moves toward the edge and settles as packages enter; short masked reveals and staggered cards establish hierarchy | Cards and purchase controls are usable without waiting for animation. No horizontal scroll trap or character covering the estimator. |
| Published game feature / campaign | A game-specific character has a short idle loop and a restrained entry linked to section visibility; optional pointer depth complements scroll on capable desktop devices | Show only relevant published catalog destinations; no implied WoW/LoL checkout at MLBB-only launch. Pointer effects are supplementary; touch and keyboard retain full functionality. |
| Brand details | The O’s portal arc may make one subtle entry movement; green highlights, button press feedback and tab/drawer transitions reinforce actions | O remains legible. No perpetual logo spinning, fake loading or flashing accents. Focus and status changes stay explicit with motion disabled. |

**UX01 motion preparation:** inventory the existing `frontend/app/home/motion.ts` behavior and tests; define a shared full/reduced preference, scene progress, easing, layering, interruption and cleanup rules. Produce a storyboard with start, quarter, midpoint, three-quarter and end states for a single MLBB scene on desktop and mobile. Define idle motion separately from scroll position so pausing scroll does not cause drift. Review composition beside account/chat layout work; do not postpone the main UX repairs for an elaborate effects engine.

**UX05 asset production and implementation:** prepare separate character, environment, foreground, light and mask layers with clean alpha, consistent edges and static posters. The social PNG is flattened art, not a layered scene, character rig or animation. Actual breathing/cloth/weapon/pose movement requires prepared articulated layers, a rig, sprite frames or a short approved animation asset; translating an entire flat PNG alone does not satisfy the character-animation brief. Select the lightest method that demonstrates convincing motion. A full 3D runtime is not assumed; introduce one only if the prototype proves a clear benefit within existing budgets. Record source, character identity, allowed use, modifications and export provenance for each asset. Preserve the existing requirement to review publication rights; generated depictions are not official licensed game assets. That publication check does not block layout or motion infrastructure work.

**Scrolling and interaction:** retain native wheel/touch/keyboard scrolling, normal browser history and scroll restoration. Do not hijack scroll speed, require completion of a cinematic, trap users in pinned panels or force sideways navigation. Clamp progress and render the correct pose when entering mid-page, reversing quickly, resizing or restoring history. If a bounded sticky scene is used, give it a clear end and a direct path onward. Decorative layers cannot intercept clicks or enter the tab order, obscure focus, shift content or cross into forms/chat. No auto-playing sound. Starting amplitude guidance: small scene-relative translations, slight rotation and limited foreground/background depth; tune against real devices rather than applying the same large movement everywhere.

**Comfort and control:** the existing motion control applies to all new scenes, idle loops and pointer effects. Honor the OS preference on first render and when it changes; a persistent reduced setting gives an immediate static composition with all information/actions intact. Provide a discoverable pause/reduce control for ongoing decorative loops. Pausing decoration must not pause payment reconciliation, countdown truth or new-message delivery. This adopts the user-control approach in [W3C Animation from Interactions (AAA)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [W3C Pause, Stop, Hide (A)](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html); it is a project design requirement, not a claim of whole-site AAA conformance.

**Performance and evidence:** extend the current measured homepage asset/layout-shift checks; do not raise budgets just to fit decorative work. Load the static hero first, defer noncritical character layers/loops, reserve dimensions and use responsive exports. Animate transforms/opacity where practical, update only visible scenes, pause offscreen/hidden-tab loops and remove listeners/frames on route exit. Mobile receives fewer layers and smaller motion, with a static fallback when needed. Record frame pacing, main-thread work, memory and transfer cost on a named midrange mobile profile and a desktop profile; target smooth display-rate movement without long blocking frames. No unmeasured 60-fps claim. Simplify the scene if it cannot meet its budget.

**UX10 acceptance:** owner-reviewed video captures and still checkpoints must demonstrate actual character motion, smooth reverse scrolling, abrupt scroll jumps, resize/orientation changes, browser back/forward, touch/keyboard navigation, reduced-motion changes, pause/resume, background-tab return, slow/failed assets and route cleanup. Verify no text overlap or hidden CTA at any intermediate position, not only first/last frames. Run deterministic browser assertions plus visual/manual checks in Chromium, Firefox and WebKit; avoid screenshot timing races by setting explicit animation progress in test fixtures. Include real mobile review where available and state its absence honestly. R10/R11 remain held after this design work.

## 2. Research and present evidence

### 2.1 What was inspected

The four supplied Google share links could not be resolved by the web reader. The matching sites were identified from their exact titles and opened directly. Research used the rendered desktop pages, visible navigation and public demo screens below. No external customer account was created, no real order was submitted and no message was sent. Private paid dashboards, seller areas and staff panels were not accessible; no conclusions about their hidden behavior are asserted.

| Reference and inspected surfaces | Useful observed pattern | PLAYORA decision and limits |
| --- | --- | --- |
| [BuyBoosting homepage](https://buyboosting.com/) and [public dashboard demo](https://buyboosting.com/demo/) | Searchable game navigation; sample order title/status, progress stages, conversation and activity grouped together | Bring status and messages close together. Give primary tasks clear navigation. The public demo is presentation evidence, not proof of private reliability. Do not copy loyalty coins, auctions, guest checkout, timed promotions or claimed staffing statistics. |
| [Elo-Boost homepage](https://elo-boost.net/), [division configurator](https://elo-boost.net/boosting/purchase/division) and [members demo](https://elo-boost.net/members/order/demo) | Current/desired rank selection, distinct service choices and an adjacent summary; compact chat with composer inside its panel, alongside activity | Use an understandable rank/configuration flow and keep the composer with history. Separate order history from messages. Do not imply PLAYORA has their automated match data, self-assignment, subscription, store balance or their service promises. |
| [Boosting.pro homepage](https://boosting.pro/) and [LoL category](https://boosting.pro/games/lol-boost/) | Game/category navigation, product cards with a title, image and price, category breadcrumbs | Give packages and accounts consistent scannable cards and a clear route back. Its large catalog navigation and long descriptions would be excessive for a launch with one game; do not reproduce the whole taxonomy. |
| [Boosting Factory homepage](https://www.boostingfactory.com/), [LoL landing](https://www.boostingfactory.com/lol) and [division configurator](https://www.boostingfactory.com/lol/division-boosting) | Game-first entry; numbered configuration groups for ranks, mode, region and optional preferences, with a separate checkout summary | Group the admin-declared form into meaningful stages, keeping selected scope and estimate visible. Avoid overwhelming customers with every extra at once. Its financial options and guarantees do not define our policies. |

These are design observations, not endorsements or a conversion study. The proposed layout is original PLAYORA work. Competitor images, branding, text, rank assets and proprietary interfaces must not be copied into the product.

Additional design references: [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports moving infrequent detail behind clear controls; [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) informs narrow-screen and zoom checks; [W3C target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) informs touch controls; [W3C form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/) informs linked validation and actionable feedback. These inform the acceptance criteria below; they do not certify the current application.

### 2.2 Current PLAYORA audit

Reviewed existing R09 test screenshots for customer coordination, completed order detail, mobile seller intake, desktop operations, mobile reports and customer privacy, plus the route maps and relevant shell/form/chat source. These use synthetic fixtures. Screenshot files under `frontend/test-results/` are generated and may be overwritten; reproduce them with the existing browser runner. This planning audit is not a new authenticated walkthrough of every route or every viewport.

| ID / severity | Evidence and problem | Planned correction | Phase |
| --- | --- | --- | --- |
| A01 / high | `coordination-desktop.png`, `customer-privacy.png`, `customer-shell.tsx`: promotional workspace banner, identity heading, navigation and sign-out precede the actual task; privacy repeats its heading | One compact task header; persistent account navigation; profile menu for sign-out; no promotional banner repeated across work screens | UX01–02 |
| A02 / high | `coordination-desktop.png`, `support/thread.tsx`: nested message panel and separate tall send/attachment form; multiple refresh controls and instructional paragraphs displace conversation | Unified chat layout, compact composer, secondary attachment/help controls, unobtrusive connection feedback | UX03 |
| A03 / high | `fulfillment-desktop.png`, `orders/detail.tsx`: completed order still stacks fulfillment, cases, agreement, payments, actions, selections, review and histories into one long page | State-led overview and next action; explicit Messages, Details, Payments and History destinations; relevant case/proof/schedule context | UX04 |
| A04 / high | `intake-mobile.png`: submission status, commercial agreement, payouts and full event history compete in a long nested layout | Guided submission and sale stages; current decision above details; history secondary; plain-language sale/payout states | UX07 |
| A05 / high | `operations-desktop.png`: many similarly sized metric cards, then queues and account administration; little visual prioritization of urgent work | Attention queue first; a small summary row; grouped operational counters and separate customer/staff administration | UX08 |
| A06 / medium | `reports-mobile.png`: repeated report heading; large filter form before preview; narrow table wraps IDs/dates heavily and needs lateral inspection | Compact filter summary/drawer; explicit date basis; mobile row summaries and accessible detail view; technical export metadata secondary | UX08 |
| A07 / high | Owner reports overlapping/messy text across sections. Exact affected routes, content lengths and viewport combinations are not yet fully reproduced | Record each collision before fixing it; long-data fixtures, responsive layout audit, shared overflow/wrapping corrections and regression screenshots | UX01, UX10 |
| A08 / medium | `identity/identity.tsx`, privacy screenshot: generic “Done.” messages, raw category/state names and long identifiers make outcomes harder to understand | Task-specific success/error copy and readable labels; copyable references in details; preserve precise backend states underneath | UX02, UX04, UX08 |
| A09 / medium | `experience.css` applies broad heading/card/form styling across very different tasks; page-specific components add more nested surfaces | Separate marketing, workspace, editor and chat composition using shared, explicit component variants | UX01 |

Passing R09 tests established functional behavior and selected accessibility checks. They did not establish satisfactory information architecture or visual polish. The owner's assessment takes priority over previous descriptions such as “polished” or “complete UX.” No unsupported percentage of defects is claimed here.

## 3. Navigation and layout model

### Public storefront

Keep a compact header with Boosting, Accounts, Sell an account and Help, plus the account/sign-in control. These are proposed customer-facing labels; preserve existing links and route compatibility. At MLBB-only launch, lead directly to Mobile Legends without making users traverse a large empty game directory. Expand game discovery from real published catalog entries as more games are added.

The homepage extends the rank-transformation scroll experience with the character choreography in section 1.2. Keep the current artwork and overall green theme. Use the new PLAYORA art for social assets or complementary details only where it fits; preserve image quality and a static reduced-motion fallback. Improve CTA wording, service/package discovery, section order and spacing. Separate “Request a custom boost” from “Browse fixed packages.” Explain the custom quote process before requesting payment; do not overload the hero with operational details.

### Customer workspace

Desktop: a compact sidebar with Overview, Orders, Messages, Saved items and Selling; Account settings and Help in a secondary group. Activity appears through an accessible notification control and a full history page. Saved items contains favorites and availability alerts, with distinct consent controls. Settings contains Profile, Notifications, Sign-in & security, and Data & privacy. Seller functions appear when relevant, while “Sell an account” remains discoverable for new sellers.

Mobile: a small header and four primary destinations (Overview, Orders, Messages, More). More exposes every secondary destination with labels. Test this structure against the actual task list in UX02; avoid a horizontally wrapped wall of tiny navigation links. In a conversation, make the composer and back-to-inbox navigation take priority over bottom navigation. Preserve safe-area space and keyboard visibility.

`/account` becomes a useful overview, with profile/security in a dedicated settings view. Existing `/orders`, `/support`, `/sell`, `/favorites`, `/availability`, `/notifications`, `/reviews`, `/privacy` and inbound links remain valid. Any new nested route or redirect must preserve authorized context, browser history and return destinations. Proposed navigation labels are not permission changes.

### Order workspace

```text
Order title · game/mode                    Current status
Next action and its reason                 Relevant deadline
Overview | Messages (unread) | Details | Payments | History

Current work / latest approved proof       Scope + accepted total
Upcoming session, when applicable          Need help / service case
```

The overview changes with the real order state. The example is a layout contract, not a requirement to fit two columns at every width. On mobile, show status and the primary action first; details remain one clear tap away. A case that holds work stays visible outside a hidden tab. Never hide required scope, amount, fees or terms behind disclosure at the point of acceptance.

### Chat workspace

```text
Desktop
Inbox + filters | Participants · linked order · conversation actions
Thread rows     | Scrollable message history
                | New messages / connection feedback, only when needed
                | Attachment preview + compact message composer + Send

Mobile
Back · subject · participants/details
Message history
Attachment preview + composer + Send (above the keyboard)
```

Use one primary history scroller. The conversation rail is independently scrollable only on desktop; on mobile the inbox and thread are separate views. Order information opens as a details panel/drawer or a direct link. Do not place a second full order dashboard above the chat.

### Staff and booster workspaces

Admin navigation groups: Work (overview, orders, inbox, calendar), Commerce (catalog/packages, accounts, submissions, coupons, reviews), Finance (exceptions, refunds, payouts, reports), Administration (customers/staff, media, alerts, content/policies, privacy, jobs/audits). Display only permitted destinations; preserve backend authorization and the dedicated admin build.

Booster navigation stays focused on assigned work, messages and availability. Separate customer and booster contexts explicitly for people with both roles. Do not expose admin queues through a simplified shared menu.

## 4. Shared interaction and readability requirements

### Density, text and controls

- One page title and one primary action per task area. Secondary actions use restrained buttons or a labeled action menu. Destructive actions get their own explicit treatment.
- Use a consistent spacing scale (initially 4/8/12/16/24/32/48 px), roughly 16 px customer body text and 14 px secondary metadata. Staff tables may be denser while remaining zoomable. Tune against the existing font, not by shrinking text until it fits.
- Use ordinary text line height around 1.5–1.7 and readable line lengths. Large marketing headings stay on marketing pages; workspace headings are smaller. No fixed-height text boxes or forced single-line titles that hide essential meaning.
- Audit flex/grid minimum sizing, wrapping, table containment, label/control associations, popover placement and sticky offsets. Long IDs, URLs, asset/network strings and user-entered names must not overlap adjacent controls. Never “fix” collisions by clipping the page or removing information.
- Prefer a single surface with grouped rows over several nested bordered cards. Collapse optional history/help/advanced controls, not required decisions. Do not replace every page with an accordion.
- A visible touch control should generally provide a 44 × 44 CSS px hit area as a product target. WCAG 2.2 AA minimum sizing is a separate criterion with exceptions; do not conflate them.
- Status uses text and a restrained color/icon combination. Loading, empty, filtered-empty, unavailable and denied are different states. Distinguish missing data from zero.

### Forms and mutation feedback

- Persistent labels, concise helper text and inline errors linked to their controls; a submit error summary focuses the first relevant error. Validate dependent options as selections change without flashing errors before interaction.
- Preserve safe entered values on ordinary network errors, rejected quotes and recoverable conflicts. Explain what changed on a stale revision and require review before retrying a consequential action.
- Autosave only where the API and UX explicitly support it. Show Saving/Saved/Failed truthfully. A draft indicator cannot imply server persistence when content only exists in memory.
- For sensitive re-verification, explain the specific action, keep a safe return destination and resume only after fresh authorization/revision checks. Never silently replay payment, role, deletion or financial approval actions.
- Use task-specific feedback such as “Profile saved” and “Message not sent — retry” rather than generic success. Routine background refresh should not replace the page or steal focus. Keep a manual retry available on failure.
- Dialogs/drawers need focus entry/restoration, Escape behavior where safe, accessible names and reachable action buttons. No essential instructions only in hover tooltips.

### Chat behavior — required, not optional polish

- Show sender role/alias and distinguish customer replies, staff replies, system events and published proof. Group adjacent messages visually with day separators and readable timestamps. Full time remains accessible.
- Keep the composer available in the conversation viewport. Expand it within a bounded range for multiline text. Desktop Enter sends and Shift+Enter inserts a newline; document the shortcut, respect IME composition and retain an explicit Send button. Mobile keyboards must support composing multiline text without accidental sends.
- Sending, confirmed and failed states are distinct. Do not clear the draft before the server accepts it. A timeout with unknown outcome must reconcile using the existing idempotency contract before resend. Do not duplicate a message after reconnect.
- Attachments have preview/removal, progress, scanning and rejection feedback; quarantined files are never shown as available. Keep existing type/size/security limits visible at the attachment control. Protected game credentials use their separate secure workflow, not chat uploads.
- Opening a thread shows the latest or first unread context. Loading earlier pages preserves scroll position. New messages auto-scroll only if the user is already at the bottom; otherwise show a “New messages” control. Returning from order details restores the thread position.
- Reconnect restores live updates and reconciles gaps without losing the draft or showing stale unauthorized content. On logout, user switch or access revocation, remove private cached content and drafts. Sensitive text is not persisted to localStorage or service workers; initial draft preservation is memory-only unless separately designed and approved.
- Keep connection warnings compact. Announce meaningful incoming content politely without reading the entire history again. Do not announce every polling tick or decorative change.
- Staff compose in clearly labeled Reply / Internal note modes, with an unmistakable audience cue and separate drafts. Switching customer/thread cannot carry a draft into the wrong recipient. Booster visibility and shared coordination remain opt-in and permission-scoped.
- No fake online presence, typing indicator, read receipt or delivery promise. Add these only if a tested backend signal exists and the privacy implications are explicitly accepted. They are not prerequisites for the redesigned chat.

## 5. Ordered implementation phases

**UX01–UX07 are delivered; UX08 is implemented for verification; UX09–UX10 follow.** See [UX01 conventions and storyboard](docs/ux/UX01_FOUNDATION.md) and [UX02 account behavior and verification](docs/ux/UX02_ACCOUNT.md), [UX03 chat behavior and verification](docs/ux/UX03_CHAT.md), and [UX04 order workspace behavior and verification](docs/ux/UX04_ORDERS.md). UX00 is the delivered audit/plan; UX00B delivered the initial green identity; UX00C refines the O, adds character social artwork and specifies rich motion before implementation. Implementation scope includes desktop/mobile layouts, text, all relevant states, backend compatibility, visual evidence and the full repository gate. Implementation was authorized on 13 September 2026. The owner authorized continuing through UX10. UI-only commits use frontend and repository checks; backend/infrastructure changes and final UX qualification retain the full gate. Phases may use smaller verified commits without merging unrelated work or bypassing the applicable checks.

| Phase | Deliverables | Completion evidence / dependency |
| --- | --- | --- |
| UX00 — Audit and plan | This roadmap, reference comparison, initial issue register, route coverage and final-launch preservation | Delivered in `d4ebfc6`; baseline limitations explicit. No UI implementation. |
| UX00B — PLAYORA identity and rollout plan | Generated logo and separate social background, asset guide, theme direction and rename inventory in section 1.1 | Two separate inspected raster files delivered for review. Website integration and derivative production assets remain in UX01 onward. |
| UX00C — Character art and motion plan | Refined O logo, separate game-character social art, preserved earlier assets and section 1.2 motion storyboard/acceptance | New raster files inspected and saved; application animation remains unimplemented. |
| UX01 — Layout repair and component rules | Align PLAYORA details with existing green tokens and production logo variants, define the shared motion contract and MLBB storyboard in section 1.2, then reproduce overlap defects, inventory shared styles, fix text/grid/overflow behavior; compact headers, buttons, fields, status, tabs, dialogs/drawers, tables and empty/error patterns | Every reproduced collision gets a screenshot and regression case. Representative customer/admin screens at narrow widths, zoom and maximum-length data. Brand contrast, small-size logo legibility and approved asset variants verified; accepted font families and overall green theme retained, rank motion and fallbacks preserved. |
| UX02 — Account navigation and sign-in/settings | Compact customer shell, useful overview, responsive navigation, profile/security/preferences/privacy separation, PLAYORA shell and authentication/email branding, passwordless entry, clear staff entry and re-verification return flow | New and returning customers find active order, inbox and settings without instructions; no authentication/role/consent regression. Depends on UX01. |
| UX03 — Chat and support | Unified responsive inbox/thread/composer, scroll/unread behavior, attachment feedback, draft/retry/reconnect, staff reply/internal note and assignment/resolution UX; reusable order/booster integration | Synthetic two-party walkthrough plus offline, delayed/duplicate responses, revocation, long history, keyboard/IME and mobile keyboard checks. Depends on UX01–02; highest interaction priority. |
| UX04 — Order workspace | State-led list/detail, next action, concise progress, quote comparison/acceptance, scope/terms, messages/proof, schedule, cases, payment history, reorder and review access | Representative custom/fixed/account orders in every lifecycle family; distinguish customer wait, staff wait and provider wait. Chat integrates without duplicated page shells. Depends on UX03. |
| UX05 — Discovery and custom boosting | PLAYORA branding within the existing green homepage theme, game-character social/share imagery, layered character animation and scroll choreography from section 1.2, and CTA/section refinements, MLBB-first catalog, clear fixed-pack cards, guided configurable rank/mode/options form, summary and estimate breakdown; continue after sign-in | Both boosting modes, conditional fields, hero/role restrictions, invalid ranks, catalog changes, quote vs fixed-price comprehension, unavailable inventory. Another synthetic game proves generic configuration. Depends on UX01–02 and order conventions. |
| UX06 — Checkout, refunds and cases | Focused direct-crypto payment screen, explicit asset/network/amount/expiry, accurate waiting/error/receipt states; case creation/evidence and remedy/refund status | State matrix below; paused checkout stays unpaid, redirect is not confirmation, duplicate clicks safe. No live financial transaction for UI tests. Depends on UX04–05. |
| UX07 — Account marketplace and selling | Search/filter cards, account detail/gallery, reservation/handoff; guided seller intake, offer comparison/acceptance, review clarification, payout progress and sold/withdrawn states | Buyer/seller data separation, both offer arrangements, sold/reserved races, long content, rejected screenshots and protected credential access. Depends on UX03–06. |
| UX08 — Admin operations and editors | Triage-first dashboard; useful queues/detail panels; catalog/form/rule/package and coupon editors; finance/cases/payouts, directories, reports, reviews, content/policy/privacy/jobs/audit experiences | Staff complete tasks without raw JSON/database edits; unpublished changes, conflicts, authority, exports and recent factors remain clear. Test realistic queue sizes and each admin route. Depends on shared components and completed customer journeys. |
| UX09 — Booster workspace and remaining additions | Assigned-work overview, availability/calendar, bookings/holds/proof/communication; finish favorites, alerts, notifications, reviews and secondary empty/error screens | Assigned-only access, timezone/DST conflicts, no-show states, disabled assignments, consent/unsubscribe and review eligibility. No unreviewed promise of live game telemetry. |
| UX10 — Whole-product review and correction | Complete character-motion evidence from section 1.2 and route/state audit, responsive/zoom/keyboard/assistive checks, visual comparisons, cross-browser qualification, task walkthroughs and fixes | No unresolved blocking/high UX defects; acceptance matrix and owner review. Produce final evidence and stop. R10/R11 still require separate explicit authorization. |

### UX02 / UX04: minimal account and order screens

Overview shows active work requiring attention, unread messages and upcoming appointments, with a quiet link to history. A customer with no orders sees a short explanation and one discovery action. Do not display a wall of empty financial or technical widgets.

Order lists use scannable rows/cards: title/game, service or account, status, next action, last meaningful update, total where authoritative, unread indicator. Filters persist through navigation; back returns to the previous list position. Pagination and empty results stay explicit.

An accepted order's details retain its original selections and policy versions. Quote review compares changed scope, price and timing, with explicit acceptance. Cancellation, case and review actions appear when relevant, with eligibility explanations. A completed order leads with completion/proof and review or help, not an open issue form and every historical control.

### UX05: the custom request flow

Default groups: goal (current → target rank), play mode, preferences, review estimate. Short configurations may remain on one page with grouped sections; do not force extra steps for a two-field service. Use declarative field groups/labels, conditional visibility and references for other games; never hard-code MLBB field IDs into the general renderer.

Optional hero/role constraints show relevant choices only when selected. Explain required choices and incompatible combinations next to the controls. The summary shows the configured estimate breakdown and “Final price after review.” Do not invent rank ladders, prices or win-rate meaning. Preserve an in-progress non-sensitive configuration through the passwordless return flow; revalidate the catalog before creating a request.

Fixed package details show included scope, exact published price, relevant availability and terms, then a direct purchase action. Avoid presenting a fixed package as a request for a discretionary quote.

### UX06: payment and service-case state matrix

| Actual condition | Required customer presentation |
| --- | --- |
| No accepted custom quote | Explain staff review/quote acceptance; no payable estimate |
| Accepted / checkout available | Scope and total, approved asset/network choices, applicable fees, one checkout action |
| Checkout paused or not configured | Order remains unpaid; explain availability and provide order/support navigation; no simulated success |
| Invoice creation pending / unknown | Show progress or recovery state; prevent duplicate creation and reconcile uncertainty |
| Awaiting funds / confirming | Provider-derived instructions and current status; distinguish quote deadline, invoice validity and reservation timing |
| Verified payment | Receipt and next fulfillment step; never infer success from browser return alone |
| Under/over/late/wrong-route funds, expired invoice, reversal or provider outage | Plain explanation of known facts and next review/support step; preserve receipt evidence; no blind “pay again” instruction |
| Case open / work held / decision proposed | Reason and current owner of the next action, evidence, permitted response and deadlines |
| Refund proposed / approved / processing / confirmed / uncertain | Exact amount, asset/network and recipient review when required; completion only after confirmed outgoing evidence |

QR/copy controls may use only authoritative invoice instructions and must preserve exact amount/address/network. If the provider's supported flow is hosted checkout, present that flow clearly instead of inventing an on-site address. Opening payment instructions is different from marking payment complete.

### UX07: marketplace and seller clarity

Public cards prioritize game/rank, region where applicable, a few meaningful attributes, price and availability. Hide private seller identity and source credentials. Use real published sanitized images with stable aspect ratios, accessible gallery controls and meaningful empty imagery. On mobile, filters open in a labeled drawer, applied filters remain visible and can be cleared.

Selling shows an understandable sequence: Draft → Submitted → Needs information / Reviewed → Offer → Accepted arrangement → Resale/handoff → Payout state. Buy-first and consignment have different payment triggers, so present the actual accepted arrangement rather than a single misleading linear promise. Staff review approval alone does not mean a purchase or payout agreement exists. Buyer delivery and seller source access remain distinct secure channels.

### UX08 / UX09: staff work and feature completeness

- Put actionable queues before secondary totals. Zero is a legitimate state, not a reason for a large empty card. Dashboard counts link to matching filters; finance units never turn into an invented revenue total.
- Use common queue controls: search, relevant filters, applied-filter summary, pagination, selected record and safe return. Avoid unsupported bulk financial/deletion actions.
- Catalog editors use grouped fields, searchable rank/reference pickers, add/remove/reorder controls with keyboard alternatives, conditional-field preview and scenario-based price-rule validation. Distinguish draft, published and historical versions; show publication changes before confirmation.
- Quote, seller offer, policy and inventory editors show a readable review summary. Unsaved changes, required fields, stale revisions and revoked authority have explicit outcomes.
- Finance queues separate incoming issues, refunds and payouts. Confirmation displays the exact obligation and destination; recent MFA is part of the action flow. Audited reports state asset/network, date bounds, recognition basis and preview freshness.
- Customer directory has a focused detail view for sessions, order/support links and permitted actions. Media explains scanning/quarantine/deleted/purge states without offering an unsafe override. Privacy explains holds and retention eligibility while keeping deletion disabled without an enabled owner policy.
- Booster calendar includes a readable agenda alternative on mobile, device/operator timezone labels, reschedule conflicts, disabled actions during holds and approved proof states. Credential reveal remains explicit, recent, audited and separate from normal chat.
- Favorites/reorder, coupons, reviews, alerts/preferences, scheduling/delivery and pre-sales support all retain their complete existing behavior. Review eligibility/moderation/refund labels and explicit availability consent must survive simplification.

## 6. Route coverage contract

Use this as the initial inventory. UX01 must compare it with both route configuration files and add any newly introduced route; UX10 must close every row. A route family includes all its variants and authorized/unauthorized states.

| Routes / surfaces | Primary owner |
| --- | --- |
| `/`, `/games`, `/games/:slug`, services, packages, public game reviews | UX05 |
| `/accounts`, `/accounts/:id` | UX07 |
| `/login`, `/account`, new overview/settings views, `/privacy`, historical `/terms` | UX02; UX08 for owner controls |
| `/orders`, `/orders/:id`, quote, payments, fulfillment, proof, case/refund, review/reorder subpanels | UX04, UX06 |
| `/support`, `/support/:id`, order and booster coordination | UX03 |
| `/sell`, `/sell/new`, `/sell/:id`, offers, seller source access and payouts | UX07 |
| `/favorites`, `/availability`, `/availability/unsubscribe`, `/notifications`, `/reviews`, `/reviews/:id` | UX09 |
| `/booster`, `/booster/orders`, `/booster/orders/:id`, `/booster/calendar`, `/booster/support/:id` | UX09 |
| `/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/support`, `/admin/support/:id`, `/admin/calendar` | UX03, UX08 |
| `/admin/catalog`, `/admin/coupons`, `/admin/accounts`, `/admin/accounts/:id`, `/admin/submissions`, `/admin/submissions/:id` | UX07–08 |
| `/admin/finance`, cases/refunds/payout queues, `/admin/reports` | UX06, UX08 |
| `/admin/customers`, `/admin/media`, `/admin/alerts`, `/admin/content`, `/admin/privacy`, `/admin/jobs`, audit/staff controls | UX08 |
| `/admin/reviews`, `/admin/reviews/:id` | UX08–09 |
| Not found, forbidden, signed out, expired session, re-verification, unavailable services and navigation recovery | Every phase; final sweep UX10 |

## 7. Definition of done and test evidence

### Visual and accessibility matrix

For each changed route family, review real rendered screenshots and interactions at 320, 360/390, 768, 1024 and 1440 CSS px widths, plus a short landscape viewport. Test 200% text enlargement and reflow equivalent to 400% zoom on a 1280 px desktop. Include long titles, unbroken strings, maximum supported text, multiline errors, many badges, empty/large datasets and translated-length stress text. English is the current implementation language; full selected-locale/RTL launch qualification remains in final-launch.md.

No overlapping text or controls, lost actions, clipped essential content, focus obscured by sticky UI, or page-wide sideways scrolling on ordinary task pages. Genuine data tables may scroll inside a labeled region; provide readable cells and a mobile detail alternative. Capture keyboard-open chat on actual iOS/Android when available; desktop emulation alone does not qualify virtual-keyboard behavior.

Run keyboard/focus checks and axe on rendered routes, then manual screen-reader checks for sign-in, form errors, tabs/dialogs, chat announcements and status updates. Review Chromium, Firefox and WebKit behavior; qualify browser versions with pinned tooling when implementation begins. Existing reduced-motion, reverse-scroll, failed artwork, no-JS public-content and strict CSP checks remain mandatory. The PLAYORA identity must fit the existing green theme, fonts and background. Prefer the existing animation engine; qualify any complementary assets for contrast, responsive crops, loading cost and graceful failure.

### Behavioral matrix

Every changed task covers success, first use/empty, loading, filtered-empty, invalid input, unavailable/denied, stale revision, timeout/offline/reconnect and repeated action where applicable. Add cross-user/role boundaries, refresh/back/deep-link restoration, revoked sessions, partial attachment failure and concurrent updates. Financial and credential actions keep their stricter server checks. No test uses customer production data or live money to exercise UI states.

Use stable synthetic fixtures for all order/payment/seller/case states, long histories and queue sizes. Existing browser journeys may be reorganized around new accessible controls but retain their behavioral/security assertions. Screenshot updates require actual inspection and a reason; never accept a new baseline just to make CI green.

### Task-based acceptance

Proposed UX targets, to measure during implementation rather than claim now:

| Task | Review target |
| --- | --- |
| Returning customer identifies order status and next action | Correct explanation after a five-second inspection of the overview |
| Open the relevant conversation from an order | One explicit action; composer immediately available within the conversation view |
| Explain custom vs fixed-package pricing | Reviewer correctly distinguishes estimate, accepted quote and directly payable pack before submitting |
| Find active order, security settings or seller submission | Within two navigation decisions from the account area, excluding authentication |
| Read older chat while messages arrive | Position stays stable; new-message control appears; no draft loss or duplicate send |
| Staff finds and handles a waiting item | Dashboard queue → record → authorized action, without searching unrelated modules |
| Complete primary tasks on a narrow screen | No accidental action, hidden mandatory term, horizontal page hunt or keyboard-covered composer |

Walk through these with the owner and, when available, representative customer and staff reviewers using synthetic tasks. Record misclicks, hesitation and assistance needed. No research participants, conversion lift or usability score is fabricated. A human review failure is work to fix even when automated tests pass.

### Delivery gates

Work directly on `main`; verified stage commits and pushes remain authorized after implementation is authorized. Use the tracked hook before every commit: UI-only changes require frontend and repository checks; documentation requires repository checks; backend, infrastructure, dependencies and unknown paths require the full root `make pre-commit`. CI and final UX qualification retain the full gate. Do not skip any check required by the applicable scope. Review the staged diff and verify `origin/main` after pushing. Record issues fixed, screenshots, test results and limitations in `docs/progress.md`.

Maintain the existing asset/bundle/performance budgets and compare new layouts against baseline on the same hardware/network profile. The chat visibility target remains two seconds under normal conditions; it is not permission to invent optimistic delivery. Realistic load and deployed Core Web Vitals/operations qualification remain R10/R11 requirements.

## 8. Review and handoff

The owner has reviewed the brand direction and authorized implementation. The first milestone is UX01 and UX02, followed immediately by UX03 chat. Present representative account and chat layouts early so the owner can steer spacing and interaction before every screen is converted. Do the authorized work needed to make that review concrete; avoid repeatedly asking about routine controls or already confirmed branding.

Typing indicators, read receipts, chat search requiring new indexing, canned staff replies, persistent server drafts, voice/video and public interactive demos are optional future decisions. They are not silently added to this roadmap's committed scope. The core redesign must stand on its own without them.

After UX10, provide the route/state evidence matrix, remaining lower-priority issues and review instructions. Stop for owner acceptance. Then, and only with separate authorization, resume the preserved [R10/R11 final launch plan](final-launch.md).

Owner clarification: character selection may change where another character better fits the green theme. Keep characters from different games; Iori/Illidan/Ahri are the current interpreted choices.
