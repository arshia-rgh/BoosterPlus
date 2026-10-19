import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { SupplierLibrary } from "../../../app/suppliers/library";
import {
  connections,
  previewPrice,
  decimalCents,
  type Pricing,
} from "../../../app/suppliers/model";
import AdminShell from "../../../app/admin/shell";
import { PageHeader } from "../../../app/ui/page-header";
import { AuthorizedIdentity } from "../../../app/identity/frame";
import type { Session } from "../../../app/identity/api";
import { fixtureSession } from "../seller-offer/data";
import { gameID, supplierConnection, supplierLibrary } from "./data";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/admin/admin.css";
const session = {
  ...fixtureSession,
  capabilities: ["admin", "owner"],
} as Session;
document.body.dataset.portal = "admin";
const params = new URLSearchParams(location.search),
  stage = params.get("stage") ?? "ready";
const catalog = supplierLibrary();
let run = catalog.import,
  reads = 0,
  conflictShown = false;
declare global {
  interface Window {
    supplierFixtureRequests: { method: string; path: string }[];
  }
}
window.supplierFixtureRequests = [];
if (stage === "empty") {
  catalog.import = null;
  catalog.items = [];
  catalog.connection.current_import = "";
}
if (stage === "unavailable") catalog.connection.configured = false;
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
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/v1/"))
    return originalFetch(input, init);
  const path = url.pathname,
    body = (typeof init?.body === "string" ? JSON.parse(init.body) : {}) as {
      request_id?: string;
      version?: number;
      markup_bps?: number;
      product_id?: string;
      offer_id?: string;
      settings?: Pricing;
    };
  window.supplierFixtureRequests.push({ method: init?.method ?? "GET", path });
  const send = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  if (path.endsWith("/session")) return send(session);
  if (path === "/api/v1/admin/shop/suppliers")
    return send({ items: connections.map(([id]) => supplierConnection(id)) });
  if (path.endsWith("/library")) {
    if (stage === "error") return send({ code: "supplier_unavailable" }, 503);
    return send({
      ...catalog,
      connection: {
        ...catalog.connection,
        id: path.includes("vendoria-test")
          ? "vendoria-test"
          : catalog.connection.id,
      },
      items: catalog.items.filter(
        (item) =>
          (!url.searchParams.get("q") ||
            item.name
              .toLowerCase()
              .includes((url.searchParams.get("q") ?? "").toLowerCase())) &&
          (!url.searchParams.get("category") ||
            item.category_id === url.searchParams.get("category")),
      ),
    });
  }
  if (path === "/api/v1/admin/catalog/games")
    return send({
      games: [
        {
          id: gameID,
          slug: "mobile-legends",
          name: "Mobile Legends",
          archived: false,
          description: "Synthetic game catalog",
          asset: "",
          asset_alt: "",
          paused: false,
          published: true,
          revision: 1,
        },
      ],
      next: "",
    });
  if (path.endsWith("/imports")) {
    run = {
      id: body.request_id ?? "synthetic-import",
      connection: catalog.connection.id,
      state: "loading",
      product_count: 0,
      offer_count: 0,
      issue: "",
      updated_at: new Date().toISOString(),
    };
    catalog.connection.active_import = run.id;
    reads = 0;
    return send(run, 202);
  }
  if (path.includes("/supplier-imports/") && run) {
    if (path.endsWith("/cancel")) {
      run.state = "cancelled";
      catalog.connection.active_import = "";
    } else if (++reads > 1 && run.state === "loading") {
      run.state = stage === "import-error" ? "failed" : "complete";
      catalog.connection.active_import = "";
      if (run.state === "complete") {
        run.product_count = 2;
        run.offer_count = 2;
        catalog.items = catalog.items.length
          ? catalog.items
          : supplierLibrary().items;
        catalog.import = { ...run };
        catalog.connection.current_import = run.id;
        catalog.connection.version++;
      }
    }
    return send(run);
  }
  const recompute = () => {
    for (const item of catalog.items)
      for (const offer of item.offers) {
        const pricing = offer.pricing;
        pricing.effective_markup_bps =
          pricing.markup_bps ?? catalog.connection.markup_bps;
        const value = previewPrice(
          pricing.cost_usd,
          pricing.preview_quantity,
          pricing.effective_markup_bps,
          pricing.override_minor || null,
        );
        pricing.preview_amount_minor = value ? (decimalCents(value) ?? "") : "";
      }
  };
  if (path.endsWith("/markup")) {
    catalog.connection.markup_bps = body.markup_bps ?? 1500;
    catalog.connection.version++;
    recompute();
    return send(catalog.connection);
  }
  if (path.endsWith("/prices")) {
    const item = catalog.items.find((value) => value.id === body.product_id),
      offer = item?.offers.find((value) => value.id === body.offer_id);
    if (!offer || !body.settings)
      return send({ code: "supplier_invalid" }, 422);
    if (stage === "conflict" && !conflictShown) {
      conflictShown = true;
      offer.pricing.version++;
      offer.pricing.region = "Saved by another administrator";
      return send({ code: "supplier_conflict" }, 409);
    }
    if (body.settings.version !== offer.pricing.version)
      return send({ code: "supplier_conflict" }, 409);
    offer.pricing = {
      ...offer.pricing,
      ...body.settings,
      version: offer.pricing.version + 1,
    };
    recompute();
    return send(offer.pricing);
  }
  return send({ code: "not_found" }, 404);
};
function Page() {
  return (
    <AuthorizedIdentity value={{ session, refresh: async () => {} }}>
      <AdminShell session={session} title="Supplier catalog">
        <main id="main" className="page identity-page" data-portal="admin">
          <PageHeader title="Supplier catalog" eyebrow="Admin workspace" />
          <p className="eyebrow">
            Isolated review · synthetic data · no external requests
          </p>
          <SupplierLibrary />
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
      { path: "/admin/shop/suppliers", element: <Page /> },
      {
        path: "/admin/shop",
        element: <h1>Manual product catalog · synthetic destination</h1>,
      },
      {
        path: "/admin/shop/orders",
        element: <h1>Manual delivery queue · synthetic destination</h1>,
      },
    ])}
  />,
);
