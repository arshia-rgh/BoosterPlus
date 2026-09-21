# PLAYORA design system

Design proposal v1 · No application changes authorized by this file.

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#071611` | Primary deep-green page background |
| Surface | `#10241B` | Cards and form groups |
| Raised surface | `#183126` | Popovers and active context |
| Main text | `#F1F7F2` | Headings, entered values, primary information |
| Supporting text | `#B2C7BA` | Body support, timestamps, secondary labels |
| Primary action | `#89EFB0` | One strongest action in a task region |
| On-primary | `#092015` | Text/icons on mint buttons |
| Structural border | `#365345` | Decorative separators; not sufficient by itself for required controls |
| Input border | `#5D7B68` | Fields requiring a visible boundary |
| Focus ring | `#E1C48D` | 3px outline, 4px offset, never clipped |
| Warning text | `#F5C77E` | Pending decisions and nonfatal exceptions |
| Error text | `#FFB7B1` | Error text with icon and explanation, never color alone |

Contrast must be checked in the actual composition, especially image-backed text, disabled controls and translucent panels. Normal text targets 4.5:1 and large text 3:1; essential controls/state indicators target 3:1. The structural border is decorative; state/field boundaries use stronger tokens. No tiny pale text over a bright character or glow.

Typography: existing `Inter, ui-sans-serif, system-ui` direction. Local atlas uses the available system font fallback; it does not download a new font or claim a bundled Inter face. Expressive hero words may use Georgia/serif, matching the existing direction. If exact Inter is later self-hosted, record its license and weights.

| Role | Desktop | Narrow | Notes |
| --- | --- | --- | --- |
| Hero | 64–80px / 1.03 | 44–48px / 1.08 | 2–3 short lines; no forced desktop nowrap |
| Page title | 40–48px / 1.15 | 30–32px / 1.2 | One H1 |
| Section title | 26–32px / 1.2 | 24–26px / 1.25 | Sentence case |
| Card title | 18–22px / 1.25 | 18–20px / 1.3 | Not all caps |
| Body | 16px / 1.6 | 16px / 1.6 | 60–72 characters per line for reading |
| Form/table content | 14–16px / 1.5 | 14–16px / 1.5 | Inputs at least 16px on mobile |
| Metadata | 12–13px / 1.5 | 12–13px / 1.5 | Never critical instructions in tiny uppercase |
| Decorative eyebrow | 11px / 1.5 | 11px / 1.5 | Optional; not a substitute for a label |

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 88. Use 24px inside ordinary cards, 16px narrow, 32–48px between related task sections, 64–88px between storefront stories. Avoid a grid of equal-weight boxes for every fact. Radius: controls 10px; cards 16–18px; feature scene 22px; status chips fully rounded.

## Layout

- Maximum storefront canvas 1440px; inner readable content ~1280px. Wide displays add margins, not stretched paragraphs.
- Desktop main grid: 12 columns/24px gutters. Public hero ~7/5; configuration main flexible + 310px summary; operational sidebar 215px with a flexible main region.
- Around 1100px reduce page padding and summary width. Below 900px remove persistent side navigation and stack summary. Below 600px forms/cards use one column. Product breakpoints follow content fit, not device labels.
- Qualify 320, 390, 768, 1024 and 1440 CSS px, 200% text and 400% browser zoom/reflow. No global horizontal scrolling. Tables may use a labeled scroll region only when comparison genuinely requires it; ordinary queues become labeled cards.
- Sticky elements must have explicit bounds and measured offsets. Avoid nested sticky header + tabbar + summary + bottom checkout control. No element may cover the focused field, an error, safe-area inset or software keyboard.
- Reserve image aspect ratios. Image failure retains the page title, alt/caption and usable CTA, not a collapsed layout.

## Components and full variants

| Component | Required variants and behavior |
| --- | --- |
| Button | Primary/secondary/text/destructive; hover/focus/pressed/loading/disabled. Loading retains width and meaningful label. Disabled action has an adjacent reason. One primary per decision region. |
| Input | Empty/filled/disabled/read-only/required/optional/error/saving. Persistent label; help and errors linked with IDs. Use appropriate autocomplete/input mode. No placeholder-only labels. |
| Select/rank picker | Native baseline or accessible searchable combobox for long catalogs; current/target side by side when space allows; selected text not hidden by decorative rank art. Keyboard selection and no pointer-only dragging. |
| Option card | Radio/checkbox semantics and visible selected indicator. Whole label is tappable; nested links do not toggle selection. Explain priced/conditional options. |
| Error summary | Appears on failed submit, moves focus, lists field links. Field values persist except secrets. Errors explain fixes; success is not a transient toast only. |
| Status chip | Text + optional icon; warning/success/neutral/error. Never combine fulfillment, payment, quote and case status into one ambiguous badge. |
| Next-action panel | One question answered: who needs to do what now? Link goes directly to that action, not a generic dashboard. |
| Price summary | Exact currency/amount, itemized adjustments, approved fees, estimate/final/package label, expiry where relevant. Expired/stale values never remain presented as payable. |
| Table/list | Search/filter/loading/empty/error/populated/stale; stable pagination; visible applied filters; row links with meaningful names. Actions do not rely on hovering. |
| Tabs | Label groups by record type. Full keyboard behavior if ARIA tabs; otherwise ordinary route links with current-page state. URL supports refresh/back/deep links. |
| Dialog/sheet | Heading, description, explicit close/cancel, focus containment for modal variants, focus return; prevent background interaction only when actually modal. No stacked modals. |
| Toast/status | Nonblocking saved/queued feedback; aria-live polite. Important failure stays beside affected task. No secrets in alerts or titles. |
| Message | Sender/alias, audience, timestamp, body, attachment scan status and sent/failed state. System events visually distinct from speech. |
| File attachment | Selected/uploading/scanning/available/rejected/retry/purge-pending. Progress is real. File type/size rules beside chooser. Access denied does not leak file metadata. |
| Timeline | Timestamp + actor alias + factual event. User and staff histories are separate; “payment verified” is not “order complete”. |
| Confirmation | Exact action, target, consequences, required reason/consent, current record version and fresh verification if needed. Destructive confirm has a specific verb, not “OK”. |
| Empty state | Plain explanation + relevant next action. No fabricated “success” for an unavailable service. |
| Skeleton | Reserve real layout, accessible loading status, no continual shimmer under reduced motion; not a replacement for an error after failure. |

## Motion and audio specification

- Button/hover transitions: 140–180ms, ease-out, maximum 2–3px translation. Focus never depends on motion.
- Panel entrance: 180–240ms opacity + ≤8px translation, once. Form errors appear immediately; do not delay recovery for an animation.
- Section reveal: optional 250–350ms, short displacement, no scroll hijacking, content present without JS.
- Rank transformation: native forward/reverse scroll with stable text and readable start/target checkpoints; reduced mode shows the two ranks without morphing. Keep header/CTAs available.
- Character scene: one active game-specific background/character; local body movement around a stable planted-foot anchor, secondary hair/cloth/wings/tail motion; 5–8s gentle cycles. Actual amplitude must be judged on target art and devices, not fixed by a generic number. Stop offscreen and when hidden. Switching scenes cleans up the previous one. Static failure fallback remains attractive.
- Cameo proposal: once per visit, only in an unoccupied storefront region, right-to-left travel; anticipation → small skill beat → brief caption/optional voice → soft exit. No collision with interactive content; reduced-motion/static mode skips it. Not part of the new atlas’s delivered motion.
- Sound: off initially; explicit opt-in with volume. Eligible noncritical action feedback is subtle, one sound per actual activation. Never sound on text entry, every tap target, financial/security/destructive confirmation or repeated retry. Voice caption visible without sound. Pause/mute immediately on visibility or preference changes.
- Asset limits and performance qualification must be agreed before implementation from real media. The design artifact’s stills do not prove character FPS, download budgets or authentic asset rights.

## Accessibility, localization and privacy

Target WCAG 2.2 AA in the later implementation; this design document is not a conformance certificate. Keep main landmarks, skip link, one H1, logical heading hierarchy, clear focus, 44×44px preferred targets (larger than the AA minimum), visible labels and status text. Codes allow paste/autofill. No sound/motion required to understand a state.

Dates show timezone and offset where decisions depend on them. Currency and crypto precision never truncate into a misleading rounded payable amount. Long IDs wrap or use deliberate copy controls; display a safe shortened ID only alongside access to the full authorized value. RTL-ready spacing and navigation order are specified, but no unchosen locale is claimed translated or tested.

Screen-recording examples must use fictional identities. Sensitive panels mask secrets, require appropriate verification, omit private content from notifications and do not persist secret drafts. Decorative imagery is ignored by assistive technology; meaningful listing evidence has a useful caption/alt text.
