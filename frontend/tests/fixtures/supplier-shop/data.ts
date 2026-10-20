import {
  emptyDefinition,
  type PublicProduct,
  type ShopDelivery,
} from "../../../app/shop/model";
import { fixtureSession } from "../seller-offer/data";

export const customerSession = {
  ...fixtureSession,
  portal: "customer",
  user: {
    ...fixtureSession.user,
    id: "synthetic-customer",
    portal: "customer",
    role: "customer",
  },
  capabilities: ["account"],
};
export function supplierProduct(
  method: "id" | "account" | "code" = "id",
): PublicProduct {
  return {
    id: "synthetic-product",
    game_id: "synthetic-game",
    game_slug: "example",
    release_id: "synthetic-release",
    version: 1,
    supplier_available: true,
    available: {},
    definition: {
      ...emptyDefinition(),
      title:
        "Example game · Regional upgrade with a long reviewed product name",
      description: "Synthetic product for isolated checkout review.",
      category: "Upgrades",
      reviewed: true,
      variants: [
        {
          key: "supplier",
          label: "Regional upgrade",
          region: "Türkiye",
          platform: "Mobile",
          server: "Europe",
          currency: "USD",
          unit_amount_minor: "575",
          min_quantity: 1,
          max_quantity: 10,
          enabled: true,
        },
      ],
      policy: {
        ...emptyDefinition().policy,
        delivery_min_hours: method === "account" ? 24 : 0,
        delivery_max_hours: method === "account" ? 72 : 1,
        delivery_terms:
          "Delivery starts after verified payment and any required account verification.",
        cancellation_terms:
          "Contact support to review cancellation eligibility.",
        refund_terms: "Any approved refund is recorded separately.",
        fees: "The displayed total includes fees.",
      },
      supplier: {
        method,
        testing: true,
        quantity: { kind: "multiple", min: "0.5", max: "10", step: "0.5" },
        eligibility: {
          global: false,
          regions: ["Türkiye"],
          countries: ["TR"],
          excluded_countries: ["US"],
          policy_kind: "allow",
          policy_countries: ["TR"],
        },
        fields:
          method === "code"
            ? []
            : [
                {
                  id: "player_id",
                  label: "Player ID",
                  kind: "text",
                  required: true,
                  secret: false,
                  transient: false,
                  options: [],
                },
                {
                  id: "server",
                  label: "Server",
                  kind: "select",
                  required: true,
                  secret: false,
                  transient: false,
                  options: [
                    { id: "eu", label: "Europe" },
                    { id: "asia", label: "Asia" },
                  ],
                },
                ...(method === "account"
                  ? [
                      {
                        id: "password",
                        label: "Game password",
                        kind: "text",
                        required: true,
                        secret: true,
                        transient: false,
                        options: [],
                      },
                    ]
                  : []),
              ],
      },
    },
  };
}
export function supplierDelivery(
  state = "completed",
  method: "id" | "account" | "code" = "code",
): ShopDelivery {
  const product = supplierProduct(method);
  const variant = product.definition.variants[0];
  if (!variant) throw new Error("Missing synthetic variant");
  return {
    order_id: "synthetic-order",
    order_state: state === "completed" ? "completed" : "in_progress",
    order_version: 1,
    version: 1,
    state,
    note: "",
    proof_message_id: "",
    updated_at: "2026-10-20T10:00:00Z",
    recipient_provided: true,
    supplier: {
      state,
      needs_review: state === "held",
      codes_available: state === "completed" && method === "code",
      testing: true,
      ...(state === "partial" ? { requested: "1.5", delivered: "0.5" } : {}),
    },
    purchase: {
      product_id: product.id,
      release_id: product.release_id,
      product: product.definition,
      variant,
      quantity: 1,
      supplier_quantity: "1.5",
      amount_minor: "1725",
    },
  };
}
