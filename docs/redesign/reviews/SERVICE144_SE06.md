# Service144: SE06 news-media design review

Date: 12 October 2026. Reviewer: separate senior UI/UX agent `/root/service_release_designer`.

**PASS — no remaining actionable findings in the reviewed news-media UI scope.** This is a scoped rendered design verdict, not production upload, publication or security qualification.

## Scope and build

Reviewed the prominent article cover explanation, image-row insertion between article blocks, per-image description/caption/rights, four-image bound, stable reorder/remove focus, current-image preservation, upload-size messaging/recovery, saved preview, public article proportions and missing-image fallback.

Frozen build `service144-r6` / isolated `service144-review7`, manifest `837769bf1a0f6d3dc705d3f59bdb484bc407f52a55f7c4b2937ddfea948dfdfa`. All article definitions, saves, previews and public responses were synthetic. No production content was edited or published.

## Rendered coverage

| Area                       | Actual checks                                    | Result                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Article editor             | Chromium390×844,820×844,1440×1000; WebKit320×844 | Cover copy distinguishes title/card artwork from body images. Inserted a gallery between two existing paragraphs. Four images reached the disabled Add state. Exact image descriptions, captions and rights survived moving image1 later, removing image3 and moving the whole row down/up. Focus followed the inserted/moved item; removal chose the next surviving item. |
| Saving and preview         | Same viewport matrix                             | Exact synthetic draft payload preserves paragraph order and image metadata. Saved revision renders the same row in private preview. No real save, permission or publication is inferred from these fixtures.                                                                                                                                                               |
| Public gallery             | Same viewport matrix                             | Three-image row is side by side on desktop/tablet and stacked on phones. Intrinsic1536×1024 images retain their3:2 proportions with `object-fit:contain` and automatic aspect/height. Captions remain beside the correct images. No document horizontal overflow in checked states.                                                                                        |
| Enlarged text              | Chromium390px,200% root text                     | Editor fields/actions and public gallery captions reflow without document overflow.                                                                                                                                                                                                                                                                                        |
| Validation and empty state | Chromium390px                                    | Exact URL error opens the hidden existing-path control and focuses it; description error focuses the corresponding image description. Removing all images focuses Add image. Submitting an empty row focuses its named group; the next Tab reaches Add image.                                                                                                              |
| Missing public image       | Chromium390px and820px                           | A failed local image shows its accessible unavailable state while keeping its caption and the other images.                                                                                                                                                                                                                                                                |
| Upload boundary/recovery   | Chromium390px                                    | 4,194,305-byte input is rejected before any upload. Exactly4,194,304 bytes reaches image preparation. Synthetic503 retains the current image and supports retry; failed prepared preview keeps **Use this image** disabled; preview retry enables/focuses it. Applying updates only that image, retains siblings and returns focus to the file input.                      |

The public gallery and editor screenshots were inspected, in addition to computed proportions, overflow and keyboard assertions. Existing green styling, game context, private staff entry and publication controls are preserved.

## Evidence and limits

Evidence is private under `.cache/flow-review141/evidence/service144-review7/`, prefixes `designer-news-*`, `designer-news-errors-*` and `designer-news-upload-*`. Helpers are `service144-news.mjs`, `service144-news-errors.mjs` and `service144-news-upload.mjs`.

The standard runtime accepts exact JSON fixtures only. For the binary upload recovery review, the browser helper supplements it with an exact local-origin PUT fixture that verifies the method, path, query, content type and4MiB request SHA256. Derivative GETs return a known local image or an explicit503. The exchange manifest is `designer-news-upload-r2-binary-fixtures.json`. The external-request block remains in place. These responses simulate processing outcomes; they do not run a scanner or generate derivatives and must not be called backend upload qualification.

Separate backend/security tests must verify actual byte/pixel limits, decoding, scanning, derivative creation, private draft authorization, publication/unpublication access, persistence, scheduling and concurrency. This review did not trigger real publication, send mail or contact external services. It does not claim a real-device or screen-reader pass, a complete application suite, or coverage of every older article-block type.

Retain interrupted helper evidence: the first URL-error assertion matched both the upload-level and precise field-level error text; it was scoped to the latter. The first size-message assertion expected the earlier “4MiB” wording; the build correctly displayed “4MB (4,194,304 bytes)”. Neither interruption was an application failure. Corrected runs completed.
