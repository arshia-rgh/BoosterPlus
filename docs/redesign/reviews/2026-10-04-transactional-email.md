# Transactional email review — 4 October 2026

**Verdict: PASS — no remaining actionable findings in the reviewed scope.**

Reviewer: separate senior UI/UX designer agent
`/root/transactional_email_design_review`. This review covers the new shared
email template and its synthetic event previews, not unrelated launch changes.

## Evidence and rounds

The reviewer inspected rendered desktop (1280×900), tablet (768×1024), narrow
320×800 and 375×812 previews, keyboard focus and document structure. The DOM
sweep covered all 14 synthetic variants; representative plaintext alternatives
were checked for five variants. The samples include payment, refund,
verification, quote, booster, expired checkout, case, seller and availability
messages. No remote images, fonts, tracking pixels or scripts are required.

| Finding | Resolution |
| --- | --- |
| EMAIL-01: bright green focus outline lacked sufficient contrast on white. | Changed to a dark green `#176b3b`, 3px outline. Keyboard focus verified. |
| EMAIL-02: “Use this code to continue” appeared after the code card. | Reworded to “Enter the code in the verification screen for your request.” Visual reading order verified. |
| EMAIL-03: the long, noninteractive account-settings URL in the availability message wrapped awkwardly. | Replaced with a clear instruction to manage alerts in account settings. The signed unsubscribe remains an explicit link. |

Round one raised EMAIL-01/02 and identified synthetic sample links that needed
the correct booster, support and seller routes. Round two verified those fixes
and raised EMAIL-03. Round three verified the availability correction and
returned the explicit PASS above. Sampled narrow views had no horizontal
overflow; the main action was 54px high. A suggestion to move preference text
below the action was nonblocking.

## Limits

These are browser-rendered email previews. Native Gmail/Outlook rendering,
physical devices, assistive technology and real message delivery were not
qualified by this review. No additional external email was sent. The earlier
owner-confirmed Gmail SPF/DKIM/DMARC PASS and Inbox result concerned a different,
plain test message and is not proof of these templates' inbox placement.

Previews can be regenerated with `go run ./internal/emailtemplate/preview`
from `backend/`. They contain synthetic data only and are written to the
ignored `.cache/email-preview/` directory.
