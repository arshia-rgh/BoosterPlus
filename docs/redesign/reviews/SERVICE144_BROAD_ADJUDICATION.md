# Service144 broad manual review: senior adjudication

Date: 12 October 2026. Reviewer: separate senior UI/UX agent `/root/service_release_designer`.

**PASS — no remaining actionable findings in the reviewed broad-manual scope after four rendered rounds. A01, B01, B02, C01 and C02 are closed.** This is the independent broad manual review requested by the owner after the implementation candidate and full gate started. It supplements the closed SE01–SE08 scoped reviews; those reviews did not certify every unrelated user journey.

## Candidate and boundaries

The independent testers used frozen `service144-r11`, manifest `a1b8e3eb1ab2c19aa649c416f4ecbfd636ace56e81695bae22ace815d59a9010`. The full1 source manifest is `3213df383932993df3a44ec4cc86027dab77bfbe653746474086c80ab1903377`. The parent retains the full1/full2 unit-focus timing failures separately; neither failed run proves the later corrections.

Browser sessions use separate synthetic datasets and local preview origins with external traffic blocked. No production account, provider, mail, payment or publication action is authorized or certified by this review. The senior reviewer adjudicates concrete tester observations, reviews the affected source and screenshots, and rechecks the implementing agent's fixes in a new frozen preview. Application source changes remain the parent's responsibility.

## Required corrections

### A01 — catalog action failure is outside the viewport, P2, closed

On the admin Price estimation section at WebKit320px, focus **Save changes** and press Enter with an exact synthetic503 save response. The request fails, but focus is BODY and the alert is above the viewport at y−546.97px while scrollY is967. The saved bar and form remain visible without the error. The screenshot confirms the error is not available in the current view. A user can mistake the unchanged form for a completed action or miss the recovery instruction.

Required outcome: explicit generic action failures receive a compact, named feedback focus destination and visible scroll position after busy ends. Keep unsaved data. Field-specific validation must retain its more precise field focus instead. Do not steal focus if the user intentionally moves to another section/control during the request. Cover a failed save, a field error and a delayed failure after deliberate focus movement.

Evidence: `.cache/flow-review141/evidence/service144-admin-manual1/manual-focus-measurements.json`, `manual-focus-webkit-320-keyboard-save-error-viewport.png` and the corresponding helper/trace. The independent admin report will provide the full coverage matrix.

### B01 — progress save lacks nearby confirmation and stable focus, P2, closed

At desktop Chromium1440px and narrow WebKit320px/200% text, save an assignment's progress from20% to42% using **Save progress**. The successful response updates the header and clears the note, but the now-disabled initiating control loses focus to BODY and there is no local live status. On the long phone view, the changed header percentage is away from the controls. This is not a keyboard trap: the next Tab reaches the adjacent proof link.

Required outcome: show a persistent, truthful local live success such as the saved percentage and relevant next step. Repair focus to the local outcome if the initiating control disappeared/disabled or its browser fallback still owns focus. Do not steal focus from another field or section. Preserve the note on failure and avoid displaying success for a failed request. Apply the same result behavior to the relevant shared fulfillment actions without changing fulfillment permissions or transition rules.

Evidence: `SERVICE144_BOOSTER_MANUAL.md`; private `service144-booster-manual1/keyboard-focus.json`, its Chromium trace, and `service144-booster-manual2/flow-2-saved-progress-*.png` plus flow records.

### B02 — revoked assignment needs a replacement focus destination, P3, closed

Focus **Refresh assignment**, then return an explicit revoked-access response. Private details and drafts are correctly removed, and an access-changed alert appears, but the removed initiating control leaves focus on BODY. The next Tab reaches Return to assigned work, so this is an orientation issue rather than a permission leak or trap.

Required outcome: focus the visible recovery heading when lost access replaces the assignment, after private content is cleared. Preserve the separate verification recovery explanation. Do not repeatedly move focus on unchanged background refreshes.

Evidence: `SERVICE144_BOOSTER_MANUAL.md`; the same keyboard-focus record and `service144-booster-manual2/flow-12-revoked-assignment-*.png`.

### C01 — idle local screenshot incorrectly locks the leave guard, P2, closed

Select a seller screenshot without starting upload, then leave the submission. The guard offers Stay and **Discard drafts and leave**, but Discard is disabled. Source confirms `UploadImage` reports `pending=true` as soon as a local file is selected, and `SellerImages` currently passes that state to the record boundary's busy flag. No network operation needs protection at this point.

Required outcome: distinguish an unsaved local selection from an upload/scan/remove or unresolved send operation. Idle selected files, including locally invalid files before a request begins, remain dirty but discardable after confirmation. Ready unsent attachments also retain a normal discard confirmation. Actual in-flight or unresolved operations remain protected, with an explanation and a visible recovery path. Preserve the exact-request-key retry for an uncertain screenshot batch; do not silently discard or duplicate it. Recheck queued scanning, definitive rejection, failed/uncertain upload/removal, successful completion, and deliberate Stay/Discard choices.

Evidence: private `service144-customer-manual1/seller-cosmetics-media-r3-draft-guard-viewport.png` and source `frontend/app/submissions/images.tsx`, `frontend/app/media/attachment.tsx`, `frontend/app/ui/record-drafts.tsx`. The independent customer report will provide the complete reproduction and coverage matrix.

## Non-findings and retained limits

- Admin **Use label** becoming disabled after its one-time action is not an actionable issue in the tested flow: the next Tab correctly reaches the adjacent Move down control. Do not force focus changes merely because BODY appears in a measurement.
- Unmodelled routes, missing fixture responses, mismatched synthetic requests and deliberately blocked external links are test limits, not automatically product bugs. Preserve their evidence rather than turning them into fabricated passes.
- The original31 journeys and shop/news/artwork/independent-panel addenda remain mapped in the individual manual reports. A tested screen does not imply successful real authentication, access enforcement, payments, mail, scans, concurrency, delivery or assistive-technology qualification.
- Preserve the green visual direction, game and record context, independent identities, mandatory staff sign-in MFA, private data clearing, existing policy/publication permissions and financial settings.

## Round-trip status

The parent proposed compact catalog error focus, shared fulfillment result feedback, lost-access heading focus and a separate image-operation state. These outcomes were accepted in scope, subject to the above no-steal, validation-priority and uncertain-operation requirements. Source/component checks alone did not close the findings.

### Second rendered round: r12

Frozen `service144-r12`, manifest `3c6d9452be9f226ee15d74d9e0bba8bfb965b3a7a756c403b0d629c4ccd36167`; independent senior-review instance `service144-designer-broad-r2`. The private runtime extends the existing exact synthetic fixture server only with an explicitly requested local SSE keepalive. The browser factory still blocks all external traffic.

- **A01 closes** at Chromium1440×1000 and WebKit320×844 with200% text. Both Enter and pointer save failures focus the named compact catalog result; its complete bounds are inside the viewport. The11.25 draft remains. A precise pricing422 still focuses the base-price input instead. Delaying the503 while navigating to FAQ leaves focus in FAQ. Screenshots confirm readable failure text and visible focus outline; no horizontal document overflow.
- **B01 closes** at Chromium1440×1000 and WebKit320×844 with200% text after the helper-timing correction below. Confirmed42% progress shows a nearby live result, focuses that result, clears the submitted note and updates the assignment. A409 instead retains the note and focuses the error, with no success status. Completion submission shows its own clear confirmation. Delaying the save while switching to Overview does not steal focus from the local workspace section.
- **B02 closes** at Chromium1440×1000 and WebKit320×844 with200% text after the helper-timing correction below. Explicit revoked-access refresh removes the private form and focuses the visible Assignment access changed heading. Moving focus to Return to assigned work remains stable afterward.
- **C01 is partly verified** at WebKit390×844. Idle valid and invalid selections allow explicit discard; the actual discard navigates to the submissions list. Stay retains the selected preview. An in-flight reservation, queued scan and uncertain screenshot send disable discard and display the new pending/recovery explanation. Ready unsent and definitively rejected images are discardable. The exact same batch/request key retries an uncertain send and resets the slots after confirmed synthetic success. Failed removal while queued remains protected and a successful retry removes it. No horizontal overflow was observed.
- **C01 stays open** because source inspection by the parent found an additional branch: uncertain removal of an already-ready image must withhold its selectable ID and retain the operation guard, including a late queued-poll result. The parent is correcting this for r13; it has not been rendered here and cannot be closed by the queued-image removal check.

Evidence: `.cache/flow-review141/evidence/service144-designer-broad-r2/designer-broad-r3-{admin,booster,seller}-*`, including viewport/full screenshots, exact fixture snapshots, focus geometry assertions, traces and review JSON. The helper is `service144-broad-recheck.mjs`. A first setup attempt used the admin tester's later overwritten scenario, which lacked pricing; it stopped before page navigation and is retained separately under `designer-broad-r2-admin-*`. The correction uses the original saved pricing fixture. It was a fixture repair, not an application failure.

The final independent customer/admin/booster reports have been read and adjudicated. Their complete mapping and unexecuted branches remain in `SERVICE144_CUSTOMER_MANUAL.md`, `SERVICE144_ADMIN_MANUAL.md` and `SERVICE144_BOOSTER_MANUAL.md`; their original r11 findings are historical observations, not conflicting new status. No additional actionable finding was established from those reports. This round does not repeat every unchanged journey or promote their explicit gaps into passes.

Desktop booster recheck initially captured the clicked Overview link before the workspace’s own navigation-focus effect ran. Its later focus correctly reached the Overview content, rather than the save result. The helper must await that expected section-focus effect before releasing the delayed save; the interrupted trace is retained and the remainder of that interrupted desktop run is not counted passed. The corrected `designer-broad-r4-booster-chromium-1440-1-*` run completed success, failure, no-steal, completion and revoked-access cases; B01/B02 desktop closure uses this later run.


### Third rendered round: r13

Frozen `service144-r13`, manifest `4621a3ad9c9e5ad1815b24efab47fb7ea7d80dfbcfa3ac70b5d767a0913f6e1d`; isolated senior instance `service144-designer-broad-r3`. The parent identifies the only runtime delta from r12 as the shared image-removal safety correction; A01/B01/B02 remain unchanged.

**C01 closes** after WebKit320×844/200% rendered rechecks. An uncertain removal of a ready image now removes its selectable reference, disables Send screenshots and explicit discard, and displays Removal is not confirmed with a same-removal retry. A deliberately delayed queued-scan response returning ready after removal starts cannot restore that reference. Successful retry restores the file input, and the actual return to the submissions list no longer raises an unnecessary guard. Idle/invalid/ready/rejected, reservation in flight, queued scanning and same-request uncertain-send cases were also repeated successfully at this size. The earlier390px evidence remains applicable.

A desktop seller run stopped after the rejected-image check because the helper selected the next file before asynchronous removal completed. Native file automation can set an input while it is disabled; the subsequent remove correctly cleared that selection. This is a helper sequencing defect, not a rendered application finding. Preserve `designer-broad-r5-seller-chromium-1440-1-interrupted*`; the corrected helper must await the enabled input before proceeding. Final desktop removal recheck was pending at this round; the fourth round below completes it.

#### C02 — native upload progress overflows the narrow enlarged-text container, P3, closed

During an actual synthetic reservation held in flight at WebKit320px/200% text, the native `<progress aria-label="Image upload progress">` is320px wide, begins at x57 and ends at x377, inside a206px-wide parent. Document scrollWidth becomes377px. The screenshot confirms the progress bar protrudes; nonbusy queued/ready/error states return to320px. This is within the changed shared upload component and appears while the guard is correctly protecting an operation.

Required: bound the progress indicator to its container, preserve its accessible indeterminate label and do not hide horizontal overflow globally to conceal the underlying width. Recheck the actual in-flight state at this narrow enlarged-text size and ordinary desktop/mobile sizes.

Evidence: `service144-designer-broad-r3/designer-broad-r6-seller-webkit-320-2-progress-geometry.json`, `upload-progress-width-viewport.png`, and r5/r6 seller traces/review records. The r6 repeat measured the exact element and repeated C01 branches; horizontal offscreen tab links listed in the geometry are inside their intentional scroll container and are not additional findings.


### Fourth rendered round and final verdict: r14

Frozen `service144-r14`, manifest `fcfdb03bfe0cacf599ba1da177fcdb1618d8468538a8e208286d1eba54dbfc85`; isolated senior instance `service144-designer-broad-r4`. The r13→r14 change adds component-owned sizing for the native upload indicator, plus a behavior-preserving callback formatting correction. Earlier r12 A01/B01/B02 and r13 narrow C01 evidence remain unchanged and are not replaced by a claim that every journey was rerun.

**C02 closes.** At WebKit 320×844 with 200% text, the actual held-in-flight progress bar is now 206px wide inside its 206px parent, x57–263; document width stays 320px. The accessible Image upload progress name is retained. Its enlarged-text screenshot was visually inspected. Ordinary WebKit 390×844 also passes the exact container/document-width assertions and removal recovery returns focus to the file input. Desktop Chromium 1440×1000 keeps the indicator bounded and has no horizontal overflow.

**C01 final desktop regression passes.** Chromium 1440×1000 repeats actual idle-file discard, invalid selection, in-flight/queued guards and explanatory copy, ready-unsent/discardable state, exact same-request uncertain-send retry, definitive rejection, uncertain reservation recovery, uncertain removal of both queued and ready images, and the delayed-ready-poll branch. During uncertain removal, Send screenshots stays disabled, discard stays disabled, the unconfirmed-removal explanation and retry remain available, and no stale media reference is restored. Confirmed removal focuses the file input and permits actual navigation without a stale guard. The revised helper awaits removal completion before selecting another file; it does not weaken the expected safety or focus assertions. Exact synthetic JPEG bytes/checksum are verified in Chromium; WebKit's metadata/local response checks are not presented as a durable upload or scanner proof.

Final evidence: `.cache/flow-review141/evidence/service144-designer-broad-r4/`:

- `designer-progress-final-webkit-320-2-*` and `designer-progress-final-webkit-390-1-*`: screenshots, exact geometry, fixture, trace and review record.
- `designer-broad-r7-seller-chromium-1440-1-*`: full/viewport screenshots, branch records, focus results, geometry, exact synthetic fixture and trace. The ready-image uncertain-removal and final completed-navigation screenshots were visually inspected.
- Final completed review records contain no uncaught page errors or attempted external requests. Earlier setup/timing interruptions and the genuine r13 overflow remain preserved in their original evidence directories.

The senior decision is **PASS — no remaining actionable findings in the reviewed scope**, including the independent testers' four confirmed findings and the additional shared-progress finding discovered during the fix review. The separate SE01–SE08 scoped reviews also remain closed. This does not certify the still-separate complete suite, live authentication/MFA, actual uploads/scanning, provider/email transactions, production permissions/persistence, physical devices or assistive technology. The individual manual reports retain explicit unexecuted branches; there is no claim that every possible user flow passed.
