# Running website — independent UX review

Reviewed on 14 September 2026, before implementation. This note records actual native-browser interaction, not another source-only review or a reinterpretation of old screenshots.

## Environment and coverage

The parent task started the current frontend builds at `http://127.0.0.1:4173` against an isolated fixture API. I used a new native Firefox tab through CUA because this agent's browser inventory did not expose the in-app browser. Initial application-window images were 1320×768; this is a screenshot size, not a verified CSS viewport measurement. The first pass was desktop only; the resumed responsive viewport settings are recorded below.

I navigated the actual running pages in this order:

1. `/games` — catalog overview.
2. A published fixture game — custom and fixed service choices.
3. Its custom service form — first configuration step.
4. Selected the fixture's Solo mode, activated “Check selections” and scrolled to the returned manual-price-review state.
5. Activated “Continue to order information” but could not complete inspection of the resulting state before the Mac locked.

No order, account, payment, message or agreement was submitted. Synthetic game/service names and duplicated fixture game entries are test-data properties; they are not reported as product defects. No assertion is made about real MLBB field content or pricing from this fixture.

## Additional observed findings

These go beyond the existing hero/showcase composition and animation roadmap.

| ID / priority | Reproduced observation | UX consequence / recommended change | Acceptance evidence |
| --- | --- | --- | --- |
| LIVE-UX-01 / P1 visual | On the custom form, select Solo, click “Check selections,” then scroll toward the bottom. The sticky right-hand “YOUR CONFIGURATION” card overlaps the top/right area of the full-width manual-price-review result card; their outlines visibly collide. The observed result text remained readable on the left. | Keep the summary contained within its layout section or allocate result space within the same two-column grid. It must stop before subsequent full-width content. Avoid solving it by merely raising one card's z-index. | Reproduce with a short form and manual-review result, then test numeric estimate, validation errors, longer copy and narrow layouts. At every scroll position, panel boundaries and content remain separate. |
| LIVE-UX-02 / P2 clarity | After the result says selections are valid and need manual price review, the right summary still instructs the user to check selections for a provisional estimate. | Update the summary to the actual state: unchecked, checking, valid/manual review, estimated, or changed since checking. Use a consistent next-action label. | Selecting, checking, receiving manual review, editing and rechecking show mutually consistent summary/result/next-action copy. |
| LIVE-UX-03 / P2 navigation | The rendered global header presents “Accounts” and “Account” in the same compact navigation row. The first opens account trading; the second identifies the personal area. | Distinguish destinations with clearer labels such as “Account marketplace” and “My account” or a state-appropriate sign-in label. This is a naming proposal, not evidence that a tested user was confused. | A first-time reviewer can identify where to browse game accounts versus view their own orders without opening both. Verify narrow navigation uses the same distinction. |
| LIVE-UX-04 / P2 hierarchy | The custom service view places a bright filled “Save to favorites” button immediately under the large title. Configuration and the actual next-step action occur substantially farther down. | Reduce the favorite action's visual priority and place it beside the title or in a compact utility area. The form's next decision should lead the action hierarchy. Preserve favorite behavior and accessible labeling. | Same-viewport before/after captures show a clear primary configuration/request action; keyboard access and favorite feedback remain intact. |

P1 here means a directly observed layout defect worth fixing before renewed visual acceptance, not a security or checkout-blocking claim. P2 findings are clarity/hierarchy improvements supported by the visible interface, with proposed user-comprehension checks still needed.

## What worked in the inspected state

The game page separates custom requests from fixed packages and labels final administrator review versus fixed scope/price. The form exposes a named native selection control, updates its summary after choosing a mode and gives an explicit manual-review result without pretending a price exists. The footer provides motion choices. I did not activate those choices before the interruption, so their behavior is not newly qualified here.

## Initial interruption and resumed review

After activating “Continue to order information” during the first pass, the immediate capture removed the previous result and continue button while still showing the first-step controls. The follow-up observation was initially prevented by the workstation lock. The resumed review below resolves this uncertainty: the stage advances, and a second selection check reveals the request/sign-in block. It is a transition-clarity issue, not a broken progression claim.

CUA reported: “The Mac is locked and automatic unlock could not unlock it.” Inspection stopped until the owner unlocked the workstation and authorized continuation. This was an environment interruption, not a PLAYORA defect. The parent then restarted fresh isolated fixtures at the same local origin.

### Resumed coverage

I reopened `/games`, selected the fresh desktop fixture game and repeated Solo → Check selections → Continue to order information. The fixture had no additional order-stage questions. After Continue, the validity/result/continue block disappeared and Mode, Coupon and “Check selections” remained. Activating “Check selections” again displayed “Request an administrator’s quote,” explained the request was unpaid and offered “Sign in and complete verification.” Thus the second stage is functional, but its visible handoff needs improvement.

I followed that link to the actual customer sign-in page, preserving its configuration return URL, then opened staff access at `/admin`. Neither sign-in was submitted. Both rendered email-code forms and explained passwordless access. Staff copy explained the authenticator requirement. Google was unavailable in these fixtures; that runtime configuration state is not classified as a product defect.

Firefox Responsive Design Mode was opened through its native UI. The toolbar confirmed 320×480 for an initial staff-page view and 390×844 for subsequent staff/customer sign-in and account-marketplace views. These are CSS viewport settings in desktop Firefox, not physical-phone, touch-keyboard or mobile-browser qualification. The sign-in content fit the narrow column without observed horizontal clipping; the short staff viewport displayed the guide and page heading before the email form, suggesting the first-owner setup/intro could be quieter.

At `/accounts`, the fresh fixture inventory was empty. I opened “Filter accounts,” inspected its search/region/rank fields, then pressed Escape. The drawer closed and focus returned to “Filter accounts,” as expected. No filter or alert subscription was submitted. This review did not expose a marketplace drawer-layout defect.

### Additional findings from continuation

| ID / priority | Observed issue | Proposed change and acceptance |
| --- | --- | --- |
| LIVE-UX-05 / P2 stage clarity | Continue clears the previous result and leaves the same configuration controls; the request/sign-in block appears only after a second “Check selections.” In a fixture without extra order fields, the reason for that second check is unclear from the visible next action. | Keep required order-stage/server validation. Make the current step, new heading/focus target and next action explicit even when no extra questions appear. Verify both zero-extra-field and additional-private-field configurations; never bypass validation to make the transition look smoother. |
| LIVE-UX-06 / P2 empty-state clarity | `/accounts` has no applied filters and an empty fixture inventory, but says “No available accounts match these filters.” | Distinguish no published inventory from filters producing no matches. Use the existing alert/catalog paths as context-appropriate next actions; do not invent stock arrival dates. Test empty inventory, genuinely filtered zero results and filters cleared. |
| LIVE-UX-07 / P2 navigation consistency | The desktop header contains “How it works,” while the 390px customer sign-in/marketplace header exposes only Games, Accounts and Account, without a replacement menu. | Preserve access to the explanatory destination on narrow screens through deliberate navigation or a small menu. Verify discoverability on internal routes, not only on the homepage where the section is already present. |

The previous desktop overlap, stale summary, navigation naming and favorite hierarchy findings remain. No authenticated account/admin workflow, actual email-code/MFA exchange, complete order submission or real-device behavior is qualified by this read-only review. Homepage animation review belongs to the designer's separate live pass; this specialist did not newly qualify its motion preferences.

Visual observations are present in this task's CUA screenshot outputs; this agent did not export additional screenshot files. No application code or runtime asset was changed. The note is for roadmap refinement and owner review, with R10/R11 still held.
