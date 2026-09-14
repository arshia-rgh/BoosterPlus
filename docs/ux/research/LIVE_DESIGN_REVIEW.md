# PLAYORA running-site visual review

Date: 14 September 2026. Design research only; no application edits or commits.

## Actual inspection and limits

Inspected the running storefront at `http://127.0.0.1:4173/` using native Google Chrome through the computer-use tool, in a separate tab. The coordinating agent supplied the current built application with an isolated fixture API and no live payment activity. This is a new rendered review, not a rereading of historical screenshots.

The Chrome window captures were approximately 971 × 768 pixels including browser chrome; this is a desktop-window review, not a claimed 1440px viewport or physical-phone test. No global window resizing was performed. A Chrome default-browser notification was visible above the site; it belongs to the browser and is not a PLAYORA defect.

Observed the loaded homepage hero, rank scene, custom/fixed choice cards, how-it-works section, the games index, and a loaded game services page. Followed “Browse published packages” from the homepage to the games index, then opened the first fixture game's services. The rendered fixture catalog contained two “Fulfillment journey game” entries, one “Synthetic boost” and one “Synthetic package.” These are test content, not evidence of duplicate production games or approved business wording.

The subsequent package navigation changed the URL, but its capture still showed the outgoing game view. The next observation reported that the Mac was locked and could not be automatically unlocked. Consequently, this review does not claim that the package detail finished loading, and it does not assess authenticated account, checkout, chat or staff layouts. The separate UX reviewer may have additional public-route evidence.

## Additional findings for the roadmap

These findings extend the already documented hero-overlay and showcase-motion work. They are proposed fixes for approval, not implemented changes.

| Finding | Direct running-site evidence | Why it matters | Proposed design response |
| --- | --- | --- | --- |
| The homepage's two distinct service choices lose their intent on navigation | “Explore custom boosting” and “Browse published packages” expose the same `/games` destination; clicking the package action landed on the generic game-selection introduction, without a visible package selection | The cards ask the visitor to choose a path, then the next screen makes that choice feel forgotten | Preserve the selected path through game choice and reveal the corresponding service group afterward. If this is not implemented, use wording that accurately says the visitor is choosing a game first. Keep actual service availability authoritative |
| Saving a game is visually promoted above finding its services | In the loaded game page, the prominent green “Save to favorites” button sits under the large title; “Custom boosting” and its service card begin substantially lower in the window | A secondary retention action receives the first strong visual emphasis on a page whose main task is choosing a service | Make saving a quiet icon/text or secondary-outline control near the title. Put custom/package choices or compact section anchors within the initial useful view. Preserve the explicit accessible name and existing save behavior |
| The missing-art fallback retains the mass of a hero illustration | The fixture game page displays a large outlined rectangle of concentric ovals containing a single “F,” opposite the large game title | A monogram is a valid fallback, but its large allocation adds vertical and visual weight without giving the visitor useful game detail | Define a compact fallback composition separate from the full artwork composition. Use a smaller game symbol/title lockup and bring service choices upward when there is no meaningful artwork. Review both real-art and missing-art states; do not assume this fixture proves launch artwork is missing |
| “Accounts” and “Account” are easy to confuse in the public navigation | The running header shows “Games,” “Accounts,” “How it works,” then an outlined “Account” control | Nearly identical labels refer to account shopping and the visitor's own workspace, requiring interpretation before navigation | Consider “Game accounts” for the marketplace and “My account” or state-aware “Sign in” for the personal destination. Keep labels consistent across public, signed-in and narrow layouts; do not change authentication or marketplace scope |
| The game-section destination is not strongly marked in the header | After navigation to `/games` and its game detail, the visible “Games” label did not present an obvious selected treatment in the inspected capture | Visitors lose a lightweight orientation cue as the hero composition changes between routes | Add a restrained green current-section treatment and appropriate current-page semantics. Confirm the actual accessible state in implementation; a visual capture alone does not prove `aria-current` is missing |

The first three items are the most useful additions: they directly connect homepage intent to the first real catalog decision. They do not require reopening unrelated order, chat or staff business flows.

## Rank-scene observation requiring focused verification

In the live early Warrior state, the profile card was visually much quieter than the left-side headline, and the faint Iori behind it added another low-contrast silhouette. This is a visual observation, not a measured WCAG contrast failure. The low-to-high transformation itself remains an accepted behavior.

Add a focused legibility review of the start, middle and final rank states, at rest as well as during scrolling. Check that the starting rank title, card boundary and progression remain understandable without making the entire scene brighter or changing the existing transformation. If necessary, quiet the background figure and strengthen only the relevant profile text/edges. Do not infer from a single transitional frame that the whole animation is broken.

## Evidence handoff and implementation acceptance

The computer-use session contains fresh rendered captures of the homepage, rank scene, two service cards, three-step explanation, games index and game detail. Reproduction sequence: open the running homepage; scroll to “Your climb, customized.” / “One pack. A clear plan.”; follow the package link; open the first game; inspect the header and start of the service groups. Repeat with representative published MLBB content during implementation rather than treating synthetic fixture names as the desired final design.

For the added catalog refinements, require before/after captures with meaningful game artwork and with absent artwork, with one and several service groups, and after both custom/package homepage entry paths. Check a desktop window, 320–390px narrow widths and enlarged text. The selected path should remain clear without hiding unavailable services or inventing a purchasable package. Favorites remain accessible but visually subordinate to service selection.

This pass is a visual/interaction audit of the routes and states above. It does not establish conversion improvement, complete mobile qualification or acceptance of the entire website. The main roadmap should incorporate only the evidenced issues and keep the remaining review coverage explicit.

## Resumed inspection after workstation unlock

The owner unlocked the workstation and the coordinating agent restarted the isolated application with fresh fixture slugs. This second pass again used native Chrome, following `/games` to the new fixture game's package page rather than relying on the expired fixture URLs. No account, order or payment mutation was performed.

The fixed-package route **did resolve** in this resumed pass. Its fresh URL, loaded accessibility tree and screenshot agreed on “Synthetic package,” the selected “Synthetic variant · USD 12.34,” delivery information and the package price. This closes the earlier package-navigation observation gap; there is no evidence here that package navigation failed.

The visible initial package composition corroborates the earlier action-hierarchy finding: the strong green “Save to favorites” control comes before variant selection and the large price/details card, while the required play-mode form lies farther down. Keep the price clear and prominent, but reduce the favorite action's emphasis and compact the header so configuration is easier to discover. The one-variant synthetic fixture does not prove that a variant selector is unnecessary for real multi-variant packages. The loaded accessibility tree also confirms a configuration summary and required fields; this pass did not complete or submit the form.

Navigating to `/accounts` produced the loaded marketplace accessibility tree, including empty Search accounts, Account region and Account rank fields, zero accounts, and “No available accounts match these filters.” Because no filters were applied, this wording suggests a filter mismatch when the observed condition is simply an empty fixture inventory. Add distinct unfiltered-empty and filtered-no-results copy, with an appropriate availability-notification path. This is an accessibility-tree/content finding, not an independently confirmed new visual-layout finding. The fixture's zero listings are not a production inventory defect.

The resumed computer-use session developed an observation limitation: URL and accessibility content changed, while some screenshots retained the outgoing package composition or a blank browser content area. Native scroll operations also returned `noWindowsAvailable` despite valid accessibility reads. A temporary native window zoom/reflow did not produce a reliable marketplace capture, and the original window size was restored afterward. These tool/window symptoms are **not** recorded as a PLAYORA blank-page or navigation defect.

Consequently this resumed pass does not claim a reliable new marketplace visual composition, a narrow/mobile viewport audit, or narrow homepage motion-control coverage. No CSS viewport width is inferred from screenshot dimensions. Those checks remain for the coordinating agent's reliable browser surface or a subsequent review. The package observation and marketplace empty-state wording above are the specific additional evidence from this resumed pass.
