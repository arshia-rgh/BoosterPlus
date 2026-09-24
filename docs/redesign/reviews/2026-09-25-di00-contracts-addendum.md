# DI00 — implementation contracts and shop/news addendum review

25 September 2026 · Base `2972498` · Final scoped verdict **PASS**

## Scope and evidence

The owner authorized DI00–DI15 application implementation, followed by a separately held final launch. DI00 delivers [implementation contracts](../IMPLEMENTATION_CONTRACTS.md), [shop/news specifications](../SHOP_NEWS_ADDENDUM.md), the [interactive companion](../design/addendum.html), and JSON matrices covering 115 accepted plus 15 additional views and all 55 legacy routes. The accepted atlas itself is unchanged. New view IDs are SH01–SH09 and NW01–NW06; six added journeys SN01–SN06 reuse existing payment/identity/support contracts.

Independent senior reviewer: `/root/di00_design_review`. The main agent authored/fixed the changes. Reviewer inspected contract/matrix/source and rendered interactions in local Chromium. Preview: `http://127.0.0.1:4187/design/addendum.html`. All data is fictional, in memory, and disconnected from real APIs/providers.

## Review rounds

| Finding | Impact and correction | Verification |
| --- | --- | --- |
| R1-01 | Narrow summary came after final submit. Stack it before the form. | Reviewed at actual 390px and canvas Phone |
| R1-02 | Recipient was merely “identifier entered.” Show masked suffix, server and display name before acceptance. | Entered recipient retained in review |
| R1-03 | Hold/correction had no reason. Require reason/next step before state change; show staff update to customer. | Blank form cannot transition; entered note visible |
| R1-04 | Failure replaced order identity and local sections. Keep record shell for recoverable states; access loss hides private detail but retains safe workspace return. | SH05/SH09 failure and denied variants |
| R1-05 | Editors lacked dirty/saved state and departure protection. Add cues, retained drafts and beforeunload guard. | Actual browser departure dialog observed |
| R1-06 | Saved/published article metadata diverged across reader/list/filter. Separate working, saved and published revisions and bind relevant views to each. | Changed title/type/source, public isolation and discovery rechecked |
| R1-07 | Paused product still allowed purchase and publication data differed from cards. Gate card/direct flow/submission; use the published revision consistently. | Publish/edit/pause/direct-entry journey rechecked |
| R1-08 | Quantity total was stale and orders read mutable drafts. Update summary immediately and capture a distinct immutable order fixture. | New draft does not alter previous order total |
| R1-09 | Product preview was only a text message. Add read-only customer detail/eligibility/terms/summary inside admin. | Preview has explicit draft identity and Back |
| R2-01 | Replacing editor with preview/reason form lost keyboard focus. Focus preview heading/reason input and restore triggering preview button on return. | Actual keyboard verification |

Round 1: FAIL; actionable findings R1-01–09. Round 2: partial fixes verified; remaining publication consistency plus keyboard regression R2-01 returned. Round 3: reviewer explicitly returned **PASS — no remaining actionable findings in scoped DI00 review**, including blocked invalid saved publication inputs and all corrected interactions.

## Checks and limits

- Independent final sweep: all 15 views at 1440 × 1000, Tablet 768 and Phone 390 canvas widths, and actual 390 × 844. No horizontal overflow or JavaScript errors. Scoped axe scan of all 15 default views at actual 390 with reduced motion: zero violations.
- Reproducible main-agent `node docs/redesign/check_addendum.mjs`: purchase/recipient, quantity updates and frozen snapshot, unpaid guard, hold reasons, retained failure shell, paused product, saved/public editorial isolation, publication/unpublication, 60 width/view combinations (320/390/768/1440) and console errors passed.
- `python3 docs/redesign/check_implementation.py`: exact baseline view/state and legacy-route coverage, proposed/existing API separation and evidence-required delivery markers passed. JavaScript syntax, changed prototype formatting and root repository gate passed before commit.
- This is design-fixture and contract evidence only, not runtime authentication, financial, database, scheduled-job or physical-device qualification. New product commercial terms remain owner-configured publication prerequisites. Runtime matrix rows remain planned. R10/R11 stay held; DI01 begins the application foundation work.
