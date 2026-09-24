# PLAYORA — design before development

Design baseline · updated 25 September 2026 · Accepted by the owner; implementation authorized

**Application implementation is authorized through DI15.** This design package supersedes `UI_UX_ROADMAP.md` and `docs/ux/HOMEPAGE_REFINEMENT_ROADMAP.md` as the active design direction. Those files remain historical records, not an implementation queue. R10/R11 remain held with their full scope in [final-launch.md](../../final-launch.md). Design approval does not authorize production launch.

On 25 September the owner accepted the current design as complete for now and requested a complete implementation roadmap before coding. [Implementation roadmap](IMPLEMENTATION_ROADMAP.md) maps the existing runtime to all 115 accepted views and 31 journeys, including missing portal isolation, shop and news capabilities. Manual staff shop fulfillment and staff-managed articles are confirmed. Detailed shop/news downstream addenda are the first planned step; they do not reopen the accepted design wholesale. The owner subsequently authorized DI00–DI15 implementation. DI00 contracts and addenda are delivered: [contracts](IMPLEMENTATION_CONTRACTS.md), [shop/news addendum](SHOP_NEWS_ADDENDUM.md), [interactive preview](design/addendum.html) and [traceability matrix](implementation-matrix.json). R10/R11 remain held.

The owner confirmed that the 13 HTML files in [pages/](pages/) are the full reference set and **visual suggestions only**. They are not the desired final quality or new product requirements. Preserve existing business rules: no wallet, escrow, wagers, top-ups, invented publisher integration, automatic booster payouts or claims of zero risk. Design all existing product capabilities first, then agree an implementation plan.

## Latest owner revision

[Homepage and game hubs](HOMEPAGE_GAME_HUB_REVISION.md) now use equal-game discovery: service introductions → game selection → persistent game header, large service choices and individual service views. Shop and news are newly requested design concepts, not imported scope from Stitch. Earlier MLBB-first homepage guidance is superseded. Application work follows the DI roadmap; R10/R11 remain held.

See the latest [shared experience revision](SHARED_EXPERIENCE_REVISION.md) for FAQs, review cards, pinned offers, persistent game flows, shared backgrounds and signed-in order-panel previews.

## Open the design

Start a loopback-only static preview from the repository root:

```sh
python3 -m http.server 4177 --bind 127.0.0.1 --directory docs/redesign
```

Open [the design atlas](http://127.0.0.1:4177/design/index.html). It is a separate **design artifact**, not a replacement frontend. It has no authentication, provider calls, API writes, persistent private data or real payment capability. Every price, account, message, date and metric is fictional and labeled as such. Do not enter real private data.

Use the screen selector for individual views, Journey for connected tasks, State for alternate outcomes, and the width controls for responsive composition. The specification drawer contains anatomy, fields, guards and recovery behavior. Review the product canvas separately from these annotations. The browser Back button returns through design views.

The current review inventory contains **115 views, 31 journeys, 573 named state treatments and all 55 existing application routes**. Named states reuse common layouts where appropriate; they are not 573 independently drawn pages.

## Package map

| File | Purpose |
| --- | --- |
| [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) | Art direction, source critique, navigation and what we deliberately changed |
| [RESEARCH.md](RESEARCH.md) | Dated research, observed evidence and design inferences |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Tokens, typography, layouts, components, responsive, motion and accessibility |
| [SCREENS.md](SCREENS.md) | Every designed view: content, fields, actions, states, mobile rules and current-route mapping |
| [FLOWS.md](FLOWS.md) | 31 connected journeys with exception branches and completion guards |
| [INTERACTIONS.md](INTERACTIONS.md) | Detailed form, quote, invoice, chat, handover, publication and recovery behavior |
| [COVERAGE.md](COVERAGE.md) | Every existing storefront/admin route mapped to design views; new proposed subviews explicitly distinguished |
| [REVIEW.md](REVIEW.md) | Review tasks, acceptance checklist, checks actually run and remaining human decisions |
| [ASSETS.md](ASSETS.md) | Reused artwork provenance and later asset requirements |
| [design/screens.json](design/screens.json) | Editable structured screen specifications |
| [design/flows.json](design/flows.json) | Editable journey paths and branches |
| [design/index.html](design/index.html) | Local visual atlas and clickable design prototype |
| [pages/](pages/) | Owner-provided Stitch exports (line endings/trailing whitespace normalized); reference material only |

## Product boundaries

- Mobile Legends first; other game designs are catalog-driven templates, not launch availability. All rank/hero/region choices and pricing require a published configuration.
- Custom estimate → staff quote → explicit customer acceptance → direct crypto payment → verified funds → fulfillment. Fixed packages bypass quote review, never payment verification.
- Google/email passwordless identity. Staff verify an authenticator at every sign-in; sensitive staff actions require recent first and second factors. Customer private handoff uses the appropriate recent identity check, not an invented mandatory customer authenticator.
- NOWPayments production integration remains the existing decision. `PAYMENTS_ENABLED=false` pauses new checkout, keeps orders unpaid and allows existing reconciliation. No runtime payment simulation.
- Seller offers explicitly choose consignment or buy-first. Direct payout obligations have no spendable balance. Customer/seller/staff conversations retain their separate audiences.
- Deletion requires an enabled, owner-entered retention policy and respects active order/dispute holds.
- Current artwork, green family and accepted font direction remain reference anchors. The redesign is free to improve details, composition, density and hierarchy. No requirement to reproduce the Stitch terminal-style dashboard.

## Status and definition of design completion

This is the **owner-accepted design baseline for implementation planning**, not a production implementation. The existing route inventory and supporting subflows are represented, the interaction and exception contracts are written, and the artifact can be reviewed independently of the running app. Acceptance does not settle unpublished business terms, art rights, real-device behavior or the detailed new shop/news downstream flows. Historical review logs retain the status and limitations recorded when each review ran.

The owner has instructed implementation to begin. DI00 completes missing new-feature contracts and records dependent commercial decisions; subsequent stages implement and qualify the accepted design. The old cameo/audio experiment remains paused. Preserve the uncommitted cameo experiment without mounting or shipping it.

## Mandatory design change review

Follow [DESIGN_CHANGE_GATE.md](DESIGN_CHANGE_GATE.md) for every design stage: a separate senior UI/UX designer reviews the changed scope, then repeated fix/review rounds must reach an explicit pass before delivery. The bordered preview contains its own scrollable website, artwork and order panel; controls and specifications outside it belong to the atlas.

## Panel navigation review

The [panel UX revision](PANEL_UX_REVISION.md) replaces disconnected customer, booster and admin subpages with persistent record workspaces, role-specific navigation and explicit return paths. Start at C01, B01 or A01; follow named rows and use local sections within each record.

## Complete current design audit

See the [full review and correction log](reviews/2026-09-24-complete-design-review.md) for the cross-role review, scoped verdicts, responsive/state checks and remaining acceptance limits. The current atlas includes context-preserving identity/checkout, truthful recovery states, working fictional discovery filters and in-memory draft continuity.

## Separate portal sign-in

[Customer, admin and booster sign-in](SEPARATE_PORTAL_SIGN_IN.md) now have independent entry experiences and portal-scoped verification/recovery. Review I01, I09 and I10; F09 and F31 cover the separate staff journeys. These are proposed design routes, not runtime authentication changes.

The [separate-login and full re-review log](reviews/2026-09-24-separate-logins-full-review.md) records this later audit and its final verdicts; earlier review evidence remains historical.
