import type {
  Connection,
  Library,
  Product,
} from "../../../app/suppliers/model";
export const importID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const gameID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export function supplierConnection(id = "nexus-sandbox"): Connection {
  return {
    id,
    testing: !id.endsWith("production"),
    configured: id === "nexus-sandbox" || id === "vendoria-test",
    version: 1,
    markup_bps: 1500,
    current_import: importID,
    active_import: "",
    purchases_enabled: false,
  };
}
export function supplierProduct(): Product {
  return {
    id: "mlbb:global:diamonds",
    name: "Mobile Legends · 86 Diamonds",
    game_id: "mlbb",
    category_id: "mlbb:global",
    description: "Synthetic supplier description.",
    kind: "topup",
    platform: "mobile",
    region: {
      global: true,
      regions: ["Global"],
      countries: [],
      excluded_countries: [],
      policy_kind: "deny",
      policy_countries: [],
    },
    review_issues: [],
    offers: [
      {
        id: "default",
        name: "Player ID",
        available: true,
        suggested_delivery: "id",
        fields: [
          {
            id: "player_id",
            label: "Player ID",
            kind: "text",
            required: true,
            secret: false,
            transient: false,
          },
        ],
        quantity: { kind: "one", min: "1", max: "1", step: "1" },
        pricing: {
          version: 0,
          markup_bps: null,
          effective_markup_bps: 1500,
          override_minor: "",
          cost_usd: "10",
          preview_quantity: "1",
          preview_amount_minor: "1150",
          game_id: "",
          region: "",
          delivery_method: "",
          shop_product_id: "",
          issues: [
            "game_mapping_required",
            "region_review_required",
            "delivery_review_required",
          ],
        },
        instruction: "",
        code_request: false,
        google_prompt: false,
        game_exit: false,
      },
    ],
  };
}
export function supplierLibrary(id = "nexus-sandbox"): Library {
  const first = supplierProduct(),
    second = supplierProduct();
  second.id = "mlbb:turkey:pass";
  second.name = "Mobile Legends · Türkiye account · Weekly Diamond Pass";
  second.category_id = "mlbb:turkey";
  const offer = second.offers[0];
  if (!offer) throw new Error("Missing synthetic offer");
  offer.name = "Account sign-in";
  offer.suggested_delivery = "account";
  offer.pricing.cost_usd = "7.25";
  offer.pricing.preview_amount_minor = "834";
  offer.google_prompt = true;
  offer.fields.push({
    id: "password",
    label: "Account password",
    kind: "text",
    required: true,
    secret: true,
    transient: false,
  });
  second.region = {
    global: false,
    regions: ["Türkiye"],
    countries: ["TR"],
    excluded_countries: [],
    policy_kind: "allow",
    policy_countries: ["TR"],
  };
  return {
    connection: supplierConnection(id),
    import: {
      id: importID,
      connection: id,
      state: "complete",
      product_count: 2,
      offer_count: 2,
      issue: "",
      updated_at: "2026-10-19T10:00:00Z",
    },
    games: [{ id: "mlbb", name: "Mobile Legends", closed: false }],
    categories: [
      { id: "mlbb:global", game_id: "mlbb", name: "Global" },
      { id: "mlbb:turkey", game_id: "mlbb", name: "Türkiye" },
    ],
    items: [first, second],
    next: "",
  };
}
