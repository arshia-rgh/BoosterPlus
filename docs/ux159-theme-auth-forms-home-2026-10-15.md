# UX159 — additive theme, sign-in and form clarity

**Delivered 16 October 2026 as signed20fe17e.** The UX164 completion record at the end supersedes earlier in-progress and preview-hold notes, which remain as historical evidence.

Owner-authorized combined implementation, 15 October 2026. Base: `7cdf812`.

## Scope and acceptance

1. Apply the approved restrained champagne details to existing green public, customer, admin and booster screens. Preserve artwork, green headings, primary actions and semantic status colors.
2. Shared split-screen sign-in: artwork left, one authentication panel right, official Google artwork and email together. Preserve independent identities, consent, invitation eligibility, authenticator requirements, recovery and cooldowns.
3. Persistent inline validation, first-invalid focus and scrolling, retained values, and visible fallback feedback across active form families. Cover native constraints, API issues, nested/conditional fields, disabled-field races and editor previews.
4. Simplify repetitive explanatory text and improve shared spacing/alignment without rewriting accepted legal, commercial or security terms.
5. Five visible homepage service choices controlling a horizontal stage, inspired by the observed JetBrains selector. Include adjacent previews, keyboard controls, responsive layout and OS reduced motion. No autoplay or scroll hijacking.

## Review and qualification

Independent reviewers: `/root/release159_senior_design` and `/root/release159_form_review`. Source review identified native form feedback gaps, disabled-field focus races, authoring-preview errors, unnamed action fields and unmapped combination rules. Both reviewers returned PASS after corrective round trips, including32 final form checks and retained visual parity/select-height evidence. See `redesign/reviews/UX159_2026-10-15.md`.

Use focused component, security and affected browser/integration checks only. Maintain full-suite coverage without running the full gate. No live messages, invoice or funds tests. CI, signed image checks, server preflight and runtime verification remain required. No deployment or qualification pass is claimed yet. Off-host recovery remains unavailable; earlier release-specific approvals are consumed.

Sources: [JetBrains](https://www.jetbrains.com/#air-for-devs), [Google branding guidance and approved assets](https://developers.google.com/identity/branding-guidelines), approved ACCENT158 preview.

## Implementation details

The green surfaces, hero emphasis, prices and semantic statuses remain unchanged. Champagne rules are loaded with their owning page families. Authentication uses one shared consent control and one panel for Google/email, with retained invitation help, recovery and staff MFA. The Google G is the unmodified official asset downloaded from https://developers.google.com/static/identity/images/g-logo.png; the white button follows Google’s published branding guidance. No third-party asset host is contacted at runtime.

Shared validation now reads native constraints into persistent inline messages; named action fields and confirmation controls register their labels and focus targets. Errors retain input, wait for disabled controls to re-enable, focus the first field in page order and avoid moving focus during correction. Unmapped server errors remain visible. Seller titles/notes and catalog combination rules return actionable paths without changing acceptance rules. Custom-order rejections reveal the correct step and survive that transition. Chat replies and authoring preserve protected-field handling and uncertain-send idempotency.

Backend changes are validation paths/messages only: no schema, identity, authorization, price, financial-state or storage changes. Retained current release supports schema43 application rollback. Full qualification remains paused under the owner's standing focused-check policy.

## Evidence in progress

- Focused race-enabled catalog/submission unit cases passed.
- New regression cases cover native sign-in constraints, seller API rejection, unknown errors, chat correction and authoring recovery, and both custom-order stages.
- Original failed frontend runs are retained in `frontend/.cache/ux159/`; fixes update obsolete guide expectations and preserve their authorization assertions.
- Production build caught a shared-CSS budget overrun. Page-family accents and existing account-only rules were moved to their owning stylesheets; all three builds now pass and shared CSS is 4069/4096 bytes gzip. No budget was raised.
- Built portal browser checks and final review/gate results are recorded below when complete. No full-suite pass, release or deployment is claimed by this draft.

- Final built-host checks passed in Chromium and WebKit at desktop/mobile sizes (three results per engine, including parent suite). The failed WebKit fixture replaced a document during a pending synthetic read; waiting for network idle before intentional hard navigation resolved the failure without filtering browser errors.
- Additional definitive chat-form rejection regression resets the calculated expiry and request key after an explicit rejection; ambiguous delivery keeps the exact original payload and key. Nine chat form component cases pass. The reviewer also identified native WebKit select sizing; scoped explicit height preserves its native arrow and a 48 px target.

## Pre-deployment owner refinement (UX160)

Candidate `923179e263fc75f053097ce57c21ad58569661a9` passed the normal focused hook (197 files /904 component tests), built Chromium/WebKit portal checks, senior rendered review, CI38773987266, image release38776975647, signatures and server preflight. It was **not activated**: the owner requested this small login revision immediately before deployment. Retain that candidate and its original/refreshed preflight receipts as superseded evidence, not a deployed release.

Remove the method-divider wording and passwordless explanation. The customer introduction is exactly “Sign in or create your account”. Move the single shared explicit consent checkbox below the email-send control; Google and email still check that same consent and focus its inline error before any request. Preserve staff invitation/MFA guidance. Use a narrower1060px layout,500px desktop story, reduced padding and smaller headings at normal browser scale; preserve readable inputs and44px-or-larger controls. Replace the left artwork with a dedicated evergreen/champagne fantasy journey, with768px and1280px JPEG variants hosted locally. The original homepage artwork remains unchanged.

Artwork was generated with the built-in image-generation tool, then exported to `frontend/public/artwork/sign-in-journey-1280.jpg` and `sign-in-journey-768.jpg`. Prompt: “Premium cinematic fantasy gaming illustration for PLAYORA, portrait4:5, a small cloaked adventurer crossing an ancient stone bridge toward a distant luminous gateway and forest citadel. Deep evergreen and charcoal teal, restrained champagne-gold details, atmospheric mist and quiet dark lower quarter for separately rendered text. No lettering, UI, logos, recognizable game characters, aggressive weapons or oversaturated neon. Compose for desktop portrait and short mobile crop.” The full generation request and original asset remain in the local UX160 evidence.

The owner already approved the absent-backup risk for the still-unactivated combined UI deployment, then amended only its presentation before activation. This continues that same authorized operation with unchanged schema43 and retained signed c664865 rollback; it is not a reusable recovery exception for future work. No off-host recovery, full-suite pass, live messages or financial tests are claimed.

Related login regressions:18 cases passed, covering each portal’s consent placement, rejection/focus for both methods, email recovery/cooldown and staff progression. The first new assertion counted a legitimate CSRF/session refresh as an extra email; it was corrected to assert exactly one email-request call while retaining the no-request assertions before consent. Senior rendered addendum and final candidate evidence follow.

The rendered refinement review found inherited admin mobile gutters inset the form controls by20px relative to the heading and consent. Stronger sign-in-only selectors reset card/fieldset padding without changing workspace forms. Earlier spacing iterations also removed inherited button/field margins, empty feedback gaps and the framed recovery disclosure, while explicit grid spacing preserves the separation between input and submit. Final review evidence is tracked in `redesign/reviews/UX160_2026-10-15.md`.

Independent senior UX160 review returned **PASS — no remaining actionable findings in this scope**. Eighteen entry contexts, twelve MFA contexts and eight corrected narrow-admin contexts were rendered across Chromium/WebKit, including consent errors and expanded recovery. The final report/source fingerprints and original findings are retained under `.cache/ux160/design-review/`. The unchanged UX159 wider-form and theme/homepage reviews remain bound to their original source. Refreshed normal frontend hook, built-host browser checks and signed-image qualification follow; deployment remains pending at this commit.

The first UX160 commit hook stopped at the security linter because a new test constructed a regular expression from its fixed portal fixture. The assertion now uses the exact staff text instead. Original failed evidence remains in `.cache/ux160/hook-attempt1`; no rule was disabled and no application logic changed.

The next hook passed906/907 component cases but exposed an unrelated activity-test initialization race: the test clicked the lazily mounted drawer before its responsive mount effect finished, which then closed it. All six isolated activity cases passed. The affected test now explicitly waits for the existing responsive initialization before testing failed-request/retry behavior; assertions and application code are unchanged. Original failed hook evidence remains under `hook-attempt2`. This test-only correction is included in the next focused run.

The test-synchronization correction also needed the repository’s lint form: a retained local mock reference instead of an unbound DOM method, and an explicit callback block. The stopped third hook is retained under `hook-attempt3`; targeted lint and the nine activity/entry regressions then passed. No lint rule or behavioral assertion was removed.


## UX161 — wide artwork and rain preview (15 October 2026)

The owner requested a larger, wider artwork with the compact login card sitting inside it, softly animated rain, and a local preview before deployment. Activation is held for preview review. The earlier signed candidates remain unactivated; their results certify their own sources only.

The shared three-portal layout now uses one scene up to 1280 px wide, a 420 px desktop card, and an inset stacked mobile layout within the same artwork. The existing generated fantasy artwork is retained. Twenty-eight decorative CSS rain streaks animate transforms only behind the content; they cannot intercept input or enter the accessibility tree. There is no motion setting or button. The device reduced-motion preference removes the rain automatically. Errors, recovery and authenticator content remain in normal document flow and can expand the scene.

The customer introduction, explicit consent below the email action, Google mark, staff invitation rules and authenticator requirements are unchanged. No authentication, schema, production configuration, financial or policy behavior changes.

Initial focused checks:19 login component cases passed. Built browser regression now verifies the form stays inside the scene, rain moves without intercepting input, and the device preference stops it. All three production builds and both scoped built Chromium/WebKit portal runs passed after correcting a strict-CSP issue: SSR inline rain variables were blocked, so rain variation now lives entirely in the stylesheet. The existing content-security policy is unchanged. The first failed browser evidence is retained. A later mobile/tablet-only scrim adjustment is undergoing final independent rendered review; its scope is contrast only. Evidence is retained in `.cache/ux161/`; unfinished checks are not claimed passed. The updated actual-component preview is at `http://127.0.0.1:4197/?page=login-customer`, with `login-admin` and `login-booster` variants. No deployment or live action occurred for this revision.


### UX161 subject visibility amendment (16 October 2026)

The owner then required the full character and gate to remain visible on both desktop and mobile. The original portrait crop has been replaced in this preview by a wider generated composition with both subjects in the left half and quiet forest on the right for the form. Desktop artwork keeps its own aspect ratio, so expanded help/MFA never zooms the image or moves a landmark under the form. At narrow desktop widths the form scales from320 to420px. Phone/tablet views reserve an unobstructed image band above story/form within the same scene. No deployment is authorized before the requested preview review.

Built-in image generation edited the original approved scene; no external stock fetch or CLI API was used. Original output: `/Users/arshia/.codex/generated_images/01a08256-98cd-71d0-b95a-54bef2366657/exec-af9b33e8-1310-4135-895e-9fb9b133f926.png`, preserved also privately at `.cache/ux161/sign-in-wide-original.png`. Project assets: `frontend/public/artwork/sign-in-journey-wide-1672.jpg` and `frontend/public/artwork/sign-in-journey-wide-1000.jpg`. The older portrait assets are retained. JPEG compression/resizing used the platform image utility; scene composition was produced by the built-in image tool.

Final image prompt:

> Use case: precise-object-edit. Asset: PLAYORA fantasy login background, panoramic landscape 2048x1152. Edit target image1. Widen/recompose the SAME beautiful green fantasy citadel scene so an HTML login card can sit over the RIGHT THIRD without hiding either the cloaked adventurer or the large luminous arched gate. Preserve the recognizable cloaked character, stone bridge, ornate arched gate, castle, mist, green forest and muted champagne light and painterly realistic quality. Place the FULL cloaked figure (head to feet) around x25%, y45–73%. Place the complete MAIN ARCH GATE around x43%, y25–63%, fully within LEFT60% of image, with visible bridge leading to it. Zoom out moderately so both subjects have breathing room. Extend the RIGHT40% naturally into quiet dark forest/stone/mist without another focal character or gate, as low-detail negative space for a form. Leave bottom18% of LEFT60% shadowed for story text, without hiding figure feet. No text, letters, logos, interface, cards, buttons or border in image. Overcast soft rainy mood, wet stone, no bright sunlight, no thick rain baked in (rain added in CSS). Do not turn this into a different scene; preserve the source identity while widening its composition.


Final wider-art scoped build checks: all three frontend builds, Chromium and WebKit built portal scenarios (desktop/mobile, customer/admin/booster), and7 server cases passed. These include real rain-transform progress under normal motion, hidden/nonanimated decoration under the device preference, image/card containment, existing consent/invitation/session checks, and serving the new image reference. The full suite was not run. Independent final composition review remains the last preview-stage check before commit; production remains unchanged.


### UX161 navbar-only storm scene amendment (16 October 2026)

The owner requested the PLAYORA logo at the gate, no login footer or separate page background, and animated thunder/lightning. The login scene now fills the space beneath the retained navbar. The existing exact `/brand/playora-dark.svg` is rendered as a small plaque registered to the source image's gate using the same aspect/crop coordinates, keeping the actual brand crisp at every size instead of approximating it through another raster generation. The wider illustration and prior portrait assets remain intact.

`SiteFooter` and `AmbientBackdrop` omit themselves on the three normalized login routes, including their trailing-slash variants. This is route-scoped, so MFA and recovery retain the same shell while all other pages retain their normal footer/background. Consent/policy links and the top navbar stay available.

Rain and localized lightning are decorative, noninteractive and behind the form. Lightning uses a single gradual22-second cycle with a small sky bolt and a maximum12%-opacity ambient illumination; there are no rapid flashes, sound effects or motion controls. Device reduced motion removes all storm animations. Twenty-six scoped login/chrome component cases, changed-file lint, all three production builds, both built Chromium/WebKit portal runs and7 server cases passed. The final shell/storm checks are retained separately as `storm-*` evidence. No complete suite or deployment was run for this amendment.


Final independent scoped review: **PASS**, with no remaining actionable findings in the changed scene/shell. See `docs/redesign/reviews/UX161_2026-10-15.md` and its exact source hashes. Nine final rendered contexts cover all three portals, representative MFA, storm peak/reduced motion and zero horizontal overflow. Earlier complete scene/visibility rounds remain separately retained, not relabelled as the final candidate. The owner preview is the next step; activation remains held.


## UX162 — gate material and visible lightning (16 October 2026)

The owner rejected UX161's plaque as pasted-on and its lightning as too hard to see. Its prior PASS remains historical evidence, not approval of this new treatment. Removed the entire SVG plaque and edited the underlying scene with the built-in imagegen tool to integrate PLAYORA into the stone lintel. The traveler, arch and forest composition remain. Old artwork is retained; new responsive assets are `frontend/public/artwork/sign-in-gate-carved-1672.jpg` and `frontend/public/artwork/sign-in-gate-carved-1000.jpg`.

Built-in imagegen edit source: `frontend/public/artwork/sign-in-journey-wide-1672.jpg`. Generated master: `/Users/arshia/.codex/generated_images/01a08256-98cd-71d0-b95a-54bef2366657/exec-73f1711b-0a28-4759-954b-08b35584faf8.png`. JPEG derivatives use quality 80, desktop 1672 px and phone 1000 px. No CLI fallback was used.

Final prompt:

> Use case: precise-object-edit. Edit this exact wide fantasy login background. Keep the composition, camera, cloaked traveler, bridge, castle, gate position, green/champagne colors and dark forest on right unchanged. Add ONLY the exact word PLAYORA (P L A Y O R A) physically carved into the stone lintel immediately above the central illuminated gate arch. It must look like ancient monumental lettering cut deeply into that existing masonry: subtle bevels, dark recessed interiors, naturally weathered stone texture, warm gold light grazing the lower edges, matching perspective and lighting. Legible elegant uppercase carved architectural lettering, modest size following the stone lintel width, integrated into the original gate material. No signboard, no rectangle, no sticker, no floating logo, no UI overlay, no bright white print. Do not obscure the gate opening or traveler. Preserve the whole wide 16:9 image with ample empty forest on right. No additional text or objects, no lightning baked into the image; lightning will animate separately.

Lightning now has a branched luminous core and soft halo, with one strike per ten seconds. It first appears after one second, reaches its peak at 1.4 seconds, then fades smoothly; localized cloud illumination follows. It remains behind the controls, noninteractive and silent. Device reduced motion removes the weather effects automatically, without a new button. No auth, consent, API or production configuration behavior changes. Browser regression now observes an actual visible rise and fade, in addition to reduced-motion and scene containment checks.

Qualification evidence for this revision is recorded separately in `.cache/ux162/` and the UX162 senior review. No full suite or production activation is requested; preview remains held for owner review.

UX162 focused verification: all three frontend production builds passed (`.cache/ux162/build.log`). Built Chromium and WebKit portal checks passed at desktop/mobile (`portals-chromium.log`, `portals-webkit.log`), including natural lightning opacity rise/fade, rain progression, reduced motion, scene containment and unchanged authentication/portal navigation assertions. The normal focused commit hook and independent senior review remain separately recorded; no complete-suite pass is claimed.

Independent UX162 round one requested one refinement: the bolt's regular zigzag and constant-width core looked graphic; WebKit also rendered the CSS-blurred halo too sharply. The final geometry varies segment lengths and angles and tapers from 2.5 to 1.7 to 0.85 art pixels with fine side branches. Its halo now uses an explicit SVG Gaussian filter with a React-generated unique ID, avoiding the cross-engine CSS-filter inconsistency. Timing and placement are unchanged. Round-one evidence is retained; round-two build/browser and rendered review evidence is separate.

Final UX162 round two: **PASS** from the independent senior rendered reviewer, with no remaining actionable scoped findings (`docs/redesign/reviews/UX162_2026-10-16.md`). Natural early/peak/fade frames on Chromium and WebKit desktop/phone confirm the irregular tapered bolt and soft SVG-filter glow; all three portal entry compositions and reduced motion remain qualified by the scoped evidence. Final three-portal production builds and built Chromium/WebKit desktop/mobile scenarios passed (`build-round2.log`, `portals-*-round2.log`). Earlier results remain separately retained. The normal focused commit hook records its own outcome in `.cache/ux162/focused-hook-result.json`; the full suite and deployment are not run. Owner preview remains the next step.


## UX163 — email recovery modal (16 October 2026)

The owner requested that Lost access to your email open a modal instead of expanding the login card. All three login portals now use a shared native dialog around their existing recovery form. The dialog has an accessible title, current-email initial focus, an explicit Close button, native Escape and keyboard containment, and returns focus to the trigger. It preserves in-memory recovery entries and a pending code challenge across dismissal/reopening; reopening does not send another request. On phones it stays inside the viewport with internal scrolling. The initial duplicate heading is visually omitted, while the later verification-step heading remains. The scene, login card and its Google/email inputs stay in place.

No recovery authorization, ownership review, authenticator requirement, consent, API or portal namespace behavior changes. No external email is sent by verification; component tests use mocked responses and browser checks use the isolated local fixture. Added all-three-portal component regressions for hidden/open state, inline validation, unchanged request payload/namespace, code-step focus, draft/challenge retention and close focus. Built browser assertions cover exact card bounds, focus wrapping, Escape/Close, responsive containment and retained entries. The component harness initially lacked native dialog methods and used an incorrect expected URL; both test-fixture mistakes are retained in the first two logs and corrected without changing production recovery behavior.

Evidence: `.cache/ux163/` and `docs/redesign/reviews/UX163_2026-10-16.md`. Normal focused checks apply; no full suite or deployment is requested. Production remains unchanged and this continues the pending preview revision.

UX163 final senior review: **PASS**, covering customer/admin/booster desktop and phone entry plus narrow, tablet, short-viewport and WebKit cases. Six focused component cases and all three production builds passed. Initial built-browser assertions incorrectly equated viewport movement from scrolling with document layout changes, and expected a fixed Shift+Tab target across browser chrome/full-keyboard-navigation preferences. Tests now compare document-space bounds and verify no background element can receive focus, rather than overriding native browser navigation. Original failures remain retained. Passed Chromium round-two evidence is retained; only WebKit is repeated after removing its browser-specific target assumption. No production-code correction was needed for those test assertions.

Final built-browser outcome: Chromium round2 and WebKit round3 both passed desktop/mobile portal scenarios. Retained results are `.cache/ux163/portals-chromium-round2.log` and `portals-webkit-round3.log`. The frozen application source matches the final senior review; only browser assertion corrections followed that review. The normal focused commit hook records its own outcome separately. Production activation remains held.


## UX164 — final combined deployment (16 October 2026)

The owner accepted the final preview and instructed “ok now deploy all together”. Signed application20fe17ebbc66b3df77c56eb5ecb6746b5953f8ee is now live on playoragames.com, admin.playoragames.com and pro.playoragames.com. This completes the same unactivated923179e operation with its approved preview amendments and recovery decision. That one-operation exception is consumed; no standing backup waiver is implied.

Qualification: final UX163 focused commit hook; retained unchanged UX159 backend/repository checks; current scoped built Chromium/WebKit portal scenarios; independent UX159–163 senior rendered reviews; exact CI38812628035 (198 frontend test files,904 component tests); image workflow38815351630; release signature verification; server configuration, schema43 and storage/dependency preflight. All passed. Full qualification was not run. Final source hashes are bound in `.cache/ux164/source-binding.json`. The superseded browser-test source hash is retained separately; current test source is qualified by its actual focused hook/browser results rather than relabelled as unchanged senior review.

An initial authorization-transfer helper contained an unterminated quoted path and was rejected by Python before any remote execution; server evidence confirmed no authorization file or activation existed. The corrected helper reused the exact local authorization receipt. The first activation then quiesced the application and stopped at the post-migration dependency check because the newly restarted scanner was not ready. Migration version and checksums remained43; no schema migration was introduced. The original operation receipt, private readiness diagnostic and failed states are retained. The scanner/storage probe subsequently passed, and `release.execute(..., resume=True)` resumed that exact interrupted signed bundle under its already-recorded one-operation decision. No blind new deployment, risk exception, safety-threshold change or skipped readiness check was used. The existing readiness failure correctly prevented serving a candidate before its dependencies passed. A future deployment-tool improvement can add a bounded readiness wait for restarted scanning infrastructure.

Final verification: release operation complete, exact deployed images verified, all eight application/mail services healthy, all three HTTPS origins/redirects checked, private webmail returns its login page, schema43/checksums verified, runtime/private configuration unchanged, and public legal/retention policies match the preflight baseline. Payments stay enabled; automatic outgoing transfers and customer deletion stay disabled. Six live Chromium/WebKit portal checks at390/1280px verified artwork loading, consent placement, Google mark, champagne color, no overflow/browser errors, recovery modal bounds/Escape/focus return and unauthenticated private-data denial. Four homepage cases at390/1440px exercised all five service tabs and keyboard navigation. Read-only final visuals were captured after the entrance animation settled. No external email, live invoice, funds, publication or authenticated customer-data mutation was performed.

Current manifest: `/srv/playora/releases/20fe17e/deployment.env`. Server evidence: `/srv/playora-qualification/ux164/preflight`; final runtime receipt: `/srv/playora/releases/20fe17e/runtime-verification.json`. Local receipts, screenshots, original errors and corrected helpers: `.cache/ux164/`. Prior signedc664865 remains available for compatible same-schema application rollback. Off-host recovery remains unavailable. Existing policies/catalogs, independent identities/MFA, stable99f60bd runtime configuration, private webmail and the user's untracked prototype/cameo directories were preserved.
