# Dedicated admin and booster portal hosts — 8 October 2026

Status: implementation and focused qualification prepared; the first full
isolated server gate failed at a strict browser-fixture assertion. A corrected
combined candidate will include the separately reviewed public contact and
authenticator QR work. Full qualification, exact release qualification and live
cutover remain pending. No production application or runtime configuration has
changed for this task.
The first isolated setup stopped before tests because a local Git clone inherited
object alternates. Its checkout/log/state were retained; a fresh independent
transport clone was then created and used for qualification. This was not a
test pass or a production failure.

## Owner direction and addresses

The customer website remains `https://playoragames.com`. Admin moves to
`https://admin.playoragames.com`; the owner selected `https://pro.playoragames.com`
for the booster workspace. Staff home is `/`, sign-in is `/login`, and orders
use `/orders` and `/orders/<id>`. The role and API namespace remain `booster`.
Both DNS A records were verified as `195.248.241.192`. The owner explicitly
confirmed Cloudflare and Google console changes. A real Google sign-in remains
owner-led acceptance after deployment; this confirmation is not a successful
OAuth transaction.

## Implementation

Three isolated React route graphs share the existing two frontend containers:
customer and booster in the storefront process, with admin in its own process.
The existing container memory budgets are retained. Page navigation converts
canonical internal staff paths at one adapter boundary; native forms, anchors,
record sections, return paths, history and downloads retain their intended
workspace. Explicit unknown-route handling preserves role identity on 404 pages.
Local development retains its existing shared-origin `/admin` and `/booster`
paths when dedicated origins are not configured.

The TLS gateway matches three exact hosts and checks TLS SNI against Host.
Frontend servers validate raw Host and overwrite their private routing/proxy
headers. The backend checks the authenticated proxy origin against the selected
portal before reading or issuing cookies. Staff cookies remain host-only;
customer sessions do not authorize admin or booster actions. Exact mutation
Origin, CSRF, Google state/PKCE and mandatory staff MFA remain in force. No
wildcard CORS, shared-domain session or runtime payment bypass is added.

Legacy staff GET/HEAD bookmarks redirect with no-store302 responses. Bounded
navigation state survives; callback credentials and arbitrary return URLs do
not. Unsafe methods are rejected without cross-origin redirects. Old SPA data
requests and ambiguous encoded/traversal aliases are rejected. Application
assets retain their technical namespaces. Email activity links resolve the
current portal destination at delivery; no external test message was sent.

## Focused checks and review

- Backend identity/configuration/notification race tests, vet, pinned
  golangci-lint and standalone gosec passed. Two new real-database scenarios
  cover OAuth callback/session/CSRF binding and 27 fully authenticated
  host/audience/token combinations plus six privileged portal boundaries;
  their execution belongs to the central server gate.
- All three production frontend builds, strict types, lint and formatting
  passed. Local units passed486 tests including10 held untracked cameo tests;
  the tracked candidate has476 tests and100% required route coverage. Five host/configuration/server scenarios and nine existing
  server/development scenarios passed against isolated local listeners.
- New actual-built Chromium and WebKit desktop/mobile browser journeys passed with
  synthetic API/provider data: clean paths, native search, local order sections,
  draft retention, history/reload, role-correct errors, assets, customer links,
  legacy redirects and host-only cookie separation. This is frontend/browser
  qualification, not a substitute for real database authentication tests.
- Repository policy, secret/workflow/contract and design-inventory checks passed.
  Deployment unit tests passed76 cases; real Caddy/Compose and full staging
  execution remain separately recorded.
- Security review found and fixed staff startup after terms publication and
  encoded/dot-segment aliases. Frontend review/build found and fixed booster
  server-only code bundling and loss of role context on unknown URLs. Scoped
  independent senior visual/navigation review returned PASS after inspecting
  all16 Chromium/WebKit desktop/mobile portal images, source and trace evidence.
  See [the review record](redesign/reviews/UI137_PORTAL_HOSTS_2026-10-08.md).
  Final aggregate evidence remains pending.

## Full-gate attempt and correction

The normal tracked hook in `/srv/playora-qualification/portal137` reached the
frontend portal browser tests, after backend qualification and frontend static,
unit, build and 14 server checks. Both desktop/mobile portal-navigation subtests
passed, but the final strict fixture assertion rejected an unhandled customer
`/api/v1/me/overview` request. The wrapper recorded failure and stopped only its
isolated fixture containers. No commit or deployment resulted.

The correction supplies an explicit bounded authenticated overview fixture and
checks the customer's empty order/support panel. It preserves the unexpected-
request assertion. The original manifest, tree and failed log stay immutable.
Fresh qualification under `portal137-round2` will cover this correction and the
contact/QR dependency delta together; the earlier partial pass is not presented
as a completed gate or as qualification of the new code.

## Cutover and recovery

Follow [the deployment runbook](../production/PORTAL_DOMAINS.md). Preserve
schema40, checkout enabled, outgoing transfers/deletion disabled, mail/webmail
configuration and secrets. Before changing live routing, retain the prior signed
6c5fdcd release, exact manifest/runtime files, mounted gateway bytes and compatible
prior deployment tooling. Rollback requires those configurations and images as a
matched set; schema compatibility alone is insufficient for the domain move.

Normal release image scanning, signatures, exact-commit CI, server preflight and
post-deployment checks remain required. Off-host recovery is absent; previous
one-use release exceptions do not authorize another exception. No additional
email, payment, refund or payout is authorized. Owner-led Google/email/MFA and
representative authenticated actions remain live acceptance, without any claim
that automated checks prove every possible defect absent.
