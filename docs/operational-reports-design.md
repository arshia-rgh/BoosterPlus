# Operational reports and account navigation

P11 now includes filtered, paginated previews and audited JSON downloads for orders, catalog publication, staff identities and owner-only audit events. Finance recognition, payment/refund/payout reporting, account privacy/retention operations and final branding/languages remain separate work. These reports never present quotes or unpaid contracts as revenue.

## Scope and data

Each query names its report kind, an inclusive `from` and exclusive `to` timestamp in UTC, optional current status/search, and an opaque next cursor. The report states its time basis: creation time for orders/catalog/staff, occurrence time for audit events. Status is the current state at generation, not a reconstruction of historical financial state. Catalog names are explicitly labeled staff working/draft names. Staff queries include boosters, administrators and owners only. Audit queries exclude metadata/private notes; other queries select only their documented columns and do not load customer answers, catalog configuration, email columns, authentication material or game credentials.

Pages contain at most 100 rows with stable ascending creation-time/ID ordering. Next cursors bind the report kind/date range/status/search by a domain-separated HMAC. SQL20 adds explicit creation-order indexes for orders, games and users; readiness separately verifies their nonunique shape without weakening unique-constraint checks. SQL files and Cobra own DDL; Ent generates queries only.

The JSON download preserves exact text and includes the query, columns, rows, explicit page limit/continuation, observation time, digest and committed audit ID. It is labeled **Download this page**; a page is never claimed to be a complete multi-page export. There is no saved report file, background email attachment or public artifact URL. JSON was chosen for exact structured exports; spreadsheet CSV interpretation has application-specific risks and no universal escaping strategy, as described by [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection). A future spreadsheet format needs its own qualification.

## Authorization and export consistency

Previews recheck current administrator/owner authority in the existing authorization transaction. Audit previews and downloads additionally require the owner-only audit capability. Downloads require recent primary verification and a recent authenticator check, an explicit reason and the exact preview digest. The server reruns the stored query under the same authorization fence and compares its content digest; changed rows/filter results produce a conflict requiring a new preview. Observation time is deliberately excluded from the content digest. The audit write must commit before an attachment response is returned. Audit failure, revoked authority or mismatched content returns an error without report download headers or bytes.

Downloads have fixed ASCII filenames, JSON content type, no-store and nosniff headers. The frontend keeps previews and temporary object URLs in memory, clears previews on changed filters or export errors, and revokes download object URLs. Completed downloads are private files under the operator's control. Every successful repeated download creates its own audit event. A change after the authorized read does not retroactively alter an already generated artifact; later downloads recheck authority and data again.

## Navigation and accessibility

The account shell uses a compact sign-out action in place of the large card before every workflow. Existing sign-out, MFA, recovery and profile behavior is preserved. Current account/workspace links expose `aria-current` for orientation. Report tables have a named scroll region and keyboard focus for horizontal navigation. The accessibility rule permits `region` focus only in this report component; other noninteractive elements remain restricted. Browser qualification explicitly checks focus, arrow-key scrolling when needed, page overflow and axe findings. This is a targeted accessibility pattern, not a disabled accessibility gate.

## Qualification limits

Tests cover current-role/factor checks, owner-only audit access, bounded dates/status/search/cursors, pagination, plain JSON text, narrow data projections, changed-preview conflicts, mandatory audit rollback, HTTP CSRF/strict input/private headers/contracts and real browser downloads. The existing complete suite remains required before commit. Production query plans/load, complete multi-workflow reporting, private-data retention rules and deployed operational acceptance still require P12 evidence and the remaining owner decisions.
