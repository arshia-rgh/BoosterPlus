# Support webmail vendor review — 4 October 2026

Candidate, not yet adopted:
`roundcube/roundcubemail:1.7.4-fpm-alpine@sha256:cced4c7d40c21ec138b3622be13cadd2bbe7467eacd17029340b8650d7237ecf`.

The current maintained `latest-fpm-alpine` and `1.7.x-fpm-alpine` tags resolve to
the same digest. The official Apache non-root variant was also scanned and has
72 HIGH package findings, versus seven in this Alpine candidate. Neither is
covered by the earlier mail/database vendor acceptance. No custom patched image
or runtime package replacement is proposed.

Private full Trivy report: `roundcube-alpine45.json`, SHA256
`699ba5acc6d3ef8b8d9b73a41054ea9aef3632eef5555a3b5faf5d74d2363468`.
Reports include package locations; the abbreviated table is not the acceptance
manifest. The scan uses the existing HIGH/CRITICAL fixable-finding policy, not a
claim that every possible vulnerability was assessed.

| Advisory | Installed packages | Fixed version | Findings |
| --- | --- | --- | --- |
| CVE-2026-75804 | libcrypto3, libssl3, openssl at 3.3.7-r1 | 3.3.7-r2 | 3 HIGH |
| CVE-2026-84782 | libcrypto3, libssl3, openssl at 3.3.7-r1 | 3.3.7-r2 | 3 HIGH |
| GHSA-3q6v-r5mr-hxv8 | league/commonmark 2.10.0 | 2.10.2 | 1 HIGH |

The OpenSSL advisories concern QUIC memory exhaustion and DTLS handshake
out-of-bounds disclosure/crashes. Planned IMAP/submission use TCP TLS, not those
protocols; this reduces expected exposure but is not a fixed-package claim.
CommonMark's table parser can consume excessive CPU for crafted Markdown.
Untrusted mail still requires care even when the browser entrance is private.

Proposed deployment: non-root PHP, bounded memory/CPU/request time, private
mail-only network, HTTPS through an SSH-only operator listener, blocked remote
images, no public mailbox login, installer/debug disabled and no optional
Markdown plugins. Actual configuration, UI and capacity tests remain required.

**Owner accepted on 4 October:** “Accept this exact image and seven findings.”
The manifest records those exact package/location fingerprints and report hash.
Other findings, scanner failures, runtime bugs and unrelated images remain
outside this acceptance. Runtime/UI/capacity qualification is still required.

Sources: [official image repository](https://github.com/roundcube/roundcubemail-docker),
[CommonMark advisory](https://github.com/thephpleague/commonmark/security/advisories/GHSA-3q6v-r5mr-hxv8).
