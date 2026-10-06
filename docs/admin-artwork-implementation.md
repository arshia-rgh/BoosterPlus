# Admin artwork uploads

Scope: game catalog main artwork, article cover and image blocks, and shop product artwork. Existing private order/account evidence uploads remain separate. Existing six game assets and their paths remain defaults, with an explicit restore-default control. No seed replacement or automatic publication.

## Interaction and responsive delivery

Editors show placement-specific recommended dimensions before file selection, accepted JPEG/PNG/WebP formats and the 4 MiB / 4 megapixel limit. Select an image, check focal point/crop previews where appropriate, upload and review generated versions, then use it in the draft. Upload/retry/error states preserve the existing image. Saving/publishing retains current revision and review rules. Alternative text and attribution remain explicit editor fields.

Game artwork has landscape hero, 4:3 mobile and card crops, plus a smaller backdrop. Cover artwork has landscape/card variants. Product and article-body images retain their complete aspect ratio, avoiding cropped product details or screenshots. Browsers choose bounded derivatives using picture/srcset. Small sources are not silently enlarged. Uploaded bytes are decoded, scanned and re-encoded without metadata; originals are never public.

## Security and persistence

Use a separate explicit SQL migration and Ent artwork records, private object storage and the existing fail-closed scanner. Admin portal/MFA, CSRF, live authorization, rate/size/pixel limits, fixed variant names and server-derived object keys apply. No arbitrary remote URLs, SVG uploads, request-driven transformations or executable image content. Draft artwork requires admin access; anonymous image delivery checks currently published game/product/article references, including article scheduling semantics. Draft replacement never changes an existing published image. Public response revalidation must check visibility again.

## Verification and delivery

Unit tests cover decoding/crops/bounds/metadata, paths and responsive selection. Isolated database/scanner/storage scenarios cover upload/retry/concurrency, role/CSRF boundaries, scan/storage failures and publication visibility. UI checks cover all four editor contexts, default restoration, replacement, failed/retried upload, focus, narrow/enlarged text and public images. The required senior designer reviews only these changes in a running preview and repeats until scoped findings are resolved. Backend/full repository qualification remains required for this new backend feature; previous one-use mobile/terms exception is consumed. Never use production data for destructive qualification.

Reference: [MDN responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images) distinguishes crop/art direction from resolution selection. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) informs independent format, authorization, storage and resource checks.

Status: implementation and scoped senior UI review complete; focused real-service and desktop/mobile browser checks passed. Complete repository qualification and delivery remain pending. No new upload feature is deployed.

## Placement guide

| Editor | Suggested source | Generated display versions |
| --- | --- | --- |
| Game catalog | 1920 × 1080, room around faces | 1600 × 800 hero, 768 × 576 phone, 640 × 400 card; smaller 800/384/320 versions |
| Article cover | 1600 × 900 | 1600 × 900 cover, 640 × 400 card; smaller 800/320 versions |
| Shop product | 1600 × 1600 | Full aspect ratio within 1600, 800, 640 and 320 pixel boxes |
| Article image block | 1600 pixels on longest side | Full aspect ratio within 1600, 800, 640 and 320 pixel boxes |

These are maximum outputs, not promises to enlarge a smaller original. Transparent output remains PNG; opaque output is JPEG. Phone JPEG orientation is respected. Animated images and SVG uploads are rejected. Admins retain control over alternative text, source/rights and the existing exact-revision publication review.

## Operations and compatibility

Migration 40 adds the separate artwork index; migration 39's six bundled game paths and framing defaults are unchanged. Recovery capture/restore now includes every ready artwork derivative, alongside existing private evidence, at the same SQL checkpoint. Processing/failed rows are never public. Failed preparation can retry the identical request; a changed crop creates a new immutable upload. Unused prepared images remain private and retained; this release has no automated artwork deletion, preventing accidental destruction of saved historical revisions. Storage monitoring and existing capacity alerts remain necessary.

The upload has one processing slot per API process, a 55-second work budget, a route-specific 60-second backend response deadline and 65/70-second frontend/gateway bounds. Normal API timeouts remain unchanged. Only the authenticated upload route receives the extended deadline; the existing request-body read deadline remains. No public storage bucket or new runtime secret is introduced.

Schema 40 cannot be rolled back to a schema 39 binary without a separately reviewed migration/recovery procedure. Keep this feature undeployed until its complete gate and release requirements pass. Off-host backups remain an unresolved owner-deferred operational item; implementing archive coverage does not establish a backup or a successful recovery of production data.
