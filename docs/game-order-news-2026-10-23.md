# GAMES185 — available games first and all service labels

The owner requested active games first in the public game lists and the missing MLBB News label. The shared card list previously preserved the API alphabetical order and explicitly excluded News when deriving visible services and whether a game was usable.

The shared card component now stably groups available games first, without mutating loader data, and uses all four services for availability and labels. Any active service (including News alone) makes a non-paused game available. Explicit off services remain hidden; global pauses and all-off/all-paused games remain noninteractive. Order within groups, artwork, links, headings and intent are preserved on both homepage and Games directory. No catalog publication, financial behavior, backend, dependency, schema or runtime changes.

Regression coverage includes stable ordering/immutable input, all four labels, news-only availability, global/service pause, explicit-off services, legacy fallback and changed availability. The responsive fixture places MLBB last in source order with all four active services, then asserts it renders first with all labels and no overflow at 390/1280px. Senior scoped rendered review and server focused checks, normal frontend/repository hook, signed release and preflight are required. No full gate or local tests. Activation needs a fresh exact recovery decision; prior 5b994c1 approval is consumed.

Concurrent DISCOUNT179/migration51/prototype/cameo work remains excluded. Evidence `.cache/games185/` and `/srv/playora-qualification/games185/`.

Scope boundary: grouping applies to the loaded list. All six current published games fit the existing 50-item API listing. Global availability ordering across future API pages is outside this UI hotfix; the backend slug cursor is unchanged.

Focused server qualification: formatting, strict types, scoped lint, 18 component cases across three files and two responsive Chromium/accessibility scenarios passed. First setup attempt failed before checks because the shared Git object chain exceeded Git’s nesting limit; the new isolated checkout’s references were flattened and checks then ran successfully. Original setup failure is retained.

Independent senior designer `/root/shop181_design` rendered round1 PASS: at 390/1280px MLBB is first, all four badges are readable, inactive cards retain their appearance/state, with no clipping or overlap. No remaining scoped findings.
