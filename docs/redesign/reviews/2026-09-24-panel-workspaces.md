# Panel workspace review — 24 September 2026

Base: `8f545b8`. Reviewer: separately spawned senior UI/UX designer `/root/panel_ux_gate`. Scope: customer/booster/admin panel wayfinding, order and other record sections, list-to-record return, role-specific navigation, inboxes, local previews, drafts, errors and affected shared chrome. Public storefront/game design and runtime implementation remain outside scope.

## Findings and review rounds

| ID | Finding | Resolution |
| --- | --- | --- |
| Baseline | Order tabs leave the record; generic Open buttons and threads lose identity; cross-role links | Persistent role/record shell, named actions, exact rows, independent role inboxes |
| UXG01 | Paid PL-1038 opens editable USD60 quote despite paid USD48 | Accepted quote is read-only, exact USD48. New draft preview is separate from issued state |
| UXG02 | Queue filter resets on Back and does not filter | Search/status filters work, zero-match recovery, retained DOM and list position |
| UXG03 | Admin footer links become customer-order previews | Role-specific footer/workspace/support destinations |
| UXG04 | Account IDs accepted by boost-only order shells | Explicit entity/family guards and contextual recovery |
| UXG05 | Booster Messages silently opens an assignment | Dedicated permitted-thread inbox with explicit record row |
| UXG06 | Reassignment recovery loses role, parent and H1 | Record content removed; meaningful accessible Back to assigned orders |
| UXG07 | Preview returns to General instead of originating Pricing editor | Origin section encoded/validated; editor draft retained |
| UXG08 | REV-12 linked to PL-1038 opens PL-1042 | Explicit named related-order route; checked calendar/media related links too |
| UXG09 | Remaining table lists retain dormant filters and detached actions | Searchable retained lists; entity-specific actions where represented, explicit read-only rows otherwise |
| UXG10 | Sticky navigation obscures focused input and new section heading | Dynamic scroll padding based on actual navigation height; focused input and selected section positioned in visible content |
| UXG10b | Native scrollIntoView scrolls/clips the outer hidden-overflow frame | Canvas-only offset scrolling; outer frame uses overflow:clip |

Four fix/review rounds: first seven findings, broader list/relationship and sticky-focus findings, outer-frame scrolling regression, then final narrow and quote-preview verification. Each remaining finding was fixed and rechecked; no severity exclusions or unresolved findings were declared passed.

## Rendered verification

Reviewer independently inspected desktop 1100 × 900, atlas Tablet/Phone and actual 390 × 844. Verified customer message draft retention; queue search/status and Back; no-match recovery; correct admin/booster footer destinations; rejected account/boost mismatch; booster inbox; reassigned recovery; Pricing preview return and draft; REV-12 → PL-1038; paid USD48 read-only; unpaid fulfillment blocked. Edited quote to USD75 and changed scope: preview reflected both, Back retained both; negative total displayed incomplete-draft recovery.

Final actual narrow frame: no horizontal overflow; frame scrollTop0; canvas top equals frame top +1px border. Focused message textarea 652–762px stays below tabs ending566px and inside canvas ending831px. Keyboard section change shows focused section title at582px, below tabs. Browser viewport overrides reset.

Implementer independently checked all **72 panel entry views** at atlas Phone390: one H1, role label, no horizontal canvas overflow, nonempty rendered content. Customer1038 Messages→Progress→Messages retained draft; Back retained In progress filter and showed only1038. Booster Security retained booster role and returned to B01 via workspace selector. Browser console errors empty.

## Final verdict and limits

**PASS — no remaining actionable findings in the changed panel-navigation scope.** Reviewer explicitly closed UXG01–10b after rendered rechecks. Syntax/formatting, design integrity, dedicated route/fixture assertions and required repository checks are recorded in progress.md.

No runtime authentication, authorization, payments, messaging, refunds or persistence is implemented/qualified here. Placeholder business/editor content still follows its existing screen specifications; this stage corrects navigation and fixture behavior, not undisclosed business decisions. Owner visual acceptance, physical devices and assistive-technology testing remain separate. Local drafts are memory-only and clear on reload/Visitor reset. R10/R11 and application work remain held.
