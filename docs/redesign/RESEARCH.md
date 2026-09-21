# Design research and evidence

Research date: 21 September 2026. Desk research and local reference inspection, not a conducted user study. No conversion lift or human usability score is claimed.

## Evidence and implications

| Source | Observed finding | PLAYORA design implication |
| --- | --- | --- |
| [Owner’s Stitch exports](pages/) and [Stitch](https://stitch.withgoogle.com/) | Thirteen independent HTML concepts, including homepage, game hubs and role dashboards. Many contain invented financial/security claims and inconsistent navigation. | Use the green/game visual mood; build a coherent product architecture from the real specification and route inventory. Stitch generation is optional. The new atlas is locally authored, not claimed as a Stitch-generated project. |
| [Boosting.pro](https://boosting.pro/) | Public content organizes discovery by game and service, followed by products and social proof. | Keep game-first browsing and clear service categories. Do not import its stock, prices, testimonials or promises. This turn’s text fetch does not establish animation performance or authenticated flow quality. |
| [Boosting Factory](https://www.boostingfactory.com/) | The public homepage presents a prominent game-selection list. | Treat selecting a game as a primary entry task rather than hiding it under a broad services menu. |
| [Elo-Boost.net](https://elo-boost.net/) | The fetch timed out in this session. | No new design or performance claims attributed to this site. |
| [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Distinguishes hiding less-frequent options from splitting a task into sequential stages, and warns about interdependent choices. | Keep related goal/rank options together with a summary. Reveal specialized hero/role requirements progressively; separate submission and payment when they represent a real decision boundary. |
| [Baymard: Minimize checkout form fields](https://baymard.com/research-articles/checkout-flow-average-form-fields) | Checkout effort is affected by fields users must process, not simply the number of steps. | Ask only for data needed at the current stage. Do not collect fulfillment credentials while estimating or repeat known order details during checkout. |
| [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) | Includes reflow, focus visibility/non-obscuring, target size, error handling and accessible authentication. | Design for narrow reflow, usable targets, persistent labels, paste-enabled codes, readable contrast and focus-safe sheets/menus. Conformance must be verified on the eventual implementation. |
| [WAI APG: Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Documents keyboard focus and modal interaction expectations. | Real confirmation/filter dialogs trap focus, close on permitted Escape, and restore focus to a meaningful trigger. The atlas specification panel is explicitly nonmodal. |
| [GOV.UK: Error summary](https://design-system.service.gov.uk/components/error-summary/) | Provides linked error-summary patterns paired with field-level errors. | Invalid submission focuses a concise summary linking to each field; preserve safe answers and state how to fix each issue. |

## Local inspection

Read all 13 exports’ structure and visible content. Opened homepage 2, MLBB and the custom builder in the local browser. Observed dense repeated chrome, oversized copy, low-contrast controls in some loaded states and horizontal crowding in the builder. These are reference observations, not regressions in the existing PLAYORA application. Remote font/art/CDN loading can affect a reference’s rendering; do not misclassify a failed resource as a proven original-design defect.

Read both actual route manifests, the accepted product specification, implementation phases, existing UX qualification, and representative catalog, identity, finance, privacy and operational components. This establishes functional coverage; it is not a fresh authenticated audit of every running application screen.

## Independent design synthesis

- **Atmosphere at discovery; clarity at commitment.** Keep expressive artwork at the top of the funnel. Increase surface opacity and reduce decoration around money, credentials and lengthy text.
- **Next action over telemetry.** Customer and staff dashboards prioritize decisions, unread messages and bookings. Omit decorative online counts and unverified “live” claims.
- **One vocabulary.** “Estimate”, “final quote”, “invoice”, “verified payment”, “order progress” and “refund” refer to different objects. Avoid “escrow” and “vault” when no corresponding product exists.
- **Context without clutter.** An order sidebar is useful on desktop; on mobile it becomes an intentional disclosure or adjacent page, never an overlay covering messages or fields.
- **Visible exceptions.** Payment uncertainty, stale edits, missed uploads and access revocation have designed recovery, rather than a generic red toast followed by guesswork.

These conclusions are design judgments informed by the sources and PLAYORA’s actual tasks. They require owner/task-based review rather than being treated as proven outcomes.
