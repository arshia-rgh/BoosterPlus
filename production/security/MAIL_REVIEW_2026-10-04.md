# Accepted mail image risk review — 4 October 2026

Status: **explicitly accepted by the owner** on 4 October 2026: “Accept these eight
findings for this exact image.” The manifest records only this reviewed delta,
retains the original acceptance/report hash, and references this additional
report. Public mail remains offline pending runtime and delivery qualification.
The original fresh audit failed correctly before this decision; a new audit is
required and must still block any additional unaccepted finding.

The selected official Docker Mailserver release remains 16.0.1. Its immutable
reference is:

`ghcr.io/docker-mailserver/docker-mailserver:16.0.1@sha256:d0fe7668defe157aad57ea31b1707ad1e2fb57d7a91bdf17cbdf876549946c86`

Fresh report 30 adds eight HIGH package findings: each advisory below appears
for both `redis-server` and `redis-tools`, installed `5:8.0.2-3+deb13u2`,
fixed package version `5:8.0.2-3+deb13u3`. The image has 201 findings, of which 193
were already accepted. These are package findings, not eight distinct CVEs.

| Advisory | Reported issue |
| --- | --- |
| CVE-2026-23479 | Use-after-free in client unblocking; potential code execution. |
| CVE-2026-23631 | Use-after-free in Lua scripting; potential code execution. |
| CVE-2026-25243 | Invalid memory access through RESTORE; potential code execution. |
| CVE-2026-81934 | TLS pending-data list use-after-free; potential code execution. |

Redis supports Rspamd inside the mail container. The deployment does not publish
Redis ports, but private placement does not establish that these findings are
unreachable. Compromise could affect mail confidentiality, integrity and service
availability, including sign-in email. Exact exploit prerequisites still require
configuration-specific analysis; none of these findings is claimed fixed.

The owner accepted these eight additional findings for this exact image and
authorized continuing its runtime qualification. Acceptance does not waive application security, scan execution, mail
authentication/TLS, delivery, resource or recovery checks. It does not authorize
unrelated future findings or a different image digest.

Complete private Trivy report:
`/srv/playora-qualification/evidence-6c5b8be/vendor-review30/mail.json`.
SHA256: `132a8eee4d14aa134200e6355f00804f2b4d81b3e0f052e4c9b7fab987f523d9`.
The original accepted reports remain separately preserved.

Primary release reference checked 4 October 2026:
[official Docker Mailserver releases](https://github.com/docker-mailserver/docker-mailserver/releases).
Package advisory references are retained in the complete scan report.
