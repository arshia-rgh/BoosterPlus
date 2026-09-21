# Current route → design coverage

Generated from both current React Router manifests and the design screen inventory. A design subview does not imply a newly implemented route. New navigation proposals require later implementation approval.

| Existing route | Designed views |
| --- | --- |
| `/` | [P01](design/index.html#P01) |
| `/account` | [C01](design/index.html#C01) |
| `/account/preferences` | [C19](design/index.html#C19) |
| `/account/security` | [I04](design/index.html#I04), [I06](design/index.html#I06), [C17](design/index.html#C17), [I07](design/index.html#I07), [I08](design/index.html#I08) |
| `/account/settings` | [C22](design/index.html#C22) |
| `/accounts` | [P12](design/index.html#P12) |
| `/accounts/:id` | [P13](design/index.html#P13), [P14](design/index.html#P14) |
| `/admin` | [A01](design/index.html#A01), [A09](design/index.html#A09) |
| `/admin/accounts` | [A22](design/index.html#A22) |
| `/admin/accounts/:id` | [A23](design/index.html#A23) |
| `/admin/alerts` | [A33](design/index.html#A33) |
| `/admin/calendar` | [A07](design/index.html#A07) |
| `/admin/catalog` | [A10](design/index.html#A10), [A11](design/index.html#A11), [A12](design/index.html#A12), [A13](design/index.html#A13), [A14](design/index.html#A14), [A24](design/index.html#A24), [A25](design/index.html#A25) |
| `/admin/content` | [A34](design/index.html#A34) |
| `/admin/coupons` | [A27](design/index.html#A27) |
| `/admin/customers` | [A08](design/index.html#A08) |
| `/admin/finance` | [A15](design/index.html#A15), [A16](design/index.html#A16), [A17](design/index.html#A17), [A18](design/index.html#A18), [A19](design/index.html#A19) |
| `/admin/jobs` | [A31](design/index.html#A31) |
| `/admin/media` | [A32](design/index.html#A32) |
| `/admin/orders` | [A02](design/index.html#A02) |
| `/admin/orders/:id` | [A03](design/index.html#A03), [A04](design/index.html#A04), [A26](design/index.html#A26) |
| `/admin/privacy` | [A35](design/index.html#A35), [A36](design/index.html#A36) |
| `/admin/reports` | [A30](design/index.html#A30) |
| `/admin/reviews` | [A28](design/index.html#A28) |
| `/admin/reviews/:id` | [A29](design/index.html#A29) |
| `/admin/submissions` | [A20](design/index.html#A20) |
| `/admin/submissions/:id` | [A21](design/index.html#A21) |
| `/admin/support` | [A05](design/index.html#A05) |
| `/admin/support/:id` | [A06](design/index.html#A06), [A37](design/index.html#A37) |
| `/availability` | [C20](design/index.html#C20) |
| `/availability/unsubscribe` | [C21](design/index.html#C21) |
| `/booster` | [B01](design/index.html#B01) |
| `/booster/calendar` | [B04](design/index.html#B04) |
| `/booster/orders` | [B02](design/index.html#B02) |
| `/booster/orders/:id` | [B03](design/index.html#B03) |
| `/booster/support/:id` | [B05](design/index.html#B05) |
| `/favorites` | [C10](design/index.html#C10) |
| `/games` | [P02](design/index.html#P02) |
| `/games/:slug` | [G01](design/index.html#G01), [G02](design/index.html#G02), [G03](design/index.html#G03), [G04](design/index.html#G04), [G05](design/index.html#G05), [G06](design/index.html#G06) |
| `/games/:slug/packages/:pack` | [P07](design/index.html#P07), [P08](design/index.html#P08) |
| `/games/:slug/reviews` | [P15](design/index.html#P15) |
| `/games/:slug/services/:service` | [P04](design/index.html#P04), [P05](design/index.html#P05), [G07](design/index.html#G07), [G12](design/index.html#G12), [G08](design/index.html#G08), [G13](design/index.html#G13), [G09](design/index.html#G09), [G14](design/index.html#G14), [G10](design/index.html#G10), [G15](design/index.html#G15), [G11](design/index.html#G11), [G16](design/index.html#G16) |
| `/login` | [I01](design/index.html#I01), [I02](design/index.html#I02), [I03](design/index.html#I03), [I05](design/index.html#I05) |
| `/notifications` | [C14](design/index.html#C14) |
| `/orders` | [C02](design/index.html#C02) |
| `/orders/:id` | [P06](design/index.html#P06), [P09](design/index.html#P09), [P10](design/index.html#P10), [P11](design/index.html#P11), [C03](design/index.html#C03), [C04](design/index.html#C04), [C05](design/index.html#C05), [C06](design/index.html#C06), [C07](design/index.html#C07), [C08](design/index.html#C08), [C09](design/index.html#C09), [C23](design/index.html#C23) |
| `/privacy` | [C18](design/index.html#C18) |
| `/reviews` | [C15](design/index.html#C15) |
| `/reviews/:id` | [C16](design/index.html#C16) |
| `/sell` | [S01](design/index.html#S01) |
| `/sell/:id` | [S03](design/index.html#S03), [S04](design/index.html#S04), [S05](design/index.html#S05), [S06](design/index.html#S06) |
| `/sell/new` | [S02](design/index.html#S02) |
| `/support` | [C11](design/index.html#C11), [C13](design/index.html#C13) |
| `/support/:id` | [C12](design/index.html#C12), [S07](design/index.html#S07) |
| `/terms` | [P16](design/index.html#P16), [P17](design/index.html#P17) |

**Coverage:** 55 existing routes mapped; 113 design views; 30 journey specifications; 555 named state treatments.

## Deliberate subviews and proposed information architecture

- Checkout, cases, proof, sessions and secure handoff are existing order/submission subflows. Their design IDs allow review without inventing public route URLs.
- How it works is a proposed separate informational destination; P16 currently maps to the existing terms surface. Policy types are current content variants, not assumed new APIs.
- Future-game templates use `/games/:slug` and the existing configurable service path. WoW, League, VALORANT, Dota 2 and Wild Rift are not activated for launch by their designs.
- Admin form/rule/package/intake/preview/history designs map to current catalog subviews; finance views map to the existing finance workspace.
- Staff directory/recovery/audit and customer identity substeps remain scoped to the existing authentication/access model.
- X01 covers route-not-found and shared access/outage recovery outside the ordinary route list.

## Unimplemented and intentionally excluded

No wallet/top-up, escrow smart contract, wager/tournament/scrim platform, in-game currency shop, auto-matchmaking, public booster hiring marketplace, affiliate/cashback system, invented anti-cheat telemetry or automatic booster compensation. These suggestions in raw exports do not expand the product scope.

The structured inventory is comprehensive against current routes, not a guarantee that every data combination has a distinct visual screenshot. Shared templates, named states and interaction contracts define those combinations. Owner review and future implementation qualification remain separate.
