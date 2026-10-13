# Service147 — combined MLBB catalog and payment release

13 October 2026. The owner expanded the payment hotfix to include all prepared MLBB catalog changes and explicitly requested their publication after deployment.

## Current instruction and verification boundary

The owner answered “Use the waiver for this catalog release too”, followed by “actually deploy both changes for catalog and payment, then again go to admin and publish all catalog changes you did”. This authorizes one combined release without repeating the full application/database/browser suite. Payment146 commit `6305c2f` is retained on main; its separate release watcher stopped before any image dispatch or activation. The completed deployment receipt below supersedes the earlier signed `72ed594` application.

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

## Delivered release and publication

Signed `b24849302b45175b7a5c9f5cc5c6237700623bc0` (tree `f8602c9fd50b9054846789575f137c1947add1b2`) is deployed and verified at schema41. Exact lightweight CI38378156434 and five-image release38379868988 passed, including image security checks. Signature verification, server preflight, migration-version/checksum checks, three-host HTTPS/redirect smoke, six application-container health/image checks and mail/private-webmail checks passed. Stable mounted99f60bd deployment files and protected runtime inputs are unchanged. The active manifest is `/srv/playora/releases/b248493/deployment.env`.

The owner explicitly answered “Deploy b248493 and publish the catalog with this recovery risk”. The private exact-release decision records absent off-host backups and possible forward-fix recovery after publishing new rank semantics. Both this recovery approval and the combined test waiver are consumed. No complete-suite pass is claimed, and the normal future release rules remain. The original failed full1 and e19141e image-build evidence remains intact.

The signed-in admin exported saved revision243. Its seller intake and unrelated settings were preserved. One old pricing example used obsolete priority/hero fields and a target outside the new absolute-star range; the original export is retained privately and the example was replaced by the sixteen prepared cases. The owner's inclusive star maxima (24/49/99) were translated to the new start-plus-span representation (0+25/25+25/50+50), preserving their intended ranges. The resulting configuration matches the researched prepared content, with the actual saved revision in the import envelope and review explicitly completed.

Normal admin import, save and preview produced revision244 and “Publication checks passed.” The owner completed the fresh authenticator dialog for publication. The editor confirmed “Catalog published.” with draft revision245; the public catalog serves **published version244**. These are distinct editor/public version counters, not inconsistent releases. Read-only verification confirmed the exact approved configuration, except pricing test cases intentionally omitted from the public API. All three public WebP covers match their signed-release file hashes. The public boosting view displays all four offers, their images, scope and USD50/18/20/23 prices. No unrelated game draft was published.

Private evidence is retained under local `.cache/service147/` and server `/srv/playora-qualification/service147/build2/`; authoritative activation is `/srv/playora/releases/b248493/hotfix-state.json` (`deployed_verified`) with `runtime-verification.json`. The private wrapper's completion JSON retained a hardcoded `activated:false` metadata field despite `stage:passed`; this field is inaccurate. The signed release state, actual container image IDs, authoritative activation receipt and public checks confirm deployment. Preserve the original wrapper evidence; do not use that field to dispatch a second deployment.

The payment response correction is live. Existing ambiguous attempts retain expiration/reconciliation safeguards; no extra provider invoice or settlement was attempted, and no end-to-end paid transaction is claimed. The owner may retry through the normal available checkout action. Checkout remains enabled, policy revision3 unchanged, outgoing transfers/deletion disabled and webmail private. Real financial acceptance and off-host recovery remain unfinished.
