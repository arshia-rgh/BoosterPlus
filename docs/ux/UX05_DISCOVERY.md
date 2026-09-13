# UX05 — Discovery and multi-game motion

The green theme, existing ascension background, fonts and rank-transformation controls are preserved. The homepage adds Iori Yagami (Chou/MLBB), Illidan (WoW) and Ahri (LoL) with manual game selection. Motion uses native scrolling and separate breathing/garment/wing/tail layers, pauses outside the viewport and in hidden documents, and supports the existing System/Reduced preference. Failed art leaves navigation usable. No carousel auto-advances and no game service is implied by decorative art.

Published forms remain generic: rank goals, fulfillment mode, estimate preferences, then private order details. The estimate is provisional; fixed scope/price and custom quotation stay distinct. A bounded 15-minute sessionStorage draft allows anonymous configuration to continue after same-tab email/Google sign-in. It contains only validated published choice fields, never free text, private instructions, credentials, coupons or consent. It is scoped to the exact catalog release/service/pack/variant and clears after successful submission and logout. Revalidation and unchecked terms after sign-in prevent stale agreement acceptance.

## Verification

Run the tracked frontend/repository gate for this UI-only stage. `configuration-draft.test.tsx` tests privacy, expiry, tampering, version binding and unavailable storage. `return-path.test.tsx` covers safe local returns with a bounded public variant. Order browser journeys exercise same-tab sign-in, restored mode and excluded private text/consent. Character browser checks compare articulated transforms, cycle all three games, test reduced/offscreen states, abort image loading, run axe and retain homepage transfer/CLS budgets. Screenshots are under ignored `frontend/.cache/character-*` and `home-*`.

The black-background PNGs are not alpha masters. Runtime SVG masks perform the silhouette and independent-part composition. Motion is subtle 2D articulation; physical-device performance, cross-browser checks, extended scroll recordings and social crop exports are tracked for UX10. No live provider action is part of qualification.
