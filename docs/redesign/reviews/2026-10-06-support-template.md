# Private support template and loading review — 6 October 2026

**PASS — no remaining actionable findings in this scope.**

Reviewer: separate senior UI/UX designer `/root/webmail_template_review`.
Base: `ce178af10bf39858ca715b1e905b97c2025e9f7a`.

Scope: the PLAYORA support composer template, apply/remove and rich-text conversion states, affected keyboard/mobile behavior, and private launcher/loading instructions. No unrelated application panels or real mailbox contents were reviewed.

The reviewer inspected actual synthetic Roundcube screenshots at1366×900,768×1024 and375×812 plus desktop dark mode. Final images and browser results are in `.cache/webmail120/review-final/`; corresponding private server evidence is `/srv/playora-qualification/webmail120/`. Rendered data uses only the isolated `qualification.test` mailbox.

## Review rounds

1. Initial recommendations required explicit Apply/Remove, manual sending, preserved current edits, deliberate plain-text conversion, readable green framing and announced status. Desktop looked readable; remaining evidence was blocked pending responsive and interaction checks.
2. **WM-UX-01, P2:** at375×812, TinyMCE's contextual table controls overlapped the fixed Save/Send footer immediately after template application. The first caret correction removed the footer obstruction but retained distracting table selection/heading overlap. The reviewer requested clean final applied/reopened and dark captures rather than accepting incomplete evidence.
3. The final implementation sets a normal text caret and removes floating layout-table toolbar/resize controls in the composer while retaining the normal Table menu and image resizing. The reviewer confirmed all final renders were readable, mobile footer/heading unobstructed, controls wrapping and dark contrast clear. Explicit verdict: **PASS — no remaining actionable findings in this scope.**

Supplied headed Chromium/Xvfb evidence verifies Tab/Enter from the Subject field, apply/remove, real typing after applying, Undo/Redo, unchanged recipient/attachment, saved-draft reopening, conversion cancellation/network-failure retry, no automatic sends and no page errors/document overflow. Regression work also fixed namespaced draft markers and preservation of nested quoted templates.

Limits: synthetic Chromium only; physical devices, assistive technology and recipient email-client rendering remain unqualified. This review is not a production latency benchmark or authorization to send external email. No real support mailbox contents or passwords were presented to the reviewer.
