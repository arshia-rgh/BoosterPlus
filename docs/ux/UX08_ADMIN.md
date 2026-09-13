# UX08 — Staff operations and editors

The admin landing page is an operations workspace: compact authoritative counts, oldest waiting requests, upcoming sessions, background failures and quick links. It no longer embeds the full user directory/security forms. Customers and staff retains identity search and all role/session/suspension/recovery actions inside expandable records; old private results clear before a new search. Audit/recovery has a deliberate secondary location. Staff module search filters navigation while preserving owner-only visibility and the existing mobile drawer/focus behavior.

Finance has distinct URL-addressable payments, service cases, seller payouts, policy and reconciliation views. Local view changes preserve mounted policy edits; hidden panels are inaccessible to keyboard navigation. Counts and messages do not infer whether live payment switches are enabled. Source receipt/asset/amount, provider evidence, accepted terms, outgoing authorization and both recent factors remain unchanged.

Catalog section shortcuts focus actual editor sections. Save and saved-draft preview are available near the top, with saved/unsaved cues. The complete field/rank/rule/package/intake/coupon editors, publication confirmation, observed revisions, stale-conflict handling, history and discard/navigation blocker remain. Background recovery surfaces the actionable failure and keeps technical timing/reference in a disclosure. Content, retention, reports, media, alerts and moderation use the shared green operational surfaces and retain existing route behavior.

## Verification

Frontend/repository gate: unit role/module-search coverage, catalog/financial/security component tests, owner/admin browser directory actions and audits, finance-view draft preservation, catalog save/preview/publish, all existing admin routes, axe/reflow, strict builds/budgets/security checks. Screenshots: ignored `frontend/.cache/operations-*`, `finance-policy-*`, existing catalog/admin route captures. Human task review and expanded cross-browser matrix remain UX10; no measured usability score is asserted.

R10/R11 and live transaction qualification remain held. No backend/API/SQL or deployment changes.
