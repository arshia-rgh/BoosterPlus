# DI12 — editorial and featured reading review

28 September 2026. Scoped senior reviewer: `di11_shop_design_review`. Scope NW01–NW06, editorial featured selection/projection and changed shared behavior.

Round 1 found ten actionable issues: conflict recovery, hidden leave protection, unlinked errors, missing game identity, inappropriate unavailable-page recovery, related-reading failure breaking the article, unfinished service activation, preview readiness not bound to revision, missing scheduled-job visibility and table typing/focus. Each was corrected and re-reviewed.

Round 2 found five remaining issues: field errors disappeared on switching to Write; actual narrow screenshots exceeded the viewport; table columns were too compressed; duplicated service navigation and record spacing; revised promotion selection lacked a reading link. Lifted error state, contained grid widths, local keyboard-scrollable tables, corrected navigation/spacing and an announced new-tab reading link resolved these. The final sweep removed the remaining duplicate link from the error state and matched the sign-in return allowlist to the actual `editor` section ID.

Final rendered review included editor, saved preview, publication, index, long article, failed image, unavailable article, featured picker, public featured reading and revised selection. Representative widths: 1440/768/393/320. Browser5 passes desktop 15.2s/mobile 18.3s, including axe, document/body overflow and actual PNG width checks. Evidence: `.cache/qualification/di12-news-browser5.log`, `frontend/.cache/di12-news-*.png`.

**Explicit final reviewer verdict: PASS — no remaining actionable scoped findings.** All N1/N2 corrections and exact portal return behavior were independently inspected. This verdict does not replace the code/security gate.

Limits: source inspection plus isolated real-API fixture/emulated-browser renders. No physical-device, actual screen-reader, real editorial approval, whole-site acceptance or launch qualification claimed. Integrated review remains DI15.
