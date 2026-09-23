# PLAYORA — design before development

Design review edition · updated 23 September 2026 · Owner approval pending

**Application development is paused.** This design package supersedes `UI_UX_ROADMAP.md` and `docs/ux/HOMEPAGE_REFINEMENT_ROADMAP.md` as the active design direction. Those files remain historical records, not an implementation queue. R10/R11 remain held with their full scope in [final-launch.md](../../final-launch.md). Design approval does not authorize production launch.

The owner confirmed that the 13 HTML files in [pages/](pages/) are the full reference set and **visual suggestions only**. They are not the desired final quality or new product requirements. Preserve existing business rules: no wallet, escrow, wagers, top-ups, invented publisher integration, automatic booster payouts or claims of zero risk. Design all existing product capabilities first, then agree an implementation plan.

## Latest owner revision

[Homepage and game hubs](HOMEPAGE_GAME_HUB_REVISION.md) now use equal-game discovery: service introductions → game selection → persistent game header, large service choices and individual service views. Shop and news are newly requested design concepts, not imported scope from Stitch. Earlier MLBB-first homepage guidance is superseded. Application development and R10/R11 remain paused.

See the latest [shared experience revision](SHARED_EXPERIENCE_REVISION.md) for FAQs, review cards, pinned offers, persistent game flows, shared backgrounds and signed-in order-panel previews.

## Open the design

Start a loopback-only static preview from the repository root:

```sh
python3 -m http.server 4177 --bind 127.0.0.1 --directory docs/redesign
```

Open [the design atlas](http://127.0.0.1:4177/design/index.html). It is a separate **design artifact**, not a replacement frontend. It has no authentication, provider calls, API writes, persistent private data or real payment capability. Every price, account, message, date and metric is fictional and labeled as such. Do not enter real private data.

Use the screen selector for individual views, Journey for connected tasks, State for alternate outcomes, and the width controls for responsive composition. The specification drawer contains anatomy, fields, guards and recovery behavior. Review the product canvas separately from these annotations. The browser Back button returns through design views.

The current review inventory contains **113 views, 30 journeys, 555 named state treatments and all 55 existing application routes**. Named states reuse common layouts where appropriate; they are not 555 independently drawn pages.

## Package map

| File | Purpose |
| --- | --- |
| [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) | Art direction, source critique, navigation and what we deliberately changed |
| [RESEARCH.md](RESEARCH.md) | Dated research, observed evidence and design inferences |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Tokens, typography, layouts, components, responsive, motion and accessibility |
| [SCREENS.md](SCREENS.md) | Every designed view: content, fields, actions, states, mobile rules and current-route mapping |
| [FLOWS.md](FLOWS.md) | 30 connected journeys with exception branches and completion guards |
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

This is a complete **review edition of the screen/flow specification and visual atlas**, not an owner-accepted final design or a production implementation. “Complete” means the existing route inventory and supporting subflows are represented, the interaction and exception contracts are written, and the artifact can be reviewed independently of the running app. It does not mean business terms, art rights, real-device behavior or all human usability questions have been settled.

Before implementation resumes: review the principal visual layouts, walk the cross-role flows, resolve commercial copy placeholders, and record accepted changes. Changes to design documents/prototypes are allowed during the pause; product implementation and the old cameo/audio experiment remain paused. Preserve the uncommitted cameo experiment without mounting or shipping it.

## Mandatory design change review

Follow [DESIGN_CHANGE_GATE.md](DESIGN_CHANGE_GATE.md) for every design stage: a separate senior UI/UX designer reviews the changed scope, then repeated fix/review rounds must reach an explicit pass before delivery. The bordered preview contains its own scrollable website, artwork and order panel; controls and specifications outside it belong to the atlas.
