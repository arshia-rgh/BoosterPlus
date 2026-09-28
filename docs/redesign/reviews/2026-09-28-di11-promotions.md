# DI11C3 — shop offers, availability and media review

28 September 2026. Scoped senior UI/UX reviewer: `di11_shop_design_review`. Changed shop product/editor, game offers editor/public projection, list availability and image fallback only. Earlier purchase/delivery review remains separately recorded.

Round 1 found three issues: promotion navigation needed a focused destination; the round trip lost the originating product-list filters; a product selected on another pagination page lost meaningful context. Fixed with the Offers section, bounded retained search state and independent release-backed selected-product read, including revision replacement and unavailable recovery.

Round 2 found narrow-screen native-select truncation hid important variant details. Added a wrapping selected-variant summary with region/platform/server, minimum quantity, unit price and exact featured total. Public offers continue to bind the exact released product/variant and minimum purchase quantity; they do not invent a discount.

Final review inspected editor at 1440/393/320, product at 768, empty lists at 393/320, public offers at 1440/320, and failed-media product at 320/768. Final browser journeys passed at 1440/768/393/320 (desktop 8.8s, mobile 8.3s). Covered off-page selection, preview/publication, retained query return, exact deep link, failed-image fallback, axe and overflow. Availability wording matches current published-game/service, current released variant and minimum-stock eligibility.

**Explicit reviewer verdict: PASS — no remaining actionable scoped findings.** All C3-01 through C3-04 findings resolved. Evidence: `.cache/qualification/di11-promotion-browser-final.log` and `frontend/.cache/di11-offers-*.png`.

Limits: isolated fixtures, code inspection and emulated browser renders; no physical-device, actual screen-reader operation, real funds, whole-site qualification or owner/launch acceptance claimed.
