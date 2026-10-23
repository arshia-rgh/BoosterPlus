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
  if (url.pathname.endsWith("/auth/session"))
    return reply({ ...customerSession, user: null, capabilities: [] });
  if (url.pathname.endsWith("/shop")) {
    const q = url.searchParams;
    if (q.get("q") === "error")
      return reply({ code: "service_unavailable" }, 503);
    if (q.get("q") === "loading")
      await new Promise((resolve) => setTimeout(resolve, 1500));
    const region = q.get("region");
    let selected = products.filter(
      (p) =>
        (!region || p.definition.variants[0]?.region === region) &&
        (!q.get("category") || p.definition.category === q.get("category")) &&
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
    return reply({
      items: q.has("after") ? selected.slice(3) : selected.slice(0, 3),
      next: !q.has("after") && selected.length > 3 ? "fixture-next" : "",
    });
  }
  const product = products.find((p) => url.pathname.endsWith("/" + p.id));
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
    <main className="page-shell">
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
  <RouterProvider
    router={createBrowserRouter([
      { path: "/games/example/shop", loader: () => release, element: <View /> },
      {
        path: "/games/example/shop/:id",
        loader: () => release,
        element: <View detail />,
      },
    ])}
  />,
);
