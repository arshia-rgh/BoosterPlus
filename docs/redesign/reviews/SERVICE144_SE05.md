# Service144: SE05 fixed-package design review

Date: 12 October 2026. Reviewer: separate senior UI/UX agent `/root/service_release_designer`.

**PASS for the reviewed fixed-package design scope after three rendered rounds. SE-F01–05 are closed.** This report preserves the earlier failed candidates and the exact correction evidence. Later seller/service-list changes have separate review reports.

## Scope and build

Reviewed package field classification, typed fixed values, customer-only delivery fields, fixed-content disclosure, direct order review, old/unavailable variants, linked choices, package cover guidance/display, and package-validation recovery. The revised quote clock was reviewed separately and is recorded in `SERVICE144_SE04.md`.

Rendered build: frozen `service144-r5` / isolated `service144-review6`, manifest `17bd01e550047db35f6c529c4c0ae0365bca44c54c36aa12fe0dadb7238ed6e0`. Current working source may contain later corrections; it does not replace this evidence.

## Findings

### SE-F01 — successful continuation does not bring the review into view, medium — closed

On Chromium390×844, fill the two permitted customer delivery facts and activate **Continue with this package** by keyboard. After the exact synthetic validation response succeeds, the review/consent appears below the long selection summary, while focus drops to the document body and the viewport stays at the old button. WebKit320×844 retains focus on the old button but likewise does not advance it to review. This makes a successful click appear ineffective.

Required: focus and scroll a compact review heading after current fixed-package validation succeeds, once per mounted review, without stealing field-error focus or re-focusing during unrelated refreshes.

Evidence: `designer-package-chromium-390-r1-fixed-review-viewport.png` and corrected-helper `r3` recordings; WebKit320px `r3`.

### SE-F02 — obsolete preset values are hidden, medium — closed

Load an admin draft with fixed role `Retired, Role` and heroes `[Retired, Hero, Mage]` after those retired options are removed. The role selector displays an empty choice, and the hero group displays only the valid Mage selection. The stored obsolete values have no disclosure or targeted removal, so the admin cannot see why the package still fails review.

Required: visibly identify unavailable scalar and multiselect values; provide exact-value removal while preserving valid values and stable keyboard focus. Do not silently change existing agreements.

Evidence: `designer-package-chromium-390-r3-obsolete-values` and equivalent WebKit320px state. The rendered role input value was empty and hero text contained only current options, while the dataset retained both removed values.

### SE-F03 — relationship errors point at unrelated fixed fields, medium — closed

`validatePackageScope` collapsed fixed-value relationship errors to the package's whole `preset_answers` path. The registry matches this to the first fixed control. A role/hero mismatch therefore appears as **Region — fixed value: Choose compatible role and heroes** in the reviewed fixture and leads to Region.

Required: preserve the precise fixed field path when known. Provide a compact, registered scope-level repair target for genuinely global errors, including obsolete field/exclusion references, instead of mapping them to an arbitrary input.

Evidence: actual backend error-path construction in `backend/internal/catalog/package_scope.go`; synthetic response using that path in `designer-package-errors-r1-linked-error-unregistered`. Exact missing-classification paths already identify the correct source selector.

### SE-F04 — invalid preview navigates away from its repair field, medium — closed

From Packages, choose **Preview saved changes** with an unclassified Player name field. The correct summary link and inline message exist, but focus moves to **Review and publication**, hiding the invalid source selector. The error summary is above the current viewport. Manually locating and activating its link correctly reveals/focuses Player name; the automatic path does not.

Required: an invalid saved preview should reveal and focus its first repair control, or a compact actionable summary for global issues. Navigate to the publication view when preview is valid. Preserve manual tab navigation and saved-draft preview semantics.

Evidence: `designer-package-chromium-390-r3-missing-source-focus`, WebKit320px equivalent, and `designer-package-errors-r1-classification-error-control` after manually activating the summary link. Source `run('preview')` sets the issues then unconditionally chooses `catalog-publish`.

### SE-F05 — intended square cover style is overridden, low — closed

The new `.package-card-artwork` declares a square aspect, but the actual card image computes `aspect-ratio:16 / 9` from stronger shared `.game-card img` styling. At390px the image is311.22×175.05px. The existing asset loaded successfully; this is a CSS precedence issue, not an image-load failure.

Required: make the package cover's intended square/contained rendering take effect, or explicitly retain this finding for the square-list SE08 stage before claiming the full requested card design complete.

Evidence: `designer-package-artwork-chromium-390-r1-square-cover-card` and `designer-package-cover-probe` computed-style output.

## Second rendered round

Frozen `service144-r6` / `service144-review7`, manifest `837769bf1a0f6d3dc705d3f59bdb484bc407f52a55f7c4b2937ddfea948dfdfa`, supplies the first corrections.

- SE-F01 now focuses the review heading, but `scrollIntoView({block: "start"})` places it at y0.23px under the sticky114px customer header at390px. The heading and agreed price are hidden. It remains open; use a header-aware position or the existing centered focus helper.
- SE-F02 now discloses the exact removed scalar/multiselect values. Removing them preserves valid Mage and returns focus to the current control. Rechecked390px, including200% text.
- SE-F03 now keeps the precise fixed hero path; a synthetic relationship error focuses the appropriate hero control. A genuinely global scope issue focuses a compact **Fixed contents** group instead of Region. Source review also confirms registered obsolete-field repair actions and exclusion groups.
- SE-F04 invalid preview now reveals Packages and directly focuses **Player name — source**. It does not navigate to publication first.
- SE-F05 remains open: the revised selector still loses to `.experience .game-card img` (0,2,1 versus0,2,0). Tablet820px square-dimension assertion fails; the aspect and crop must be checked against that actual container rule.

Evidence: review7 `designer-package-chromium-390-fixed1-*`, `designer-package-errors-r2-*`, and `designer-package-artwork-chromium-820-fixed2-*`. The latter failure is a real CSS result, not a fixture mismatch.

## Third rendered round

Frozen `service144-r7` / `service144-review8`, manifest `c406fcb87fdebc95fc56e566599302207ef5b2eed72a6483170520e207648561`.

- SE-F01 closes: the focused fixed-package review heading is centered at y465.4px in the390×844 viewport, visible below the signed-in customer header. The valid exact-body fixture reaches review without submitting an order. Missing classification and obsolete-value repair controls remain correct in the same rerun.
- SE-F05 closes: the shared service-tile selector produces301×301px artwork at820px, with contained imagery. Separate actual grids at390/1440px Chromium and390px WebKit confirm square card media. The customer package cover guidance and unsupported-format/current-image retention also pass the820px recheck.

Evidence: review8 `designer-package-chromium-390-r4-*`, `designer-package-artwork-chromium-820-fixed2-*`, and package rows in `designer-tiles-chromium-390-r1-*`, `designer-tiles-chromium-1440-r2-*`, `designer-tiles-webkit-390-r3-*`. Service chooser findings from the new SE08 scope do not reopen package scope.

## Historical first-candidate checks and qualification boundaries

These are the initial review6 observations and limits. Findings noted in that candidate were corrected and rechecked in rounds2–3 above; the final verdict is PASS.

- Chromium390×844 and WebKit320×844: fixed contents appear as readable descriptions; only approved customer Server/Player name facts render as inputs. Excluded custom defaults and fixed Role/Hero/Region controls are absent from the customer form. Fixed Europe restricts selectable servers to EU1. The exact synthetic validation payload retains fixed contents and approved facts, then exposes package consent; no order was submitted.
- Both widths: an undefined legacy preset declaration blocks new purchase UI with explicit review wording. Capacity zero disables continuation while preserving the offer description. Existing quoted agreements were not edited.
- Admin390px and WebKit320px: per-field source controls and typed current-value controls render. Missing classification has a valid inline error and working summary link, subject to the automatic-focus finding above.
- Package cover at390px: square1600×1600 recommendation, current local artwork preview, rejected SVG preserving that current choice, and200% text reflow. Public detail/card images load local assets without document overflow. A processed upload, private/public publication transition, failed rendition retry and the full responsive cover matrix are not claimed passed in this round.
- Green theme, in-game context, independent portal identity and existing permission boundaries remain intact in the inspected scope.

All browser traffic used exact synthetic fixtures through the isolated external-request-denying factory. No production/API, mail, provider, payment, quote issuance or publication action was performed. No real-device or assistive-technology pass is claimed. Backend persistence, security, concurrency, coupons and payment behavior remain separate qualification.

Evidence is under `.cache/flow-review141/evidence/service144-review6/`. Helpers: `service144-packages.mjs`, `service144-package-errors.mjs`, `service144-package-artwork.mjs`, and `service144-package-cover-probe.mjs`. Retain earlier helper interruptions: an incorrect package accordion selector, and trying to open Packages after the preview had changed the selected section. Corrected helpers use the actual accordion and explicitly return to the Packages route. These are review-tool corrections, not product failures.
