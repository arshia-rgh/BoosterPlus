# Service144: SE07 seller images and cosmetic details review

Date: 12 October 2026. Reviewer: separate senior UI/UX agent `/root/service_release_designer`.

**PASS for the reviewed SE07 design scope after three rendered rounds. SE-S01–04 are closed.** This is a scoped design review, not backend or production qualification.

## Candidate and coverage

Frozen `service144-r7`, isolated `service144-review8`, manifest `c406fcb87fdebc95fc56e566599302207ef5b2eed72a6483170520e207648561`.

Reviewed seller cosmetic category/quantity/name groups; private screenshot preparation, uncertain batch send and navigation protection; admin reviewed-media selection, title image, ordering/removal, private preview and required-cover publication validation. Preserved game context, green theme, independent staff identity and existing publication permissions.

Chromium390×844 and820×844 rendered the saved cosmetics groups and their add/remove/error states. Chromium390×844 and WebKit390×844 rendered seller uploads; Chromium390×844 rendered admin image selection; phone200% text inspected for cosmetics and cover controls. API requests were exact synthetic responses only. Binary fixtures asserted local-file hashes and method/path/request shapes; they did not contact storage or a scanner.

## Findings

### SE-S01 — required collection error is not associated with its focused repair action, medium — closed

Submit an empty required cosmetic collection. The exact `submission_invalid` response with path `skins` focuses **Add skin group**, and the error appears visually below the control. The focused button has no `aria-describedby`/invalid state; the collection is a plain div/h4 without a named semantic group or required indication. A keyboard or screen-reader user reaches an action without its reason.

Required: expose a named required collection group, associate the group-level error/help with the focused repair control or compact group target, and preserve specific row-field error targets. Do not require a screen-reader user to search after focus moves.

Evidence: `designer-seller-cosmetics-chromium-820-r3-empty-required` and recorded post-response DOM. Quantity mismatch already focuses the correct quantity input; removing a middle group already focuses the next category and retains its value.

### SE-S02 — admin image operations drop keyboard focus, medium — closed

Previewing a selected image replaces the focused preview button with an image; focus becomes BODY. Moving the title image from second to first disables the focused Move up control, likewise losing focus. Removing the title image removes the focused control with no replacement focus. This makes repeat review/reorder work cumbersome and loses location in a long editor.

Required: stable visible focus after preview, boundary movement and removal; return to the affected group, its next available action or the title selector when appropriate. Preview expiry/error must also leave a usable re-request path.

Evidence: `designer-admin-cover-chromium-390-r1-selected-cover-preview`, `cover-reordered`, and `cover-removed`, with BODY focus recorded.

### SE-S03 — publication preview cannot show the selected cover and gallery, medium — closed

The publication view labels the section **Customer preview · private draft**, but calls `ProductTerms` with `images: []` and adds only image download buttons. It cannot show the selected title image or final gallery ordering. Individual image previews exist in the previous section, but they do not qualify the actual cover/gallery arrangement before publication.

Required: a private inline preview using the selected reviewed cover and ordered gallery, with permission-scoped grants and useful expiry/failure handling. Show what is actually selected without creating public URLs or publishing to obtain a preview. Retain the explicit private label.

Evidence: `designer-admin-cover-chromium-390-r1-private-preview`; source `frontend/app/resale/inventory.tsx`. Missing-cover publication itself correctly changes to Public images, exposes the inline error and focuses **Account title image**.

### SE-S04 — screenshot completion/recovery loses focus and hides the next step, medium — closed

After upload becomes ready, the Upload image action disappears and focus becomes BODY. After a batch send becomes uncertain, its temporarily disabled action has also lost focus; on390px the uncertain warning is partly below the viewport and retry is further below. Success resets the batch but again gives no new focus target.

Required: after current-request completion, focus a compact ready/error/uncertain/success target and bring it into view. Keep unknown batches immutable and retry with the same request reference. Removing an attachment should restore its input or a stable slot target without jumping to the document start.

Evidence: `designer-seller-upload-chromium-390-r1-two-ready`, `uncertain-locked-batch`, `retry-confirmed`; viewport screenshots and recorded focus.

## Second rendered round

Frozen `service144-r8` / `service144-review9`, manifest `13efd0ecf7b54510ffc3fe24402390c4d24f77a63a6a3b47d0c58c1d271ac7d5`.

- SE-S01 closes. Chromium390px/200% now exposes **Skin collection (required)** as a named invalid fieldset. Its error ID describes both the group and the focused Add skin group action. Exact row-count focus and removal focus remain correct.
- SE-S02 main correction closes. Selected preview retains its stable Refresh preview button; reorder and removal focus the corresponding remaining fieldset. Missing-cover publication still reveals and focuses the title selector.
- SE-S03 cover/gallery content correction works: the actual private card uses selected media802, gallery starts with802 then801, and grant failures preserve a focused retry control. The45-second expiry removes focused gallery controls and leaves BODY focus in Chromium; this still needs a conditional return to Load private preview images when the removed controls held focus. Do not steal focus from unrelated fields.
- SE-S04 compact batch outcome works in WebKit for uncertain delivery and successful retry. Exact attachments/request key remain unchanged. The shared upload completion after pointer activation still leaves WebKit focus on the enclosing focusable record-content div; the new `body || root.contains(activeElement)` guard does not recognize this browser fallback. Explicitly focusing the file input before selecting its synthetic bytes still reproduces the failed ready-focus assertion. Explicit keyboard activation of Upload image passes ready-focus recovery; subsequent pointer activation of Remove attachment still fails to restore the input (`designer-seller-upload-webkit-390-r3`). Preserve the existing no-steal intent when repairing browser fallback focus.

Evidence: review9 `designer-seller-cosmetics-chromium-390-r3-*`, `designer-admin-cover-chromium-390-r1-*`, `designer-private-listing-chromium-390-r1-*`, `designer-private-listing-webkit-820-r1-*`, and `designer-seller-upload-webkit-390-r1/r2-*`. The new private-preview synthetic route verifies permission-scoped URL shapes, local image loads and current ordering; it does not exercise a real permission server or expiry token.

## Third rendered round

Frozen `service144-r9` / `service144-review10`, manifest `a76a360ba66a8b2b6373d0d731329f1aa5a5bea34b6b5adac9562dd325db9aec`.

- SE-S03 closes. With the second gallery thumbnail explicitly focused,45-second expiry now returns focus to **Load private preview images**. Chromium390px and WebKit820px both pass. Selected cover/gallery order, grant-error retry and recovery remain correct. Source limits expiry focus repair to a disappearing gallery that actually held focus.
- SE-S04 closes. WebKit390px pointer upload now focuses the compact ready outcome; removing the second image returns focus to its file input, and selecting a replacement focuses Upload image. The same synthetic two-image batch survives an uncertain send and retries with identical contents/reference. Both uncertain and successful outcomes are focused and visible. Navigation protection remains intact. Existing Chromium correction evidence is retained in review9.

Evidence: review10 `designer-seller-upload-webkit-390-r2-*` and `designer-private-listing-{chromium-390,webkit-820}-r2-*`, including private binary exchange manifests. The file picker itself uses Playwright synthetic local bytes with explicit input focus; no native-device picker or real scan result is claimed.

## Historical first-candidate observations and qualification limits

This block preserves the original review8 results. Remaining issues described here were subsequently closed in rounds2–3 above.

- Saved Collector2 (Aldous/Yu Zhong) and Epic1 (Chou) groups retain exact values. Adding a third group focuses its category. Removing the middle group preserves the next group's values and focus.
- Exact server-shaped quantity mismatch points at the appropriate row quantity. Required-empty error remains visible and reaches the collection, subject to SE-S01 semantics.
- Chromium and WebKit: two local JPEG previews can be prepared. The synthetic send contains both IDs in order and one stable request key. Unknown delivery locks batch edits; the successful identical retry resets the batch and states that images remain private review material.
- Leaving the seller record with prepared screenshots opens and focuses a draft-protection warning. Staying preserves the two images.
- Admin title selection remains the same media ID when order changes. Removing it clears the cover. Missing cover at publication exposes/focuses the correct selector without publishing.
- Green theme and current game/record context remain. No measured document overflow in recorded phone/tablet/200% states.

In the first candidate, WebKit also lost precise screenshot-operation focus to the broad record-content div. That historical observation did not close SE-S04; round3 supplies its final closure.

Evidence directory: `.cache/flow-review141/evidence/service144-review8/`. Helpers: `service144-seller-cosmetics.mjs`, `service144-seller-upload.mjs`, `service144-admin-cover.mjs`. Preserve initial helper corrections: an incorrect Add/Remove skin-category label was corrected to actual group wording; quantity mismatch fixture path was corrected to actual backend `.count`; the preliminary generic error code was corrected to `submission_invalid`. Those are fixture corrections, not application bugs.

No actual scan, object ownership/publication, malware rejection, backend deduplication, persistence, external messages, live financial action, production setting or authenticated real-user journey is claimed qualified. Real devices and assistive technology remain outside this rendered review. Backend/security tests belong to separate release evidence.
