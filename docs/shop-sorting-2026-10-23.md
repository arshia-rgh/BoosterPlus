# SHOP181 — shop sorting and public browsing delivered

Signed `4b9296df4ac06502236dc88cfc9b1e3221882fca` is deployed and verified on 23 October 2026 at unchanged schema50. The owner approved exactly “Deploy 4b9296d shop browsing update without an off-host backup”; that one-release recovery exception is consumed.

## Customer behavior

- Default shop ordering: all recognizable diamond packs first, Global diamonds before regional diamonds, regional names alphabetically, and ascending quantity within each region. Passes follow all diamonds; other products follow passes. Region filtering preserves quantity ordering.
- Four choices: Diamonds: low to high / high to low and Price: low to high / high to low. Explicit price sorting takes precedence over region/type and uses the published minimum enabled purchase displayed on the card. Currencies stay separate, USD first; no invented conversion.
- Counts come only from explicit diamond quantities in released titles. `50 + 5 Diamonds` means55; `1000 Diamonds (500 + 500)` stays1000. Pass durations/included diamonds do not turn passes into diamond packs. Unknown products remain after known groups.
- Readable full authored titles, one price block, concise delivery/region metadata and exceptional availability replace repetitive card descriptions. Full descriptions and eligibility remain on the detail page before purchase. A short View details action retains the full accessible product name. Manual delivery ranges are preserved.
- Search stays visible. Shops, global/per-game accounts, news and boosting use modal filters. Edits apply together on Apply; Cancel, Close and Escape discard edits; Reset edits only the draft. Applied criteria are removable chips, with Clear all and deliberate focus return. Removing account currency also clears dependent price criteria. Game-directory search has a removable chip; private operational queues are outside this public-discovery scope.
- Filter/sort state lives in the URL, survives detail/back navigation, preserves game/service context and resets pagination when changed. Narrow phone dialogs scroll fields between fixed header/actions, including320×480 coverage.
- Product artwork reserves its frame and hides unfinished image paint without removing accessible alt. Cached, lazy, failed and source-change states are covered. Responsive source elements and the image remain siblings inside their picture; actual320px thumb/768px card selection passed. Decorative hero positioning is preserved.

## Ordering implementation and boundaries

Ordering applies before pagination across all matching published releases. Bounded200-row batches and51 ordered keys avoid retaining every public product. Filter-bound cursors use deterministic ID ties; legacy UUID cursors resolve their current public position. Cursors are reading positions, not reservations.

There is no migration, catalog publication, price/policy change, purchase activation, identity or payout change. Checkout remains enabled; supplier purchases, outgoing transfers and customer deletion remain disabled; Vendoria remains absent. Private webmail and stable99f60bd runtime tooling/configuration are preserved.

Concurrent DISCOUNT179 code is excluded. Its eventual integration must reconcile price sorting with its effective-price projection; this production release has no discount projection. All unrelated source/index changes and prototype/cameo files were preserved.

## Qualification and review

- Server-only focused Go formatting, unit/race, integration compilation, golangci/standalone gosec, dependency/security/build checks and the normal backend/repository hook passed for original sorting commit6d6e5b5.
- Four isolated TiDB scenarios passed, including219 products across batches/pages, immutable releases, filter/pagination ordering, publication isolation and Nexus checkout visibility. Temporary database/container data was removed. These unchanged backend checks were retained for the frontend expansion.
- Final scoped frontend formatting, types, lint,22 component cases and11 distinct browser scenarios passed. The normal frontend/repository hook passed216 component files /1,024 cases,14 server checks and repository checks.
- Independent senior designer source/rendered rounds passed after D01–D07 corrections. Desktop1440, tablet768, phones390/320, short320×480 dialogs, empty/error states, focus, chips, long titles and artwork were reviewed. See [design review](redesign/reviews/SHOP181_DESIGN.md). This is fixture evidence, not a native-device certification.
- Exact CI39950597285, image build/scans39952074777, manifest/SBOM signature verification and server preflight passed.
- Post-deployment: eight application/mail services healthy; schema50 and protected runtime/policy settings verified;12 live GET/HEAD-only Chromium cases passed (four shop widths, filter/detail return, chips, account/news/boost dialogs, three portal sign-in pages). Nine public GETs verified all216 products across pagination, Global/region/quantity/pass priority, Indonesia ascending/descending and both price sorts. Supplier purchasing remains disabled.

No full gate or local tests ran. No live order, publication, customer message, provider invoice or funds test occurred. Production checks used only public reads and the existing temporary storage health probe.

## Preserved failed evidence

Initial frontend lint found two void-callback shorthand expressions and a fixture non-null assertion. Database attempt1 stopped at the environment guard for unapproved port14002 before business assertions; attempt2 used the approved disposable14001 and passed. UI3 found import/lint, premature-query, ambiguous-label and empty-price-parameter issues. UI4's final case used an obsolete action label; UI5 then passed9 cases. Senior review required toolbar alignment and short-dialog footer fixes; UI6 passed10 cases. UI7's test-only responsive fixture was inserted into the wrong endpoint; UI8 corrected it and passed. None of these failures was waived.

The final public API verification initially assumed an envelope containing `data`; this endpoint correctly returns `items`/`next` directly. Only the verification helper changed, and the successful second run is retained separately. The release helper also retried a transient GitHub TLS-handshake timeout before authenticated signing; workflow results were successful.

While compiling, free disk approached/breached the existing20% storage floor. Only24 inactive generated Go binaries (1.39GiB) and later inactive generated compiler cache (2.65GiB) were removed. Source, logs, runtime data, accepted images and thresholds remain intact. Pre-pull capacity was about31GB free of145GB; future large pulls still require capacity checks.

## Recovery and evidence

Current manifest: `/srv/playora/releases/4b9296d/deployment.env`. Previous signed817812b is retained at the same schema, but application rollback and off-host server/data recovery are not qualified; a forward fix may be required. No reusable recovery exception is granted.

Private receipts: `/srv/playora-qualification/shop181/` and `.cache/shop181/`, including original failures, both hook proofs, exact source binding, CI/build evidence, signatures, preflight, literal owner approval, activation, live browser results and `public-sorting-verification2.json`.
