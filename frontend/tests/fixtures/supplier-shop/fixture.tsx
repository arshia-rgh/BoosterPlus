import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { GameShop } from "../../../app/shop/public";
import GameShopProduct from "../../../app/routes/game-shop-product";
import { SupplierDelivery } from "../../../app/shop/supplier-delivery";
import ShopDeliveryPanel from "../../../app/shop/delivery";
import { SupplierLibrary } from "../../../app/suppliers/library";
import { ShopProductEditor } from "../../../app/shop/editor";
import { ShopProducts } from "../../../app/shop/list";
import ShopQueue from "../../../app/shop/queue";
import { ActionVerificationDialog } from "../../../app/identity/action-verification-dialog";
import { GameShell } from "../../../app/catalog/game-shell";
import { emptyConfiguration, type Release } from "../../../app/catalog/model";
import { PageHeader } from "../../../app/ui/page-header";
import { AuthorizedIdentity } from "../../../app/identity/frame";
import AdminShell from "../../../app/admin/shell";
import type { Session } from "../../../app/identity/api";
import type { Draft, ShopDelivery } from "../../../app/shop/model";
import { supplierLibrary } from "../suppliers/data";
import { fixtureSession } from "../seller-offer/data";
import { customerSession, supplierProduct, supplierDelivery } from "./data";
import "../../../app/styles.css";
import "../../../app/experience/experience.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/admin/admin.css";
import "../../../app/shop/shop.css";
import "../../../app/suppliers/suppliers.css";

const params = new URLSearchParams(location.search);
document.body.dataset.portal = location.pathname.startsWith("/admin")
  ? "admin"
  : "customer";
const stage = params.get("stage") ?? "ready";
const method =
  params.get("method") === "code"
    ? "code"
    : params.get("method") === "id"
      ? "id"
      : "account";
const product = supplierProduct(method);
if (stage === "unavailable") product.supplier_available = false;
if (stage === "fixed-price" && product.definition.supplier)
  product.definition.supplier.quantity = {
    kind: "one",
    min: "1",
    max: "1",
    step: "1",
  };
if (params.get("timing") === "instant" && method !== "account") {
  product.definition.policy.delivery_min_hours = 0;
  product.definition.policy.delivery_max_hours = 0;
}
const badgeRegion = params.get("badge");
if (badgeRegion) {
  for (const variant of product.definition.variants)
    variant.region = badgeRegion;
  product.definition.asset = "/catalog-assets/game-mlbb-640.jpg";
  product.definition.asset_alt = "Mobile Legends artwork";
}
const manual = supplierProduct("id");
delete manual.definition.supplier;
manual.id = "manual-product";
manual.definition.title = "PLAYORA manual product";
manual.available = { supplier: 3 };
if (stage === "range") {
  const first = manual.definition.variants[0];
  if (!first) throw new Error("Missing manual variant fixture");
  manual.definition.variants.push({
    ...first,
    key: "larger",
    label: "Larger option",
    unit_amount_minor: "1234",
  });
  manual.definition.asset = "/catalog-assets/game-mlbb-640.jpg";
  manual.definition.asset_alt = "Mobile Legends artwork";
}
manual.definition.policy.reservation_minutes = 15;
manual.definition.policy.delivery_min_hours = 24;
manual.definition.policy.delivery_max_hours = 48;
manual.definition.policy.delivery_terms =
  "A PLAYORA team member completes delivery within the accepted estimate after verified payment.";
manual.definition.recipient = [
  {
    key: "player_id",
    label: "Player ID",
    help: "Game identifier only",
    required: true,
    max_length: 32,
  },
];
const manualDelivery = supplierDelivery("processing");
delete manualDelivery.supplier;
manualDelivery.order_id = "manual-order";
manualDelivery.order_state = "queued";
manualDelivery.state = "";
manualDelivery.version = 0;
manualDelivery.purchase.product = manual.definition;
manualDelivery.purchase.product_id = manual.id;
manualDelivery.purchase.quantity = 1;
manualDelivery.purchase.amount_minor = "575";
const catalog = supplierLibrary();
const firstOffer = catalog.items[0]?.offers[0];
if (!firstOffer) throw new Error("Missing fixture offer");
for (const item of catalog.items)
  for (const offer of item.offers) {
    Object.assign(offer.pricing, {
      version: 1,
      game_id: product.game_id,
      region: "Türkiye",
      delivery_method: offer.suggested_delivery,
      issues: [],
    });
  }
const adminSession = {
  ...fixtureSession,
  capabilities: ["admin", "owner"],
} as Session;
let session: unknown = location.pathname.startsWith("/admin")
  ? adminSession
  : customerSession;
const draft: Draft = {
  id: product.id,
  game_id: product.game_id,
  slug: "example",
  game: "Example game",
  version: 1,
  state: "draft",
  draft: product.definition,
  current_release: "",
  stocks: [],
  updated_at: "2026-10-20T10:00:00Z",
};
const release: Release = {
  id: "synthetic-game-release",
  game_id: product.game_id,
  slug: "example",
  version: 1,
  paused: false,
  created_at: "2026-10-20T10:00:00Z",
  configuration: {
    ...emptyConfiguration("Example game"),
    discovery: {
      ...emptyConfiguration("Example game").discovery,
      capabilities: [
        { service: "shop", state: "active", description: "", reason: "" },
      ],
    },
  },
};
if (stage === "linked") {
  draft.version = 7;
  firstOffer.pricing.shop_product_id = draft.id;
}
type RequestAudit = {
  path: string;
  method: string;
  body: Record<string, unknown>;
};
declare global {
  interface Window {
    nexusUIRequests: RequestAudit[];
    expireNexusSession: () => void;
    finishNexusRequest: () => void;
    setNexusDelivery: (state: string) => void;
  }
}
window.nexusUIRequests = [];
window.expireNexusSession = () => {
  session = { ...customerSession, user: null };
  window.dispatchEvent(
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "customer" },
    }),
  );
};
window.finishNexusRequest = () => {};
const originalFetch = window.fetch.bind(window);
let reservations = 0;
let verified = false;
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
  const path = url.pathname;
  const body = (
    typeof init?.body === "string" ? JSON.parse(init.body) : {}
  ) as Record<string, unknown>;
  window.nexusUIRequests.push({ path, method: init?.method ?? "GET", body });
  const send = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  if (path.endsWith("/session")) return send(session);
  if (path.endsWith("/shop/manual-product/reserve"))
    return send(manualDelivery);
  if (path === "/api/v1/admin/orders/manual-order/shop")
    return send(manualDelivery);
  if (path === "/api/v1/admin/orders/manual-order/shop/claim") {
    manualDelivery.version++;
    manualDelivery.order_version++;
    manualDelivery.order_state = "in_progress";
    manualDelivery.state = "processing";
    manualDelivery.assigned_id = fixtureSession.user.id;
    return send(manualDelivery);
  }
  if (path === "/api/v1/admin/orders/manual-order/shop/recipient")
    return send({
      order_id: "manual-order",
      version: manualDelivery.version,
      values: { player_id: "synthetic-manual-player" },
    });
  if (path === "/api/v1/admin/orders/manual-order/shop/submit") {
    if (body.proof_message_id !== "synthetic-proof")
      return send({ code: "shop_invalid" }, 400);
    manualDelivery.version++;
    manualDelivery.state = "submitted";
    manualDelivery.proof_message_id = "synthetic-proof";
    return send(manualDelivery);
  }
  if (path === "/api/v1/admin/conversations")
    return send({
      id: "manual-thread",
      booster_shared: false,
      kind: "order",
      order_id: "manual-order",
      linked_order_id: "",
      subject: "Synthetic manual delivery",
      slug: "example",
      state: "open",
      version: 1,
      sequence: 1,
      unread: 0,
      updated_at: draft.updated_at,
      created_at: draft.updated_at,
    });
  if (path === "/api/v1/admin/conversations/manual-thread/messages")
    return send({
      messages: [
        {
          id: "synthetic-proof",
          purpose: "proof",
          sequence: 1,
          sender_label: "Synthetic owner",
          sender_role: "owner",
          sender_id: fixtureSession.user.id,
          visibility: "public",
          body: "Synthetic reviewed delivery proof",
          attachments: ["synthetic-image"],
          created_at: draft.updated_at,
        },
      ],
      next: 0,
      latest: 1,
    });
  if (path.endsWith("/mfa/verify")) {
    verified = true;
    return send({ recovery_codes: [] });
  }
  if (
    stage === "reauth" &&
    !verified &&
    (path.endsWith("/shop/codes") || path.endsWith("/shop/action"))
  )
    return send({ code: "recent_auth_required" }, 403);
  if (path.endsWith("/quote"))
    return send({
      id: "synthetic-quote",
      product_id: product.id,
      release_id: product.release_id,
      quantity: body.quantity,
      amount_minor: String(Math.round(Number(body.quantity) * 1150)),
      currency: "USD",
      expires_at: new Date(
        Date.now() + (stage === "expiry" ? 2000 : 60000),
      ).toISOString(),
      testing: true,
    });
  if (path.endsWith("/supplier-reserve")) {
    if (stage === "uncertain" && reservations++ === 0)
      return send({ code: "unavailable" }, 503);
    if (stage === "delayed")
      await new Promise<void>((resolve) => {
        window.finishNexusRequest = resolve;
      });
    return send(supplierDelivery("awaiting_payment", method));
  }
  if (path.endsWith("/shop/codes"))
    return send({
      keys: [
        {
          code: "SYNTHETIC-PRIVATE-CODE-".repeat(6),
          cardNo: "12345678901234567890",
          expireAt: "2027-01-01",
          url: "https://redeem.example.invalid/code",
        },
      ],
    });
  if (path.endsWith("/shop/action")) {
    if (stage === "error") return send({ code: "supplier_unavailable" }, 503);
    return send({
      kind: "verification",
      url:
        stage === "unsafe"
          ? "https://foreign.example.invalid/verify"
          : "https://nexus-sandbox.amadeustech.dev/verify/synthetic",
      employee: "",
      profile_url: "",
    });
  }
  if (path === "/api/v1/admin/shop/price-sync")
    return send({
      interval_minutes: 480,
      configured: true,
      last_run: null,
      next_check_at: null,
      attention_count: 0,
      attention: [],
      repriced: [],
    });
  if (path === "/api/v1/admin/shop/suppliers")
    return send({ items: [catalog.connection] });
  if (path.endsWith("/library")) return send(catalog);
  if (path === "/api/v1/admin/shop/supplier-listings") {
    if (stage === "linked") {
      if (body.shop_version !== 7) return send({ code: "conflict" }, 409);
      draft.version = 8;
    }
    firstOffer.pricing.shop_product_id = draft.id;
    return send(draft);
  }
  if (path === `/api/v1/admin/shop/products/${draft.id}/preview`)
    return send({ draft, issues: [] });
  if (path === `/api/v1/admin/shop/products/${draft.id}/history`)
    return send({ items: [], next: 0 });
  if (path === `/api/v1/admin/shop/products/${draft.id}`) return send(draft);
  if (path === "/api/v1/admin/catalog/games")
    return send({ games: [], next: "" });
  if (path === "/api/v1/admin/shop/products")
    return send({
      items: [true, false].map((supplier) => ({
        id: supplier ? product.id : "manual-product",
        supplier,
        game_id: product.game_id,
        game: "Example game",
        slug: "example",
        title: supplier ? product.definition.title : "PLAYORA manual product",
        version: 1,
        state: "draft",
        updated_at: draft.updated_at,
      })),
      next: "",
    });
  if (path === "/api/v1/admin/orders") {
    const rows = [true, false].map((supplier) => ({
      id: supplier ? "supplier-order" : "manual-order",
      version: 1,
      kind: "shop",
      state: supplier ? "in_progress" : "queued",
      slug: "example",
      service: "shop",
      package: "",
      variant: "regional",
      game_name: "Example game",
      created_at: draft.updated_at,
      updated_at: draft.updated_at,
      accepted_price: { currency: "USD", amount_minor: "1725" },
      staff: {
        customer_id: "synthetic-customer",
        assigned_id: "",
        payment_state: "paid",
        delivery_state: supplier ? "pending" : "",
        supplier_delivery: supplier,
      },
    }));
    return send({
      orders: rows.filter(
        (row) =>
          url.searchParams.get("delivery") !== "supplier" ||
          row.staff.supplier_delivery,
      ),
      next: "",
    });
  }
  if (path.endsWith("/shop/filters"))
    return send({ regions: ["Türkiye"], categories: ["Upgrades"] });
  if (path.endsWith("/shop/manual-product")) return send(manual);
  if (path.endsWith(`/shop/${product.id}`)) return send(product);
  if (path.endsWith("/shop")) {
    const id = supplierProduct("id");
    id.id = "id-product";
    id.definition.title = "Player ID top-up";
    const code = supplierProduct("code");
    code.id = "code-product";
    code.definition.title = "Regional digital code";
    return send({
      items: [product, id, code, manual].filter(
        (row) =>
          !url.searchParams.get("method") ||
          (row.definition.supplier?.method ?? "manual") ===
            url.searchParams.get("method"),
      ),
      next: "",
    });
  }
  return send({ code: "unavailable" }, 503);
};
function DeliveryPage() {
  const [data, setData] = useState<ShopDelivery>(() => {
    const value = supplierDelivery(params.get("state") ?? "completed", method);
    if (params.has("parent")) value.order_state = params.get("parent") ?? "";
    if (stage === "review" && value.supplier)
      value.supplier.needs_review = true;
    return value;
  });
  window.setNexusDelivery = (state) => {
    setData({ ...supplierDelivery(state, method), version: data.version + 1 });
  };
  return (
    <main id="main" className="page">
      <PageHeader title="Order delivery" eyebrow="Synthetic order" />
      <SupplierDelivery
        data={data}
        admin={false}
        refresh={() => {
          setData({ ...data, version: data.version + 1 });
        }}
      />
      <ActionVerificationDialog />
    </main>
  );
}
function AdminPage({
  editor = false,
  view = "library",
}: {
  editor?: boolean;
  view?: "library" | "products" | "queue";
}) {
  const title = editor
    ? "Shop product editor"
    : view === "products"
      ? "Shop products"
      : view === "queue"
        ? "Shop delivery queue"
        : "Supplier catalog";
  return (
    <AuthorizedIdentity
      value={{ session: adminSession, refresh: async () => {} }}
    >
      <AdminShell session={adminSession} title={title}>
        <main id="main" className="page identity-page" data-portal="admin">
          <PageHeader title={title} />
          {editor ? (
            <ShopProductEditor />
          ) : view === "products" ? (
            <ShopProducts />
          ) : view === "queue" ? (
            <ShopQueue />
          ) : (
            <SupplierLibrary />
          )}
        </main>
      </AdminShell>
    </AuthorizedIdentity>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <div
    className={
      document.body.dataset.portal === "customer" ? "experience" : undefined
    }
  >
    <RouterProvider
      router={createBrowserRouter([
        {
          element: (
            <GameShell release={release}>
              <Outlet />
            </GameShell>
          ),
          children: [
            {
              path: "/games/:slug/shop",
              loader: () => release,
              element: <GameShop />,
            },
            {
              path: "/games/:slug/shop/:id",
              loader: () => release,
              element: <GameShopProduct />,
            },
          ],
        },
        { path: "/delivery", element: <DeliveryPage /> },
        {
          path: "/admin/manual-delivery",
          element: (
            <main className="page">
              <PageHeader title="Manual delivery" />
              <ShopDeliveryPanel id="manual-order" admin changed={() => {}} />
            </main>
          ),
        },
        {
          path: "/admin/orders/:id",
          element: (
            <main className="page">
              <PageHeader title="Existing staff order destination" />
            </main>
          ),
        },
        {
          path: "/orders/:id",
          element: (
            <main className="page">
              <h1>Existing payment destination</h1>
            </main>
          ),
        },
        { path: "/admin/shop/suppliers", element: <AdminPage /> },
        { path: "/admin/shop/orders", element: <AdminPage view="queue" /> },
        { path: "/admin/shop/:id", element: <AdminPage editor /> },
        {
          path: "/admin/shop",
          element: <AdminPage view="products" />,
        },
      ])}
    />
  </div>,
);
