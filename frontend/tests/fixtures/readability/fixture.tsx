// Synthetic rendered review. API calls stay in this fixture, never a live service.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { GameShell } from "../../../app/catalog/game-shell";
import {
  GamePage,
  PackagePage,
  ServicePage,
} from "../../../app/catalog/public";
import { configurationSchema, type Release } from "../../../app/catalog/model";
import { capabilitiesFor } from "../../../app/catalog/public-discovery";
import { z } from "../../../app/validation";
import { AccountProduct } from "../../../app/resale/market";
import { publicListingSchema } from "../../../app/resale/model";
import { DirectoryFilters } from "../../../app/admin/directory-filters";
import NewSupport from "../../../app/support/new";
import Privacy from "../../../app/privacy/pages";
import PurchaseReview from "../../../app/reviews/form";
import { ChatFormCard } from "../../../app/support/forms/card";
import AccountAlerts from "../../../app/availability/accounts";
import { customerSession } from "../supplier-shop/data";
import catalog from "../mlbb-catalog/configuration167.json";
import account from "./account.json";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/ui/workspace.css";
import "../../../app/experience/experience.css";
import "../../../app/catalog/public-discovery.css";

const listing = publicListingSchema.parse(account);
listing.images = [];
const release: Release = {
  id: "synthetic-readability",
  game_id: "synthetic-game",
  slug: "mobile-legends",
  version: 1,
  paused: false,
  created_at: "2026-10-21T00:00:00Z",
  configuration: configurationSchema.parse(catalog.configuration),
};
release.configuration.asset = "/catalog-assets/game-mlbb-1536.jpg";
release.configuration.asset_alt = "Mobile Legends game artwork";
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.href,
  );
  if (!url.pathname.startsWith("/api/v1/")) return originalFetch(input, init);
  const send = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  if (url.pathname.endsWith("/validate")) {
    const body = z
      .object({
        package: z.string().optional(),
        answers: z.record(z.string(), z.unknown()),
      })
      .parse(JSON.parse(typeof init?.body === "string" ? init.body : "{}"));
    const pack = release.configuration.packages.find(
      (p) => p.key === body.package,
    );
    const issues = (pack?.variants[0]?.required_fields ?? [])
      .filter(
        (key) =>
          !Object.entries(body.answers).some(
            ([name, value]) => name === key && value,
          ),
      )
      .map((key) => ({ path: key, message: "This field is required." }));
    return send({ answers: body.answers, issues });
  }
  if (init?.method && init.method !== "GET")
    return send({ code: "fixture_read_only" }, 422);
  if (url.pathname.endsWith("/session")) return send(customerSession);
  if (url.pathname.endsWith("/forms/synthetic-form"))
    return send({
      id: "synthetic-form",
      version: 1,
      title: "Access request",
      description: "",
      mode: "request",
      purpose: "information",
      recipient: "Customer",
      audience: "Customer and staff",
      state: "open",
      fields: [
        {
          key: "notes",
          label: "Access notes",
          kind: "multiline",
          secure: true,
          required: true,
        },
      ],
      answers: {},
      has_secure: true,
      can_respond: true,
      can_reveal: false,
      can_cancel: false,
      expires_at: "2099-01-01T00:00:00Z",
      answered_at: null,
    });
  if (url.pathname.endsWith("/discovery"))
    return send({
      game_id: release.game_id,
      release_id: release.id,
      capabilities: capabilitiesFor(release),
      metrics: [],
      promotions: [],
    });
  if (url.pathname === "/api/v1/accounts/" + listing.id) return send(listing);
  if (url.pathname.endsWith("/privacy/requests"))
    return send({ requests: [], next: "" });
  if (url.pathname.endsWith("/site/retention"))
    return send({
      release_id: "fixture-retention",
      kind: "retention",
      version: 1,
      updated_at: release.created_at,
      label: "Synthetic retention policy",
      data: {
        enabled: false,
        preserve_evidence: true,
        policy_text: "Synthetic retention terms for visual review.",
        backup_policy: "Synthetic backup terms.",
        financial_days: 365,
        dispute_days: 365,
        audit_days: 365,
        support_days: 90,
        grace_days: 30,
      },
    });
  if (url.pathname.endsWith("/review"))
    return send({
      order_id: "synthetic-order",
      eligible: true,
      review: null,
      policy: {
        release_id: "synthetic-review",
        policy: {
          content: "Synthetic publication policy for visual review.",
          fields: [],
          rules: [],
        },
        references: [],
      },
    });
  if (url.pathname === "/api/v1/games") return send({ games: [], next: "" });
  if (url.pathname.endsWith("/favorites")) return send({ items: [], next: "" });
  return send({ code: "fixture_unavailable" }, 404);
};
function Forms() {
  return (
    <main id="main" className="page identity-page">
      <h1>Form review</h1>
      <section className="catalog-section">
        <h2>Staff directory filters</h2>
        <DirectoryFilters
          query=""
          states={["active", "suppressed"]}
          apply={() => {}}
        />
      </section>
      <NewSupport />
      <section className="catalog-section">
        <h2>Protected response</h2>
        <ChatFormCard
          base="/conversations/synthetic-chat"
          id="synthetic-form"
          revision={1}
          changed={() => {}}
        />
      </section>
      <PurchaseReview orderID="synthetic-order" completed />
      <AccountAlerts slug="mobile-legends" />
      <Privacy />
    </main>
  );
}
const router = createBrowserRouter([
  {
    element: (
      <div className="experience browse-experience">
        <Outlet />
      </div>
    ),
    children: [
      { path: "/forms", element: <Forms /> },
      {
        path: "/games/:slug",
        loader: () => release,
        element: (
          <GameShell release={release}>
            <Outlet />
          </GameShell>
        ),
        children: [
          { index: true, loader: () => release, element: <GamePage /> },
          {
            path: "packages/:pack",
            loader: () => release,
            element: <PackagePage />,
          },
          {
            path: "services/:service",
            loader: () => release,
            element: <ServicePage />,
          },
          {
            path: "accounts/:id",
            element: <AccountProduct gameSlug="mobile-legends" />,
          },
        ],
      },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
