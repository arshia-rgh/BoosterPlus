# Terms reader readability — 6 October 2026

Owner requested that the public `/terms` page separate its numbered clauses and become easier to read. This is a presentation addition to the pending mobile update, not a policy rewrite or public deployment.

## Cause and fix

The public bootstrap agreement is a single flattened Terms of Service + Privacy Notice string. The existing `white-space: pre-wrap` reader cannot recover missing paragraph breaks. The version is `playora-2026-10-05-v1`.

`policy-layout.json` records UTF-16 whitespace offsets and the SHA-256 of those exact public bytes, derived from the existing approved document structure and verified against the current public text. The server restores only those spaces as line/paragraph breaks when the complete hash matches. Any other version/text remains unchanged. The source fixture is public policy text, not secret runtime configuration. No stored content, acceptance record, legal protection, version or effective date is modified. Approved draft documents remain unchanged.

The policy reader adds semantic numbered headings, paragraph spacing, lists, compact section links and a restrained reading surface. The three previously literal Markdown tables become labeled definition rows that fit narrow screens. Plain text remains escaped; malformed tables remain readable text. Historical-version notices, policy links and printing remain available. Future published copy should retain paragraph breaks; this exact legacy map must never be applied heuristically to another agreement.

## Review gate

Senior reviewer: `/root/terms_readability_review`. Scope: terms and shared policy presentation only.

- Round 1: screen review passed; **T01 / P2** found A4 print pages too close to paper edges.
- Fix: named policy print pages use 16 mm margins, preserving headings with following text.
- Round 2: regenerated pages 1–2 visually verified. **PASS — no remaining actionable findings in the reviewed terms/shared policy presentation scope.**

Reviewed phone 320/390, tablet 768 and desktop 1440 pixels, plus 320px at 200% text. Reviewer independently exercised keyboard contents expansion/anchor focus and the historical-version notice. Physical devices, screen-reader operation and physical printing remain unverified. The verdict is neither new legal approval nor deployment qualification.

## Qualification

- Unit regression covers exact whitespace-only preservation, unchanged unknown/historical text, configured bootstrap immutability, all 21 numbered clauses and their links, three fact tables, bullet content, escaped hostile markup, malformed-table fallback and historical navigation.
- Site component/loader tests, formatting, TypeScript, ESLint and both production builds passed locally. Nine server tests passed with loopback permissions; their first sandboxed attempt failed `listen EPERM` and was not an application failure or a pass.
- Chromium and WebKit passed ten combined viewport/text cases, no page overflow, all section anchors, main-content WCAG A/AA checks, print visibility and historical-version navigation. The initial browser harness lacked the explicit context required by Axe; corrected and rerun successfully.
- Private reproducible preview, browser script, public-text comparison, captures, print PDF and results are in `.cache/terms-review/`. Source-level tests and the immutable public-text fixture are tracked.
- The earlier mobile131 images precede this terms addition and do not qualify the new artifact. Current server artifact checks remain pending at this entry. The ordinary complete repository gate and the one-use scoped-check decision remain outstanding. No commit, push or production change is claimed.

## Completed candidate checks

Mobile132 passed current repository/secret/workflow checks, Go lint/standalone gosec/live vulnerability checks, frontend contracts/format/types/lint, all 137 committed frontend unit files / 454 tests with the existing coverage thresholds, dependency audit, both builds, nine server checks, both final image security scans and non-root/read-only container smoke. The image scans report no fixable HIGH/CRITICAL findings under the existing policy. Source, scan and image hashes are retained privately under `.cache/mobile132/` and `/srv/playora-qualification/mobile132/`. This is bounded candidate qualification, not a full backend/production gate or new complete browser run. The terms-specific Chromium/WebKit and senior review results above cover the changed presentation; prior complete mobile browser evidence remains scoped to its original source.

The first local unit harness used a JSDOM-transformed `import.meta.url` as a filesystem URL; corrected to the literal fixture path and all affected tests reran successfully. No failed harness run is counted as passed.

Commit/push remain pending the existing one-use scoped-check decision; normal tracked gates are unchanged. Production is unchanged. A local public-text-only preview is available at `http://127.0.0.1:5175/terms` while its preview process runs.
