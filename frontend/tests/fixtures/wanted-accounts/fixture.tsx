// Synthetic rendered review. API calls stay in this fixture, never a live service.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { GameShell } from "../../../app/catalog/game-shell";
import { GameAccounts } from "../../../app/catalog/game-accounts";
import { configurationSchema, type Release } from "../../../app/catalog/model";
import { capabilitiesFor } from "../../../app/catalog/public-discovery";
import { publicListingSchema } from "../../../app/resale/model";
import { customerSession } from "../supplier-shop/data";
import catalog from "../mlbb-catalog/configuration167.json";
import account from "../readability/account.json";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/ui/workspace.css";
import "../../../app/experience/experience.css";
import "../../../app/catalog/public-discovery.css";

const base = publicListingSchema.parse(account);
base.images = [];
const listings = [0, 1, 2].map((index) => ({
  ...base,
  id: `00000000-0000-4000-8000-00000000016${String(index)}`,
  product: {
    ...base.product,
    title:
      [
        "Mythic account · Collector collection",
        "Legend account · Starter skins",
        "Mythical Glory · 300 skins",
      ][index] ?? base.product.title,
  },
}));
const release: Release = {
  id: "synthetic-wanted",
  game_id: "synthetic-game",
  slug: "mobile-legends",
  version: 1,
  paused: false,
  created_at: "2026-10-22T00:00:00Z",
  configuration: configurationSchema.parse(catalog.configuration),
};
release.configuration.asset = "/catalog-assets/game-mlbb-1536.jpg";
release.configuration.asset_alt = "Mobile Legends game artwork";
const params = new URLSearchParams(location.search);
const scenario = params.get("wanted") ?? "many";
const wanted = {
  many: [
    {
      id: "00000000-0000-4000-8000-000000004801",
      title: "Mythical Glory account with Collector skins",
      description:
        "A buyer is looking for a Mythical Glory account in Europe with at least two Collector skins.\nMarksman or mage mains preferred.",
      updated_at: "2026-10-21T09:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000004802",
      title: "Any Legend account in Southeast Asia",
      description: "Most heroes unlocked. Starlight skins are a bonus.",
      updated_at: "2026-10-20T09:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000004803",
      title: "Account with Ling Collector and 120+ heroes",
      description:
        "Region does not matter. The account must be bound to an email you control so it can be handed over safely.",
      updated_at: "2026-10-19T09:00:00Z",
    },
  ],
  one: [
    {
      id: "00000000-0000-4000-8000-000000004801",
      title: "Mythical Glory account with Collector skins",
      description:
        "A buyer is looking for a Mythical Glory account in Europe with at least two Collector skins.",
      updated_at: "2026-10-21T09:00:00Z",
    },
  ],
  none: [],
}[scenario];
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
  if (init?.method && init.method !== "GET")
    return send({ code: "fixture_read_only" }, 422);
  if (url.pathname.endsWith("/session"))
    return params.get("session") === "out"
      ? send({ code: "unauthenticated" }, 401)
      : send(customerSession);
  if (url.pathname.endsWith("/discovery"))
    return send({
      game_id: release.game_id,
      release_id: release.id,
      capabilities: capabilitiesFor(release),
      metrics: [],
      promotions: [],
    });
  if (url.pathname.endsWith("/wanted-accounts")) {
    if (scenario === "error") return send({ code: "fixture_failure" }, 503);
    return send({ items: wanted ?? [] });
  }
  if (url.pathname === "/api/v1/accounts")
    return send({
      items: params.get("stock") === "none" ? [] : listings,
      next: "",
    });
  if (url.pathname.endsWith("/favorites")) return send({ items: [], next: "" });
  return send({ code: "fixture_unavailable" }, 404);
};
const router = createBrowserRouter([
  {
    element: (
      <div className="experience browse-experience">
        <Outlet />
      </div>
    ),
    children: [
      {
        path: "/games/:slug",
        loader: () => release,
        element: (
          <GameShell release={release}>
            <Outlet />
          </GameShell>
        ),
        children: [
          {
            path: "accounts",
            loader: () => release,
            element: <GameAccounts />,
          },
        ],
      },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
