# Shared runtime UI foundations

The accepted reference is `docs/redesign/design/`; do not import its workspace controls or fixture data into the application. These components render in the existing storefront and admin builds.

- `site-chrome.tsx`: shared footer and ambient art; minimal storefront/booster header. Destinations follow workspace identity. Authorization remains server-owned; recognizing a pathname never grants a capability.
- `design-system.css`: green theme tokens and explicitly named shared surfaces. Keep feature selectors scoped; do not add global rules for all forms, sections or buttons.
- `motion.ts`: shared persistent device/reduced-motion preference. Decorative effects must stop in reduced mode; content and controls remain present without animation or JavaScript.
- `page-header.tsx`: page identity for ordinary workspace screens.
- `record-shell.tsx`: persistent record identity plus query-backed local sections. It does not load records, authorize access, persist sensitive drafts or replace server checks.

Record owners must keep non-sensitive draft state above the selected section, clear it on record/user/portal changes, and retain a validated list-return URL. Never serialize credentials, private messages or payment details into a return URL. Loading/error/access-loss content stays in the same workspace; inaccessible private data must be removed. Use one main heading per record page when integrating RecordShell, rather than nesting it under an existing page heading.

The current component test demonstrates local section changes and Back without remounting identity. Full order-route integration belongs to DI06/DI08/DI09. Adding the primitive alone does not complete those flows. Game-specific artwork and persistent service selection remain DI01/DI04 work.

Before changing shared visuals, run the scoped senior designer review loop in `docs/redesign/DESIGN_CHANGE_GATE.md`, frontend pre-commit and root checks. Include narrow enlarged text: a page can avoid horizontal overflow while still breaking navigation words into unreadable fragments.
