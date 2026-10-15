import Forms, {formResponse} from "./forms";
import Identity from "../../../frontend/app/identity/identity";
import { IdentityFrame } from "../../../frontend/app/identity/frame";
import "../../../frontend/app/styles.css";
import "../../../frontend/app/ui/design-system.css";
import "../../../frontend/app/ui/workspace.css";
import "../../../frontend/app/ui/primitives.css";
import "../../../frontend/app/ui/secondary.css";
import "../../../frontend/app/experience/experience.css";
import "../../../frontend/app/admin/admin.css";
import "../../../frontend/app/catalog/form-rhythm.css";
// Design-only: render current components with isolated data. Never a production entry point.
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { HomePage } from "../../../frontend/app/home/page";
import { GameShell } from "../../../frontend/app/catalog/game-shell";
import { GamePage } from "../../../frontend/app/catalog/public";
import {
  SiteHeader,
  SiteFooter,
  AmbientBackdrop,
} from "../../../frontend/app/ui/site-chrome";
import AccountNavigation from "../../../frontend/app/account/navigation";
import AccountOverview from "../../../frontend/app/account/overview";
import AdminShell from "../../../frontend/app/admin/shell";
import OrderList from "../../../frontend/app/orders/list";
import { BoosterQueue } from "../../../frontend/app/fulfillment/booster-workspace";
import {
  session,
  order,
  work,
} from "../../../frontend/tests/portals/fixtures.mjs";
import { defaultHome } from "../../../frontend/app/site/content";
import { capabilitiesFor } from "../../../frontend/app/catalog/public-discovery";
import { AuthorizedIdentity } from "../../../frontend/app/identity/frame";
import content from "../color-study-2026-10-15/public-content.json";
import { PageHeader } from "../../../frontend/app/ui/page-header";
import States from "../color-study-2026-10-15/states";

import "../../../frontend/app/ui/champagne.css";
const search = new URLSearchParams(location.search),
  screen = search.get("page") || "home";
const palette = search.get("palette") || "green-champagne";
document.documentElement.dataset.palette = [
  "current",
  "green-champagne",
  "glacier",
  "iris",
  "champagne",
].includes(palette)
  ? palette
  : "green-champagne";
const portal =
  screen.includes("admin") ? "admin" : screen.includes("booster") ? "booster" : "customer";
document.body.dataset.portal = portal;
document.body.className = portal === "admin" ? "admin-app" : "storefront-app";
const identity = session(portal, !screen.startsWith("login"));
if (identity.user) { identity.user.display_name = "Alex · Demo"; identity.user.staff_alias = "Alex · Demo"; }
identity.google_enabled = true;
const game = content.game;
const date = new Date().toISOString();
const orders = [
  {
    ...order,
    id: "00000000-0000-4000-8000-000000000156",
    game_name: "Mobile Legends",
    slug: "mobile-legends",
    state: "submitted",
    created_at: date,
    updated_at: date,
  },
  {
    ...order,
    id: "00000000-0000-4000-8000-000000000157",
    game_name: "World of Warcraft",
    slug: "world-of-warcraft",
    kind: "package",
    state: "in_progress",
    created_at: date,
    updated_at: date,
  },
  {
    ...order,
    id: "00000000-0000-4000-8000-000000000158",
    game_name: "League of Legends",
    slug: "league-of-legends",
    state: "awaiting_payment",
    created_at: date,
    updated_at: date,
  },
];
orders.forEach((item, index) => {
  item.staff = {
    customer_id: "demo-customer-" + index,
    assigned_id: index === 1 ? "demo-pro" : "",
    payment_state: index === 1 ? "paid" : "unpaid",
  };
});
const metrics = [
  ["active", "Active orders", 12],
  ["complete", "Completed orders", 248],
  ["games", "Games in the lineup", 6],
].map(([key, label, value]) => ({
  key,
  label,
  value,
  state: "available",
  definition: "Synthetic design sample, not a live business statistic.",
  period_end: date,
  refreshed_at: date,
}));
const catalog = {
  games: [
    ["mobile-legends", "Mobile Legends", "mlbb"],
    ["world-of-warcraft", "World of Warcraft", "wow"],
    ["league-of-legends", "League of Legends", "lol"],
    ["valorant", "Valorant", "valorant"],
    ["dota-2", "Dota 2", "dota"],
    ["wild-rift", "Wild Rift", "wildrift"],
  ].map(([slug, name, asset], index) => ({
    id: "preview-" + index,
    slug,
    name,
    description: "Explore boosting, accounts, shop and news.",
    asset:
      "/catalog-assets/game-" +
      asset +
      "-640." +
      (asset === "valorant" ? "png" : "jpg"),
    asset_alt: name,
    paused: false,
    version: 1,
    capabilities: capabilitiesFor(game),
  })),
  next: "",
};
const requests = [];
(window as any).__previewRequests = requests;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof Request
        ? input.url
        : String(input),
    location.origin,
  );
  if (url.origin !== location.origin)
    throw new Error("Color previews cannot contact an external service");
  if (!url.pathname.startsWith("/api/")) return nativeFetch(input, init);
  const method = init.method || "GET";
  requests.push({ path: url.pathname, method });
  if(screen.startsWith("form-") && !url.pathname.endsWith("/session")) return formResponse(url.pathname,method);
  if (method !== "GET")
    return new Response(JSON.stringify({ code: "preview_read_only" }), {
      status: 403,
    });
  const path = url.pathname;
  let data: any = null;
  if (path.endsWith("/session")) data = identity;
  else if (path.endsWith("/me/overview"))
    data = {
      attention: [{ ...orders[0], state: "quoted" }],
      active: [orders[1]],
      messages: [
        {
          id: "preview-chat",
          subject: "Your Mobile Legends request",
          unread: 2,
        },
      ],
      upcoming: [],
      progress: [],
      more_messages: false,
      more_attention: false,
      more_active: false,
      more_upcoming: false,
    };
  else if (path.endsWith("/admin/orders")) data = { orders, next: "" };
  else if (path.endsWith("/booster/fulfillment"))
    data = {
      items: [
        {
          ...work,
          order_id: orders[0].id,
          game: "Mobile Legends",
          service: "Rank boost",
          progress: 60,
          alias: "Alex",
          note: "Legend II → Mythic · Latest progress shared",
          updated_at: date,
        },
        {
          ...work,
          order_id: orders[1].id,
          game: "World of Warcraft",
          service: "Fixed package",
          state: "queued",
          progress: 0,
          alias: "Alex",
          note: "Ready for the agreed start",
          updated_at: date,
        },
      ],
      next: "",
    };
  else if (path.endsWith("/site/metrics")) data = { metrics };
  else if (path.endsWith("/discovery"))
    data = {
      game_id: game.game_id,
      release_id: game.id,
      capabilities: capabilitiesFor(game),
      metrics,
      promotions: [],
    };
  else if (path.endsWith("/public/reviews")) data = { items: [] };
  else if (path.endsWith("/me/favorites")) data = { favorites: [], next: "" };
  else if (path.endsWith("/site/legal"))
    data = {
      kind: "legal",
      version: 0,
      release_id: "",
      label: "",
      data: {},
      updated_at: date,
    };
  else if (path.endsWith("/catalog/games")) data = catalog;
  else data = {};
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
function Workspace({ booster = false }) {
  return (
    <>
      <SiteHeader />
      <div className="experience workspace-experience">
        <div className="account-layout">
          <AccountNavigation
            session={identity}
            action={<p className="quiet">Preview account</p>}
          />
          <main id="main" className="page identity-page">
            <PageHeader
              eyebrow={booster ? "Booster workspace" : "My account"}
              title={booster ? "Assigned work" : "Your overview"}
            />
            {booster ? <BoosterQueue /> : <AccountOverview />}
          </main>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
function Page() {
  let page;
  if (screen.startsWith("form-")) page = <><SiteHeader /><Forms screen={screen}/><SiteFooter /></>;
  else if (screen.startsWith("login")) page = <>{portal !== "admin" && <SiteHeader />}<IdentityFrame value={portal === "admin" ? AdminShell : ({children}) => children}><Identity title="Sign in" /></IdentityFrame><SiteFooter /></>;
  else if (screen === "home")
    page = (
      <>
        <SiteHeader />
        <HomePage loaderData={{ ...defaultHome, ...content.home, catalog }} />
        <SiteFooter />
      </>
    );
  else if (screen === "game" || screen === "boost")
    page = (
      <>
        <SiteHeader />
        <div className="experience">
          <GameShell release={game}>
            <GamePage />
          </GameShell>
        </div>
        <SiteFooter />
      </>
    );
  else if (screen === "states")
    page = (
      <>
        <SiteHeader />
        <div className="experience workspace-experience">
          <States />
        </div>
        <SiteFooter />
      </>
    );
  else if (screen === "admin")
    page = (
      <AdminShell session={identity} title="Order queue">
        <main id="main" className="page identity-page">
          <PageHeader eyebrow="Admin workspace" title="Order queue" />
          <OrderList admin />
        </main>
      </AdminShell>
    );
  else page = <Workspace booster={screen === "booster"} />;
  return (
    <AuthorizedIdentity value={{ session: identity, refresh: async () => {} }}>
      <AmbientBackdrop />
      {page}
      <div className="preview-toast" role="status" hidden>
        Design preview only. Use the page selector above to switch pages.
      </div>
    </AuthorizedIdentity>
  );
}
const path =
  screen.startsWith("login") ? (portal === "customer" ? "/login" : `/${portal}/login`) :
  screen === "boost"
    ? "/games/mobile-legends?service=boost"
    : screen === "game"
      ? "/games/mobile-legends"
      : screen === "admin"
        ? "/admin/orders"
        : screen === "booster"
          ? "/booster/orders"
          : screen === "customer"
            ? "/account"
            : "/";
const router = createMemoryRouter(
  [{ path: "*", loader: () => game, element: <Page /> }],
  { initialEntries: [path] },
);
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
let toastTimer;
document.addEventListener(
  "click",
  (event) => {
    const link = (event.target as HTMLElement).closest("a");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const toast = document.querySelector<HTMLElement>(".preview-toast");
    if (toast) {
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (toast.hidden = true), 2800);
    }
  },
  true,
);
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (
    event.data?.type === "palette" &&
    ["current", "green-champagne", "glacier", "iris", "champagne"].includes(
      event.data.value,
    )
  )
    document.documentElement.dataset.palette = event.data.value;
  if (event.data?.type === "section") {
    const selector =
      event.data.value === "services"
        ? ".service-introduction"
        : event.data.value === "game-grid"
          ? screen === "boost"
            ? ".game-panel > h2"
            : ".game-panel"
          : event.data.value === "games"
            ? "#game-selection"
            : null;
    if (selector)
      document
        .querySelector(selector)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    else scrollTo({ top: 0, behavior: "smooth" });
  }
});
