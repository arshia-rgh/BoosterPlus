import { AccountMarket } from "../../../app/resale/market";
import { NewsIndex } from "../../../app/news/public";
import { GamePage, GameCatalog } from "../../../app/catalog/public";
import { configurationSchema } from "../../../app/catalog/model";
import catalog from "../mlbb-catalog/configuration167.json";
import account from "../readability/account.json";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { GameShop } from "../../../app/shop/public";
import { supplierProduct, customerSession } from "../supplier-shop/data";
import "../../../app/styles.css";
import "../../../app/experience/experience.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/ui/forms.css";

document.body.dataset.portal = "customer";
const products = [
  ["55 Diamonds · Global", "Global", "Diamonds", "110"],
  ["275 Diamonds · Global", "Global", "Diamonds", "520"],
  ["5 Diamonds · Indonesia", "Indonesia", "Diamonds", "100"],
  ["50 Diamonds · Indonesia", "Indonesia", "Diamonds", "105"],
  ["Weekly Diamond Pass · Global", "Global", "Passes", "150"],
  ["Elite Bundle · Indonesia", "Indonesia", "Bundles", "700"],
].map(([title = "", region = "", category = "", price = ""], i) => {
  const product = supplierProduct("id");
  product.id = `product-${String(i)}`;
  product.supplier_available = false;
  product.definition.title = title;
  product.definition.category = category;
  product.definition.description = `${title}. Instant top-up.`;
  product.definition.asset = "/catalog-assets/game-mlbb-640.jpg";
  product.definition.asset_alt = "Mobile Legends artwork";
  for (const variant of product.definition.variants) {
    variant.region = region;
    variant.unit_amount_minor = price;
  }
  return product;
});
const reviewProducts = [
  "50 + 5 Diamonds · Indonesia — first top-up bonus",
  "Monthly Diamond Pass · Türkiye (30 days)",
  "Elite Bundle",
].map((title, i) => {
  const product = supplierProduct("id");
  product.id = `review-${String(i)}`;
  product.definition.title = title;
  product.definition.asset = "/catalog-assets/game-mlbb-640.jpg";
  product.definition.description =
    "Bonus applies to eligible first top-ups only. Review this condition before ordering.";
  product.supplier_available = false;
  for (const v of product.definition.variants)
    v.region = i === 0 ? "Indonesia" : i === 1 ? "Türkiye" : "Global";
  if (i === 2) {
    delete product.definition.supplier;
    product.definition.policy.delivery_min_hours = 2;
    product.definition.policy.delivery_max_hours = 24;
    const v = product.definition.variants[0];
    if (v)
      product.definition.variants.push({
        ...v,
        key: "regional",
        region: "Indonesia",
      });
  }
  return product;
});
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.origin,
  );
  if (!url.pathname.startsWith("/api/v1/")) return originalFetch(input, init);
  if (init?.method && init.method !== "GET")
    throw new Error("Read-only fixture");
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  if (url.pathname.endsWith("/filters"))
    return reply({
      regions: ["Global", "Indonesia"],
      categories: ["Bundles", "Diamonds", "Passes"],
    });
  if (url.pathname.endsWith("/accounts/games"))
    return reply({
      games: [{ slug: "mobile-legends", name: "Mobile Legends" }],
      next: "",
    });
  if (url.pathname === "/api/v1/accounts")
    return reply({
      items: [{ ...account, images: ["/catalog-assets/game-mlbb-640.jpg"] }],
      next: "",
    });
  if (url.pathname.endsWith("/auth/session"))
    return reply({ ...customerSession, user: null, capabilities: [] });
  if (url.pathname.endsWith("/shop")) {
    const q = url.searchParams;
    if (q.get("q") === "error")
      return reply({ code: "service_unavailable" }, 503);
    if (q.get("q") === "loading")
      await new Promise((resolve) => setTimeout(resolve, 1500));
    const region = q.get("region");
    let selected =
      q.get("q") === "review-cases"
        ? reviewProducts
        : products.filter(
            (p) =>
              (!region || p.definition.variants[0]?.region === region) &&
              (!q.get("category") ||
                p.definition.category === q.get("category")) &&
              (!q.get("q") ||
                ["loading", "error"].includes(q.get("q") ?? "") ||
                p.definition.title
                  .toLowerCase()
                  .includes((q.get("q") ?? "").toLowerCase())),
          );
    // Fixture responses illustrate the API contract; backend regressions prove ordering.
    if (q.get("sort")?.startsWith("price"))
      selected = [...selected].sort(
        (a, b) =>
          (Number(a.definition.variants[0]?.unit_amount_minor) -
            Number(b.definition.variants[0]?.unit_amount_minor)) *
          (q.get("sort") === "price_desc" ? -1 : 1),
      );
    if (q.get("sort") === "diamonds_desc")
      selected = [
        products[1],
        products[0],
        products[3],
        products[2],
        products[4],
        products[5],
      ].filter(
        (p): p is (typeof products)[number] => !!p && selected.includes(p),
      );
    const sample = products.at(0);
    if (q.get("q") === "responsive-cases" && sample)
      selected = [
        {
          ...sample,
          definition: {
            ...sample.definition,
            asset: "/api/v1/artwork/11111111-1111-4111-8111-111111111111/wide",
          },
        },
      ];
    return reply({
      items: q.has("after") ? selected.slice(3) : selected.slice(0, 3),
      next: !q.has("after") && selected.length > 3 ? "fixture-next" : "",
    });
  }
  const product = [...products, ...reviewProducts].find((p) =>
    url.pathname.endsWith("/" + p.id),
  );
  if (product) return reply(product);
  return reply({ code: "not_found" }, 404);
};
const release = {
  slug: "example",
  paused: false,
  configuration: {
    discovery: { capabilities: [{ service: "shop", state: "active" }] },
  },
};
function View({ detail = false }: { detail?: boolean }) {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">PLAYORA · Shop</p>
        <h1>Mobile Legends</h1>
      </header>
      <GameShop detail={detail} />
    </main>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <div className="experience">
    <RouterProvider
      router={createBrowserRouter([
        { path: "/accounts", element: <AccountMarket /> },
        {
          path: "/games",
          loader: () => ({ games: [], next: "" }),
          element: <GameCatalog />,
        },
        {
          path: "/games/example/news",
          loader: () => ({ slug: "example", page: { items: [], next: "" } }),
          element: (
            <main className="page">
              <h1>Mobile Legends</h1>
              <NewsIndex />
            </main>
          ),
        },
        {
          path: "/games/example",
          loader: () => ({
            ...release,
            id: "synthetic",
            game_id: "synthetic",
            version: 1,
            created_at: "2026-10-23T00:00:00Z",
            configuration: configurationSchema.parse(catalog.configuration),
          }),
          element: (
            <main className="page">
              <h1>Mobile Legends</h1>
              <GamePage />
            </main>
          ),
        },
        {
          path: "/games/example/shop",
          loader: () => release,
          element: <View />,
        },
        {
          path: "/games/example/shop/:id",
          loader: () => release,
          element: <View detail />,
        },
      ])}
    />
  </div>,
);
