# PLAYORA production deployment — 5 October 2026

The application is deployed at [playoragames.com](https://playoragames.com). **Checkout and outgoing transfers remain paused.** This records an actual installation, not completed commercial-launch qualification.

## Verified release

- Deployed source: `99f60bd0a4ab75fa0aa333a3aa95b150edf371e2`; schema39.
- [Hosted quality checks](https://github.com/arshia-rgh/BoosterPlus/actions/runs/37277572594) and [release image builds/scans](https://github.com/arshia-rgh/BoosterPlus/actions/runs/37279532818) passed. Hosted CI uses the owner's lightweight policy; heavy qualification is independently recorded as server gate100 with exact application-source equivalence.
- Five immutable image digests and SBOMs verified against the independently signed release. Signing private material remains off-server; temporary registry credentials were removed.
- SQL migrations/history, service health, private storage/scanner probes, external HTTPS routing/security headers and anonymous API rejection passed.
- The approved policies use first-publication version `playora-2026-10-05-v1` and the owner-selected public label “PLAYORA team”. Original approved policy hashes and protections remain preserved.

Private server receipts: `/srv/playora/releases/99f60bd/deployment109-state.json`, `/srv/playora/installation/operations/boosterplus-production-release.json`, and `/srv/playora-qualification/launch-99f60bd/`. Runtime configuration and credentials stay outside Git. The deployment-only source is `/srv/playora/releases/99f60bd/source/production`; use that installed directory for production operations.

## Owner account handover

Completed: the owner confirmed Google sign-in and authenticator enrollment. The private read-only check verified the selected identity, email verification and enabled MFA, with no previous owner. The audited `identity bootstrap-owner` command granted the role; readback confirmed exactly one owner/bootstrap audit, incremented authentication version and revoked prior sessions. Separate admin sign-in and its real second-factor challenge still require the owner walkthrough. Private receipt: `/srv/playora/releases/99f60bd/owner110-bootstrap.json`. No payment setting changed.

1. Open [customer sign-in](https://playoragames.com/login) and use Google with the existing owner Gmail.
2. Open [account security](https://playoragames.com/account/security), enroll and verify an authenticator, and save recovery codes privately. Never send setup keys, codes or recovery codes in chat.
3. Tell the deployment operator when complete. They verify that exact identity and run the audited first-owner bootstrap CLI. This step is now completed for the selected owner identity.
4. Sign in independently at [admin sign-in](https://playoragames.com/admin/login), including the required authenticator step. A customer session does not substitute for an admin session. [Booster sign-in](https://playoragames.com/booster/login) is also separate.

Support webmail runs privately behind SSH. From the repository on the owner's Mac, run `make -C production webmail-open`; use the separately supplied protected mailbox credential. See [webmail instructions](../production/WEBMAIL.md). No public webmail login is exposed.

## Remaining acceptance

The private qualification packet remains authoritative for unfinished checks: real portal/MFA journeys; final role/content walkthrough; bounded live invoice/refund/payout tests; capacity/load, monitoring, incident/rotation and release-recovery acceptance; domain/renewal and policy details. Do not treat infrastructure deployment as a pass for these checks. Payment/payout activation requires its independent evidence and owner decision.

Off-host backups and real recovery/RPO/RTO testing are deferred by the owner until after initial launch. Primary-host loss may lose all data. Existing backup tooling and strict qualification defaults remain intact. Deletion stays disabled. “PLAYORA team” is a public label, not evidence of a registered entity or completed mandatory operator-disclosure review.

The one owner-reported Inbox message had SPF/DKIM/DMARC PASS; earlier messages went to Spam and the owner marked one not spam. This is limited recipient evidence, not a guarantee for other recipients. All three authorized delivery tests are consumed.
