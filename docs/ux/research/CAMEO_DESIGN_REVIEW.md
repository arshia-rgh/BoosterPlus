# PLAYORA small-character cameo: senior design review

Date: 14 September 2026. Planning only. This note extends the proposed [homepage refinement roadmap](../HOMEPAGE_REFINEMENT_ROADMAP.md); it does not authorize application implementation or resume R10/R11.

## Artistic judgment

A small character encounter can give PLAYORA a memorable game-like moment while keeping its original green landscape and readable interface. It should behave like a brief encounter in the margin of the experience, rather than becoming a second hero or a mascot that follows the visitor everywhere.

The requested artistic sequence remains explicit: after a small downward scroll, a tiny game character enters; performs a coherent movement and one attack/skill; says a short line in that character's voice; then travels softly from right to left and disappears. The voice and attack are part of the requested normal experience, not optional polish to remove without discussion. Whole-image movement alone does not satisfy an articulated attack or walk/run cycle.

The separate request for a punch-like sound on every website button activation also remains in scope. Treat it as a shared interaction sound across the website, including customer and staff interfaces, subject to the visitor's sound setting and browser playback capability. Do not quietly narrow it to the homepage's primary action. The parent roadmap should resolve the precise audio asset and playback conditions.

## Required experience versus optional refinements

| Required artistic result | Optional refinement |
| --- | --- |
| Small, theme-fitting game character | A particular named character; choose the strongest quality and silhouette match |
| Trigger after a small meaningful downward scroll | Exact trigger distance and lane location after responsive inspection |
| Readable preparatory movement followed by one attack/skill | Tiny local particles or a restrained contact glow |
| A short spoken line in the selected character's voice | A matching small caption balloon, recommended for the spoken-content equivalent |
| Coherent right-to-left travel and soft disappearance | A brief glance or nod before departure |
| Punch-like feedback on all actionable website buttons when sound is enabled | Subtle sample variation if it retains one consistent sound identity |

The cameo should not damage controls, interrupt input, launch a fake battle UI, display invented hit points, shake the whole page or darken the reading area. Those additions would make the interaction louder without fulfilling the requested sequence better.

## Composition and placement

Use a dedicated shallow encounter lane at the transition from the opening hero to the first content section. Integrate it into existing breathing space where possible, with its height reserved before loading. This lets the character cross right-to-left without covering copy or turning into a persistent viewport overlay. It should remain visually associated with the green landscape through a soft floor shadow and restrained green/gold light.

The lane is the preferred first prototype, not a claim that its final location is already proven. Test it with the actual hero height and the promise/rank transition. The trigger must happen soon enough to match “scroll down a little,” rather than after several full sections. Start testing a downward threshold of approximately 120–240 CSS pixels combined with the lane being visible. A visitor who jumps past the lane should not have to wait for it or be scrolled back.

Keep the original hero free of the rejected large Iori overlay. This cameo is a separate tiny encounter; its existence does not reopen the art-only hero decision. Do not place it across the rank profile, navigation, catalog cards, chat launcher or cookie/consent controls. Its painted layer stays beneath menus, dialogs, focus indicators and other interactive surfaces. The decorative animation never receives pointer input.

Initial size targets are 80–112 CSS pixels in standing height on desktop and 56–80 pixels on mobile, with a small skill effect confined to roughly 1.5 times the figure's footprint. These are starting ranges for actual-size review, not fixed production requirements. If the character becomes illegible at that size, simplify the pose and effects before making the entire encounter much bigger.

A martial-arts silhouette may communicate the short attack better than a winged figure whose detail disappears at miniature scale. A green-compatible MLBB character is a logical first prototype because it matches the launch game. Iori can still be considered at this small scale if its quality, color balance and motion work; it should not be selected solely because the requested button sound references his punch. Existing showcase game diversity remains intact.

## Proposed eight-second storyboard

Timings below are design starting points. A qualified character animation and actual spoken line determine the final rhythm; do not time-stretch speech unnaturally to force the table.

| Time | Character action | Visual/audio treatment |
| --- | --- | --- |
| 0.0–0.7s | Enter from the right edge of the encounter lane and settle in the right-hand third | A real small step or landing motion; soft opacity entrance only at the outer edge; no large pop-up scale |
| 0.7–1.4s | Shift weight and prepare one recognizable skill | Coherent body anticipation; face and hands remain readable; text elsewhere stays still |
| 1.4–2.1s | Perform one short punch/strike/skill and recover | One compact impact localized in empty lane space; no attack on page content, screen shake, bright flash or damage overlay |
| 2.1–3.4s | Say a short line, then turn toward the left | Requested character voice; a concise matching caption may sit above the figure within the lane; no essential instruction delivered only through audio |
| 3.4–7.4s | Travel from right to left with a calm, coherent walk/run cycle | Native character locomotion synchronized with displacement so feet do not visibly skate; mostly steady travel speed rather than easing every step |
| 7.4–8.1s | Exit beyond the left boundary | Soft disappearance at the lane edge; no teleport, residual particles or lingering empty speech balloon |

The spoken line should be brief and suit the character's personality without sounding like an instruction or a guarantee about the order. Prefer a reviewed authentic or properly authorized character line when available. Do not label a generic voice as the character's real voice. Asset availability and voice provenance are dependencies the consolidated plan must track honestly.

## Frequency and responsive behavior

Recommend one automatic encounter per browsing session, triggered by deliberate downward scroll; ordinary reverse scrolling or returning from a nearby page must not restart it. Provide a quiet replay action within the experience settings or lane only after it ends. Frequency is an art-direction proposal for owner review, not permission to remove the automatic first encounter.

On mobile preserve the same sequence at a smaller scale in a bounded lane. Keep it out of bottom navigation, safe-area insets and the software keyboard. Short landscape viewports may need less vertical stage height and a shorter crossing path; keep the attack and line intact instead of accelerating everything until it becomes unreadable. Do not require a visitor to stop scrolling to access content.

If the lane leaves view, pause the visual sequence and avoid starting an unheard voice line in the background. Resume only while it is useful and visible; do not catch up with a burst of attacks or overlapping audio. A route change ends the encounter. Reduced-motion and explicit pause use a resolved still or suppressed decorative encounter, while preserving the ability to access its caption/replay controls as appropriate. This is an accessibility mode; it should not be misreported as fulfillment of the normal animated brief.

## Button sound design

The requested all-button treatment should sound like a very short, restrained game punch/tap, distinct from the cameo's larger skill sound and spoken line. Keep the attack's weight at the encounter, while ordinary controls get a compact transient without a long tail, shout or repeated voice. The audio must acknowledge activation rather than imply that payment, deletion or any asynchronous action succeeded.

Keep one predictable sound identity across native buttons, shared button components, icon buttons, dialog actions and staff controls. Keyboard and touch activation should receive the same treatment as pointer activation. Disabled controls do not activate and should remain silent. Loading, network retries, programmatic focus and backend responses must not generate pretend user clicks. Link-styled navigation and non-button controls need an explicit scope decision in the consolidated plan rather than accidental behavior from an indiscriminate document click listener.

Respect a discoverable sound toggle consistently across the website. The proposed sound-on experience includes every eligible activation; browser restrictions, muting and deliberate limits on overlapping playback must be documented as behavior rather than silently omitted coverage. Rapid clicking needs an audio mix that does not become painfully loud or create an accumulating queue. If button feedback overlaps the cameo voice, lower the button effect rather than making the spoken line unintelligible. Buttons must execute immediately without waiting for audio loading or completion.

## Priority and acceptance

Priority order: usable content and real task feedback; stable navigation and input; original hero/rank composition; coherent main showcase motion; short cameo; decorative particles. Voice and all-button audio remain requested features with their own quality criteria, even though they must yield to visitor preferences and never block interaction.

Before calling the encounter complete, present an actual-size desktop and mobile recording from scroll trigger through disappearance, plus a close-up only for checking anatomy and compositing. The sequence must visibly include entrance, anticipation, one skill, recovery, the requested spoken line, right-to-left locomotion and exit. A static sprite translated across the page does not pass. Test the miniature silhouette against the real green background; a close-up alone cannot prove it works on the website.

Record trigger timing, pause/resume, rapid scroll, reverse scroll, repeat visits, route changes, overlays, reduced motion, sound off, denied playback and failed media. Verify that no control is covered and no layout jumps on asset load or exit. The shared button-sound inventory must cover customer and staff routes, pointer/touch/keyboard and disabled/loading states. The final visual judgment should assess whether the encounter feels like a brief delightful detail while the site remains easy to use.
