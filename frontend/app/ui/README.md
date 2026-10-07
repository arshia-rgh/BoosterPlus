# Shared runtime UI foundations

The accepted reference is `docs/redesign/design/`; do not import its workspace controls or fixture data into the application. These components render in the existing storefront and admin builds.

- `site-chrome.tsx`: shared footer and ambient art; minimal storefront/booster header. Destinations follow workspace identity. Authorization remains server-owned; recognizing a pathname never grants a capability.
- `design-system.css`: green theme tokens and explicitly named shared surfaces. Keep feature selectors scoped; do not add global rules for all forms, sections or buttons.
- `motion.ts`: shared automatic device reduced-motion preference. Decorative effects must stop in reduced mode; content and controls remain present without animation or JavaScript.
- `page-header.tsx`: page identity for ordinary workspace screens.
- `record-shell.tsx`: persistent record identity plus query-backed local sections. It does not load records, authorize access, persist sensitive drafts or replace server checks.

Record owners must keep non-sensitive draft state above the selected section, clear it on record/user/portal changes, and retain a validated list-return URL. Never serialize credentials, private messages or payment details into a return URL. Loading/error/access-loss content stays in the same workspace; inaccessible private data must be removed. Use one main heading per record page when integrating RecordShell, rather than nesting it under an existing page heading.

The current component test demonstrates local section changes and Back without remounting identity. Full order-route integration belongs to DI06/DI08/DI09. Adding the primitive alone does not complete those flows. The DI01 `catalog/game-shell.tsx` wraps game/custom/package/review routes with persistent game identity and local error recovery; additional service subflows remain DI04 onward. Optional published `hero_layout` controls desktop/mobile focal percentages and desktop copy side. Static bounded rules in `catalog/artwork-framing.css` support every integer 0–100 without inline styles or weakening CSP; preserve these bounds and the pre-hydration image-failure fallback when extending artwork. Legacy configurations use documented defaults. New catalog versions must be reviewed and published before changed framing becomes public.

Before changing shared visuals, run the scoped senior designer review loop in `docs/redesign/DESIGN_CHANGE_GATE.md`, frontend pre-commit and root checks. Include narrow enlarged text: a page can avoid horizontal overflow while still breaking navigation words into unreadable fragments.

`feedback.tsx` provides stable status/error announcements and loading/error/empty panels. Keep feedback beside its action; do not auto-dismiss errors or replace a durable result with a timed toast. `error-page.tsx` is the shared root-boundary recovery view for both builds: 401/403/404/429/503, generic failure and offline connection changes. It never renders raw error data. Feature-owned boundaries should retain their record/game shell and use these patterns without exposing inaccessible content.

`retry-time.ts` bounds real Retry-After metadata and renders an explicit UTC time. `RetryButton` disables during a deadline or active request; callers must also lock their request handler and focus-driven refresh. A reload is an explicit GET, never an automatic replay of a payment or other mutation. Shared Form retains editable safe input during cooldown, locks while submitting and focuses stable error feedback. Portal isolation and safe post-sign-in intent are separate DI02 work, not guarantees provided by these UI primitives.

Foundation variants live in `primitives.tsx/css`: Button (primary/secondary/text/destructive, optional busy/busyLabel with stable geometry), StatusBadge (always readable text, never color alone), Skeleton and TableRegion. Give a standalone Skeleton a loading label; use an empty label only when a parent already owns the accessible loading announcement. TableRegion retains native table/caption/header semantics and adds named keyboard scrolling, not grid interaction.

Form/Text integrate `form-validation.tsx`: server issues match locally registered field names; help/error IDs and aria-invalid are managed together; summary links focus those controls. Editing clears only that field's stale issue and asks for another submission when all displayed issues were edited. It never claims the server accepted an edit. Do not register sensitive values in field metadata.

`list-navigation.tsx` provides the data-router CursorPagination used by GameCatalog and a filterQuery helper that clears stale cursors. Pagination changes only the cursor, retains filters, exposes pending state and prevents duplicate activation. Loader failures retain their target URL for explicit recovery; a new filter starts at the first page. Specialized list integrations belong to their owning phases.

The reusable qualification fixture is in `tests/fixtures/ui-foundations/` and exercised by `tests/e2e/foundation-components.spec.ts`; never add it to application routes or production assets. See `docs/redesign/DI01_QUALIFICATION.md` for component ownership, actual evidence and later-feature boundaries.
