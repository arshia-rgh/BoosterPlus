// Isolated synthetic storefront; no live API, purchases or customer data.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { GameShell } from "../../../app/catalog/game-shell";
import { GamePage, Offerings } from "../../../app/catalog/public";
import { configurationSchema, type Release } from "../../../app/catalog/model";
import { capabilitiesFor } from "../../../app/catalog/public-discovery";
import { AccountCard } from "../../../app/resale/account-presentation";
import { publicListingSchema } from "../../../app/resale/model";
import { GameShop } from "../../../app/shop/public";
import { NewsIndex, NewsArticle } from "../../../app/news/public";
import { emptyDefinition } from "../../../app/news/model";
import { supplierProduct, customerSession } from "../supplier-shop/data";
import catalog from "../mlbb-catalog/configuration167.json";
import account from "../readability/account.json";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/experience/experience.css";
const release: Release = {
  id: "synthetic-release",
  game_id: "synthetic-game",
  slug: "mobile-legends",
  version: 1,
  paused: false,
  created_at: "2026-10-24T00:00:00Z",
  configuration: configurationSchema.parse(catalog.configuration),
};
release.configuration.asset = "/catalog-assets/game-mlbb-1536.jpg";
for (const c of release.configuration.discovery?.capabilities ?? [])
  c.state = "active";
for (const p of release.configuration.packages)
  p.asset = "/catalog-assets/mlbb-mythic-climb.webp";
const reviewStates = new URLSearchParams(location.search).has("review-states");
if (reviewStates) {
  const shop = release.configuration.discovery?.capabilities.find(
    (c) => c.service === "shop",
  );
  if (shop) {
    shop.state = "paused";
    shop.reason = "Ordering temporarily unavailable";
  }
  const pack = release.configuration.packages[0];
  if (pack?.variants[0]) {
    pack.variants = [
      {
        ...pack.variants[0],
        key: "one",
        currency: "USD",
        amount_minor: "2500",
        capacity: 5,
        preset_answers: {},
      },
      {
        ...pack.variants[0],
        key: "two",
        currency: "USD",
        amount_minor: "3500",
        capacity: 5,
        preset_answers: {},
      },
      {
        ...pack.variants[0],
        key: "eur",
        currency: "EUR",
        amount_minor: "2200",
        capacity: 5,
        preset_answers: {},
      },
    ];
  }
}
const products = [
  "86 Diamonds · Global",
  "Weekly Diamond Pass · Indonesia",
  "Long product title with eligible first-purchase bonus and region details",
].map((title, i) => {
  const p = supplierProduct(i === 1 ? "code" : "id");
  p.id = `product-${String(i)}`;
  p.definition.title = title;
  p.game_slug = release.slug;
  p.definition.asset = "/artwork/mlbb-services/shop-v1-960.jpg";
  if (p.definition.supplier && i < 2)
    p.definition.supplier.quantity = {
      kind: "one",
      min: "1",
      max: "1",
      step: "1",
    };
  p.definition.policy.delivery_min_hours = 0;
  p.definition.policy.delivery_max_hours = 0;
  p.definition.asset_alt = "Mobile Legends";
  p.supplier_available = i !== 2;
  for (const v of p.definition.variants) {
    v.region = i === 1 ? "Indonesia" : "Global";
    v.unit_amount_minor = String(199 + i * 500);
  }
  return p;
});
const articles = [
  "What changed in the latest patch",
  "A complete guide to choosing your next hero and improving your map awareness",
  "Land of Dawn: this week’s update",
].map((title, i) => ({
  id: `article-${String(i)}`,
  game_slug: release.slug,
  revision_id: `revision-${String(i)}`,
  published_at: "2026-10-24T00:00:00Z",
  updated_at: "2026-10-24T00:00:00Z",
  redirect: false,
  definition: {
    ...emptyDefinition,
    title,
    slug: `article-${String(i)}`,
    kind: "guide" as const,
    asset: "/catalog-assets/game-mlbb-640.jpg",
    asset_alt: "Land of Dawn",
    game_version: i === 0 ? "Patch 2.1.12" : "",
    summary: "Detailed content remains inside this article.",
  },
}));
const listing = publicListingSchema.parse(account);
listing.images = ["/catalog-assets/game-mlbb-640.jpg"];
const original = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const u = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.origin,
  );
  if (!u.pathname.startsWith("/api/v1/")) return original(input, init);
  if (init?.method && init.method !== "GET")
    throw new Error("Read-only review fixture");
  const reply = (v: unknown, status = 200) =>
    new Response(JSON.stringify(v), {
      status,
      headers: { "content-type": "application/json" },
    });
  if (u.pathname.endsWith("/session"))
    return reply({ ...customerSession, user: null, capabilities: [] });
  if (u.pathname.endsWith("/discovery"))
    return reply({
      game_id: release.game_id,
      release_id: release.id,
      capabilities: capabilitiesFor(release),
      metrics: [],
      promotions: [],
    });
  if (u.pathname.endsWith("/shop/filters"))
    return reply({
      regions: ["Global", "Indonesia"],
      categories: ["Diamonds", "Passes"],
    });
  if (u.pathname.endsWith("/shop")) return reply({ items: products, next: "" });
  if (u.pathname.endsWith("/favorites")) return reply({ items: [], next: "" });
  return reply({ code: "not_found" }, 404);
};
function Accounts() {
  const other = structuredClone(listing);
  other.id = "missing";
  other.images = [];
  other.product.title =
    "Account with a longer collection title for mobile readability";
  return (
    <section>
      <h2>Available accounts</h2>
      <div className="account-card-grid">
        <AccountCard listing={listing} />
        <AccountCard listing={other} />
        <AccountCard
          listing={listing}
          preview
          previewImage="/catalog-assets/game-mlbb-640.jpg"
        />
      </div>
    </section>
  );
}
function Details() {
  return (
    <section>
      <h2>Product details</h2>
      <p>Chosen product details remain in the same game.</p>
    </section>
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
            path: "boost",
            element: (
              <section>
                <Offerings release={release} path="packages" />
              </section>
            ),
          },
          { path: "accounts", element: <Accounts /> },
          { path: "shop", loader: () => release, element: <GameShop /> },
          {
            path: "news",
            loader: () => ({
              page: { items: articles, next: "" },
              slug: release.slug,
            }),
            element: <NewsIndex />,
          },
          {
            path: "news/:article",
            loader: () => ({
              article: articles[0],
              related: articles.slice(1),
              relatedUnavailable: false,
            }),
            element: <NewsArticle />,
          },
          { path: "shop/:id", element: <Details /> },
          { path: "accounts/:id", element: <Details /> },
          { path: "packages/:id", element: <Details /> },
        ],
      },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
