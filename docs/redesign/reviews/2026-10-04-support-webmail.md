# Private support webmail review — 4 October 2026

**Verdict: PASS — no remaining actionable findings in the reviewed scope.**

Reviewer: separate senior UI/UX reviewer agent `/root/support_mail_ui_review`.
Base commit: `a41b9a97864c63283c8dbb36d5bb62b4fe96f551`.

## Scope and evidence

Reviewed the new private operator support-mail access instructions, isolated
Chrome/SSH entry, Roundcube sign-in, mailbox navigation, message reading,
attachment affordances, reply composer, search, saved drafts and logout. The
scope includes `production/WEBMAIL.md`, `production/deploy/open_webmail.py`,
`production/webmail/`, `production/gateway/Caddyfile.webmail` and
`production/compose.webmail.yaml`. It excludes the PLAYORA application portals,
their designs and unrelated launch changes.

The reviewer read the changed configuration/instructions and inspected rendered
screenshots. The implementing agent supplied browser-action observations from
an isolated synthetic `.test` mailbox. The reviewer did not inspect production
credentials or real messages, operate the mailbox, or send email. Authentication
and security observations below describe supplied test evidence, not a separate
security audit by this reviewer.

Rendered review covered desktop 1366×900, tablet 768×1024 and mobile 375×812:

- Initial credential-free desktop/mobile login captures.
- Review60 login, inbox, message and composer captures; premature message and
  resized-mobile captures were rejected as insufficient evidence.
- Review64: twelve settled login/inbox/message/composer captures, with fresh
  browser contexts at each width and explicit loaded-content assertions.
- Review71: light/dark message views, including corrected link contrast.
- Review76: corrected desktop attachment button and mobile floating Compose
  control, with the prior settled layouts retained.
- Review84: desktop Drafts view containing synthetic drafts saved in earlier
  sessions, following actual keyboard navigation in headed Chromium/Xvfb.

Screenshots remain private qualification artifacts, including
`/private/tmp/playora-webmail-review64/`, `playora-webmail-review71/`,
`playora-webmail-review76/` and `playora-webmail-review84/`. These temporary paths
identify reviewed evidence; they are not permanent repository assets or a
promise that evidence survives workstation cleanup.

## Review rounds and resolutions

| Finding | Initial severity | Observation and required outcome | Resolution |
| --- | --- | --- | --- |
| WM-UX-01 | P2 | Bright cyan login action and pale placeholders needed readable contrast. | A small presentation-only plugin uses white on `#147347` (5.88:1) and `#59636c` placeholders on white (6.13:1), plus visible login focus. Computed colors and rendered login/compose controls verified. |
| WM-UX-02 | P2 | Operator instructions did not clearly identify the mailbox username and independent credential/reset boundary. | Instructions now name the support mailbox/short username, distinguish its password from passwordless PLAYORA portals, and direct resets through the deployment operator. |
| WM-UX-03 | Provisional P1 | Review60 mobile composer showed clipped labels and overlapping navigation. | Fresh, fully settled review64 captures show clean mobile/tablet forms and navigation. Classified as premature capture evidence, not a confirmed application defect. |
| WM-UX-04 | Provisional P1 | Review60 message view lacked complete header/actions/attachment and showed an incomplete avatar. | Explicit loaded-content assertions and review64 show subject, sender, attachment, reply/back controls and complete rendering. Classified as a capture artifact. |
| WM-UX-05 | P2 | Authenticated light-mode links, attachment button and floating Compose control had insufficient apparent contrast. | Narrow light-mode overrides provide green links/FAB and a darker secondary button. Review71/76 verified the rendered fixes; dark message palette remains intact. |
| WM-UX-06 | Provisional P1 | Headless forward Tab testing appeared trapped between the preview frame and document boundary. | The same actual keyboard traversal in headed Chromium/Xvfb reaches Inbox, ArrowDown selects Drafts, Enter opens it, Tab reaches Logout and Enter signs out. This was a headless focus-boundary limitation. An ineffective experimental list-layout setting was removed; vendor JavaScript is unchanged. |

Round 1 was blocked by missing authenticated/responsive evidence and raised
WM-UX-01/02. Round 2 verified login contrast and instructions, but rejected the
incomplete mobile/message captures. Round 3 closed those capture findings and
raised WM-UX-05. Subsequent light/dark and button captures closed the contrast
finding. Keyboard evidence remained pending until headed test84 resolved
WM-UX-06. Final headed test88 completed search and mobile-menu evidence. No
remaining actionable finding was identified after these fixes and checks.

## Interaction evidence received

- Actual login Tab traversal reaches username, password and Login; Enter signs
  in with visible focus. Invalid credentials leave the sign-in form and display
  a login-failed message.
- Settled synthetic message and reply composer render across all three widths;
  message attachment is discoverable, and draft saves persist across sessions.
- Actual headed keyboard navigation opens Drafts and logs out. Reopening an
  authenticated route after logout displays sign-in.
- Headed test88 verifies keyboard search: a negative query shows zero rows and
  “Search returned no matches”; a matching query returns the fixture message.
- At 375px, the task menu opens and its explicit Close control dismisses it;
  Logout is no longer in the viewport after closing. Escape is not the vendor
  menu's dismissal behavior; no Escape support is claimed.
- Supplied final runs report no page errors and no document overflow at the
  reviewed widths. Earlier fixture runs also reported no external resource
  requests and confirmed Secure/HttpOnly/SameSite=Strict session attributes.

## Boundaries and remaining qualification

This is a scoped UI review of private SSH-only webmail, not approval for a public
mailbox login. Screenshots and browser automation use synthetic data. The
owner's physical Mac/Chrome tunnel workflow, physical touch devices, assistive
technology and other browser engines have not been independently exercised by
this reviewer. Headless focus-boundary behavior must not be reported as a
successful substitute for the headed keyboard checks.

This verdict does not qualify external message delivery, attachment safety,
server capacity, backups/restores, session expiry, all vendor screens or the
complete launch. Those retain their separate tests and recorded limitations.
Accepted vendor image findings remain findings, and user visual acceptance is
not inferred from this review. The implementing agent retains responsibility
for repository checks, evidence retention and the verified commit/push.
