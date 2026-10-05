# Official vendor images and accepted findings

Owner decision, 2 October 2026: continue using stable official vendor images even
with the reviewed vulnerabilities. This supersedes the earlier instruction to
wait for vendor fixes. No PLAYORA-rebuilt vendor prototypes are adopted.

## Selection

| Component | Selected release | Reason |
| --- | --- | --- |
| TiDB, PD, TiKV, BR | 8.5.8 | Patch update within the existing 8.5 LTS family; keep all four components aligned. |
| SeaweedFS | 4.48 | Current official release; its prior fresh audit had no fixable HIGH/CRITICAL findings. S3/application compatibility still needs qualification. |
| Docker Mailserver | 16.0.1 | Current stable maintenance release, including Dovecot/LDAP fixes. |
| Restic | 0.19.1 | Current stable maintenance release; retain repository compatibility. |

Every reference includes the registry digest, including development/staging
fixtures. No floating `latest`, release candidate or custom vendor build is used.
“Stable” describes the release channel, not a guarantee of security or uptime.

Primary research, checked 2 October 2026:
[TiDB 8.5 LTS](https://docs.pingcap.com/tidb/dev/release-8.5.0/),
[8.5.8 release notes](https://docs.pingcap.com/tidb/stable/release-8.5.8/),
[SeaweedFS releases](https://github.com/seaweedfs/seaweedfs/releases),
[Docker Mailserver releases](https://github.com/docker-mailserver/docker-mailserver/releases),
[Restic releases](https://github.com/restic/restic/releases).

## Security result semantics

`make infrastructure-audit` still scans every selected vendor image using the
live vulnerability database and retains complete JSON reports. It reports each
image as CLEAN, OWNER-ACCEPTED FINDINGS, BLOCKED or SCAN ERROR. A successful policy
check with accepted findings must never be described as a clean scan.

[The acceptance manifest](security/vendor-image-acceptance.json) records the
owner decision, exact image digests, original report hashes and each reviewed
finding's advisory ID, package, installed/fixed version, severity and location.
The initial manifest contains 466 package-location findings across six images;
this is not 466 unique CVEs and does not establish exploitability or safety.
On4October2026 the owner accepted eight additional Redis package findings for
the unchanged mail image; see [the scoped review](security/MAIL_REVIEW_2026-10-04.md).
The accepted inventory is now474 package-location findings. The original reports
and new report remain separately preserved. SeaweedFS4.48 has no exception.
Resolved findings need no acceptance.

A new image digest, new advisory, changed severity/package/version/location,
scanner failure, incomplete report or missing evidence cannot inherit an old
exception. Do not regenerate this manifest automatically from a failing scan.
Review updates explicitly and prefer official fixes when available. No generic
ignore file or environment switch suppresses the scanner.

Application source/dependency security checks remain unchanged. Private network
boundaries, non-root execution where supported, TLS/authentication, least
privilege, backups and monitoring remain required; they do not prove the
accepted vulnerabilities unreachable. Runtime compatibility, actual recovery,
load and external launch qualification remain independent gates.
