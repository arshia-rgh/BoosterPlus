# Character cameo and game audio — UX research

Research date: 14 September 2026. Planning only; no application, asset or runtime changes. This supplements the homepage refinement research and keeps R10/R11 held.

## Requested experience

The owner wants a small game character to appear after some scrolling, perform a single skill/damage action, speak with its own voice, traverse the viewport from right to left and disappear. Every website button should play an Iori Yagami MLBB punch sound when activated. Preserve that scope: sound coverage includes the storefront, customer/seller/booster areas and staff/admin buttons. A recommendation to change defaults or sound intensity is a design proposal, not an authorization to silently exclude routes.

## Senior UX assessment

The cameo can provide a memorable, short gaming moment if it has a beginning and a clear end. Its strength is surprise followed by disappearance; repeatedly interrupting reading, form entry or chat would make the same effect tiring. Treat the scene as a small performance in an intentionally clear lane, with a single skill and localized impact. “Damage” is visual theater: no actual controls shake loose, disappear, look broken or change their data.

The all-button punch identity is feasible as an opt-in theme. It carries a repetition cost during admin work and chat, so the strongest proposal is a quiet default with immediately discoverable game-sound controls. When enabled, preserve the requested punch across all eligible buttons, including staff. An optional lower-intensity staff preset and independent voice/click levels can address fatigue without quietly narrowing coverage. Do not equate a punch with successful payment, order submission, deletion or refund: it acknowledges activation only; actual outcomes retain their existing visual/status feedback.

No usability study has measured these effects. A small human review should compare a first discovery visit with five minutes of repetitive chat/admin tasks, and record distraction, mute discoverability and whether action/outcome meaning remains clear.

## Browser constraints supported by primary sources

Audible media and Web Audio may be blocked when initiated without user interaction; programmatic `play()` can reject. Browser policy varies, and stored preference alone does not guarantee playback permission on a fresh page. The implementation must handle denial as a normal silent state and never delay a real button action while waiting for sound. [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

Scrolling is not in the platform's list of activation-triggering input events. A first-scroll cameo can be visually triggered, but audible character speech cannot be promised from scrolling alone. A clearly labeled “Enable game sounds” button supplies an intentional activation and explains the consequence; it is a better product contract than trying to unlock audio on unrelated clicks. [MDN user activation](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation)

Chrome documents creating/resuming `AudioContext` following a user gesture. Check the actual context state and handle suspended/interrupted playback. A fresh context, an interrupted app and a restored tab are separate cases to test. [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)

WebKit advises assuming audio/video can require a user gesture and checking rejected playback. Per-element behavior and user preferences mean passing in Chromium is insufficient evidence for Safari. Keep the visual scene independently playable or gracefully static. [WebKit autoplay guidance](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)

Local observation: `frontend/server.mjs` currently declares camera, microphone and geolocation restrictions; it does not explicitly add an autoplay directive. That does not override browser policies. No microphone permission or recording capability is needed for prerecorded character lines or button effects.

## Proposed controls and behavior

These are concrete design starting points for approval, not measured thresholds.

| Control | Proposed behavior |
| --- | --- |
| Game sounds | Initially off. Explicit on/off, with a clear label and visible state in the shared shell. Muting stops active click/voice playback immediately. Turning on may play one quiet preview on that same intentional activation. |
| Click sounds | Independent toggle/level; when on, one short Iori punch per eligible button activation throughout both apps. Default preview level should be modest and tuned by listening, not presented as a guaranteed physical loudness. |
| Character voice | Independent toggle/level; one brief line per cameo, synchronized to the scene. Voice is not necessary to understand or operate the site. |
| Motion/cameos | Respect the existing System/Reduced motion preference. Add a clear way to dismiss/disable cameos, without tying up focus. Reduced motion suppresses the cross-screen travel and skill effect. |
| Replay cameo | Optional explicit replay in the relevant decorative section; never replay merely because reverse scrolling crosses the trigger again. Sound follows the user's current preference and browser capability. |

Keep preferences device-local and versioned unless a later decision calls for account synchronization. Handle unavailable storage without breaking controls. Separate motion from sound preferences: reduced motion does not mean hearing impairment, and muting does not mean motion sensitivity. A denied browser playback attempt must not quietly change the user's chosen preference; show the distinction in the sound control if necessary and retry only on another intentional activation, not a timer loop.

Recommended cameo frequency is at most once per session on the homepage, after a deliberate native-scroll threshold and only when the stage is visible. A dedicated decorative lane can span the available viewport width while avoiding copy and primary actions. Suppress or defer when a modal is open, a text field/composer is focused, the document is hidden or the lane is outside the viewport. Defer only while the visitor remains in the relevant section; discard stale pending scenes on navigation. This is a proposal for where the *cameo* runs, not a restriction on the all-buttons audio scope. If the owner wants the cameo across authenticated routes as well, explicitly extend the route/state matrix rather than assuming that behavior.

Use a bounded event lifecycle: eligible → prepared → entering → skill/voice → crossing → exiting → finished. Stop on dismissal, reduced motion, navigation or a hidden document; do not resume surprise speech in the middle of a sentence when the tab returns. Mark a begun or deliberately dismissed automatic cameo as consumed for that session. Keep replay intentional.

## Global button-sound architecture

Use one sound coordinator per app document with a shared implementation contract for storefront and admin builds. It owns preference state, asset readiness, master/category gains, playback cancellation and browser permission/error state. Avoid one `AudioContext` or network fetch per button.

Inventory native buttons, submit inputs and button-role controls in all routes. Instrument semantic activation, not both pointer-down and click, so keyboard activation and assistive-technology activation work and a single click does not double-play. Include dialog confirmation/cancel, pagination, filters, upload triggers and chat-send controls. Do not turn ordinary text links into buttons or add unrelated hover/typing/focus sounds. Button-styled links need an explicit inventory decision; if the owner means all visual CTAs, include them consistently.

Disabled, inert and prevented actions produce no activation sound. Mute/stop controls must silence first rather than playing another punch on the way out. Programmatic submissions, polling and network retries produce none. These are functional semantics, not arbitrary route exclusions. A punch plays when the action is accepted locally, even if a later server response fails; the UI must still report the real result.

Use short, cached audio with a bounded mixer. Every accepted activation requests its click effect, but rapid clicks must not create an ever-louder overlapping queue. Replacing the previous click sound with a tiny fade is a candidate policy; test whether that preserves the punch identity at realistic rates. Voice and button sounds need an intentional mix, such as slightly lowering the click channel while the line plays. Do not accumulate delayed clicks that sound after navigation or after the user mutes.

The shared audio layer must never submit an action twice, intercept native browser behavior, delay navigation or alter existing security/form semantics. Restrict runtime asset URLs to controlled local assets. Diagnostic records may contain an asset ID and error class, not button text, typed messages, private order identifiers or customer information.

## Accessibility and visual safety

Audio starting automatically for more than three seconds requires independent pause/stop or volume control under WCAG 1.4.2. W3C also recommends user-initiated sound because unexpected audio can interfere with screen readers. A short punch under that threshold still benefits from the master mute; brevity is not a reason to surprise the visitor. [W3C audio control](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html)

Provide a synchronized, legible caption for the prerecorded character line, with speaker identification when needed. If sound conveys a meaningful skill impact, include that information. This is a speech caption, not a return of character biography copy. Keep it in a stable readable location and accessible on explicit replay; do not automatically interrupt screen-reader speech with a decorative live announcement. [W3C prerecorded captions](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)

A character skill should use a localized impact, restrained glow and no full-screen white/red flash or camera shake. All flashing content, even decoration, must meet the flash criterion; use a nonflashing effect as the design default instead of relying on the character being small enough. [W3C three-flashes criterion](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)

If the automatically started scene lasts beyond five seconds alongside content, provide stop/hide control where required. Keep that control reachable without taking focus away from the user's work. Reduced motion should remove the nonessential cross-screen travel, not merely make it slower. [W3C pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

## Assets still needed

A filename scan of `frontend/public` and `docs/brand` found no MP3, WAV, OGG, M4A, AAC, FLAC, WebM or MP4 assets during this research. Existing static character art is not a character voice, Iori punch recording or skill animation. The exact requested audio is therefore an unmet asset dependency, not an implemented capability.

The asset package needs the chosen character and costume/version; the exact short spoken line and language; its transcript; a clean authentic voice clip; the specific MLBB Iori/Chou punch effect; a short skill animation with entry/exit-compatible poses; and source/provenance and permitted website-use information. Do not rip a competitor's media, fabricate possession of game audio or label a synthetic approximation as the real character voice. If authentic usable audio cannot be supplied or sourced, a commissioned original effect/voice is an alternative requiring an explicit choice because it changes the requested identity. The asset-independent controller and UI plan can still proceed.

## Failure and state qualification

| Case | Expected result |
| --- | --- |
| Fresh visit, scroll only | No unexpected audible playback. Visual cameo runs only if motion is allowed; speech has a readable caption. Sound opt-in remains discoverable. |
| Explicit sound opt-in | Browser context resumes if allowed; preview plays once. Denial/unsupported API leaves navigation usable and no unhandled rejection. |
| Persisted on, fresh tab | Preference is honored as intent, playback still checks capability; no promise of unlocked audio inherited from the previous document. |
| Sound disabled mid-line | All sound stops promptly, scheduled clips are canceled and later clicks stay silent. |
| Reduced motion before load or mid-scene | No crossing/skill animation continues; no delayed replay when the preference changes back. Explicit replay remains controlled. |
| Repeated/reverse scroll | Automatic cameo is not repeatedly retriggered. A begun/dismissed scene remains consumed for the session. |
| Form/chat/dialog interaction | Character does not cover the composer, controls, validation or modal; focus and caret remain unchanged. |
| Every button family | Pointer, touch, Enter, Space and assistive activation produce at most one effect per accepted action, across public, account, seller, booster and admin routes. |
| Disabled/mute/system events | Disabled and inert controls, programmatic requests, polling and retries stay silent; mute takes precedence. |
| Burst activation | No runaway overlap, clipping, delayed sound backlog or change to action count. |
| Navigation/hidden tab | Scene and voice stop; returning does not unexpectedly continue an old phrase. |
| Missing/slow/broken media | No transaction waits for assets. Broken voice/effect is silent; broken scene leaves content intact. No repeated network retry loop. |
| Caption/volume review | Words and meaningful sound cues remain understandable with audio muted; screen-reader speech is not overwhelmed or repeatedly interrupted. |
| Cross-browser/device | Test Chromium, Firefox, WebKit plus actual iOS/Android audio controls and interruption behavior. Desktop emulation does not certify real-device playback. |
| Performance/security | Assets are bounded/lazy, controlled-origin, decoded once as appropriate; no page layout shift, leaked private action data or bypass of existing CSP/security policy. |

Later implementation needs normal scoped frontend/root checks and recorded human listening/motion review. This research does not establish permission to launch or claim access to authentic game recordings.
