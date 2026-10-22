// Synthetic PRICESYNC174 admin review. Every API call stays in this fixture.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import AdminShell from "../../../app/admin/shell";
import { PageHeader } from "../../../app/ui/page-header";
import { AuthorizedIdentity } from "../../../app/identity/frame";
import type { Session } from "../../../app/identity/api";
import { ShopProducts } from "../../../app/shop/list";
import { ShopProductEditor } from "../../../app/shop/editor";
import { SupplierLibrary } from "../../../app/suppliers/library";
import type { Draft, PriceReview, PriceSync } from "../../../app/shop/model";
import { fixtureSession } from "../seller-offer/data";
import { supplierProduct } from "../supplier-shop/data";
import { supplierLibrary } from "../suppliers/data";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/admin/admin.css";
import "../../../app/shop/shop.css";
import "../../../app/suppliers/suppliers.css";

const session = {
  ...fixtureSession,
  capabilities: ["admin", "owner"],
} as Session;
document.body.dataset.portal = "admin";
const params = new URLSearchParams(location.search),
  stage = params.get("stage") ?? "mixed",
  editorStatus = params.get("status") ?? "override_changed";
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3600_000).toISOString();
let sequence = 0;
function review(
  status: PriceReview["status"],
  title: string,
  more: Partial<PriceReview> = {},
): PriceReview {
  sequence++;
  return {
    product_id: `00000000-0000-4000-8000-0000000174${String(sequence).padStart(2, "0")}`,
    title,
    game: "Mobile Legends",
    state: "published",
    supplier_product_id: `mlbb:diamonds:${String(sequence)}`,
    status,
    attention: "open",
    version: 2,
    quantity: "1",
    baseline_total: "1.005",
    supplier_total: "1.2",
    selling_minor: "1234",
    failures: 0,
    checked_at: hoursAgo(1),
    detected_at: hoursAgo(9),
    repriced_at: null,
    repriced_from_minor: "",
    repriced_to_minor: "",
    repriced_from_total: "",
    repriced_to_total: "",
    ...more,
  };
}
const mixed = (): PriceReview[] => [
  review("check_failed", "Weekly Diamond Pass · Indonesia", {
    failures: 3,
    detected_at: hoursAgo(30),
  }),
  review("override_changed", "86 Diamonds · Global", {
    detected_at: hoursAgo(26),
  }),
  review("unavailable", "Starlight Membership · Philippines", {
    failures: 2,
  }),
  review("override_changed", "Twilight Pass bundle", {
    quantity: "5",
    baseline_total: "4.5",
    supplier_total: "5.25",
    selling_minor: "499",
  }),
  review("requirements_changed", "Diamonds · Türkiye", {
    detected_at: hoursAgo(2),
  }),
  review(
    "needs_refresh",
    "Supercalifragilisticexpialidocious".repeat(3) +
      "UnbrokenTitleForNarrowLayoutsWithoutSpaces",
    { baseline_total: "2", supplier_total: "2.4", selling_minor: "230" },
  ),
];
const repriced = (): PriceReview[] => [
  review("current", "172 Diamonds · Global", {
    attention: "",
    detected_at: null,
    repriced_at: hoursAgo(3),
    repriced_from_minor: "1000",
    repriced_to_minor: "1050",
    repriced_from_total: "8.7",
    repriced_to_total: "9.13",
  }),
  review("repriced", "Weekly Diamond Pass · Global", {
    attention: "",
    detected_at: null,
    quantity: "2",
    repriced_at: hoursAgo(40),
    repriced_from_minor: "345",
    repriced_to_minor: "322",
    repriced_from_total: "3",
    repriced_to_total: "2.8",
  }),
];
const lastRun = (state: "running" | "complete" | "failed", issue = "") => ({
  state,
  started_at: hoursAgo(2),
  finished_at: state === "running" ? null : hoursAgo(1.9),
  checked: 224,
  repriced: 2,
  flagged: 3,
  deferred: 0,
  failed: 1,
  issue,
});
function overview(): PriceSync {
  const base: PriceSync = {
    interval_minutes: 480,
    configured: true,
    last_run: lastRun("complete"),
    next_check_at: new Date(Date.now() + 6 * 3600_000).toISOString(),
    attention_count: 0,
    attention: [],
    repriced: repriced(),
  };
  switch (stage) {
    case "quiet":
      return base;
    case "fresh":
      return { ...base, last_run: null, next_check_at: null, repriced: [] };
    case "many": {
      const many = Array.from({ length: 50 }, (_, index) =>
        review("override_changed", `Synthetic offer ${String(index + 1)}`),
      );
      return { ...base, attention_count: 63, attention: many };
    }
    case "off":
      return {
        ...base,
        configured: false,
        last_run: null,
        next_check_at: null,
        attention: mixed().slice(0, 2),
        attention_count: 2,
      };
    case "single":
      return {
        ...base,
        attention: mixed().slice(1, 2),
        attention_count: 1,
        repriced: [],
      };
    default: {
      const attention = mixed();
      const run =
        stage === "running"
          ? lastRun("running")
          : stage === "failed"
            ? lastRun("failed", "supplier_unavailable")
            : stage === "stopped"
              ? lastRun("failed")
              : base.last_run;
      return {
        ...base,
        last_run: run,
        attention,
        attention_count: attention.length,
      };
    }
  }
}
let current = overview();
let failNext = stage === "conflict" ? 409 : stage === "ack-error" ? 503 : 0;
const product = supplierProduct("id");
const editorReview = (): PriceReview | undefined => {
  if (editorStatus === "none") return undefined;
  if (editorStatus === "repriced") return repriced()[0];
  if (editorStatus === "below")
    return mixed().find((item) => item.title === "Twilight Pass bundle");
  return (
    mixed().find((item) => item.status === editorStatus) ??
    review("override_changed", "86 Diamonds · Global")
  );
};
let draftReview = editorReview();
const draft = (): Draft => ({
  id: product.id,
  game_id: product.game_id,
  slug: "example",
  game: "Mobile Legends",
  version: 3,
  state: "published",
  draft: product.definition,
  current_release: "00000000-0000-4000-8000-000000017499",
  stocks: [],
  updated_at: hoursAgo(5),
  ...(draftReview ? { price_review: draftReview } : {}),
});
const products = () => ({
  items: [
    ...mixed().map((item, index) => ({
      id: item.product_id,
      supplier: true,
      game_id: product.game_id,
      game: item.game,
      slug: item.product_id,
      title: item.title,
      version: 2,
      state: "published",
      updated_at: hoursAgo(index + 1),
      price_status: item.status,
      price_attention: item.attention,
      ...(index === 1 ? { repriced_at: hoursAgo(50) } : {}),
    })),
    {
      id: repriced()[0]?.product_id ?? "",
      supplier: true,
      game_id: product.game_id,
      game: "Mobile Legends",
      slug: "repriced",
      title: "172 Diamonds · Global",
      version: 4,
      state: "published",
      updated_at: hoursAgo(3),
      price_status: "current" as const,
      price_attention: "" as const,
      repriced_at: hoursAgo(3),
    },
    {
      id: "manual-product",
      supplier: false,
      game_id: product.game_id,
      game: "Mobile Legends",
      slug: "manual",
      title: "PLAYORA manual coaching session",
      version: 1,
      state: "published",
      updated_at: hoursAgo(80),
    },
  ],
  next: "",
});
const catalog = supplierLibrary();
declare global {
  interface Window {
    priceRequests: { path: string; method: string; body: unknown }[];
  }
}
window.priceRequests = [];
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
  const body: unknown =
    typeof init?.body === "string" ? JSON.parse(init.body) : {};
  window.priceRequests.push({
    path: url.pathname + url.search,
    method: init?.method ?? "GET",
    body,
  });
  if (stage === "loading" && url.pathname.endsWith("/price-sync"))
    return new Promise<Response>(() => {});
  await new Promise((resolve) => setTimeout(resolve, 80));
  const path = url.pathname.slice("/api/v1".length);
  if (path.endsWith("/session")) return send(session);
  if (path === "/admin/catalog/games") return send({ games: [], next: "" });
  if (path === "/admin/shop/products") return send(products());
  if (path === "/admin/shop/price-sync") {
    if (stage === "error") return send({ code: "fixture_failure" }, 503);
    return send(current);
  }
  const ack = /^\/admin\/shop\/price-sync\/([^/]+)\/acknowledge$/.exec(path);
  if (ack) {
    if (failNext) {
      const status = failNext;
      failNext = 0;
      if (status === 409) {
        current = {
          ...current,
          attention: current.attention.map((item) =>
            item.product_id === ack[1]
              ? { ...item, version: item.version + 1 }
              : item,
          ),
        };
        return send({ code: "shop_conflict" }, 409);
      }
      return send({ code: "fixture_failure" }, status);
    }
    const item =
      current.attention.find((value) => value.product_id === ack[1]) ??
      (draftReview?.product_id === ack[1] ? draftReview : undefined);
    if (!item) return send({ code: "shop_conflict" }, 409);
    const done: PriceReview = {
      ...item,
      attention: "acknowledged",
      version: item.version + 1,
      ...(item.status === "override_changed"
        ? { status: "current" as const, baseline_total: item.supplier_total }
        : {}),
    };
    current = {
      ...current,
      attention: current.attention.filter(
        (value) => value.product_id !== item.product_id,
      ),
      attention_count: current.attention_count - 1,
    };
    if (draftReview?.product_id === item.product_id) draftReview = done;
    return send(done);
  }
  if (path === `/admin/shop/products/${product.id}`) return send(draft());
  if (path === `/admin/shop/products/${product.id}/preview`)
    return send({ draft: draft(), issues: [] });
  if (path.endsWith("/releases")) return send({ items: [], next: 0 });
  if (path === "/admin/shop/suppliers")
    return send({ items: [catalog.connection] });
  if (path.endsWith("/library")) return send(catalog);
  return send({ code: "not_found" }, 404);
};
function Page({ view }: { view: "products" | "editor" | "library" }) {
  const title =
    view === "editor"
      ? "Shop product editor"
      : view === "library"
        ? "Supplier catalog"
        : "Shop products";
  return (
    <AuthorizedIdentity value={{ session, refresh: async () => {} }}>
      <AdminShell session={session} title={title}>
        <main id="main" className="page identity-page" data-portal="admin">
          <PageHeader title={title} eyebrow="Admin workspace" />
          {view === "editor" ? (
            <ShopProductEditor />
          ) : view === "library" ? (
            <SupplierLibrary />
          ) : (
            <ShopProducts />
          )}
        </main>
      </AdminShell>
    </AuthorizedIdentity>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <RouterProvider
    router={createBrowserRouter([
      { path: "/admin/shop", element: <Page view="products" /> },
      { path: "/admin/shop/suppliers", element: <Page view="library" /> },
      { path: "/admin/shop/:id", element: <Page view="editor" /> },
    ])}
  />,
);
