# MLBB catalog setup for the service-experience release

Prepared 12 October 2026. Applies to the editor deployed in signed release `72ed594`; this guide does not publish catalog changes. Read-only audit source: public Mobile Legends release 200 on 11 October. Recheck the current saved draft before editing; a later owner revision takes precedence.

## Why no numeric estimate appears today

The live `rank_boost` service selects `manual-review-v1` and has no pricing plan. That setting intentionally requests a staff quote instead of calculating an amount. The estimate engine is implemented; a game-specific set of prices and passing examples is still needed. Fixed-package prices are separate from custom estimates.

## Reviewable changes for the next MLBB draft

In Admin → Catalog → Mobile Legends, edit a new draft and retain its revision. Do not overwrite an independently changed draft with an old export. None of the following changes updates existing orders or agreements.

| Area             | Current audited configuration                                           | Proposed draft configuration                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery         | `priority`: Standard/Priority                                           | Remove this field after reviewing its references. Use **Add requested delivery-hours range**: required `delivery_min_hours` / `delivery_max_hours`, integer 1–720 by default, and an `ordered_numbers` rule. Bounds are editable.             |
| Delivery meaning | Priority label                                                          | Requested elapsed calendar hours after verified payment and required delivery information/access are ready. It is a request; the accepted quote defines the commitment.                                                                       |
| Win rate         | `requested_win_rate`, legacy decimal                                    | Retain the key and use the explicit `win_rate` field type. Choices are no preference, range, below, above, and exactly 100%. Review any old numeric pricing conditions rather than assuming they still apply.                                 |
| Region/server    | Six regions and 28 servers, independent fields                          | Add `linked_choices`, `single_parent`, from `region` to `server`. Explicitly map every server to one region using the editor. Do not infer a server's region from its display name.                                                           |
| Role/heroes      | Optional choices hidden behind `single_role` and `single_hero` switches | Make `role` and `hero` directly visible optional estimate fields. Remove their toggle-based visibility/required conditions and the redundant toggles after checking references. Add `linked_choices`, `shared_parent`, from `role` to `hero`. |
| Hero mappings    | 133 heroes, five role choices, no relationships                         | Review the role list for completeness and map every available hero to one or more supported roles. The generic engine supports multiple roles without guessing.                                                                               |
| Role reference   | The role reference is labeled with kind `hero`                          | Correct its descriptive kind in the reviewed draft. The mapping uses explicit keys, not that label.                                                                                                                                           |
| Pricing          | Manual review                                                           | Retain manual review until the owner supplies reviewed prices and passing examples. The instructions below describe activation.                                                                                                               |
| Fixed offer      | USD 50, 24–72 hours, but no pinned boost specifications                 | Define the exact included rank/progress/win-rate/hero/role scope in the fixed-offer editor before publication. Do not invent those specifications from the package title.                                                                     |

The delivery template adds two fields without silently deleting existing priority settings. It is an explicit editor action. To replace Standard/Priority, remove the old field and repair any rules/examples that reference it before publishing. Keep the same underlying keys only when their meaning is unchanged.

The role/hero behavior is: choosing a role filters heroes; choosing heroes first matches their unique common role. A mixed selection with no common role removes and disables the role constraint. Multiple common roles remain an explicit choice. A matched role includes a **Limit Heroes to …** control; it does not silently trap the customer in that role when they return to edit.

## Configure custom pricing

1. Open **Price estimation → your service → Calculate estimate**. Select the currency and enter the base, minimum and maximum in normal money values. Currency selection is not an exchange-rate conversion; review every amount if changing it.
2. For rank progression, add **Rank interval sum**. Select `from_rank` and `to_rank`, which must use the same ordered rank reference. Set an amount for every adjacent rank transition that customers can select.
3. To price partial stars/points, also select `from_units` and `to_units`. Every relevant rank must have a positive, accurate unit count in the rank reference. If a rank system cannot be expressed this way, use a separate service or a manual-review condition; do not publish guessed counts.
4. Add other rules in the intended order. Fixed additions and per-unit amounts use normal currency inputs. Percentage and multiplier rules act on the running subtotal, so order matters. Conditions refer to configured values, not marketing labels. A **Require manual review** rule is appropriate for combinations the owner has not priced.
5. Delivery requests, hero/role restrictions and win-rate preferences do not automatically add a surcharge. Add explicit reviewed rules for those choices if desired. Do not reuse old numeric win-rate formulas for range/comparison answers.
6. Add synthetic price examples. Enter selections and independently calculate the expected total. **Check this price example** shows the current unsaved result and breakdown. It never copies the actual total into the expectation. Fix any mismatch before publication.
7. Include examples for ordinary progression, partial progress, add-ons, minimum/maximum bounds, each manual-review branch, delivery boundaries and representative valid relationship combinations. Also inspect invalid reversed ranks/hours and incompatible choices in the customer preview.
8. Save the draft, review it in the saved customer preview, and publish through the ordinary authenticated review flow. Publication pins the form, rules, examples and evaluator together. Customer estimates remain provisional; staff still provide the final quote.

### Illustrative arithmetic only

For a synthetic service with a USD 10.00 base, USD 2.50 fixed addition and a following 20% adjustment, the result is USD 15.00: `(10.00 + 2.50) × 1.20`. Reversing those rules gives USD 14.50. These are examples for checking the editor, not proposed MLBB prices. Backend calculations use exact decimals and round the final total once.

## Before publication

- Check the draft against the latest live release and review every removed/rekeyed field.
- Complete verified region/server and hero/role mappings. Incomplete or conflicting mappings block publication.
- Review requested-hours bounds and the timing-start wording; keep requests distinct from accepted promises.
- Check all saved synthetic examples and the actual customer preview on mobile.
- Fully specify each fixed offer. Customer-specific delivery facts do not change its promised scope.
- Preserve current payment policy and old catalog releases. No payment, email or publication is performed by this guide.

## Fixed packages in the deployed editor

The current published offer does not declare fixed boost contents. Existing orders retain their original release and agreement. New purchases of that incomplete offer will remain unavailable until an administrator saves and publishes an explicitly reviewed definition.

In Fixed packages, choose the service, add a package cover (4 MB maximum), and describe the complete offer. For each variant, set an ordinary currency price, delivery range and availability. Under Fixed contents & delivery information, classify every estimate/order field as a fixed value, customer delivery information, or not included. The server rejects unclassified, overlapping or invalid values. Classify actual boost specifications (target, starting eligibility, play mode, included hero/role and win-rate promise) according to the exact offer. Only genuine customer facts such as region/server/player information belong in customer delivery information; price and promised contents cannot be changed by a purchase request.

Custom-only preferences, such as a requested hours range, can be explicitly excluded from a fixed offer. Its own delivery commitment is shown above the form. If a fixed field has a visibility condition, its controlling fields must also be fixed, so a customer cannot hide or change a purchased promise. Later private access still uses the separate secure handoff flow.

New custom quotes and fixed agreements record the delivery start condition: elapsed calendar hours after verified payment and the required delivery information/access are ready. The customer’s requested hours are shown separately in quote comparison. Old quotes and agreements without this declaration retain their original wording.

No live package scope, price, relationship mapping or game publication has been changed by this implementation.

## Account-sale images and skin groups

In the game's Seller intake editor, add a **Skin collection** field in the order stage. Add the game's reviewed skin categories as ordinary option choices (the stored value may equal the visible label). Sellers can add category groups, specify a whole quantity and name each skin or associated hero on a separate line. Names are entered by the seller, checked for duplicates/length and reviewed by staff; they are not automatically published. Quantities must match the named items. The bounded input allows20 categories,100 names per category and200 total names. Existing scalar skin-count fields and historical submissions remain unchanged until the owner explicitly publishes a revised intake.

Sellers prepare up to four4MB screenshots per batch in Account details and press **Send screenshots for review** to attach them to their private review conversation. Uploaded or attached files do not automatically become account-listing media. Staff first review/sanitize the content, select eligible images in inventory, choose **Account title image**, and review the public listing before publishing. Removing a selected cover requires an explicit replacement; the first image is never silently assigned. The public gallery shows the chosen cover first. Empty-image listings keep an honest placeholder.

Staff can preview a selected private image through a short-lived authenticated grant. Do not copy private player identifiers, ownership evidence or cosmetic claims into public listing attributes without review.
