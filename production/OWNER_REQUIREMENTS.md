# PLAYORA launch requirements

Preparation and isolated qualification are underway on the owner-provided server. **Do not send passwords, private keys, recovery codes or API secrets in chat.** Supply secrets through protected files on the server; qualification precedes public sales.

**Infrastructure decision, 2 October 2026:** the owner superseded the wait for vendor fixes and authorized stable official images with reviewed findings accepted explicitly. Images remain digest-pinned and scanned; accepted vulnerabilities remain documented risks. New findings, failed scans and compatibility/recovery failures are not waived. Private custom prototypes are not adopted.

## Infrastructure

- **Primary server:** purchased ParsPack Germany, Ubuntu Server 24.04 LTS, amd64, 8 vCPU, 16 GB RAM, 150 GB provider-described NVMe. The explicit candidate budget is in [SMALL_HOST.md](SMALL_HOST.md); capacity remains subject to server load/recovery tests. One host means downtime if it fails. The original larger profile remains available.
- **Self-hosted email:** static public IPv4, outbound TCP 25 permitted, configurable PTR/reverse DNS. Confirm these with the host before purchasing. We configure authenticated SMTP, TLS, SPF, DKIM and DMARC; actual inbox delivery must pass.
- **Domain:** `playoragames.com`, with `mail.playoragames.com` for mail. Cloudflare A/MX/SPF/DKIM/DMARC and forward/PTR checks pass; initial publicly trusted certificates are installed. The owner confirmed SPF/DKIM/DMARC PASS and Inbox placement for the one approved recheck. This does not prove general recipient deliverability or certificate renewal. See [setup steps](DOMAIN_SETUP.md).
- **Off-host backups — deferred by owner on 4 October:** arrange after initial launch. A separate server/private S3 destination, recovery key custody, expiry and actual restore qualification remain follow-up requirements. There is currently no qualified recovery from loss of the primary host.
- **SSH received:** the local `playora` alias and dedicated deployment operator are verified. A separate owner-approved read-only GitHub deploy key now provides source retrieval; no laptop private key was copied. Never paste private keys here.

## Identity and integrations

- **Owner account:** owner selected the existing protected Gmail address; the private bootstrap intent is prepared. Verified sign-in, authenticator enrollment and secure recovery-code storage still require the actual owner. No owner role has yet been granted.
- **Mail addresses:** notifications/support accounts and postmaster/abuse aliases are prepared. All three expressly approved delivery tests have been consumed; no further external mail is authorized by this checklist. Private support webmail is prepared; actual owner mailbox walkthrough remains open.
- **Google sign-in:** credentials are installed privately and the three callbacks match the intended domain. Actual deployed sign-in still needs qualification; see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).
- **NOWPayments:** live credentials are reported ready. Confirm accepted assets/networks and settlement/fees. Later authorize an explicit small transaction/fee budget and protected refund/payout destinations; credentials alone do not authorize spending.
- **Alerts:** responsible operator and an independent alert destination/watchdog that still works when the primary server or its mail service is down.
- **Release access:** authenticated GitHub access now includes `read:packages`; the encrypted signing key is prepared outside Git. Exact successful CI/build evidence, image pulls and signature verification remain required.

## Before enabling public sales

- Approve initial games/services, actual prices, capacity, delivery estimates, win-rate meaning and remedies; shop products/regions/delivery requirements; seller terms for buy-first and consignment.
- Policy wording and 24/7 support/fulfillment are owner-approved; see [the versioned approval](../docs/legal/APPROVAL.md). Resolve required operator disclosures and qualify the actual staffing, full-refund and separate account-damage compensation procedures before publishing the promises. Confirm artwork usage rights.
- Map the approved privacy defaults to actual retention/hold controls and applicable statutory obligations. Backup expiry remains a later configured requirement. Customer deletion remains disabled until the policy and independent recovery handling are qualified.
- Review the deployed customer/admin/booster journeys. Server database/load/restore tests, alert delivery, real email/OAuth and bounded live-payment qualification must pass before activation.

You can provide these progressively. Missing inputs block only the work that depends on them. Implementation and test evidence are tracked in [LAUNCH_EXECUTION.md](LAUNCH_EXECUTION.md).
