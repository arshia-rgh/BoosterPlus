# Complete current design review — 24 September 2026

Base: `338fb3c`. Owner requested a complete review and repeated corrections until no actionable issues remain. Scope: the current 113-view atlas, 30 journey specifications, all three workspaces, seller flows, public/game discovery, identity, checkout, alternate states, shared chrome, keyboard navigation and responsive behavior. This extends the usual changed-scope gate for this owner-requested audit. It does not resume application development or R10/R11.

## Independent review team

- `/root/full_public_review`: public/game/identity/payment views, 41 entry views and their principal journeys.
- `/root/full_customer_review`: customer/seller workspaces, 30 entry views and their principal journeys.
- `/root/full_staff_review`: booster/admin/catalog/finance, initial 42-view sweep and source review of corrections.
- `/root/staff_final_review`: independent rendered verification of staff fixes after the original staff reviewer lost browser access. The original review was explicitly BLOCKED, not passed. The replacement reviewed all reported staff findings and affected contexts.
- `/root/access_scenario_gate`: final independent regression review of access loss, reassignment, reset and completed-order messages.

## Tracked findings and corrections

| ID | Observed problem | Correction |
| --- | --- | --- |
| PUB01 | Checkout changes product/order/amount | Separate account USD120 and package USD48 purchase contexts; existing custom USD60 stays in its record; coherent returns and confirmation examples |
| PUB02 | Google opens email-code form; verification loses original task; setup sequence missing | Separate Google redirect preview, contextual email/staff routes, original return/cancel and authenticator setup/verification/recovery-storage sequence |
| PUB03 | Authentication help exposes implementation instructions | Customer-facing guidance and explicitly fictional input validation |
| PUB04 | Error/expired/paused states retain actionable normal content | Local-view state sources, replacement state content, targeted payment/estimate recovery, no expired invoice address or stale timer |
| PUB05 | Second listing opens different account; discovery filters do nothing | One exact represented AC-208 listing, meaningful account/game filters and no-match feedback |
| PUB06 | Policy links show undifferentiated content | Selected Terms/Privacy/Refunds navigation and explicit unpublished policy state |
| PUB07 | Edited request differs from summary/review; invalid equal rank progresses | Memory-only chosen scope reflected through review/sign-in/edit return; higher target required; staff estimate rather than invented rule output |
| PUB08 | Nested game form focus lands below pinned offers/outside viewport | Canvas-only destination scrolling, stable inset and adjacent local Back links while retaining game shell |
| CUS01 | Seller acceptance/transfer/payout offered without complete terms | Explicit consignment draft with missing prerequisites; disabled acceptance/handover/recipient action; consistent list/detail status |
| CUS02 | Disabled deletion looks actionable; export has no action | Disabled deletion until owner policy, export-request preview and support/privacy links |
| CUS03 | Security is prose and customer is shown staff authenticator | Concrete fictional methods/sessions, revoke confirmation previews and staff-only authenticator controls |
| CUS04 | Checkout proceeds without network/consent | Required route and consent validation with policy links and explicit demo feedback |
| CUS05 | Corner panel covers chat actions; correction obscures focused field | Smaller collapsed panel, bounded focus scrolling, mobile modal with inert canvas/blur, focus loop and Escape return |
| CUS06 | Seller/support/profile/preferences forms lack usable completion flow/copy | Seller review/required checks, support subject/message and owned-item selection, identity-specific rendering, clear profile/preference copy |
| CUS07 | Saved account opens a different listing and loses source | Exact AC-208 detail and return to saved accounts |
| CUS08 | Unsubscribe looks completed by navigation; review leads to ineligible order | Specific alert confirmation preview and explicit no-completed-orders review state |
| CUS09 | Completed/delivery-ready/expired states contradict default record and reset on tabs | Persistent same-record scenario, targeted completion/delivery/expired content and appropriate next actions |
| CUS10 | Seller intake loses My sales navigation | Active parent, breadcrumb and named Back with retained in-memory input |
| STF01 | Local quote/catalog/chat states disappear behind root states | State selector and inspector follow the active local view |
| STF02 | Verification abandons editor and draft; directory action lacks target | Exact originating editor return/draft retention; unselected directory action explicitly a layout example |
| STF03 | Held finance/privacy and draft buyer delivery appear actionable | Persistent blocker status and prerequisite-based disabled authorization/erasure/transfer with recovery |
| STF04 | Cached selector references wrong booster order | Regenerated data and versioned local assets; PL-1038 consistent |
| STF05 | Internal note still labelled public reply | Persistent audience styling, composer label and send-button changes |
| STF06 | Edited catalog draft appears validated by hardcoded preview | Clearly labelled illustrative layout-only preview; quote preview still reflects supported edited scope/amount |
| STF07 | Privacy queue link changes URL without opening detail | Same-root queue-to-record rendering corrected |
| STF08 | Private note text carries into public reply | Separate memory-only drafts per conversation audience, retained through section switching |
| GEN01 | Access-loss scenario could retain conversation after shared state refinement | Hide record details, local controls and conversation; explicit parent recovery, with default reset restored |

## Review rounds

Initial sweeps found behavioral and state consistency problems despite broadly passing layouts. First correction round added contextual journeys and review-state handling. Follow-up reviews required specific recovery actions, scenario continuity, enrollment detail and original-task sign-in. Later checks corrected mobile focus scrolling, privacy queue entry, audience draft separation and nested game focus/Back positioning. No findings were waived or declared passed while blocked. Final area verdicts are recorded below after the final rechecks.

## Verification evidence

- Primary: all 113 entry views at canvas widths 373/751/1223px, **339 layout checks** with one visible H1, meaningful content and no horizontal canvas overflow.
- Primary: all **555 available named state selections** at phone width, one visible H1/no horizontal overflow. This tests presentation, not 555 independent runtime scenarios.
- Public reviewer: 41 entries across desktop/Tablet/Phone (123 checks), plus all 41 at actual 390 × 844. Task-based checks include edited custom request → review → email verification → return, game-specific request editing, exact account checkout, invalid route/consent/code/rank, expired invoice recovery, policy selection and keyboard nested game flow.
- Customer reviewer: 30 entries at Phone, desktop/Tablet compositions and task rechecks for seller prerequisites, export/deletion, security, checkout validation, support identity, saved listings, alert confirmation, review eligibility, state continuity and mobile corner focus.
- Staff reviewers: 42 entries at Phone initially; desktop/Tablet operational views; replacement reviewer independently checked fixes at actual 390 × 844 and Tablet, including quote75, policy editor verification return, privacy queue/detail, blocked payout/delivery and internal/public draft separation.
- Browser console error log empty in completed primary and public passes. Temporary reviewer viewport overrides are reset after checks.
- Design integrity: 113 views, 30 journeys, all 55 existing route mappings and 555 named states. JavaScript syntax, Prettier and 33 route/fixture assertions pass. Root repository policy/secret scan, contract equality, workflow lint and diff checks passed; the tracked hook reruns the repository gate at commit.

## Final verdicts

- Staff: **PASS — no remaining actionable findings in STF01–STF08 and affected staff workflows.**
- Public: **PASS — no remaining actionable findings in PUB01–PUB08 and the reviewed public/game/payment/identity scope.**
- Customer/seller: **PASS — no remaining actionable findings in CUS01–CUS10 and the reviewed customer/seller scope.**
- Shared access-loss correction: **PASS — no remaining actionable findings in GEN01.** At Phone width, customer access loss, booster reassignment and admin access removal hide record details and conversation, retain one visible heading and contextual recovery, and reset correctly. Completed → Messages preserves its record, scenario and usable conversation.

## Limits and remaining decisions

This is a reviewed static design prototype, with fictional records and memory-only drafts. It does not authenticate, validate production permissions, publish content, transmit messages, upload files, execute payments or qualify financial operations. Generic secondary states remain annotated shared patterns; principal recovery paths have concrete scoped examples. Commercial terms, prices, approved game configurations, legal copy and media rights are not invented by this review. Shop/news downstream detail remains the previously documented design decision/work, outside the current implemented screen inventory.

A scoped PASS means no actionable issues remain from these reviews, not proof that no undiscovered usability issue exists. Owner acceptance, physical-device keyboard behavior, human assistive-technology evaluation and production qualification remain separate. Application development and R10/R11 stay paused; existing untracked cameo/prototype experiments are preserved.
