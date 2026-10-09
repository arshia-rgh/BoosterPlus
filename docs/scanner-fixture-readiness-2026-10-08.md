# Isolated scanner readiness — 8 October 2026

The panels140 complete gate failed in `TestArtworkHTTPPortalCSRFAndLimits`: a valid artwork upload returned HTTP 500. The frozen candidate and failed receipt are retained. Two subsequent isolated reruns of the unchanged artwork storage/authority and HTTP scenarios passed. Those focused results do not turn the incomplete full gate into a pass.

## Evidence and bounded conclusion

The first scanner startup logged bundled daily definitions 28080, with a warning that they were older than seven days. FreshClam installed 28146 at 01:35:17 UTC but could not notify clamd because its socket did not yet exist; the socket appeared about a second later. The Docker healthcheck tested daemon responsiveness without establishing the freshness of its loaded definitions. The stopped fixture did not report an OOM kill.

This supports a scanner startup/readiness race as the probable cause. The original HTTP response did not preserve its underlying scanner diagnostic, so the exact cause of that particular 500 is not asserted as proven. A separate cold-start diagnostic also observed Docker Healthy followed by a VERSION timeout, demonstrating that transient loading/reload availability needs explicit handling.

ClamAV documents PING as a responsiveness check, VERSION as engine/database information, and RELOAD as a reload request. These have different guarantees. Its Docker documentation also explains that disabling concurrent reload makes scanning wait for reload completion. See the official [ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html) and [Docker reload behavior](https://docs.clamav.net/manual/Installing/Docker.html).

## Test-infrastructure correction

- Integration and browser entry scripts now run `TestScannerFixtureReadiness` before starting their long suites.
- The preflight uses the unchanged application `media.Clamd.Scan`, including its 72-hour freshness limit and bounded INSTREAM protocol. It requires a benign sample to scan clean and the EICAR control to return `media.ErrInfected`.
- Readiness has a five-minute context/deadline. Only the fixed development endpoint `127.0.0.1:13310` may receive reload requests, at most three and at least one minute apart, when the application reports stale definitions. A reload acknowledgement alone never passes readiness.
- Failed/unknown scans, stale definitions, failed reloads and incorrect controls cannot become successful test results. The outer process is bounded and failure stops the long suite.
- Synthetic readiness-policy tests run in the normal backend `test-scripts` target, including lightweight CI. Python control-flow tests prove a failed preflight stops integration and browser population startup.

No production scanner policy, image, memory limit or security threshold changed. No database, mailbox, real-provider invoice, external email or financial action was used for this diagnosis.

## Checks and server proof

Local checks passed: eight race-enabled synthetic readiness-policy cases, four new Python preflight cases, six existing browser-selection cases, four existing TiDB-wait script cases, tagged golangci-lint with zero issues, standalone gosec and diff/format checks.

Two scanner-only fresh-volume diagnostic attempts were kept separately:

1. `panels140-scanner-readiness`: Docker became Healthy, but the additional observational VERSION probe timed out before the Go preflight ran. This attempt failed; its logs remain. Cleanup succeeded and no OOM kill was reported.
2. `panels140-scanner-readiness2`: the observational timeout was changed to a recorded observation so the authoritative application preflight could run. Loaded daily definitions 28146 dated 7 October 2026 were fresh; the race-enabled clean/EICAR preflight passed. It required no actual reload. The stale/reload branch is covered by synthetic policy tests, not claimed reproduced in this second live fixture.

Both attempts used a separate scanner-only Docker project, an immutable Go source overlay, and automatic removal of only that project's container, network and fresh volume. The original failed checkout/index and production were unchanged. Second-attempt cleanup returned 0 with no remaining project containers, independently verified.

Private evidence is retained beneath `/srv/playora-qualification/panels140-scanner-readiness*`. The successful proof log SHA256 is `4b2455122dce96380278edaf5557933d05d82e9147510e00b19009e8de0b6e8a`; the exercised readiness test SHA256 is `cdb50c4a9afd1396c7bd28f56e4606e1860210a8b74215136912774c00725a7f`. Local tooling fingerprints are in `.cache/panels140-scanner-readiness/source-sha256.json`.

A fresh complete gate for the corrected combined candidate remains required. These focused checks do not certify unrelated application changes or eliminate future scanner/network availability failures; they surface readiness failures before a long qualification run begins.
