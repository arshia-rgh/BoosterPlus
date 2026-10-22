import { useState } from "react";
import PolicyRoutes from "../../../app/payments/policy-routes";
import { paymentRoutes } from "../../../app/payments/routes";
import type { Policy } from "../../../app/payments/model";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import Checkout from "../../../app/payments/checkout";
import { detailSchema } from "../../../app/orders/model";
import { emptyConfiguration } from "../../../app/catalog/model";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";
const release = {
  id: "release",
  game_id: "game",
  slug: "mobile-legends",
  version: 1,
  paused: false,
  created_at: "2026-10-22T00:00:00Z",
  configuration: emptyConfiguration("Mobile Legends"),
};
const answers = {};
const checkoutDetail = detailSchema.parse({
  order: {
    id: "fixture-checkout",
    version: 1,
    kind: new URLSearchParams(location.search).get("kind") ?? "custom",
    state: "awaiting_payment",
    slug: "mobile-legends",
    service: "rank_boost",
    package: "",
    variant: "",
    game_name: "Mobile Legends",
    created_at: "2026-10-14T00:00:00Z",
    updated_at: "2026-10-14T00:00:00Z",
  },
  offer: release,
  answers,
  estimate: {
    release_id: "ui149",
    version: 1,
    evaluator: "manual-review-v1",
    expires_at: "2099-01-01T00:00:00Z",
    outcome: "manual_review",
    currency: "",
    amount_minor: "0",
    answers,
    lines: [],
    issues: [],
  },
  coupon_code: "",
  contract: {
    id: "contract",
    payment_state: "unpaid",
    data: {
      quote_id: "quote",
      revision: 1,
      currency: "USD",
      subtotal_minor: "5000",
      amount_minor: "5000",
      lines: [],
      scope: "Synthetic boost",
      reason: "Reviewed",
      delivery_min_hours: 1,
      delivery_max_hours: 24,
      expires_at: "2099-01-01T00:00:00Z",
      terms_version: "fixture",
    },
  },
});

function PolicyFixture() {
  const [routes, change] = useState<Policy["routes"]>([
    ...paymentRoutes.filter((route) => route.code !== "usdtbsc"),
    { code: "usdtbsc", network: "eth", label: "Old USDT" },
    { code: "legacy", network: "old", label: "Saved legacy route" },
  ]);
  return (
    <>
      <h2>Payment policy</h2>
      <PolicyRoutes routes={routes} change={change} />
    </>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <BrowserRouter>
    <main
      className="customer-workspace"
      style={{ maxWidth: "52rem", margin: "2rem auto", padding: "1rem" }}
    >
      <h1>Complete your payment</h1>
      {new URLSearchParams(location.search).has("policy") ? (
        <PolicyFixture />
      ) : (
        <Checkout
          detail={checkoutDetail}
          admin={new URLSearchParams(location.search).has("admin")}
          changed={() => {}}
        />
      )}
    </main>
  </BrowserRouter>,
);
