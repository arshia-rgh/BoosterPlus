# UX159 — additive theme, sign-in and form clarity

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
