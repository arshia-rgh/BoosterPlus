import PaymentPolicyEditor from "../../../app/payments/policy-editor";
import { paymentRoutes } from "../../../app/payments/routes";
import { emptyRemedies, remedyLabels } from "../../../app/payments/model";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
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
  const routes = paymentRoutes.filter(
    (route) => route.code === "usdtbsc" || route.code === "usdttrc20",
  );
  return (
    <PaymentPolicyEditor
      done={() => {}}
      settings={{
        version: 4,
        configured: true,
        enabled: true,
        outgoing_enabled: false,
        published: null,
        draft: {
          label: "Payment agreement",
          text: "Orders are priced in USD and paid through our secure hosted checkout. Choose an available coin and network on that payment page. Payment is complete only after verified confirmation.",
          routes,
          currencies: ["USD"],
          fee_mode: "merchant",
          rate_mode: "fixed",
          window_minutes: 30,
          remedies: {
            ...emptyRemedies,
            ...Object.fromEntries(
              remedyLabels.map(([key]) => [
                key,
                "Reviewed synthetic remedy terms. Accepted order protections remain unchanged.",
              ]),
            ),
            dispute_hours: 8760,
            appeal_hours: 720,
            max_appeals: 3,
          },
        },
      }}
    />
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
const fixture = (
  <>
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
  </>
);
createRoot(root).render(
  <RouterProvider
    router={createBrowserRouter([{ path: "*", element: fixture }])}
  />,
);
