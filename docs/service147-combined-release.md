# Service147 — combined MLBB catalog and payment release

13 October 2026. The owner expanded the payment hotfix to include all prepared MLBB catalog changes and explicitly requested their publication after deployment.

## Current instruction and verification boundary

The owner answered “Use the waiver for this catalog release too”, followed by “actually deploy both changes for catalog and payment, then again go to admin and publish all catalog changes you did”. This authorizes one combined release without repeating the full application/database/browser suite. Payment146 commit `6305c2f` is retained on main; its separate release watcher stopped before any image dispatch or activation. Production remains signed `72ed594` until the combined release receipt confirms otherwise.

The frozen Service145/full1 gate and its original failures remain intact. The errors were two unchecked test JSON encodes, a shadowed local name and the payment currency-comparison lint expression. They are corrected in this candidate. Previous focused behavior/browser checks and the completed senior UI review remain evidence of their actual source, not a new complete-suite pass. The combined source must pass scoped static/security/repository checks, normal lightweight hosted CI, signed immutable image checks and runtime preflight. The private commit exception is exact-tree and one-use; permanent tracked hooks remain unchanged.

## Included changes

- Accept the uppercase currency echoes returned by NOWPayments while retaining amount, selected-asset, order, URL and single-attempt protection.
- Correctly display and price absolute Mythic stars, preserving historical zero-based catalogs.
- Searchable hero selection linked to lanes; linked regions/play locations; explicit delivery-hour ranges; reviewed win-rate preferences.
- Researched custom estimates with sixteen calculation examples and clear final-quote boundaries.
- Three illustrated fixed offers, with admin-defined scope, visible package prices and square covers; preserve the existing package and its agreed scope.
- Safe catalog import/export tied to the current saved revision, with stale/foreign/unsaved edits rejected and publication still requiring normal admin verification.

The detailed content, prices, assumptions and research are in `docs/catalog/MLBB_PREPARED_DRAFT.json` and `docs/catalog/MLBB_RESEARCH_2026-10-13.md`. The existing `base_revision: 0` prevents blindly replacing a live draft.

## Publication and preserved boundaries

After deployment, export the latest saved MLBB configuration through the admin editor. Compare it with the earlier public revision236 and saved revision243 used during preparation, merge the intended boost changes, and preserve unrelated or newer owner edits. Use the current revision in the import envelope, save, preview, inspect validation/pricing examples and publish through normal staff authentication/MFA. The owner's latest instruction authorizes the prepared package prices and delivery commitments; no unrelated game draft is included. Record the actual resulting revision and public verification before claiming publication.

No SQL migration or historical contract rewrite is included. Keep independent customer/admin/booster identities, mandatory staff MFA, published finance policy revision3, enabled checkout, disabled outgoing transfers/deletion and private webmail. The single diagnostic provider invoice permission is consumed; do not issue another test or send external mail. Previously uncertain attempts retain expiration/reconciliation safeguards.

Off-host backups remain absent. The signed current application is retained. Optional rank-unit offsets change the interpretation of new catalog data, so rollback after publication requires preserving the compatible application and catalog versions together; do not claim an old application can interpret newly published offsets or silently roll back accepted order terms. The exact deployment decision and operational recovery limits must be recorded with the release.

## Packaging correction

Combined source `e19141e` passed exact lightweight CI38375464404. Image run38376910333 stopped before a release bundle was produced: the frontend's standalone Docker context could not resolve the MLBB browser fixture's import from the repository-level docs directory. No deployment occurred. Keep that failed log and source unchanged. The correction places a semantically identical snapshot inside the frontend test fixture directory and updates only its two imports, so frontend-only image builds can typecheck without reaching outside their build context. Application behavior, catalog content, dependencies and migrations are unchanged. Typecheck, formatting/lint and repository/security checks bind this correction; the owner's combined-release test waiver remains one-use and no full-suite pass is claimed.
