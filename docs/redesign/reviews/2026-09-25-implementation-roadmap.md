# Accepted design implementation roadmap — scoped planning review

25 September 2026 · Base: `29238851367d949070bfc9a900cc0e3b0e6d255b`

## Scope

The owner accepted the current design as complete for now and requested a complete implementation roadmap before coding. Review covers [the new roadmap](../IMPLEMENTATION_ROADMAP.md), its screen/journey mapping, runtime reuse/new-feature claims, dependencies, decisions and status/handoff links in repository and design READMEs, AGENTS, IMPLEMENTATION_PHASES and final-launch. Confirmed additions: initial shop fulfillment by staff after verified payment; staff-managed news/patches/guides only.

Reviewer: `/root/roadmap_design_gate`, assigned the senior UI/UX designer and implementation-coverage review role. The primary agent authored/fixed the plan; the reviewer independently inspected it against the atlas JSON and relevant runtime routes, identity/schema and domain source.

No atlas markup, styles, assets, interactive behavior or application code changed. This was document/source review; rendered-browser review was not applicable to this change and is not claimed. Future visual/addendum/application changes still require the rendered design review gate.

## Round 1 — FAIL

**RG01 · medium · phase map / DI05 / DI08 / Appendix B.** The initial wording called the listed delivery phase the integrated journey acceptance owner, even when a journey depended on later designed screens. For example F01 includes C04/C06/C05/C16 and fulfillment/review completion, which cannot be certified at DI05. F04 needs later finance recovery; F12/F13 need admin; other financial paths use later reauthentication/job views. This could permit premature completion claims or create a sequencing deadlock.

Required correction: distinguish phase-local feature tests against existing working counterparts from complete acceptance of the newly designed cross-phase journey. Assign integrated acceptance only after dependencies are implemented, retaining independent final qualification.

## Round 2 — PASS

Primary-agent correction:

- Defined phase exits as owned screens/contracts and relevant journey segments, not delivery of later redesigned dependencies.
- Made DI05 and DI08 segment checks explicit.
- Assigned full F01–F31 and approved new-feature journey acceptance, including exception branches/done guards, to DI14.
- Relabeled Appendix B as primary implementation ownership and retained DI15 independent whole-system requalification.
- Clarified current versus historical execution links and held-launch status.

Reviewer verified RG01 resolved and returned **PASS — no remaining actionable findings in this documentation scope**. Reviewer independently confirmed exact-once mapping of all 115 accepted view IDs and 31 journey IDs and accurate two-build/booster reuse, shared-auth gaps, current role model, missing shop order kind and missing article domain. Separate portal sessions, manual delivery, staff-only publishing, business-rule constraints and held R10/R11 remain explicit.

The final document lives alongside the accepted design package as `docs/redesign/IMPLEMENTATION_ROADMAP.md`; relative links were updated and checked. The implementation scope is unchanged by its location.

## Verification and limits

- Exact-once screen/flow mapping checked against the current JSON inventories; all relative Markdown file targets in changed planning documents resolve.
- Repository gate includes commit-scope tests, policy/secret scan, backend/frontend contract comparison, workflow lint and diff checks. Results are summarized in [progress](../../progress.md).
- No application tests, browser/render tests, provider requests, migrations, funds movement, deployment, device qualification or new commercial terms were performed or approved by this documentation review.
- All DI00–DI15 phases remain planned. New shop/news downstream addenda are required before dependent implementation. R10/R11 stay held. Owner design acceptance does not equate to runtime or launch qualification.
