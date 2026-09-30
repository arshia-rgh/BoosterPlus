# PLAYORA launch requirements

Preparation is underway. **Do not send passwords, private keys, recovery codes or API secrets in chat.** Supply secrets later through protected files on the server. SSH is requested after the deployment package is prepared; server qualification precedes public sales.

## Infrastructure

- **Primary server:** provisional Ubuntu Server 24.04 LTS, amd64, 16 dedicated CPU cores, 64 GB RAM, 1 TB persistent NVMe. Capacity remains subject to server load tests. One host means downtime if it fails.
- **Self-hosted email:** static public IPv4, outbound TCP 25 permitted, configurable PTR/reverse DNS. Confirm these with the host before purchasing. We configure authenticated SMTP, TLS, SPF, DKIM and DMARC; actual inbox delivery must pass.
- **Domain:** chosen website/mail hostname, DNS management access method and certificate-contact email. No domain is selected yet.
- **Off-host backups:** a separate server or private S3-compatible destination, its region/capacity/access method, and an independently held recovery key. Agree backup expiry, key custodian and recovery operator; backups on the primary disk do not qualify.
- **Later SSH:** server IP/hostname, SSH port, deployment username and access method with sufficient administrative permission. Prefer an authorized public key; never paste a private key here.

## Identity and integrations

- **Owner account:** email address for the first owner; an authenticator app and secure recovery-code storage.
- **Mail addresses:** desired sender/support/postmaster addresses, display name and owner-selected Gmail/Outlook recipients for delivery tests.
- **Google sign-in:** an owned Google Cloud OAuth web client and consent configuration. After choosing the HTTPS origin, register all three callbacks: `/api/v1/auth/portals/{customer,admin,booster}/google/callback` (three separate URLs). Store the client secret privately.
- **NOWPayments:** live credentials are reported ready. Confirm accepted assets/networks and settlement/fees. Later authorize an explicit small transaction/fee budget and protected refund/payout destinations; credentials alone do not authorize spending.
- **Alerts:** responsible operator and an independent alert destination/watchdog that still works when the primary server or its mail service is down.
- **Release access:** authenticated repository/Actions and registry access for build verification and image pulls; separate custody of the encrypted release-signing key. We prepare the setup instructions.

## Before enabling public sales

- Approve initial games/services, actual prices, capacity, delivery estimates, win-rate meaning and remedies; shop products/regions/delivery requirements; seller terms for buy-first and consignment.
- Approve business/support identity, contact hours/timezone, launch language, terms, privacy, cancellations/refunds and account handover policies. Confirm artwork usage rights.
- Set retention/backup expiry and legal-hold rules. Customer deletion remains disabled until an explicit policy and operational recovery handling are qualified.
- Review the deployed customer/admin/booster journeys. Server database/load/restore tests, alert delivery, real email/OAuth and bounded live-payment qualification must pass before activation.

You can provide these progressively. Missing inputs block only the work that depends on them. Implementation and test evidence are tracked in [LAUNCH_EXECUTION.md](LAUNCH_EXECUTION.md).
