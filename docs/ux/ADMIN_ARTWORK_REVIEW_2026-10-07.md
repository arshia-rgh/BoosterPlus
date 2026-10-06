# Admin artwork upload — scoped senior UI/UX review

Verdict: **PASS — no remaining actionable findings in the reviewed scope.**

Reviewer: separate senior UI/UX designer agent `/root/artwork_design_review`. Review ran on 6–7 October 2026 against the working changes based on `fb8a1f5`, with a final rendered recheck of the phone framing correction on 7 October. This is the required changed-UI review, not approval of deployment or a full repository/security qualification.

## Scope and approach

Reviewed the new shared artwork uploader and its game catalog, article cover, article image-block and shop product integrations. Checked recommended dimensions, file restrictions, focal/crop previews, preparation and application to the draft, retained current artwork, default restoration, upload/preview failures and retries, keyboard focus, validation disclosure, inline block movement and responsive public presentation. Existing game assets remain defaults; publication is a separate editor action.

Used the built React applications through a private local server at `127.0.0.1:5176`, with isolated synthetic API responses at `127.0.0.1:18083`. Fixtures include the bundled game image and generated geometric artwork with edge markers. No production requests, private user records, actual email or payment actions were used. Fixture preparation and scripts were confined to `.cache/artwork-review/`; this report is the only tracked file written by the reviewer.

## Review rounds and corrections

| Finding | Initial observation and impact | Correction and verification |
| --- | --- | --- |
| AU01 — P2 | Successful upload JSON enabled applying the image without recovering failed derivative previews, so an administrator could not review the result reliably. | Preparation and image loading are distinct. A deliberately failed phone derivative showed an explicit retry action and kept Use this image disabled. Recovery loaded previews and enabled the action in Chromium and WebKit. |
| AU02 — P2 | Adjust crop and Restore default removed their focused controls without restoring a useful keyboard position. | Adjust crop focuses Horizontal focal point; Use and Restore default return to the file control. Verified with keyboard activation and active-element checks. |
| AU03 — P1 | Index-keyed article blocks could associate stateful pending uploads with a different block after moving/removing blocks. | Stable local block keys preserve pending preparation with the correct image block. Moving the first prepared image down moved its Use action with it; applying it and removing the other block retained the correct caption and record. Verified in both browser engines. |
| AU04 — P2 | Inline upload controls registered the cover's `asset` field name; a closed path disclosure also hid the validation target. | Inline fields no longer duplicate `asset`. A synthetic cover validation failure opened the correct disclosure; the summary link focused its labeled input. Both engines reported exactly one `asset` input with two inline image blocks present. |
| AU05 — P2 | The separate catalog Phone framing preview remained portrait 3:4 after phone derivatives changed to landscape 4:3, visibly clipping the subject differently from the live game hero. | Phone framing now uses 4:3. Final Chromium/WebKit renders at 1440, 768, 390 and 320 px show the complete synthetic subject and the intended lower text region. The narrow preview measured 254×191 px; wider previews measured 320×240 px. Existing default artwork remains available. |

Round one identified AU01–AU04 by code review and withheld a verdict pending rendering. Round two verified those fixes and found AU05 in rendered catalog framing. Round three verified AU05 and the affected public product images; no further actionable findings remained.

## Actual rendered coverage

- Chromium and WebKit: game uploader at 1440, 768, 390 and 320 px; replacement, service-unavailable error, broken derivative, preview retry, crop adjustment, application, default restoration and useful keyboard focus.
- Chromium and WebKit: article cover preparation, inline image preparation/movement/removal, product preparation and invalid SVG selection. Cover field validation and summary-to-field focus were checked in both engines.
- Chromium: detailed component screenshots for game, cover, inline and product at 1440, 768, 390 and 320 px, plus 320 px with 200% root text size. No document-width overflow was observed. WebKit also passed product 320 px/200% text.
- Chromium: public game hero/backdrop and article cover/body-image rendering at 1440, 768, 390 and 320 px. Responsive source selection was inspected, including the phone hero derivative.
- Chromium: synthetic public product cards and details at all four widths. Cards used card/thumb derivatives and details used wide/wide-small derivatives. Complete non-square image content remained visible with `object-fit: contain`, including edge markers.
- Chromium and WebKit: final applied-image game framing correction at all four widths. No overflow or broken preview image was observed.

The two-step Prepare → Use flow visibly distinguishes image preparation from applying a draft change. Confirmation text states that saving/publishing remains necessary. The existing image survives failed replacement, and Restore default explicitly affects the draft. Size guidance and accepted formats precede selection; article-body and product image previews preserve the complete image instead of applying editorial crops.

## Evidence and limits

Private local evidence is retained under `.cache/artwork-review/`: `results.json`, `detail-results.json`, `errors-results.json`, `final-results.json`, `public-shop-results.json`, associated screenshot files and reproducible fixture/browser scripts. Representative final screenshots include `final-framing-chromium-390.png`, `final-framing-webkit-320.png`, `error-validation-chromium.png`, `detail-product-390-100.png`, `public-shop-card-320.png` and `public-shop-detail-390.png`.

These synthetic render checks qualify the interface and state transitions, not actual scanning, encoding, storage, publication authorization or server idempotency. Those require the implementation's independent integration/browser tests. The simulated processing failure used HTTP 503; this review does not claim a measured 65-second network-timeout test. Public product rendering was checked in Chromium, not separately in WebKit. Physical devices, touch input, assistive-technology reading order, exhaustive image compositions and owner visual acceptance are not established by this review. The framing widget is a representative preview, not a pixel-identical simulation of every possible viewport or text length.

The reviewer did not run or certify the full repository gate, production release, live publication or backend test results. This PASS is limited to the changed UI and the scenarios above.
