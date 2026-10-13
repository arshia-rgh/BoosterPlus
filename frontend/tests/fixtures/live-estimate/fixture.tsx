import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Link,
} from "react-router";
import { configurationSchema, type Release } from "../../../app/catalog/model";
import { GameShell } from "../../../app/catalog/game-shell";
import {
  ServicePage,
  GamePage,
  PackagePage,
} from "../../../app/catalog/public";
import Checkout from "../../../app/payments/checkout";
import { detailSchema } from "../../../app/orders/model";
import AdminOrderWorkspace from "../../../app/orders/admin-workspace";
import prepared from "../mlbb-catalog/configuration.json";
import { saveConfigurationDraft } from "../../../app/catalog/configuration-draft";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";
import "../../../app/experience/experience.css";
import "../../../app/catalog/service-tiles.css";
const configuration = configurationSchema.parse(prepared.configuration);
configuration.discovery = {
  ...configuration.discovery,
  capabilities: (["boost", "accounts", "shop", "news"] as const).map(
    (service) => ({
      service,
      state: "active",
      description: "Isolated fixture",
      reason: "",
    }),
  ),
};
const release: Release = {
  id: "ui149",
  game_id: "synthetic-game",
  slug: "mobile-legends",
  version: 1,
  paused: false,
  created_at: "2026-10-14T00:00:00Z",
  configuration,
};
const service = configuration.services[0];
const sample = service?.pricing?.cases[0];
if (!service || !sample) throw new Error("Missing synthetic service example");
const answers = sample.answers;
saveConfigurationDraft(release.id, service, configuration, "", "", answers);
const checkoutDetail = detailSchema.parse({
  order: {
    id: "fixture-checkout",
    version: 1,
    kind: "custom",
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
function CheckoutPreview() {
  return (
    <main className="catalog-page">
      <h1>Isolated payment preview</h1>
      <Checkout detail={checkoutDetail} admin={false} changed={() => {}} />
    </main>
  );
}
function Frame() {
  return (
    <div
      className="experience"
      onClickCapture={(event) => {
        if (
          (event.target as HTMLElement).closest(
            'a[href^="https://nowpayments.io/"]',
          )
        )
          event.preventDefault();
      }}
    >
      <header style={{ padding: "1rem", background: "#102719" }}>
        Isolated UI preview · synthetic prices · no real orders or payments.{" "}
        <Link to="/games/mobile-legends?service=boost">Boosting</Link>
        {" · "}
        <Link to="/games/mobile-legends/services/rank_boost">Custom</Link>
        {" · "}
        <Link to="/admin/orders/fixture-order">Admin estimate</Link>
      </header>
      <Outlet />
      <footer style={{ padding: "3rem" }}>PLAYORA · isolated review</footer>
    </div>
  );
}
const router = createBrowserRouter([
  {
    Component: Frame,
    children: [
      {
        path: "/games/:slug",
        element: (
          <GameShell release={release}>
            <Outlet />
          </GameShell>
        ),
        children: [
          { index: true, loader: () => release, Component: GamePage },
          {
            path: "services/:service",
            loader: () => release,
            Component: ServicePage,
          },
          {
            path: "packages/:pack",
            loader: () => release,
            Component: PackagePage,
          },
        ],
      },
      { path: "/admin/orders/:id", Component: AdminOrderWorkspace },
      { path: "/review/checkout", Component: CheckoutPreview },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing preview root");
createRoot(root).render(<RouterProvider router={router} />);
